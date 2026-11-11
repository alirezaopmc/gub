package store

import (
	"context"
	"errors"
	"sync"
	"testing"
	"time"

	"github.com/manovaspace/gub/server/core/lease"
)

func TestPostgresLeaseAcquireRenewRelease(t *testing.T) {
	pool := openTestDB(t, true)
	ctx := context.Background()
	roomID := newTestRoom(t, pool)
	a := NewPostgresLeaseManager(pool)
	b := NewPostgresLeaseManager(pool)

	la, err := a.Acquire(ctx, roomID, "node-a", time.Minute)
	if err != nil {
		t.Fatalf("acquire by A: %v", err)
	}
	if la.Epoch != 1 || la.OwnerNode != "node-a" {
		t.Fatalf("unexpected first lease: %+v", la)
	}

	if _, err := b.Acquire(ctx, roomID, "node-b", time.Minute); !errors.Is(err, lease.ErrLeaseHeldByOther) {
		t.Fatalf("B acquired a held lease: %v", err)
	}

	// Same-node reacquire keeps the epoch.
	again, err := a.Acquire(ctx, roomID, "node-a", time.Minute)
	if err != nil || again.Epoch != la.Epoch {
		t.Fatalf("same-node reacquire: epoch %d err %v", again.Epoch, err)
	}

	if _, err := a.Renew(ctx, roomID, "node-a", la.Epoch, time.Minute); err != nil {
		t.Fatalf("renew with current epoch: %v", err)
	}
	if _, err := a.Renew(ctx, roomID, "node-a", la.Epoch+5, time.Minute); !errors.Is(err, lease.ErrEpochMismatch) {
		t.Fatalf("renew with wrong epoch: %v", err)
	}
	if _, err := b.Renew(ctx, roomID, "node-b", la.Epoch, time.Minute); !errors.Is(err, lease.ErrLeaseHeldByOther) {
		t.Fatalf("renew by non-owner: %v", err)
	}

	if err := b.Release(ctx, roomID, "node-b", la.Epoch); !errors.Is(err, lease.ErrLeaseHeldByOther) {
		t.Fatalf("release by non-owner: %v", err)
	}
	if err := a.Release(ctx, roomID, "node-a", la.Epoch+5); !errors.Is(err, lease.ErrEpochMismatch) {
		t.Fatalf("release with wrong epoch: %v", err)
	}
	if err := a.Release(ctx, roomID, "node-a", la.Epoch); err != nil {
		t.Fatalf("release: %v", err)
	}
	if _, err := a.GetOwner(ctx, roomID); !errors.Is(err, lease.ErrLeaseNotFound) {
		t.Fatalf("owner after release: %v", err)
	}
	if err := a.Release(ctx, roomID, "node-a", la.Epoch); err != nil {
		t.Fatalf("releasing a missing lease should succeed: %v", err)
	}
}

func TestPostgresLeaseExpiryTakeoverBumpsEpoch(t *testing.T) {
	pool := openTestDB(t, true)
	ctx := context.Background()
	roomID := newTestRoom(t, pool)
	a := NewPostgresLeaseManager(pool)
	b := NewPostgresLeaseManager(pool)

	la, err := a.Acquire(ctx, roomID, "node-a", time.Second)
	if err != nil {
		t.Fatalf("acquire by A: %v", err)
	}

	time.Sleep(1100 * time.Millisecond)

	if _, err := a.GetOwner(ctx, roomID); !errors.Is(err, lease.ErrLeaseExpired) {
		t.Fatalf("expired lease reported as %v", err)
	}

	lb, err := b.Acquire(ctx, roomID, "node-b", time.Minute)
	if err != nil {
		t.Fatalf("takeover after expiry: %v", err)
	}
	if lb.Epoch != la.Epoch+1 || lb.OwnerNode != "node-b" {
		t.Fatalf("takeover lease %+v, want epoch %d", lb, la.Epoch+1)
	}

	// The stale owner is fenced out.
	if _, err := a.Renew(ctx, roomID, "node-a", la.Epoch, time.Minute); err == nil {
		t.Fatal("stale owner renewed after takeover")
	}
	if err := a.Release(ctx, roomID, "node-a", la.Epoch); err == nil {
		t.Fatal("stale owner released after takeover")
	}
	owner, err := a.GetOwner(ctx, roomID)
	if err != nil || owner.OwnerNode != "node-b" {
		t.Fatalf("owner after stale writes: %+v %v", owner, err)
	}
}

func TestPostgresLeaseContendedAcquireHasOneWinner(t *testing.T) {
	pool := openTestDB(t, true)
	ctx := context.Background()
	roomID := newTestRoom(t, pool)

	const nodes = 4
	var wg sync.WaitGroup
	results := make(chan error, nodes)
	start := make(chan struct{})
	for i := 0; i < nodes; i++ {
		mgr := NewPostgresLeaseManager(pool)
		node := []string{"node-a", "node-b", "node-c", "node-d"}[i]
		wg.Add(1)
		go func() {
			defer wg.Done()
			<-start
			_, err := mgr.Acquire(ctx, roomID, node, time.Minute)
			results <- err
		}()
	}
	close(start)
	wg.Wait()
	close(results)

	wins := 0
	for err := range results {
		switch {
		case err == nil:
			wins++
		case errors.Is(err, lease.ErrLeaseHeldByOther):
		default:
			t.Fatalf("unexpected acquire error: %v", err)
		}
	}
	if wins != 1 {
		t.Fatalf("%d nodes acquired the same lease", wins)
	}
}
