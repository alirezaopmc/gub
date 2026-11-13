package lease_test

import (
	"context"
	"testing"
	"time"

	"github.com/manovaspace/gub/server/core/lease"
)

func TestMemLeaseManager(t *testing.T) {
	mgr := lease.NewMemManager()
	ctx := context.Background()
	roomID := "room-alpha"

	// 1. Node A acquires lease for 50ms
	l1, err := mgr.Acquire(ctx, roomID, "node-A", 50*time.Millisecond)
	if err != nil {
		t.Fatalf("node-A acquire failed: %v", err)
	}
	if l1.Epoch != 1 || l1.OwnerNode != "node-A" {
		t.Errorf("unexpected lease: %+v", l1)
	}

	// 2. Node B tries to acquire active lease -> fails
	_, err = mgr.Acquire(ctx, roomID, "node-B", 50*time.Millisecond)
	if err != lease.ErrLeaseHeldByOther {
		t.Errorf("expected ErrLeaseHeldByOther, got %v", err)
	}

	// 3. Node A renews with correct epoch
	l1Renewed, err := mgr.Renew(ctx, roomID, "node-A", l1.Epoch, 100*time.Millisecond)
	if err != nil {
		t.Fatalf("renew failed: %v", err)
	}
	if l1Renewed.Epoch != l1.Epoch {
		t.Errorf("expected epoch %d, got %d", l1.Epoch, l1Renewed.Epoch)
	}

	// 4. Renewal with stale epoch fails
	_, err = mgr.Renew(ctx, roomID, "node-A", 999, 100*time.Millisecond)
	if err != lease.ErrEpochMismatch {
		t.Errorf("expected ErrEpochMismatch, got %v", err)
	}

	// 5. Release
	if err := mgr.Release(ctx, roomID, "node-A", l1.Epoch); err != nil {
		t.Fatalf("release failed: %v", err)
	}

	// 6. Node B can now acquire (epoch increments to 2)
	l2, err := mgr.Acquire(ctx, roomID, "node-B", 50*time.Millisecond)
	if err != nil {
		t.Fatalf("node-B acquire failed: %v", err)
	}
	if l2.OwnerNode != "node-B" {
		t.Errorf("expected owner node-B, got %s", l2.OwnerNode)
	}
}
