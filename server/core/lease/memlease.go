package lease

import (
	"context"
	"sync"
	"time"
)

type MemManager struct {
	mu     sync.RWMutex
	leases map[string]*Lease
}

func NewMemManager() *MemManager {
	return &MemManager{
		leases: make(map[string]*Lease),
	}
}

func (m *MemManager) Acquire(_ context.Context, roomID, nodeID string, duration time.Duration) (*Lease, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	now := time.Now()
	existing, exists := m.leases[roomID]
	if exists && !now.After(existing.ExpiresAt) && existing.OwnerNode != nodeID {
		return nil, ErrLeaseHeldByOther
	}

	var newEpoch int64 = 1
	if exists {
		newEpoch = existing.Epoch + 1
	}

	lease := &Lease{
		RoomID:    roomID,
		OwnerNode: nodeID,
		Epoch:     newEpoch,
		ExpiresAt: now.Add(duration),
	}
	m.leases[roomID] = lease
	return lease, nil
}

func (m *MemManager) Renew(_ context.Context, roomID, nodeID string, epoch int64, duration time.Duration) (*Lease, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	now := time.Now()
	existing, exists := m.leases[roomID]
	if !exists {
		return nil, ErrLeaseNotFound
	}
	if existing.OwnerNode != nodeID {
		return nil, ErrLeaseHeldByOther
	}
	if existing.Epoch != epoch {
		return nil, ErrEpochMismatch
	}

	existing.ExpiresAt = now.Add(duration)
	return existing, nil
}

func (m *MemManager) Release(_ context.Context, roomID, nodeID string, epoch int64) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	existing, exists := m.leases[roomID]
	if !exists {
		return nil
	}
	if existing.OwnerNode != nodeID {
		return ErrLeaseHeldByOther
	}
	if existing.Epoch != epoch {
		return ErrEpochMismatch
	}

	delete(m.leases, roomID)
	return nil
}

func (m *MemManager) GetOwner(_ context.Context, roomID string) (*Lease, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	existing, exists := m.leases[roomID]
	if !exists {
		return nil, ErrLeaseNotFound
	}
	if time.Now().After(existing.ExpiresAt) {
		return nil, ErrLeaseExpired
	}
	return existing, nil
}
