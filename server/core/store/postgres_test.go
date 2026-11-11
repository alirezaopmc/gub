package store

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"testing"

	"github.com/manovaspace/gub/server/core/event"
	"github.com/manovaspace/gub/server/core/game"
)

func TestPostgresStoreAppendAndGetEvents(t *testing.T) {
	pool := openTestDB(t, true)
	ctx := context.Background()
	roomID := newTestRoom(t, pool)
	es := NewPostgresStore(pool)

	mk := func(seq int64, n int) event.StoredEvent {
		return event.StoredEvent{
			RoomID:    roomID,
			Seq:       seq,
			Type:      "click",
			Actor:     game.Actor{ID: "actor-1"},
			Payload:   json.RawMessage(fmt.Sprintf(`{"n":%d}`, n)),
			Timestamp: testTimestamp(),
		}
	}

	if err := es.AppendEvents(ctx, roomID, 0, []event.StoredEvent{mk(1, 1), mk(2, 2)}); err != nil {
		t.Fatalf("append: %v", err)
	}

	all, err := es.GetEvents(ctx, roomID, 0, 0)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if len(all) != 2 || all[0].Seq != 1 || all[1].Seq != 2 {
		t.Fatalf("unexpected events: %+v", all)
	}
	var payload struct {
		N int `json:"n"`
	}
	if err := json.Unmarshal(all[1].Payload, &payload); err != nil || payload.N != 2 {
		t.Fatalf("payload round trip: %s %v", all[1].Payload, err)
	}
	if all[0].Actor.ID != "actor-1" {
		t.Fatalf("actor round trip: %+v", all[0].Actor)
	}

	after, err := es.GetEvents(ctx, roomID, 1, 0)
	if err != nil || len(after) != 1 || after[0].Seq != 2 {
		t.Fatalf("GetEvents after 1: %+v %v", after, err)
	}

	// Wrong expected sequence is a conflict, and nothing is written.
	if err := es.AppendEvents(ctx, roomID, 0, []event.StoredEvent{mk(3, 3)}); !errors.Is(err, event.ErrConcurrencyConflict) {
		t.Fatalf("stale expectedSeq: %v", err)
	}
	if err := es.AppendEvents(ctx, roomID, 2, []event.StoredEvent{mk(3, 3)}); err != nil {
		t.Fatalf("append at correct seq: %v", err)
	}
	// Replaying the same append now conflicts.
	if err := es.AppendEvents(ctx, roomID, 2, []event.StoredEvent{mk(3, 3)}); !errors.Is(err, event.ErrConcurrencyConflict) {
		t.Fatalf("replayed append: %v", err)
	}

	all, err = es.GetEvents(ctx, roomID, 0, 0)
	if err != nil || len(all) != 3 {
		t.Fatalf("expected 3 events after conflicts, got %d (%v)", len(all), err)
	}

	if err := es.AppendEvents(ctx, "no-such-room", 0, []event.StoredEvent{{RoomID: "no-such-room", Seq: 1, Type: "x", Timestamp: testTimestamp()}}); !errors.Is(err, event.ErrRoomNotFound) {
		t.Fatalf("append to missing room: %v", err)
	}
}
