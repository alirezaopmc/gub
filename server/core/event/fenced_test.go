package event_test

import (
	"context"
	"encoding/json"
	"errors"
	"testing"
	"time"

	"github.com/manovaspace/gub/server/core/event"
	"github.com/manovaspace/gub/server/core/game"
)

func fencedRecord(roomID string, seq int64) event.StoredEvent {
	return event.StoredEvent{
		RoomID:    roomID,
		Seq:       seq,
		Type:      "click",
		Actor:     game.Actor{ID: "p1"},
		Payload:   json.RawMessage("null"),
		Timestamp: time.Now().UTC(),
	}
}

func TestMemStoreFencedAppendRejectsStaleEpoch(t *testing.T) {
	ctx := context.Background()
	s := event.NewMemStore()
	const roomID = "room-fenced"

	if err := s.AppendEventsFenced(ctx, roomID, 2, 0, []event.StoredEvent{fencedRecord(roomID, 1)}); err != nil {
		t.Fatalf("append at epoch 2: %v", err)
	}

	// The sequence matches, but epoch 1 is older than the accepted epoch 2.
	if err := s.AppendEventsFenced(ctx, roomID, 1, 1, []event.StoredEvent{fencedRecord(roomID, 2)}); !errors.Is(err, event.ErrFenced) {
		t.Fatalf("stale epoch: expected ErrFenced, got %v", err)
	}

	// The current epoch keeps writing.
	if err := s.AppendEventsFenced(ctx, roomID, 2, 1, []event.StoredEvent{fencedRecord(roomID, 2)}); err != nil {
		t.Fatalf("current epoch append: %v", err)
	}

	// A stale sequence is still a concurrency conflict, not a fence.
	if err := s.AppendEventsFenced(ctx, roomID, 2, 0, []event.StoredEvent{fencedRecord(roomID, 1)}); !errors.Is(err, event.ErrConcurrencyConflict) {
		t.Fatalf("stale seq: expected ErrConcurrencyConflict, got %v", err)
	}

	logged, err := s.GetEvents(ctx, roomID, 0, 0)
	if err != nil {
		t.Fatalf("get events: %v", err)
	}
	if len(logged) != 2 {
		t.Fatalf("expected 2 records, got %d", len(logged))
	}
}

func TestMemStoreFencedRejectionDoesNotRaiseEpoch(t *testing.T) {
	ctx := context.Background()
	s := event.NewMemStore()
	const roomID = "room-fence-noop"

	// A refused append at a conflicting sequence must not fence the older epoch.
	if err := s.AppendEventsFenced(ctx, roomID, 3, 5, []event.StoredEvent{fencedRecord(roomID, 6)}); !errors.Is(err, event.ErrConcurrencyConflict) {
		t.Fatalf("expected ErrConcurrencyConflict, got %v", err)
	}
	if err := s.AppendEventsFenced(ctx, roomID, 2, 0, []event.StoredEvent{fencedRecord(roomID, 1)}); err != nil {
		t.Fatalf("epoch 2 should still be accepted: %v", err)
	}
}
