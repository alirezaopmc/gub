package hub

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
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

// LeaseTTL is how long a room lease lasts without a heartbeat. The owner renews
// it every LeaseTTL/3. If it cannot, another node may adopt the room, so the
// room closes.
const LeaseTTL = 30 * time.Second

const (
	// leaseOpTimeout bounds one lease call (acquire, renew or release).
	leaseOpTimeout = 5 * time.Second
	// defaultSubscriberBuffer is the per-client event buffer. A client whose
	// buffer fills is closed by the room and resyncs.
	defaultSubscriberBuffer = 32
)

var (
	ErrGameNotRegistered  = errors.New("game not registered")
	ErrInvalidPlayerCount = errors.New("player count outside the game's allowed range")
	// ErrRoomOwnedElsewhere is returned when another node holds the room lease.
	// Use errors.As with *RoomOwnedElsewhereError to read the owner node.
	ErrRoomOwnedElsewhere = errors.New("room is owned by another node")
	// ErrShuttingDown is returned for new rooms and room loads once Shutdown has started.
	ErrShuttingDown = errors.New("server is shutting down")
)

// RoomOwnedElsewhereError names the node that holds the room lease. OwnerNode is
// empty when the owner could not be read.
type RoomOwnedElsewhereError struct {
	RoomID    string
	OwnerNode string
}

func (e *RoomOwnedElsewhereError) Error() string {
	if e.OwnerNode == "" {
		return fmt.Sprintf("room %s is owned by another node", e.RoomID)
	}
	return fmt.Sprintf("room %s is owned by node %s", e.RoomID, e.OwnerNode)
}

func (e *RoomOwnedElsewhereError) Is(target error) bool {
	return target == ErrRoomOwnedElsewhere
}

type Config struct {
	NodeID           string
	Registry         *registry.Registry
	Sessions         *session.Manager
	Store            event.Store
	Leases           lease.Manager
	SnapshotInterval int64
	// SubscriberBuffer is the event buffer per WebSocket client. Zero means 32.
	SubscriberBuffer int
}

