package hub

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"sync"
	"time"

	"github.com/manovaspace/gub/server/core/event"
	"github.com/manovaspace/gub/server/core/game"
	"github.com/manovaspace/gub/server/core/lease"
	"github.com/manovaspace/gub/server/core/registry"
	"github.com/manovaspace/gub/server/core/room"
	"github.com/manovaspace/gub/server/core/session"
	"github.com/manovaspace/gub/server/core/transport"
)

var (
	ErrGameNotRegistered = errors.New("game not registered")
)

type Config struct {
	NodeID           string
	Registry         *registry.Registry
	Sessions         *session.Manager
	Store            event.Store
	Leases           lease.Manager
	SnapshotInterval int64
}

type Hub struct {
	nodeID           string
	reg              *registry.Registry
	sessions         *session.Manager
	store            event.Store
	leases           lease.Manager
	snapshotInterval int64

	mu    sync.RWMutex
	rooms map[string]*room.Room
}

func New(cfg Config) *Hub {
	if cfg.Registry == nil {
		cfg.Registry = registry.Default
	}
	if cfg.Sessions == nil {
		cfg.Sessions = session.NewManager()
	}
	if cfg.Store == nil {
		cfg.Store = event.NewMemStore()
	}
	if cfg.Leases == nil {
		cfg.Leases = lease.NewMemManager()
	}
	if cfg.SnapshotInterval <= 0 {
		cfg.SnapshotInterval = 20
	}

	return &Hub{
		nodeID:           cfg.NodeID,
		reg:              cfg.Registry,
		sessions:         cfg.Sessions,
		store:            cfg.Store,
		leases:           cfg.Leases,
		snapshotInterval: cfg.SnapshotInterval,
		rooms:            make(map[string]*room.Room),
	}
}

type CreateRoomRequest struct {
	GameID     string          `json:"gameId"`
	HostName   string          `json:"hostName"`
	MaxPlayers int             `json:"maxPlayers"`
	Config     json.RawMessage `json:"config"`
}

type JoinRoomRequest struct {
	RoomCode string    `json:"roomCode"`
	Name     string    `json:"name"`
	Role     game.Role `json:"role"`
}

type RoomResponse struct {
	Room   *session.RoomSession `json:"room"`
	Member *session.Member      `json:"member"`
	Token  string               `json:"token"`
}

