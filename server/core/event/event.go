package event

import (
	"context"
	"encoding/json"
	"errors"
	"time"

	"github.com/manovaspace/gub/server/core/game"
)

var (
	ErrConcurrencyConflict = errors.New("event sequence concurrency conflict")
	ErrSnapshotNotFound    = errors.New("snapshot not found")
	ErrRoomNotFound        = errors.New("room not found")
)

type StoredEvent struct {
	RoomID    string          `json:"roomId"`
	Seq       int64           `json:"seq"`
	Type      string          `json:"type"`
	Actor     game.Actor      `json:"actor"`
	Payload   json.RawMessage `json:"payload"`
	Timestamp time.Time       `json:"timestamp"`
}

type Snapshot struct {
	RoomID    string          `json:"roomId"`
	Seq       int64           `json:"seq"`
	Phase     string          `json:"phase"`
	StateBlob json.RawMessage `json:"stateBlob"`
	Timestamp time.Time       `json:"timestamp"`
}

type Store interface {
	AppendEvents(ctx context.Context, roomID string, expectedSeq int64, events []StoredEvent) error
	GetEvents(ctx context.Context, roomID string, afterSeq int64, limit int) ([]StoredEvent, error)
	SaveSnapshot(ctx context.Context, snap Snapshot) error
	GetLatestSnapshot(ctx context.Context, roomID string) (*Snapshot, error)
}