type Hub struct {
	nodeID           string
	reg              *registry.Registry
	sessions         *session.Manager
	store            event.Store
	leases           lease.Manager
	snapshotInterval int64
	subscriberBuffer int

	// mu guards rooms and closing. Every room in rooms holds this node's lease.
	mu      sync.RWMutex
	rooms   map[string]*room.Room
	closing bool
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
	if cfg.SubscriberBuffer <= 0 {
		cfg.SubscriberBuffer = defaultSubscriberBuffer
	}

	return &Hub{
		nodeID:           cfg.NodeID,
		reg:              cfg.Registry,
		sessions:         cfg.Sessions,
		store:            cfg.Store,
		leases:           cfg.Leases,
		snapshotInterval: cfg.SnapshotInterval,
		subscriberBuffer: cfg.SubscriberBuffer,
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
	if h.isClosing() {
		return nil, ErrShuttingDown
	}

	g, err := h.reg.Get(req.GameID)
	if err != nil {
		return nil, ErrGameNotRegistered
	}

	maxPlayers := req.MaxPlayers
	if maxPlayers <= 0 {
		maxPlayers = g.Def().MaxPlayers
	}

	// The config and seed are persisted with the room, so a room loaded later
	// (after a restart or on another node) starts with the same settings.
	rs, host, token, err := h.sessions.CreateRoomWithSettings(req.GameID, req.HostName, maxPlayers, req.Config, time.Now().UnixNano())
	if err != nil {
		return nil, err
	}

	l, err := h.leases.Acquire(ctx, rs.ID, h.nodeID, LeaseTTL)
	if err != nil {
		return nil, fmt.Errorf("failed to acquire room lease: %w", err)
	}

	// Initialize active room actor. It starts in the lobby until StartRoom.
	rm, err := room.New(room.Config{
		ID:               rs.ID,
		Game:             g,
		Store:            h.store,
		SnapshotInterval: h.snapshotInterval,
		Epoch:            l.Epoch,
	})
	if err != nil {
		h.releaseLease(rs.ID, l.Epoch)
		return nil, fmt.Errorf("failed to create room actor: %w", err)
	}

	if err := h.attach(rm); err != nil {
		rm.Close()
		h.releaseLease(rs.ID, l.Epoch)
		return nil, err
	}

	return &RoomResponse{
		Room:   rs,
		Member: host,
		Token:  token,
	}, nil
}

// StartRoom starts the room hosted by the member behind token. Only the host
// may start, and only once. The roster is locked by the session when the room
// starts, so players can no longer join while viewers still can.
func (h *Hub) StartRoom(ctx context.Context, token string) error {
	rs, member, err := h.sessions.AuthenticateToken(token)
	if err != nil {
		return err
	}
	if member.Role != game.RoleHost {
		return game.ErrUnauthorized
	}

	g, err := h.reg.Get(rs.GameID)
	if err != nil {
		return ErrGameNotRegistered
	}
	if err := checkPlayerCount(g.Def(), len(rs.SeatIndexes())); err != nil {
		return err
	}

	rm, err := h.GetRoom(rs.ID)
	if err != nil {
		return err
	}

	// MarkStarted locks the roster. Joins check the same flag under the session
	// lock, so the seats read after it are final.
	if err := h.sessions.MarkStarted(rs.ID); err != nil {
		return err
	}
	started := false
	defer func() {
		if !started {
			_ = h.sessions.UnmarkStarted(rs.ID)
		}
	}()
	seats := rs.SeatIndexes()
	if err := checkPlayerCount(g.Def(), len(seats)); err != nil {
		return err
	}

	// The config and seed come from the session, which loads them from the
	// Repository for a room this node did not create.
	config, seed := rs.Settings()
	if err := rm.Start(ctx, seats, config, seed); err != nil {
		return err
	}
	started = true
	return nil
}

func checkPlayerCount(def game.GameDef, n int) error {
	if n < def.MinPlayers || n > def.MaxPlayers {
		return fmt.Errorf("%w: have %d, need %d to %d", ErrInvalidPlayerCount, n, def.MinPlayers, def.MaxPlayers)
	}
	return nil
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

// GetRoom returns the room in memory. If it is not there, GetRoom takes the room
// lease and loads the room from the log. It returns a *RoomOwnedElsewhereError
// when another node holds the lease.
func (h *Hub) GetRoom(roomID string) (*room.Room, error) {
	h.mu.RLock()
	rm, exists := h.rooms[roomID]
	closing := h.closing
	h.mu.RUnlock()

	if exists {
		return rm, nil
	}
	if closing {
		return nil, ErrShuttingDown
	}

	// Not in memory: take the lease before building the room, so only the owner
	// replays the log and runs the room. Holding mu makes acquire and insert one step.
	h.mu.Lock()
	defer h.mu.Unlock()

	if rm, exists := h.rooms[roomID]; exists {
		return rm, nil
	}
	if h.closing {
		return nil, ErrShuttingDown
	}

	rs, err := h.sessions.GetRoomByID(roomID)
	if err != nil {
		return nil, err
	}

	g, err := h.reg.Get(rs.GameID)
	if err != nil {
		return nil, err
	}

	ctx, cancel := context.WithTimeout(context.Background(), leaseOpTimeout)
	defer cancel()
	l, err := h.leases.Acquire(ctx, roomID, h.nodeID, LeaseTTL)
	if err != nil {
		if errors.Is(err, lease.ErrLeaseHeldByOther) {
			return nil, &RoomOwnedElsewhereError{RoomID: roomID, OwnerNode: h.ownerNode(ctx, roomID)}
		}
		return nil, fmt.Errorf("failed to acquire room lease: %w", err)
	}

	rm, err = room.New(room.Config{
		ID:               rs.ID,
		Game:             g,
		Store:            h.store,
		SnapshotInterval: h.snapshotInterval,
		Epoch:            l.Epoch,
	})
	if err != nil {
		h.releaseLease(roomID, l.Epoch)
		return nil, err
	}

	h.rooms[roomID] = rm
	h.startWorkers(rm)
	return rm, nil
}

// ownerNode returns the node that holds the room lease, or "" when unknown.
func (h *Hub) ownerNode(ctx context.Context, roomID string) string {
	l, err := h.leases.GetOwner(ctx, roomID)
	if err != nil {
		return ""
	}
	return l.OwnerNode
}

// attach registers a freshly leased room. It refuses when the hub is shutting
// down, and then the caller closes the room and releases the lease.
func (h *Hub) attach(rm *room.Room) error {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.closing {
		return ErrShuttingDown
	}
	h.rooms[rm.ID()] = rm
	h.startWorkers(rm)
	return nil
}

// startWorkers starts the goroutines that keep a leased room alive and forget it
// when it closes. The caller holds h.mu.
func (h *Hub) startWorkers(rm *room.Room) {
	go h.watch(rm)
	go h.heartbeat(rm)
}

// watch forgets a room once it closes, however it closed.
func (h *Hub) watch(rm *room.Room) {
	<-rm.Done()
	h.forget(rm)
}

// heartbeat renews the room lease every LeaseTTL/3. A failed renewal means the
// lease is lost, so the room closes and another node may take it.
func (h *Hub) heartbeat(rm *room.Room) {
	interval := LeaseTTL / 3
	ticker := time.NewTicker(interval)
	defer ticker.Stop()

	for {
		select {
		case <-rm.Done():
			return
		case <-ticker.C:
			ctx, cancel := context.WithTimeout(context.Background(), interval)
			_, err := h.leases.Renew(ctx, rm.ID(), h.nodeID, rm.Epoch(), LeaseTTL)
			cancel()
			if err != nil {
				slog.Error("room lease renewal failed; closing room",
					"room", rm.ID(), "epoch", rm.Epoch(), "node", h.nodeID, "err", err)
				rm.Close()
				h.forget(rm)
				return
			}
		}
	}
}

// forget removes a closed room from the hub and releases its lease. It runs
// under h.mu so a concurrent GetRoom cannot take the lease in between. It is
// safe to call more than once, and it does nothing for a room already replaced.
func (h *Hub) forget(rm *room.Room) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.rooms[rm.ID()] != rm {
		return
	}
	delete(h.rooms, rm.ID())
	h.releaseLease(rm.ID(), rm.Epoch())
}

// releaseLease gives the lease back. A release that fails (for example because
// another node already took the room) is logged and otherwise ignored.
func (h *Hub) releaseLease(roomID string, epoch int64) {
	ctx, cancel := context.WithTimeout(context.Background(), leaseOpTimeout)
	defer cancel()
	if err := h.leases.Release(ctx, roomID, h.nodeID, epoch); err != nil {
		slog.Warn("room lease release failed", "room", roomID, "epoch", epoch, "node", h.nodeID, "err", err)
	}
}

func (h *Hub) isClosing() bool {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return h.closing
}

// Shutdown drains the hub. It refuses new rooms and room loads, closes every room
// (each saves a snapshot) and releases the leases. It returns ctx.Err() if the
// context ends first. Leases of rooms still closing then expire on their own.
func (h *Hub) Shutdown(ctx context.Context) error {
	h.mu.Lock()
	h.closing = true
	rooms := make([]*room.Room, 0, len(h.rooms))
	for _, rm := range h.rooms {
		rooms = append(rooms, rm)
	}
	h.mu.Unlock()

	done := make(chan struct{})
	var wg sync.WaitGroup
	for _, rm := range rooms {
		wg.Add(1)
		go func(rm *room.Room) {
			defer wg.Done()
			rm.Close()
			h.forget(rm)
		}(rm)
	}
	go func() {
		wg.Wait()
		close(done)
	}()

	select {
	case <-done:
		slog.Info("hub drained", "rooms", len(rooms), "node", h.nodeID)
		return nil
	case <-ctx.Done():
		return fmt.Errorf("hub shutdown: %w", ctx.Err())
	}
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
		var owned *RoomOwnedElsewhereError
		switch {
		case errors.As(err, &owned):
			msg := "room is owned by another node"
			if owned.OwnerNode != "" {
				msg = "room is owned by node " + owned.OwnerNode
			}
			_ = conn.Send(ctx, transport.ErrorMessage("ROOM_OWNED_ELSEWHERE", msg))
		case errors.Is(err, ErrShuttingDown):
			_ = conn.Send(ctx, transport.ErrorMessage("SHUTTING_DOWN", "Server is shutting down; reconnect shortly"))
		default:
			_ = conn.Send(ctx, transport.ErrorMessage("ROOM_ERROR", "Failed to load room"))
		}
		return
	}

	audience := game.Audience{
		ID:   member.ID,
		Seat: member.Seat,
		Role: member.Role,
	}

	// Subscribe before the welcome view, so no event is missed between them.
	eventsCh, unsubscribe := rm.Subscribe(h.subscriberBuffer)

	// Send initial welcome message with current view
	curView, _ := rm.View(ctx, audience)
	if err := conn.Send(ctx, transport.WelcomeMessage(member, curView, audience, 0)); err != nil {
		unsubscribe()
		return
	}

	// The pump owns the subscription from here and releases it on exit.
	sendErrCh := make(chan error, 1)
	go func() {
		err := h.pumpEvents(ctx, conn, rm, audience, eventsCh, unsubscribe)
		// Cancelling ends the blocked Receive below, so the connection closes.
		cancel()
		sendErrCh <- err
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

// pumpEvents sends one client the room's events, each followed by a view. When
// the room closes the client's subscription (it fell behind), the pump subscribes
// again and sends a fresh view, so the client catches up from current state. When
// the room itself has closed, the pump sends ROOM_CLOSED and returns. The client
// reconnects to load the room again.
func (h *Hub) pumpEvents(ctx context.Context, conn *transport.WSConn, rm *room.Room, aud game.Audience, ch <-chan event.StoredEvent, unsubscribe func()) error {
	defer func() { unsubscribe() }()

	var lastSeq int64
	for {
		select {
		case <-ctx.Done():
			return nil

		case ev, ok := <-ch:
			if !ok {
				if roomClosed(rm) {
					_ = conn.Send(ctx, transport.ErrorMessage("ROOM_CLOSED", "Room closed; reconnect to continue"))
					return room.ErrRoomClosed
				}
				// The room closed this subscriber for falling behind. Subscribe
				// again, then send the current view.
				unsubscribe()
				ch, unsubscribe = rm.Subscribe(h.subscriberBuffer)
				v, _ := rm.View(ctx, aud)
				if err := conn.Send(ctx, transport.ViewMessage(v, aud, lastSeq)); err != nil {
					return err
				}
				slog.Info("client resynced after slow subscriber close", "room", rm.ID(), "seq", lastSeq)
				continue
			}

			lastSeq = ev.Seq
			// Whenever state changes, send event and updated view
			v, _ := rm.View(ctx, aud)
			if err := conn.Send(ctx, transport.EventMessage(ev)); err != nil {
				return err
			}
			if err := conn.Send(ctx, transport.ViewMessage(v, aud, ev.Seq)); err != nil {
				return err
			}
		}
	}
}

// roomClosed reports whether the room has closed.
func roomClosed(rm *room.Room) bool {
	select {
	case <-rm.Done():
		return true
	default:
		return false
	}
}
