package event

import (
	"context"
	"sync"
)

type MemStore struct {
	mu        sync.RWMutex
	events    map[string][]StoredEvent
	snapshots map[string]Snapshot
}

func NewMemStore() *MemStore {
	return &MemStore{
		events:    make(map[string][]StoredEvent),
		snapshots: make(map[string]Snapshot),
	}
}

func (m *MemStore) AppendEvents(_ context.Context, roomID string, expectedSeq int64, events []StoredEvent) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	current := m.events[roomID]
	var currentSeq int64 = 0
	if len(current) > 0 {
		currentSeq = current[len(current)-1].Seq
	}

	if currentSeq != expectedSeq {
		return ErrConcurrencyConflict
	}

	for i, ev := range events {
		expectedNext := currentSeq + int64(i) + 1
		if ev.Seq != expectedNext {
			return ErrConcurrencyConflict
		}
	}

	m.events[roomID] = append(current, events...)
	return nil
}

func (m *MemStore) GetEvents(_ context.Context, roomID string, afterSeq int64, limit int) ([]StoredEvent, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	all := m.events[roomID]
	if len(all) == 0 {
		return nil, nil
	}

	out := make([]StoredEvent, 0)
	for _, ev := range all {
		if ev.Seq > afterSeq {
			out = append(out, ev)
			if limit > 0 && len(out) >= limit {
				break
			}
		}
	}
	return out, nil
}

func (m *MemStore) SaveSnapshot(_ context.Context, snap Snapshot) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.snapshots[snap.RoomID] = snap
	return nil
}

func (m *MemStore) GetLatestSnapshot(_ context.Context, roomID string) (*Snapshot, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	snap, exists := m.snapshots[roomID]
	if !exists {
		return nil, ErrSnapshotNotFound
	}
	return &snap, nil
}
