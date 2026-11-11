package event_test

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/manovaspace/gub/server/core/event"
	"github.com/manovaspace/gub/server/core/game"
)

type counterState struct {
	Count int `json:"count"`
}

type counterGame struct{}

func (c *counterGame) Def() game.GameDef {
	return game.GameDef{ID: "counter", Name: "Counter", MinPlayers: 1, MaxPlayers: 2}
}

func (c *counterGame) Setup(_ json.RawMessage, _ int64, _ []int) (game.State, error) {
	return &counterState{Count: 0}, nil
}

func (c *counterGame) Validate(_ game.State, _ game.Actor, cmd game.Command) error {
	if cmd.Type != "increment" && cmd.Type != "add" {
		return game.ErrInvalidCommand
	}
	return nil
}

func (c *counterGame) Apply(state game.State, _ game.Actor, cmd game.Command) ([]game.Event, error) {
	s := state.(*counterState)
	if cmd.Type == "increment" {
		s.Count++
		return []game.Event{{Type: "increment", Payload: s.Count}}, nil
	}
	if cmd.Type == "add" {
		var n int
		if err := json.Unmarshal(cmd.Payload, &n); err != nil {
			return nil, err
		}
		s.Count += n
		return []game.Event{{Type: "add", Payload: s.Count}}, nil
	}
	return nil, game.ErrInvalidCommand
}

func (c *counterGame) Tick(_ game.State, _ time.Duration) ([]game.Event, error) {
	return nil, nil
}

func (c *counterGame) View(state game.State, _ game.Audience) (any, error) {
	return state, nil
}

func (c *counterGame) Phase(_ game.State) string {
	return "running"
}

func (c *counterGame) IsOver(_ game.State) bool {
	return false
}

func (c *counterGame) UnmarshalState(data []byte) (game.State, error) {
	var s counterState
	if err := json.Unmarshal(data, &s); err != nil {
		return nil, err
	}
	return &s, nil
}

func roomStartedRecord(t *testing.T, roomID string, seats []int, seed int64) event.StoredEvent {
	t.Helper()
	payload, err := json.Marshal(event.RoomStartedPayload{Seats: seats, Seed: seed})
	if err != nil {
		t.Fatalf("encode room_started: %v", err)
	}
	return event.StoredEvent{
		RoomID:    roomID,
		Seq:       1,
		Type:      event.RoomStartedType,
		Actor:     game.Actor{ID: "system", Role: game.RoleSystem},
		Payload:   payload,
		Timestamp: time.Now(),
	}
}

func TestMemStoreAndReplay(t *testing.T) {
	ctx := context.Background()
	store := event.NewMemStore()
	g := &counterGame{}
	roomID := "room-1"

	// 1. Empty log means the room is in the lobby.
	state, seq, err := event.Replay(ctx, store, roomID, g)
	if err != nil {
		t.Fatalf("replay failed: %v", err)
	}
	if state != nil || seq != 0 {
		t.Errorf("expected lobby (nil state, seq 0), got state=%v seq=%d", state, seq)
	}

	// 2. Log: room_started, then commands. Commands are stored as command types and payloads.
	cmds := []event.StoredEvent{
		roomStartedRecord(t, roomID, []int{0, 1}, 42),
		{RoomID: roomID, Seq: 2, Type: "increment", Actor: game.Actor{Seat: 0, Role: game.RolePlayer}, Timestamp: time.Now()},
		{RoomID: roomID, Seq: 3, Type: "increment", Actor: game.Actor{Seat: 1, Role: game.RolePlayer}, Timestamp: time.Now()},
		{RoomID: roomID, Seq: 4, Type: "add", Actor: game.Actor{Seat: 0, Role: game.RolePlayer}, Payload: json.RawMessage("5"), Timestamp: time.Now()},
	}
	if err := store.AppendEvents(ctx, roomID, 0, cmds); err != nil {
		t.Fatalf("failed to append log: %v", err)
	}

	// 3. Concurrency conflict on wrong expectedSeq.
	if err := store.AppendEvents(ctx, roomID, 1, []event.StoredEvent{{RoomID: roomID, Seq: 5, Type: "increment"}}); err != event.ErrConcurrencyConflict {
		t.Errorf("expected ErrConcurrencyConflict, got %v", err)
	}

	// 4. Replay from the log: count = 1 + 1 + 5 = 7, room_started is not applied as a command.
	replayedState, replayedSeq, err := event.Replay(ctx, store, roomID, g)
	if err != nil {
		t.Fatalf("replay failed: %v", err)
	}
	if replayedSeq != 4 {
		t.Errorf("expected seq 4, got %d", replayedSeq)
	}
	if replayedState.(*counterState).Count != 7 {
		t.Errorf("expected count 7, got %d", replayedState.(*counterState).Count)
	}

	// 5. Save snapshot at seq 4.
	snapBlob, _ := json.Marshal(replayedState)
	snap := event.Snapshot{
		RoomID:    roomID,
		Seq:       4,
		Phase:     "running",
		StateBlob: snapBlob,
		Timestamp: time.Now(),
	}
	if err := store.SaveSnapshot(ctx, snap); err != nil {
		t.Fatalf("save snapshot failed: %v", err)
	}

	// 6. Append one more command after the snapshot.
	more := []event.StoredEvent{
		{RoomID: roomID, Seq: 5, Type: "add", Actor: game.Actor{Seat: 1, Role: game.RolePlayer}, Payload: json.RawMessage("10"), Timestamp: time.Now()},
	}
	if err := store.AppendEvents(ctx, roomID, 4, more); err != nil {
		t.Fatalf("failed to append events after snapshot: %v", err)
	}

	// 7. Replay uses the snapshot at seq 4 and applies seq 5: count = 7 + 10 = 17.
	snapReplayedState, finalSeq, err := event.Replay(ctx, store, roomID, g)
	if err != nil {
		t.Fatalf("replay with snapshot failed: %v", err)
	}
	if finalSeq != 5 {
		t.Errorf("expected final seq 5, got %d", finalSeq)
	}
	if snapReplayedState.(*counterState).Count != 17 {
		t.Errorf("expected count 17, got %d", snapReplayedState.(*counterState).Count)
	}
}

func TestReplayRejectsLogWithoutRoomStarted(t *testing.T) {
	ctx := context.Background()
	store := event.NewMemStore()
	bad := []event.StoredEvent{{RoomID: "r", Seq: 1, Type: "increment", Timestamp: time.Now()}}
	if err := store.AppendEvents(ctx, "r", 0, bad); err != nil {
		t.Fatalf("append: %v", err)
	}
	if _, _, err := event.Replay(ctx, store, "r", &counterGame{}); err == nil {
		t.Error("expected error for log that does not start with room_started")
	}
}
