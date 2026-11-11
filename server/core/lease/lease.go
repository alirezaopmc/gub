package lease

import (
	"context"
	"errors"
	"time"
)

var (
	ErrLeaseHeldByOther = errors.New("room lease held by another node")
	ErrLeaseExpired     = errors.New("room lease expired")
	ErrEpochMismatch    = errors.New("lease fencing epoch mismatch")
	ErrLeaseNotFound    = errors.New("lease not found")
)

type Lease struct {
	RoomID    string    `json:"roomId"`
	OwnerNode string    `json:"ownerNode"`
	Epoch     int64     `json:"epoch"`
	ExpiresAt time.Time `json:"expiresAt"`
}

func (l *Lease) IsExpired() bool {
	return time.Now().After(l.ExpiresAt)
}

type Manager interface {
	Acquire(ctx context.Context, roomID, nodeID string, duration time.Duration) (*Lease, error)
	Renew(ctx context.Context, roomID, nodeID string, epoch int64, duration time.Duration) (*Lease, error)
	Release(ctx context.Context, roomID, nodeID string, epoch int64) error
	GetOwner(ctx context.Context, roomID string) (*Lease, error)
}
