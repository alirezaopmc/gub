package store

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manovaspace/gub/server/core/lease"
)

// PostgresLeaseManager implements lease.Manager on the room_leases table.
// Expiry is compared with the database clock (now()), so nodes with skewed
// clocks agree on whether a lease has expired.
type PostgresLeaseManager struct {
	pool *pgxpool.Pool
}

var _ lease.Manager = (*PostgresLeaseManager)(nil)

func NewPostgresLeaseManager(pool *pgxpool.Pool) *PostgresLeaseManager {
	return &PostgresLeaseManager{pool: pool}
}

// Acquire claims the room for nodeID. A lease is granted when none exists, when
// the current lease has expired, or when nodeID already owns it. A takeover by a
// different node bumps the fencing epoch. A reacquire by the same node keeps it.
// The claim is one atomic upsert, so two nodes cannot both win.
func (p *PostgresLeaseManager) Acquire(ctx context.Context, roomID, nodeID string, duration time.Duration) (*lease.Lease, error) {
	const query = `
		INSERT INTO room_leases (room_id, owner_node, epoch, lease_expiry, updated_at)
		VALUES ($1, $2, 1, now() + make_interval(secs => $3), now())
		ON CONFLICT (room_id) DO UPDATE SET
			epoch = CASE
				WHEN room_leases.owner_node = EXCLUDED.owner_node THEN room_leases.epoch
				ELSE room_leases.epoch + 1
			END,
			owner_node = EXCLUDED.owner_node,
			lease_expiry = EXCLUDED.lease_expiry,
			updated_at = now()
		WHERE room_leases.lease_expiry < now() OR room_leases.owner_node = EXCLUDED.owner_node
		RETURNING room_id, owner_node, epoch, lease_expiry`

	var l lease.Lease
	err := p.pool.QueryRow(ctx, query, roomID, nodeID, duration.Seconds()).
		Scan(&l.RoomID, &l.OwnerNode, &l.Epoch, &l.ExpiresAt)
	if errors.Is(err, pgx.ErrNoRows) {
		// The conflict branch's WHERE was false: another node holds an unexpired lease.
		return nil, lease.ErrLeaseHeldByOther
	}
	if err != nil {
		return nil, fmt.Errorf("failed to acquire lease: %w", err)
	}
	return &l, nil
}

// Renew extends the lease when nodeID owns it at the given epoch.
func (p *PostgresLeaseManager) Renew(ctx context.Context, roomID, nodeID string, epoch int64, duration time.Duration) (*lease.Lease, error) {
	const query = `
		UPDATE room_leases
		SET lease_expiry = now() + make_interval(secs => $4), updated_at = now()
		WHERE room_id = $1 AND owner_node = $2 AND epoch = $3
		RETURNING room_id, owner_node, epoch, lease_expiry`

	var l lease.Lease
	err := p.pool.QueryRow(ctx, query, roomID, nodeID, epoch, duration.Seconds()).
		Scan(&l.RoomID, &l.OwnerNode, &l.Epoch, &l.ExpiresAt)
	if err == nil {
		return &l, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("failed to renew lease: %w", err)
	}
	return nil, p.explainMismatch(ctx, roomID, nodeID, epoch)
}

// Release deletes the lease when nodeID owns it at the given epoch. Releasing a
// lease that does not exist is not an error, as in lease.MemManager.
func (p *PostgresLeaseManager) Release(ctx context.Context, roomID, nodeID string, epoch int64) error {
	const query = `DELETE FROM room_leases WHERE room_id = $1 AND owner_node = $2 AND epoch = $3`

	tag, err := p.pool.Exec(ctx, query, roomID, nodeID, epoch)
	if err != nil {
		return fmt.Errorf("failed to release lease: %w", err)
	}
	if tag.RowsAffected() == 1 {
		return nil
	}
	err = p.explainMismatch(ctx, roomID, nodeID, epoch)
	if errors.Is(err, lease.ErrLeaseNotFound) {
		return nil
	}
	return err
}

// GetOwner returns the current lease. It returns lease.ErrLeaseNotFound when
// there is none and lease.ErrLeaseExpired when it has lapsed.
func (p *PostgresLeaseManager) GetOwner(ctx context.Context, roomID string) (*lease.Lease, error) {
	const query = `
		SELECT room_id, owner_node, epoch, lease_expiry, lease_expiry < now()
		FROM room_leases WHERE room_id = $1`

	var l lease.Lease
	var expired bool
	err := p.pool.QueryRow(ctx, query, roomID).
		Scan(&l.RoomID, &l.OwnerNode, &l.Epoch, &l.ExpiresAt, &expired)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, lease.ErrLeaseNotFound
	}
	if err != nil {
		return nil, fmt.Errorf("failed to read lease: %w", err)
	}
	if expired {
		return nil, lease.ErrLeaseExpired
	}
	return &l, nil
}

// explainMismatch names why a conditional write matched no row. It is only used
// on the error path, so its read is not atomic with the failed write.
func (p *PostgresLeaseManager) explainMismatch(ctx context.Context, roomID, nodeID string, epoch int64) error {
	var owner string
	var current int64
	err := p.pool.QueryRow(ctx,
		`SELECT owner_node, epoch FROM room_leases WHERE room_id = $1`, roomID).
		Scan(&owner, &current)
	if errors.Is(err, pgx.ErrNoRows) {
		return lease.ErrLeaseNotFound
	}
	if err != nil {
		return fmt.Errorf("failed to read lease: %w", err)
	}
	if owner != nodeID {
		return lease.ErrLeaseHeldByOther
	}
	if current != epoch {
		return lease.ErrEpochMismatch
	}
	// Owner and epoch match now, so the row changed between the two statements.
	return fmt.Errorf("lease for room %s changed during the request", roomID)
}
