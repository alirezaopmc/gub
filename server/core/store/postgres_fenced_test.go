package store

import (
	"context"
	"encoding/json"
	"errors"
	"testing"
	"time"

	"github.com/manovaspace/gub/server/core/event"
	"github.com/manovaspace/gub/server/core/game"
)

func fencedTestRecord(roomID string, seq int64) event.StoredEvent {
	return event.StoredEvent{
		RoomID:    roomID,
		Seq:       seq,
		Type:      "click",
		Actor:     game.Actor{ID: "p1"},
		Payload:   json.RawMessage("null"),
		Timestamp: testTimestamp(),
	}
}

func TestPostgresFencedAppendChecksLeaseEpoch(t *testing.T) {
	pool := openTestDB(t, true)
	ctx := context.Background()
	roomID := newTestRoom(t, pool)
	leases := NewPostgresLeaseManager(pool)
	es := NewPostgresStore(pool)

	// node-a holds a lease that lapses at once, then node-b takes the room over.
	first, err := leases.Acquire(ctx, roomID, "node-a", time.Millisecond)
	if err != nil {
		t.Fatalf("acquire by node-a: %v", err)
	}
	time.Sleep(50 * time.Millisecond)
	second, err := leases.Acquire(ctx, roomID, "node-b", time.Millisecond)
	if err != nil {
		t.Fatalf("takeover by node-b: %v", err)
	}
	if second.Epoch <= first.Epoch {
		t.Fatalf("takeover must bump the epoch: first %d, second %d", first.Epoch, second.Epoch)
	}

	// The stale owner is fenced even though its sequence is right.
	if err := es.AppendEventsFenced(ctx, roomID, first.Epoch, 0, []event.StoredEvent{fencedTestRecord(roomID, 1)}); !errors.Is(err, event.ErrFenced) {
		t.Fatalf("stale epoch: expected ErrFenced, got %v", err)
	}

	// The current owner writes, but its lease has lapsed by now, so it is fenced
	// too: nobody else may have taken over, yet the lease is no longer valid.
	time.Sleep(50 * time.Millisecond)
	if err := es.AppendEventsFenced(ctx, roomID, second.Epoch, 0, []event.StoredEvent{fencedTestRecord(roomID, 1)}); !errors.Is(err, event.ErrFenced) {
		t.Fatalf("expired lease: expected ErrFenced, got %v", err)
	}

	// With a live lease the current epoch writes.
	live, err := leases.Acquire(ctx, roomID, "node-b", time.Minute)
	if err != nil {
		t.Fatalf("renew by node-b: %v", err)
	}
	if err := es.AppendEventsFenced(ctx, roomID, live.Epoch, 0, []event.StoredEvent{fencedTestRecord(roomID, 1)}); err != nil {
		t.Fatalf("live lease append: %v", err)
	}

	logged, err := es.GetEvents(ctx, roomID, 0, 0)
	if err != nil {
		t.Fatalf("get events: %v", err)
	}
	if len(logged) != 1 {
		t.Fatalf("expected only the live append in the log, got %d records", len(logged))
	}
}
