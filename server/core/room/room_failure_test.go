package room_test

import (
	"context"
	"errors"
	"sync/atomic"
	"testing"
	"time"

	"github.com/manovaspace/gub/server/core/event"
	"github.com/manovaspace/gub/server/core/game"
	"github.com/manovaspace/gub/server/core/room"
)

// flakyStore wraps a MemStore and can be told to refuse appends.
type flakyStore struct {
	*event.MemStore
	failAppends atomic.Bool
	failFenced  atomic.Bool
}

var errDiskGone = errors.New("disk gone")

func (f *flakyStore) AppendEvents(ctx context.Context, roomID string, expectedSeq int64, events []event.StoredEvent) error {
	if f.failAppends.Load() {
		return errDiskGone
	}
	return f.MemStore.AppendEvents(ctx, roomID, expectedSeq, events)
}

func (f *flakyStore) AppendEventsFenced(ctx context.Context, roomID string, epoch int64, expectedSeq int64, events []event.StoredEvent) error {
	if f.failFenced.Load() {
		return event.ErrFenced
	}
	if f.failAppends.Load() {
		return errDiskGone
	}
	return f.MemStore.AppendEventsFenced(ctx, roomID, epoch, expectedSeq, events)
}

func waitDone(t *testing.T, rm *room.Room, within time.Duration) {
	t.Helper()
	select {
	case <-rm.Done():
	case <-time.After(within):
		t.Fatal("room did not close")
	}
}

// A fenced append refused with ErrFenced closes the room. The room accepts no
// more commands and writes no snapshot, because its state is ahead of the log.
func TestFencedAppendFailureClosesRoom(t *testing.T) {
	ctx := context.Background()
	store := &flakyStore{MemStore: event.NewMemStore()}
	rm, err := room.New(room.Config{ID: "room-fenced", Game: &testGame{}, Store: store, Epoch: 4, SnapshotInterval: 1000})
	if err != nil {
		t.Fatalf("new room: %v", err)
	}
	defer rm.Close()

	if err := rm.Start(ctx, []int{0, 1}, nil, 1); err != nil {
		t.Fatalf("start: %v", err)
	}
	if rm.Epoch() != 4 {
		t.Fatalf("epoch = %d, want 4", rm.Epoch())
	}

	store.failFenced.Store(true)
	actor := game.Actor{Seat: 0, Role: game.RolePlayer, ID: "p1"}
	if err := rm.Dispatch(ctx, actor, game.Command{Type: "inc"}); !errors.Is(err, event.ErrFenced) {
		t.Fatalf("expected ErrFenced from dispatch, got %v", err)
	}
	waitDone(t, rm, 2*time.Second)

	if err := rm.Dispatch(ctx, actor, game.Command{Type: "inc"}); err == nil {
		t.Fatal("a closed room accepted a command")
	}
	if _, err := store.GetLatestSnapshot(ctx, "room-fenced"); !errors.Is(err, event.ErrSnapshotNotFound) {
		t.Fatalf("fenced room must not write a snapshot, got err %v", err)
	}
}

// A failed write poisons the room: the command is refused, the room closes and
// writes no snapshot. A room rebuilt from the log has only the committed commands.
func TestPersistFailurePoisonsRoomAndRehydrateFromLog(t *testing.T) {
	ctx := context.Background()
	store := &flakyStore{MemStore: event.NewMemStore()}
	const roomID = "room-poison"

	rm, err := room.New(room.Config{ID: roomID, Game: &testGame{}, Store: store, SnapshotInterval: 1000})
	if err != nil {
		t.Fatalf("new room: %v", err)
	}
	if err := rm.Start(ctx, []int{0, 1}, nil, 3); err != nil {
		t.Fatalf("start: %v", err)
	}
	actor := game.Actor{Seat: 0, Role: game.RolePlayer, ID: "p1"}
	if err := rm.Dispatch(ctx, actor, game.Command{Type: "inc"}); err != nil {
		t.Fatalf("first inc: %v", err)
	}

	store.failAppends.Store(true)
	if err := rm.Dispatch(ctx, actor, game.Command{Type: "inc"}); !errors.Is(err, errDiskGone) {
		t.Fatalf("expected the write error from dispatch, got %v", err)
	}
	waitDone(t, rm, 2*time.Second)

	// Commands are refused after the failure, and the closed room says so.
	if err := rm.Dispatch(ctx, actor, game.Command{Type: "inc"}); err == nil {
		t.Fatal("poisoned room accepted a command")
	}
	if _, err := store.GetLatestSnapshot(ctx, roomID); !errors.Is(err, event.ErrSnapshotNotFound) {
		t.Fatalf("poisoned room must not write a snapshot, got err %v", err)
	}

	// Reload from the log: only the committed command (count 1) is there.
	store.failAppends.Store(false)
	rebuilt, err := room.New(room.Config{ID: roomID, Game: &testGame{}, Store: store, SnapshotInterval: 1000})
	if err != nil {
		t.Fatalf("rebuild: %v", err)
	}
	defer rebuilt.Close()
	v, err := rebuilt.View(ctx, game.Audience{Seat: 0, Role: game.RoleViewer})
	if err != nil {
		t.Fatalf("view: %v", err)
	}
	if got := v.(*testState).Count; got != 1 {
		t.Fatalf("rebuilt count = %d, want 1 (the failed command must not be in the log)", got)
	}
}

// A subscriber that never reads is closed once its buffer fills. The room stays open.
func TestSubscriberThatNeverReadsIsClosed(t *testing.T) {
	ctx := context.Background()
	rm, err := room.New(room.Config{ID: "room-overflow", Game: &testGame{}, Store: event.NewMemStore()})
	if err != nil {
		t.Fatalf("new room: %v", err)
	}
	defer rm.Close()

	if err := rm.Start(ctx, []int{0, 1}, nil, 1); err != nil {
		t.Fatalf("start: %v", err)
	}
	ch, unsubscribe := rm.Subscribe(1)
	defer unsubscribe()

	actor := game.Actor{Seat: 0, Role: game.RolePlayer, ID: "p1"}
	for i := 0; i < 3; i++ {
		if err := rm.Dispatch(ctx, actor, game.Command{Type: "inc"}); err != nil {
			t.Fatalf("inc %d: %v", i, err)
		}
	}

	// The one buffered event is still delivered, then the channel is closed.
	select {
	case _, ok := <-ch:
		if !ok {
			t.Fatal("expected the buffered event before the close")
		}
	case <-time.After(time.Second):
		t.Fatal("no buffered event")
	}
	select {
	case _, ok := <-ch:
		if ok {
			t.Fatal("slow subscriber still receiving events")
		}
	case <-time.After(time.Second):
		t.Fatal("slow subscriber was not closed")
	}

	select {
	case <-rm.Done():
		t.Fatal("closing a slow subscriber must not close the room")
	default:
	}
	if _, err := rm.View(ctx, game.Audience{Seat: 0, Role: game.RoleViewer}); err != nil {
		t.Fatalf("view after overflow: %v", err)
	}

	// Unsubscribing after the room closed the channel must not panic.
	unsubscribe()
	unsubscribe()
}

// An idle room closes itself and reports it through Done.
func TestIdleRoomClosesItself(t *testing.T) {
	rm, err := room.New(room.Config{
		ID:          "room-idle",
		Game:        &testGame{},
		Store:       event.NewMemStore(),
		IdleTimeout: 50 * time.Millisecond,
	})
	if err != nil {
		t.Fatalf("new room: %v", err)
	}
	waitDone(t, rm, 2*time.Second)
	rm.Close()
}
