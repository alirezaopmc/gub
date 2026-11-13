package room_test

import (
	"context"
	"encoding/json"
	"errors"
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
	})
	if err != nil {
		t.Fatalf("failed to create room: %v", err)
	}
	defer rm.Close()

	ctx := context.Background()

	// Subscribe before start so the room_started record is observed.
	eventsCh, unsubscribe := rm.Subscribe(16)
	defer unsubscribe()

	if err := rm.Start(ctx, []int{0, 1}, nil, 1); err != nil {
		t.Fatalf("start failed: %v", err)
	}

	// room_started is seq 1.
	select {
	case ev := <-eventsCh:
		if ev.Seq != 1 || ev.Type != event.RoomStartedType {
			t.Errorf("expected room_started at seq 1, got %s at %d", ev.Type, ev.Seq)
		}
	case <-time.After(500 * time.Millisecond):
		t.Fatal("timeout waiting for room_started")
	}

	v, err := rm.View(ctx, game.Audience{Seat: 0, Role: game.RolePlayer})
	if err != nil {
		t.Fatalf("view failed: %v", err)
	}
	st := v.(*testState)
	if st.Count != 0 || st.Phase != "lobby" {
		t.Errorf("unexpected initial state: %+v", st)
	}

	// Dispatch commands sequentially. Commands are seq 2..6.
	actor := game.Actor{Seat: 0, Role: game.RolePlayer, ID: "p1"}
	for i := 0; i < 5; i++ {
		if err := rm.Dispatch(ctx, actor, game.Command{Type: "inc"}); err != nil {
			t.Fatalf("dispatch %d failed: %v", i, err)
		}
	}

	for i := 2; i <= 6; i++ {
		select {
		case ev := <-eventsCh:
			if ev.Seq != int64(i) {
				t.Errorf("expected seq %d, got %d", i, ev.Seq)
			}
			if ev.Type != "incremented" {
				t.Errorf("expected type 'incremented', got %s", ev.Type)
			}
		case <-time.After(500 * time.Millisecond):
			t.Fatalf("timeout waiting for event at seq %d", i)
		}
	}

	// Snapshot interval 5 fires at seq 5.
	snap, err := store.GetLatestSnapshot(ctx, "room-123")
	if err != nil {
		t.Fatalf("expected snapshot at seq 5, got err: %v", err)
	}
	if snap.Seq != 5 {
		t.Errorf("expected snapshot seq 5, got %d", snap.Seq)
	}

	// The log holds one record per command: room_started plus 5 inc.
	logged, err := store.GetEvents(ctx, "room-123", 0, 0)
	if err != nil {
		t.Fatalf("get events: %v", err)
	}
	if len(logged) != 6 {
		t.Fatalf("expected 6 log records, got %d", len(logged))
	}
	if logged[0].Type != event.RoomStartedType {
		t.Errorf("expected first record room_started, got %s", logged[0].Type)
	}
	for _, rec := range logged[1:] {
		if rec.Type != "inc" {
			t.Errorf("expected command record 'inc' at seq %d, got %s", rec.Seq, rec.Type)
		}
	}
}

func TestRoomLobbyRejectsCommands(t *testing.T) {
	ctx := context.Background()
	store := event.NewMemStore()

	rm, err := room.New(room.Config{ID: "room-lobby", Game: &testGame{}, Store: store})
	if err != nil {
		t.Fatalf("failed to create room: %v", err)
	}
	defer rm.Close()

	v, err := rm.View(ctx, game.Audience{Seat: 0, Role: game.RolePlayer})
	if err != nil {
		t.Fatalf("view in lobby failed: %v", err)
	}
	lv, ok := v.(room.LobbyView)
	if !ok || lv.Phase != "lobby" {
		t.Errorf("expected LobbyView{Phase: lobby}, got %#v", v)
	}

	actor := game.Actor{Seat: 0, Role: game.RolePlayer, ID: "p1"}
	if err := rm.Dispatch(ctx, actor, game.Command{Type: "inc"}); !errors.Is(err, room.ErrNotStarted) {
		t.Errorf("expected ErrNotStarted, got %v", err)
	}

	if recs, _ := store.GetEvents(ctx, "room-lobby", 0, 0); len(recs) != 0 {
		t.Errorf("lobby must not write to the log, got %d records", len(recs))
	}
}

func TestRoomStartOnlyOnce(t *testing.T) {
	ctx := context.Background()
	store := event.NewMemStore()

	rm, err := room.New(room.Config{ID: "room-once", Game: &testGame{}, Store: store})
	if err != nil {
		t.Fatalf("failed to create room: %v", err)
	}
	defer rm.Close()

	if err := rm.Start(ctx, []int{0, 1}, nil, 7); err != nil {
		t.Fatalf("first start failed: %v", err)
	}
	if err := rm.Start(ctx, []int{0, 1}, nil, 7); !errors.Is(err, room.ErrAlreadyStarted) {
		t.Errorf("expected ErrAlreadyStarted on second start, got %v", err)
	}
	if recs, _ := store.GetEvents(ctx, "room-once", 0, 0); len(recs) != 1 {
		t.Errorf("expected exactly one room_started record, got %d", len(recs))
	}
}

func TestRoomReplayFromLogRebuildsState(t *testing.T) {
	ctx := context.Background()
	store := event.NewMemStore()
	const roomID = "room-replay"

	// Snapshot interval is high, so the second room must rebuild from the log alone.
	first, err := room.New(room.Config{ID: roomID, Game: &testGame{}, Store: store, SnapshotInterval: 1000})
	if err != nil {
		t.Fatalf("failed to create room: %v", err)
	}
	if err := first.Start(ctx, []int{0, 1}, nil, 9); err != nil {
		t.Fatalf("start failed: %v", err)
	}
	actor := game.Actor{Seat: 1, Role: game.RolePlayer, ID: "p2"}
	for i := 0; i < 3; i++ {
		if err := first.Dispatch(ctx, actor, game.Command{Type: "inc"}); err != nil {
			t.Fatalf("dispatch failed: %v", err)
		}
	}
	first.Close()

	second, err := room.New(room.Config{ID: roomID, Game: &testGame{}, Store: store, SnapshotInterval: 1000})
	if err != nil {
		t.Fatalf("rebuild room failed: %v", err)
	}
	defer second.Close()

	v, err := second.View(ctx, game.Audience{Seat: 0, Role: game.RoleViewer})
	if err != nil {
		t.Fatalf("view failed: %v", err)
	}
	st := v.(*testState)
	if st.Count != 3 || st.Phase != "lobby" {
		t.Errorf("rebuilt state mismatch: %+v", st)
	}
}

func TestRoomConcurrentDispatch(t *testing.T) {
	store := event.NewMemStore()
	g := &testGame{}

	rm, err := room.New(room.Config{
		ID:    "room-concurrent",
		Game:  g,
		Store: store,
	})
	if err != nil {
		t.Fatalf("failed to create room: %v", err)
	}
	defer rm.Close()

	ctx := context.Background()
	if err := rm.Start(ctx, []int{0, 1, 2, 3}, nil, 1); err != nil {
		t.Fatalf("start failed: %v", err)
	}

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
