package hub_test

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/coder/websocket"
	"github.com/manovaspace/gub/server/core/event"
	"github.com/manovaspace/gub/server/core/game"
	"github.com/manovaspace/gub/server/core/hub"
	"github.com/manovaspace/gub/server/core/registry"
	"github.com/manovaspace/gub/server/core/room"
	"github.com/manovaspace/gub/server/core/session"
	"github.com/manovaspace/gub/server/core/transport"
)

type clickerState struct {
	Clicks int `json:"clicks"`
}

type clickerGame struct{}

func (c *clickerGame) Def() game.GameDef {
	return game.GameDef{ID: "clicker", Name: "Clicker", MinPlayers: 1, MaxPlayers: 2}
}

func (c *clickerGame) Setup(_ json.RawMessage, _ int64, _ []int) (game.State, error) {
	return &clickerState{Clicks: 0}, nil
}

func (c *clickerGame) Validate(_ game.State, _ game.Actor, cmd game.Command) error {
	if cmd.Type != "click" {
		return game.ErrInvalidCommand
	}
	return nil
}

func (c *clickerGame) Apply(state game.State, _ game.Actor, cmd game.Command) ([]game.Event, error) {
	s := state.(*clickerState)
	s.Clicks++
	return []game.Event{{Type: "clicked", Payload: s.Clicks}}, nil
}

func (c *clickerGame) Tick(_ game.State, _ time.Duration) ([]game.Event, error) {
	return nil, nil
}

func (c *clickerGame) View(state game.State, _ game.Audience) (any, error) {
	return state, nil
}

func (c *clickerGame) Phase(_ game.State) string {
	return "playing"
}

func (c *clickerGame) IsOver(_ game.State) bool {
	return false
}

func TestHubWebSocketWorkflow(t *testing.T) {
	reg := registry.New()
	_ = reg.Register(&clickerGame{})

	h := hub.New(hub.Config{
		NodeID:   "node-test",
		Registry: reg,
	})

	ctx := context.Background()

	// 1. Create Room
	resp, err := h.CreateRoom(ctx, hub.CreateRoomRequest{
		GameID:     "clicker",
		HostName:   "Alice",
		MaxPlayers: 2,
	})
	if err != nil {
		t.Fatalf("failed to create room: %v", err)
	}

	// Rooms start in the lobby; the host starts the game before players connect.
	if err := h.StartRoom(ctx, resp.Token); err != nil {
		t.Fatalf("failed to start room: %v", err)
	}

	// 2. Start HTTP / WS test server
	server := httptest.NewServer(http.HandlerFunc(h.HandleWebSocket))
	defer server.Close()

	wsURL := "ws" + strings.TrimPrefix(server.URL, "http") + "?token=" + resp.Token

	// 3. Connect via WebSocket
	dialCtx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	ws, _, err := websocket.Dial(dialCtx, wsURL, nil)
	if err != nil {
		t.Fatalf("websocket dial failed: %v", err)
	}
	conn := transport.WrapWS(ws)
	defer conn.Close()

	// 4. Expect Welcome message
	welcomeMsg, err := conn.Receive(dialCtx)
	if err != nil {
		t.Fatalf("receive welcome failed: %v", err)
	}
	if welcomeMsg.Type != transport.MsgWelcome {
		t.Errorf("expected welcome message, got %+v", welcomeMsg)
	}

	// 5. Send command: "click"
	clickCmd := transport.ClientMessage{
		Type:    transport.MsgCommand,
		CmdType: "click",
	}
	clickData, _ := json.Marshal(clickCmd)
	if err := ws.Write(dialCtx, websocket.MessageText, clickData); err != nil {
		t.Fatalf("failed to write click command: %v", err)
	}

	// 6. Receive event & view
	eventMsg, err := conn.Receive(dialCtx)
	if err != nil {
		t.Fatalf("receive event failed: %v", err)
	}
	if eventMsg.Type != transport.MsgEvent {
		t.Errorf("expected event message, got %+v", eventMsg)
	}

	viewMsg, err := conn.Receive(dialCtx)
	if err != nil {
		t.Fatalf("receive view failed: %v", err)
	}
	if viewMsg.Type != transport.MsgView {
		t.Errorf("expected view message, got %+v", viewMsg)
	}
}