func (h *Hub) CreateRoom(ctx context.Context, req CreateRoomRequest) (*RoomResponse, error) {
	g, err := h.reg.Get(req.GameID)
	if err != nil {
		return nil, ErrGameNotRegistered
	}

	maxPlayers := req.MaxPlayers
	if maxPlayers <= 0 {
		maxPlayers = g.Def().MaxPlayers
	}

	rs, host, token, err := h.sessions.CreateRoom(req.GameID, req.HostName, maxPlayers)
	if err != nil {
		return nil, err
	}

	// Acquire initial lease
	if _, err := h.leases.Acquire(ctx, rs.ID, h.nodeID, 30*time.Minute); err != nil {
		return nil, fmt.Errorf("failed to acquire room lease: %w", err)
	}

	// Initialize active room actor
	rm, err := room.New(room.Config{
		ID:               rs.ID,
		Game:             g,
		GameConfig:       req.Config,
		Seed:             time.Now().UnixNano(),
		PlayerSeats:      []int{0},
		Store:            h.store,
		SnapshotInterval: h.snapshotInterval,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create room actor: %w", err)
	}

	h.mu.Lock()
	h.rooms[rs.ID] = rm
	h.mu.Unlock()

	return &RoomResponse{
		Room:   rs,
		Member: host,
		Token:  token,
	}, nil
}

func (h *Hub) JoinRoom(_ context.Context, req JoinRoomRequest) (*RoomResponse, error) {
	rs, member, token, err := h.sessions.JoinRoom(req.RoomCode, req.Name, req.Role)
	if err != nil {
		return nil, err
	}

	return &RoomResponse{
		Room:   rs,
		Member: member,
		Token:  token,
	}, nil
}

func (h *Hub) GetRoom(roomID string) (*room.Room, error) {
	h.mu.RLock()
	rm, exists := h.rooms[roomID]
	h.mu.RUnlock()

	if exists {
		return rm, nil
	}

	// If not in local memory, check lease and rehydrate from store
	h.mu.Lock()
	defer h.mu.Unlock()

	if rm, exists := h.rooms[roomID]; exists {
		return rm, nil
	}

	rs, err := h.sessions.GetRoomByID(roomID)
	if err != nil {
		return nil, err
	}

	g, err := h.reg.Get(rs.GameID)
	if err != nil {
		return nil, err
	}

	seats := make([]int, 0, len(rs.Seats))
	for s := range rs.Seats {
		seats = append(seats, s)
	}

	rm, err = room.New(room.Config{
		ID:               rs.ID,
		Game:             g,
		PlayerSeats:      seats,
		Store:            h.store,
		SnapshotInterval: h.snapshotInterval,
	})
	if err != nil {
		return nil, err
	}

	h.rooms[roomID] = rm
	return rm, nil
}

// HandleWebSocket handles incoming WebSocket connections.
func (h *Hub) HandleWebSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := transport.AcceptWS(w, r, nil)
	if err != nil {
		return
	}
	defer conn.Close()

	ctx, cancel := context.WithCancel(r.Context())
	defer cancel()

	// Initial handshake: either ?token=... or first message is join
	token := r.URL.Query().Get("token")
	var rs *session.RoomSession
	var member *session.Member

	if token != "" {
		rs, member, err = h.sessions.AuthenticateToken(token)
	}

	if rs == nil || member == nil {
		// Wait for join message
		msg, err := conn.Receive(ctx)
		if err != nil {
			_ = conn.Send(ctx, transport.ErrorMessage("BAD_HANDSHAKE", "Expected join message"))
			return
		}
		if msg.Type != transport.MsgJoin {
			_ = conn.Send(ctx, transport.ErrorMessage("INVALID_MESSAGE", "First message must be join"))
			return
		}
		if msg.Token != "" {
			rs, member, err = h.sessions.AuthenticateToken(msg.Token)
			if err != nil {
				_ = conn.Send(ctx, transport.ErrorMessage("AUTH_FAILED", "Invalid session token"))
				return
			}
		} else {
			_ = conn.Send(ctx, transport.ErrorMessage("MISSING_TOKEN", "Session token required"))
			return
		}
	}

	rm, err := h.GetRoom(rs.ID)
	if err != nil {
		_ = conn.Send(ctx, transport.ErrorMessage("ROOM_ERROR", "Failed to load room"))
		return
	}

	audience := game.Audience{
		ID:   member.ID,
		Seat: member.Seat,
		Role: member.Role,
	}

	// Send initial welcome message with current view
	curView, _ := rm.View(ctx, audience)
	_ = conn.Send(ctx, transport.WelcomeMessage(member, curView, audience, 0))

	// Subscribe to room events
	eventsCh, unsubscribe := rm.Subscribe(32)
	defer unsubscribe()

	// Goroutine to send room events to client
	sendErrCh := make(chan error, 1)
	go func() {
		for {
			select {
			case <-ctx.Done():
				return
			case ev, ok := <-eventsCh:
				if !ok {
					return
				}
				// Whenever state changes, send event and updated view
				v, _ := rm.View(ctx, audience)
				if err := conn.Send(ctx, transport.EventMessage(ev)); err != nil {
					sendErrCh <- err
					return
				}
				if err := conn.Send(ctx, transport.ViewMessage(v, audience, ev.Seq)); err != nil {
					sendErrCh <- err
					return
				}
			}
		}
	}()

	// Loop to receive commands from client
	for {
		select {
		case <-ctx.Done():
			return
		case err := <-sendErrCh:
			_ = err
			return
		default:
			msg, err := conn.Receive(ctx)
			if err != nil {
				return
			}

			switch msg.Type {
			case transport.MsgPing:
				_ = conn.Send(ctx, transport.ServerMessage{Type: transport.MsgPong, Timestamp: time.Now()})

			case transport.MsgCommand:
				actor := game.Actor{
					ID:   member.ID,
					Seat: member.Seat,
					Role: member.Role,
				}
				cmd := game.Command{
					Type:    msg.CmdType,
					Payload: msg.Payload,
				}
				if err := rm.Dispatch(ctx, actor, cmd); err != nil {
					_ = conn.Send(ctx, transport.ErrorMessage("COMMAND_ERROR", err.Error()))
				}

			case transport.MsgResync:
				v, _ := rm.View(ctx, audience)
				_ = conn.Send(ctx, transport.ViewMessage(v, audience, 0))
			}
		}
	}
}
