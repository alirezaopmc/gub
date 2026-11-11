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

// bigGame is clickerGame with a large view, so a client that stops reading backs up.
type bigGame struct {
	clickerGame
}

func (b *bigGame) Def() game.GameDef {
	return game.GameDef{ID: "big", Name: "Big", MinPlayers: 1, MaxPlayers: 2}
}

func (b *bigGame) View(state game.State, _ game.Audience) (any, error) {
	return map[string]any{
		"clicks": state.(*clickerState).Clicks,
		"pad":    strings.Repeat("x", 128<<10),
	}, nil
}

// A client that stops reading is closed out of the room's event stream. When it
// reads again it gets a fresh view with every click, not a silent gap.
func TestSlowClientGetsFreshViewAfterOverflow(t *testing.T) {
	ctx := context.Background()
	reg := registry.New()
	if err := reg.Register(&bigGame{}); err != nil {
		t.Fatalf("register: %v", err)
	}
	h := hub.New(hub.Config{NodeID: "node-slow", Registry: reg, SubscriberBuffer: 1})

	resp, err := h.CreateRoom(ctx, hub.CreateRoomRequest{GameID: "big", HostName: "Alice", MaxPlayers: 2})
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if err := h.StartRoom(ctx, resp.Token); err != nil {
		t.Fatalf("start: %v", err)
	}

	server := httptest.NewServer(http.HandlerFunc(h.HandleWebSocket))
	defer server.Close()
	wsURL := "ws" + strings.TrimPrefix(server.URL, "http") + "?token=" + resp.Token

	dialCtx, cancel := context.WithTimeout(ctx, 20*time.Second)
	defer cancel()
	ws, _, err := websocket.Dial(dialCtx, wsURL, nil)
	if err != nil {
		t.Fatalf("dial: %v", err)
	}
	conn := transport.WrapWS(ws)
	defer conn.Close()
	// WrapWS sets the transport read limit. Raise it for this test's large views.
	ws.SetReadLimit(64 << 20)

	_, welcome, err := ws.Read(dialCtx)
	if err != nil || !strings.Contains(string(welcome[:min(len(welcome), 40)]), `"welcome"`) {
		t.Fatalf("expected welcome, got %.60s (%v)", welcome, err)
	}

	// Do not read while the room accepts a burst of clicks.
	rm, err := h.GetRoom(resp.Room.ID)
	if err != nil {
		t.Fatalf("get room: %v", err)
	}
	actor := game.Actor{ID: resp.Member.ID, Seat: resp.Member.Seat, Role: resp.Member.Role}
	const clicks = 200
	for i := 0; i < clicks; i++ {
		if err := rm.Dispatch(ctx, actor, game.Command{Type: "click"}); err != nil {
			t.Fatalf("click %d: %v", i, err)
		}
	}

	// Now read raw frames. The last view must show every click.
	type frame struct {
		Type  string `json:"type"`
		Error string `json:"error"`
		Code  string `json:"errorCode"`
		View  struct {
			Clicks int `json:"clicks"`
		} `json:"view"`
	}
	for {
		_, data, err := ws.Read(dialCtx)
		if err != nil {
			t.Fatalf("read before a view with %d clicks: %v", clicks, err)
		}
		var f frame
		if err := json.Unmarshal(data, &f); err != nil {
			t.Fatalf("decode frame: %v", err)
		}
		if f.Type == string(transport.MsgError) {
			t.Fatalf("unexpected error %s: %s", f.Code, f.Error)
		}
		if f.Type == string(transport.MsgView) && f.View.Clicks == clicks {
			return
		}
	}
}