// rangeGame is clickerGame with a configurable id and player range.
type rangeGame struct {
	clickerGame
	id       string
	min, max int
}

func (r *rangeGame) Def() game.GameDef {
	return game.GameDef{ID: r.id, Name: r.id, MinPlayers: r.min, MaxPlayers: r.max}
}

func newTestHub(t *testing.T, games ...game.Game) (*hub.Hub, *event.MemStore) {
	t.Helper()
	reg := registry.New()
	for _, g := range games {
		if err := reg.Register(g); err != nil {
			t.Fatalf("register %s: %v", g.Def().ID, err)
		}
	}
	store := event.NewMemStore()
	return hub.New(hub.Config{NodeID: "node-test", Registry: reg, Store: store}), store
}

func TestHubStartRoomRejectsNonHost(t *testing.T) {
	ctx := context.Background()
	h, _ := newTestHub(t, &clickerGame{})

	resp, err := h.CreateRoom(ctx, hub.CreateRoomRequest{GameID: "clicker", HostName: "Alice", MaxPlayers: 2})
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	player, err := h.JoinRoom(ctx, hub.JoinRoomRequest{RoomCode: resp.Room.Code, Name: "Bob", Role: game.RolePlayer})
	if err != nil {
		t.Fatalf("join player: %v", err)
	}
	viewer, err := h.JoinRoom(ctx, hub.JoinRoomRequest{RoomCode: resp.Room.Code, Name: "Carol", Role: game.RoleViewer})
	if err != nil {
		t.Fatalf("join viewer: %v", err)
	}

	for name, token := range map[string]string{"player": player.Token, "viewer": viewer.Token} {
		if err := h.StartRoom(ctx, token); !errors.Is(err, game.ErrUnauthorized) {
			t.Errorf("%s start: expected ErrUnauthorized, got %v", name, err)
		}
	}

	rm, _ := h.GetRoom(resp.Room.ID)
	v, _ := rm.View(ctx, game.Audience{Role: game.RoleViewer})
	if lv, ok := v.(room.LobbyView); !ok || lv.Phase != "lobby" {
		t.Errorf("room must stay in lobby after rejected start, got %#v", v)
	}
}

func TestHubStartRoomPlayerCount(t *testing.T) {
	ctx := context.Background()

	tests := []struct {
		name       string
		game       game.Game
		maxPlayers int
		extra      int // players joined besides the host
		wantErr    bool
	}{
		{"too few for range 2..2", &rangeGame{id: "pair", min: 2, max: 2}, 2, 0, true},
		{"exactly min", &rangeGame{id: "pair", min: 2, max: 2}, 2, 1, false},
		{"too many for max 2", &rangeGame{id: "duo", min: 1, max: 2}, 4, 2, true},
		{"within range", &rangeGame{id: "duo", min: 1, max: 2}, 4, 1, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h, _ := newTestHub(t, tt.game)
			gameID := tt.game.Def().ID
			resp, err := h.CreateRoom(ctx, hub.CreateRoomRequest{GameID: gameID, HostName: "Alice", MaxPlayers: tt.maxPlayers})
			if err != nil {
				t.Fatalf("create: %v", err)
			}
			for i := 0; i < tt.extra; i++ {
				if _, err := h.JoinRoom(ctx, hub.JoinRoomRequest{RoomCode: resp.Room.Code, Name: "P", Role: game.RolePlayer}); err != nil {
					t.Fatalf("join %d: %v", i, err)
				}
			}

			err = h.StartRoom(ctx, resp.Token)
			if tt.wantErr {
				if !errors.Is(err, hub.ErrInvalidPlayerCount) {
					t.Errorf("expected ErrInvalidPlayerCount, got %v", err)
				}
				rm, _ := h.GetRoom(resp.Room.ID)
				v, _ := rm.View(ctx, game.Audience{Role: game.RoleViewer})
				if lv, ok := v.(room.LobbyView); !ok || lv.Phase != "lobby" {
					t.Errorf("room must stay in lobby after rejected start")
				}
				return
			}
			if err != nil {
				t.Errorf("unexpected start error: %v", err)
			}
		})
	}
}

