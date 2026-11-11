package hub_test

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/coder/websocket"
	"github.com/manovaspace/gub/server/core/game"
	"github.com/manovaspace/gub/server/core/hub"
	"github.com/manovaspace/gub/server/core/registry"
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
