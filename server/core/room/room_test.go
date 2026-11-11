package room_test

import (
	"context"
	"encoding/json"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/manovaspace/gub/server/core/event"
	"github.com/manovaspace/gub/server/core/game"
	"github.com/manovaspace/gub/server/core/room"
)

type testState struct {
	Count int    `json:"count"`
	Phase string `json:"phase"`
}

type testGame struct {
	tickCount int64
}

func (t *testGame) Def() game.GameDef {
	return game.GameDef{ID: "test-game", Name: "Test Game", MinPlayers: 1, MaxPlayers: 4}
}

func (t *testGame) Setup(_ json.RawMessage, _ int64, _ []int) (game.State, error) {
	return &testState{Count: 0, Phase: "lobby"}, nil
}

func (t *testGame) Validate(_ game.State, _ game.Actor, cmd game.Command) error {
	if cmd.Type != "inc" && cmd.Type != "finish" {
		return game.ErrInvalidCommand
	}
	return nil
}

func (t *testGame) Apply(state game.State, _ game.Actor, cmd game.Command) ([]game.Event, error) {
	s := state.(*testState)
	if cmd.Type == "inc" {
		s.Count++
		return []game.Event{{Type: "incremented", Payload: s.Count}}, nil
	}
	if cmd.Type == "finish" {
		s.Phase = "game_over"
		return []game.Event{{Type: "finished", Payload: s.Count}}, nil
	}
	return nil, game.ErrInvalidCommand
}

func (t *testGame) Tick(state game.State, _ time.Duration) ([]game.Event, error) {
	atomic.AddInt64(&t.tickCount, 1)
	return nil, nil
}

func (t *testGame) View(state game.State, _ game.Audience) (any, error) {
	return state, nil
}

func (t *testGame) Phase(state game.State) string {
	return state.(*testState).Phase
}

func (t *testGame) IsOver(state game.State) bool {
	return state.(*testState).Phase == "game_over"
}

func (t *testGame) UnmarshalState(data []byte) (game.State, error) {
	var s testState
	if err := json.Unmarshal(data, &s); err != nil {
		return nil, err
	}
	return &s, nil
}

func TestRoomLifecycle(t *testing.T) {
	store := event.NewMemStore()
	g := &testGame{}

	rm, err := room.New(room.Config{
		ID:               "room-123",
		Game:             g,
		Store:            store,
		SnapshotInterval: 5,
		PlayerSeats:      []int{0, 1},
	})
	if err != nil {
		t.Fatalf("failed to create room: %v", err)
	}
	defer rm.Close()

	ctx := context.Background()

	// Initial view
	v, err := rm.View(ctx, game.Audience{Seat: 0, Role: game.RolePlayer})
	if err != nil {
		t.Fatalf("view failed: %v", err)
	}
	st := v.(*testState)
	if st.Count != 0 || st.Phase != "lobby" {
		t.Errorf("unexpected initial state: %+v", st)
	}

	// Subscribe to events
	eventsCh, unsubscribe := rm.Subscribe(16)
	defer unsubscribe()

	// Dispatch commands sequentially
	actor := game.Actor{Seat: 0, Role: game.RolePlayer, ID: "p1"}
	for i := 0; i < 5; i++ {
		if err := rm.Dispatch(ctx, actor, game.Command{Type: "inc"}); err != nil {
			t.Fatalf("dispatch %d failed: %v", i, err)
		}
	}

	// Read 5 events from subscriber
	for i := 1; i <= 5; i++ {
		select {
		case ev := <-eventsCh:
			if ev.Seq != int64(i) {
				t.Errorf("expected seq %d, got %d", i, ev.Seq)
			}
			if ev.Type != "incremented" {
				t.Errorf("expected type 'incremented', got %s", ev.Type)
			}
		case <-time.After(500 * time.Millisecond):
			t.Fatalf("timeout waiting for event %d", i)
		}
	}

	// Check that snapshot was taken at seq 5
	snap, err := store.GetLatestSnapshot(ctx, "room-123")
	if err != nil {
		t.Fatalf("expected snapshot at seq 5, got err: %v", err)
	}
	if snap.Seq != 5 {
		t.Errorf("expected snapshot seq 5, got %d", snap.Seq)
	}
}

func TestRoomConcurrentDispatch(t *testing.T) {
	store := event.NewMemStore()
	g := &testGame{}

	rm, err := room.New(room.Config{
		ID:          "room-concurrent",
		Game:        g,
		Store:       store,
		PlayerSeats: []int{0, 1, 2, 3},
	})
	if err != nil {
		t.Fatalf("failed to create room: %v", err)
	}
	defer rm.Close()

	ctx := context.Background()
	const numGoroutines = 8
	const dispatchesPerGoroutine = 10

	var wg sync.WaitGroup
	wg.Add(numGoroutines)

	for i := 0; i < numGoroutines; i++ {
		go func(seat int) {
			defer wg.Done()
			actor := game.Actor{Seat: seat, Role: game.RolePlayer, ID: "player"}
			for j := 0; j < dispatchesPerGoroutine; j++ {
				_ = rm.Dispatch(ctx, actor, game.Command{Type: "inc"})
			}
		}(i % 4)
	}

	wg.Wait()

	v, err := rm.View(ctx, game.Audience{Seat: 0, Role: game.RoleViewer})
	if err != nil {
		t.Fatalf("view failed: %v", err)
	}
	finalCount := v.(*testState).Count
	if finalCount != numGoroutines*dispatchesPerGoroutine {
		t.Errorf("expected count %d, got %d", numGoroutines*dispatchesPerGoroutine, finalCount)
	}
}
