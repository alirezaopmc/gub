package hub_test

import (
	"context"
	"errors"
	"sync/atomic"
	"testing"
	"time"

	"github.com/manovaspace/gub/server/core/event"
	"github.com/manovaspace/gub/server/core/game"
	"github.com/manovaspace/gub/server/core/hub"
	"github.com/manovaspace/gub/server/core/lease"
	"github.com/manovaspace/gub/server/core/registry"
	"github.com/manovaspace/gub/server/core/session"
)

// fencedFailStore wraps a MemStore and refuses fenced appends once told to.
type fencedFailStore struct {
	*event.MemStore
	failFenced atomic.Bool
}

func (f *fencedFailStore) AppendEventsFenced(ctx context.Context, roomID string, epoch int64, expectedSeq int64, events []event.StoredEvent) error {
	if f.failFenced.Load() {
		return event.ErrFenced
	}
	return f.MemStore.AppendEventsFenced(ctx, roomID, epoch, expectedSeq, events)
}

func clickerRegistry(t *testing.T) *registry.Registry {
	t.Helper()
	reg := registry.New()
	if err := reg.Register(&clickerGame{}); err != nil {
		t.Fatalf("register: %v", err)
	}
	return reg
}

// A room held by another node cannot be loaded here. The error names the owner.
func TestGetRoomOwnedElsewhere(t *testing.T) {
	ctx := context.Background()
	reg := clickerRegistry(t)
	sessions := session.NewManager()
	store := event.NewMemStore()
	leases := lease.NewMemManager()

	h1 := hub.New(hub.Config{NodeID: "node-a", Registry: reg, Sessions: sessions, Store: store, Leases: leases})
	resp, err := h1.CreateRoom(ctx, hub.CreateRoomRequest{GameID: "clicker", HostName: "Alice", MaxPlayers: 2})
	if err != nil {
		t.Fatalf("create: %v", err)
	}

	h2 := hub.New(hub.Config{NodeID: "node-b", Registry: reg, Sessions: sessions, Store: store, Leases: leases})
	_, err = h2.GetRoom(resp.Room.ID)
	if !errors.Is(err, hub.ErrRoomOwnedElsewhere) {
		t.Fatalf("expected ErrRoomOwnedElsewhere, got %v", err)
	}
	var owned *hub.RoomOwnedElsewhereError
	if !errors.As(err, &owned) || owned.OwnerNode != "node-a" {
		t.Fatalf("expected owner node-a, got %v", err)
	}

	// The owner still serves the room.
	if _, err := h1.GetRoom(resp.Room.ID); err != nil {
		t.Fatalf("owner GetRoom: %v", err)
	}
}

// Shutdown closes the rooms, releases their leases and refuses new rooms.
func TestShutdownReleasesLeasesAndRefusesNewRooms(t *testing.T) {
	ctx := context.Background()
	reg := clickerRegistry(t)
	leases := lease.NewMemManager()
	h := hub.New(hub.Config{NodeID: "node-a", Registry: reg, Leases: leases})

	resp, err := h.CreateRoom(ctx, hub.CreateRoomRequest{GameID: "clicker", HostName: "Alice", MaxPlayers: 2})
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if _, err := leases.GetOwner(ctx, resp.Room.ID); err != nil {
		t.Fatalf("lease should be held before shutdown: %v", err)
	}

	if err := h.Shutdown(ctx); err != nil {
		t.Fatalf("shutdown: %v", err)
	}
	if _, err := leases.GetOwner(ctx, resp.Room.ID); !errors.Is(err, lease.ErrLeaseNotFound) {
		t.Fatalf("lease should be released after shutdown, got %v", err)
	}
	if _, err := h.CreateRoom(ctx, hub.CreateRoomRequest{GameID: "clicker", HostName: "Bob", MaxPlayers: 2}); !errors.Is(err, hub.ErrShuttingDown) {
		t.Fatalf("expected ErrShuttingDown, got %v", err)
	}
	if _, err := h.GetRoom(resp.Room.ID); !errors.Is(err, hub.ErrShuttingDown) {
		t.Fatalf("expected ErrShuttingDown from GetRoom, got %v", err)
	}
}

// A room that closes itself (here: a fenced write was refused) is dropped from
// the hub and its lease is released, so a later load starts a fresh room.
func TestFencedRoomIsEvictedAndLeaseReleased(t *testing.T) {
	ctx := context.Background()
	reg := clickerRegistry(t)
	store := &fencedFailStore{MemStore: event.NewMemStore()}
	leases := lease.NewMemManager()
	h := hub.New(hub.Config{NodeID: "node-a", Registry: reg, Store: store, Leases: leases})

	resp, err := h.CreateRoom(ctx, hub.CreateRoomRequest{GameID: "clicker", HostName: "Alice", MaxPlayers: 2})
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if err := h.StartRoom(ctx, resp.Token); err != nil {
		t.Fatalf("start: %v", err)
	}
	rm, err := h.GetRoom(resp.Room.ID)
	if err != nil {
		t.Fatalf("get room: %v", err)
	}

	store.failFenced.Store(true)
	actor := game.Actor{ID: resp.Member.ID, Seat: resp.Member.Seat, Role: resp.Member.Role}
	if err := rm.Dispatch(ctx, actor, game.Command{Type: "click"}); !errors.Is(err, event.ErrFenced) {
		t.Fatalf("expected ErrFenced, got %v", err)
	}
	select {
	case <-rm.Done():
	case <-time.After(2 * time.Second):
		t.Fatal("fenced room did not close")
	}

	deadline := time.Now().Add(2 * time.Second)
	for {
		_, err := leases.GetOwner(ctx, resp.Room.ID)
		if errors.Is(err, lease.ErrLeaseNotFound) {
			break
		}
		if time.Now().After(deadline) {
			t.Fatalf("lease not released after the room closed: %v", err)
		}
		time.Sleep(10 * time.Millisecond)
	}

	rm2, err := h.GetRoom(resp.Room.ID)
	if err != nil {
		t.Fatalf("reload: %v", err)
	}
	if rm2 == rm {
		t.Fatal("hub still returns the closed room")
	}
}