func TestHubStartRoomOnlyOnce(t *testing.T) {
	ctx := context.Background()
	h, _ := newTestHub(t, &clickerGame{})

	resp, err := h.CreateRoom(ctx, hub.CreateRoomRequest{GameID: "clicker", HostName: "Alice", MaxPlayers: 2})
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if err := h.StartRoom(ctx, resp.Token); err != nil {
		t.Fatalf("first start: %v", err)
	}
	if err := h.StartRoom(ctx, resp.Token); !errors.Is(err, session.ErrRoomStarted) {
		t.Errorf("second start: expected session.ErrRoomStarted, got %v", err)
	}
}

func TestHubJoinAfterStart(t *testing.T) {
	ctx := context.Background()
	h, _ := newTestHub(t, &clickerGame{})

	resp, err := h.CreateRoom(ctx, hub.CreateRoomRequest{GameID: "clicker", HostName: "Alice", MaxPlayers: 2})
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if err := h.StartRoom(ctx, resp.Token); err != nil {
		t.Fatalf("start: %v", err)
	}

	if _, err := h.JoinRoom(ctx, hub.JoinRoomRequest{RoomCode: resp.Room.Code, Name: "Late", Role: game.RolePlayer}); !errors.Is(err, session.ErrRoomStarted) {
		t.Errorf("player join after start: expected session.ErrRoomStarted, got %v", err)
	}
	if _, err := h.JoinRoom(ctx, hub.JoinRoomRequest{RoomCode: resp.Room.Code, Name: "Watcher", Role: game.RoleViewer}); err != nil {
		t.Errorf("viewer join after start should be allowed, got %v", err)
	}
}

func TestHubStartEmitsRoomStarted(t *testing.T) {
	ctx := context.Background()
	h, _ := newTestHub(t, &clickerGame{})

	resp, err := h.CreateRoom(ctx, hub.CreateRoomRequest{GameID: "clicker", HostName: "Alice", MaxPlayers: 2})
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	rm, err := h.GetRoom(resp.Room.ID)
	if err != nil {
		t.Fatalf("get room: %v", err)
	}
	ch, unsubscribe := rm.Subscribe(8)
	defer unsubscribe()

	if err := h.StartRoom(ctx, resp.Token); err != nil {
		t.Fatalf("start: %v", err)
	}

	select {
	case ev := <-ch:
		if ev.Type != event.RoomStartedType || ev.Seq != 1 {
			t.Errorf("expected room_started at seq 1, got %s at %d", ev.Type, ev.Seq)
		}
	case <-time.After(2 * time.Second):
		t.Fatal("timeout waiting for room_started")
	}
}

func TestHubRehydrateFromLog(t *testing.T) {
	ctx := context.Background()
	reg := registry.New()
	if err := reg.Register(&clickerGame{}); err != nil {
		t.Fatalf("register: %v", err)
	}
	store := event.NewMemStore()
	sessions := session.NewManager()

	h1 := hub.New(hub.Config{NodeID: "node-a", Registry: reg, Sessions: sessions, Store: store})
	resp, err := h1.CreateRoom(ctx, hub.CreateRoomRequest{GameID: "clicker", HostName: "Alice", MaxPlayers: 2})
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if err := h1.StartRoom(ctx, resp.Token); err != nil {
		t.Fatalf("start: %v", err)
	}
	rm1, _ := h1.GetRoom(resp.Room.ID)
	actor := game.Actor{ID: resp.Member.ID, Seat: resp.Member.Seat, Role: resp.Member.Role}
	for i := 0; i < 3; i++ {
		if err := rm1.Dispatch(ctx, actor, game.Command{Type: "click"}); err != nil {
			t.Fatalf("click: %v", err)
		}
	}

	// A second hub with the same sessions and store has no rooms in memory.
	h2 := hub.New(hub.Config{NodeID: "node-b", Registry: reg, Sessions: sessions, Store: store})
	rm2, err := h2.GetRoom(resp.Room.ID)
	if err != nil {
		t.Fatalf("rehydrate: %v", err)
	}
	v, err := rm2.View(ctx, game.Audience{Seat: 0, Role: game.RoleHost})
	if err != nil {
		t.Fatalf("view: %v", err)
	}
	if clicks := v.(*clickerState).Clicks; clicks != 3 {
		t.Errorf("expected 3 clicks after rehydrate, got %d", clicks)
	}
}
