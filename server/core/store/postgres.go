package store

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manovaspace/gub/server/core/event"
)

type PostgresStore struct {
	pool *pgxpool.Pool
}

func NewPostgresStore(pool *pgxpool.Pool) *PostgresStore {
	return &PostgresStore{pool: pool}
}

var (
	_ event.Store       = (*PostgresStore)(nil)
	_ event.FencedStore = (*PostgresStore)(nil)
)

func (p *PostgresStore) AppendEvents(ctx context.Context, roomID string, expectedSeq int64, events []event.StoredEvent) error {
	return p.appendEvents(ctx, roomID, nil, expectedSeq, events)
}

// AppendEventsFenced appends like AppendEvents, but only while the room lease
// still has the given epoch and has not expired by the database clock. The lease
// row is locked FOR SHARE in the same transaction, so a takeover waits until this
// append commits. Otherwise it returns event.ErrFenced.
func (p *PostgresStore) AppendEventsFenced(ctx context.Context, roomID string, epoch int64, expectedSeq int64, events []event.StoredEvent) error {
	return p.appendEvents(ctx, roomID, &epoch, expectedSeq, events)
}

// appendEvents is the shared append path. A nil epoch skips the lease check.
func (p *PostgresStore) appendEvents(ctx context.Context, roomID string, epoch *int64, expectedSeq int64, events []event.StoredEvent) error {
	if len(events) == 0 {
		return nil
	}

	tx, err := p.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	// Lock the room row so concurrent appends to one room are serialized. The
	// sequence check and the inserts below then see one consistent sequence.
	var lockedID string
	if err := tx.QueryRow(ctx, "SELECT id FROM rooms WHERE id = $1 FOR UPDATE", roomID).Scan(&lockedID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return event.ErrRoomNotFound
		}
		return fmt.Errorf("failed to lock room: %w", err)
	}

	// Fencing check: the writer's epoch must be the lease's current epoch, and the
	// lease must not have expired by the database clock.
	if epoch != nil {
		var leaseEpoch int64
		var live bool
		err := tx.QueryRow(ctx,
			"SELECT epoch, lease_expiry > now() FROM room_leases WHERE room_id = $1 FOR SHARE",
			roomID).Scan(&leaseEpoch, &live)
		if errors.Is(err, pgx.ErrNoRows) {
			return event.ErrFenced
		}
		if err != nil {
			return fmt.Errorf("failed to check lease: %w", err)
		}
		if leaseEpoch != *epoch || !live {
			return event.ErrFenced
		}
	}

	// Optimistic concurrency check
	var currentSeq *int64
	err = tx.QueryRow(ctx, "SELECT MAX(seq) FROM room_events WHERE room_id = $1", roomID).Scan(&currentSeq)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return fmt.Errorf("failed to check current seq: %w", err)
	}

	var actualSeq int64 = 0
	if currentSeq != nil {
		actualSeq = *currentSeq
	}

	if actualSeq != expectedSeq {
		return event.ErrConcurrencyConflict
	}

	batch := &pgx.Batch{}
	for _, ev := range events {
		actorBytes, _ := json.Marshal(ev.Actor)
		batch.Queue(
			`INSERT INTO room_events (room_id, seq, type, actor, payload, created_at)
			 VALUES ($1, $2, $3, $4, $5, $6)`,
			roomID, ev.Seq, ev.Type, actorBytes, ev.Payload, ev.Timestamp,
		)
	}

	br := tx.SendBatch(ctx, batch)
	for i := 0; i < len(events); i++ {
		_, err := br.Exec()
		if err != nil {
			br.Close()
			var pgErr *pgconn.PgError
			if errors.As(err, &pgErr) && pgErr.Code == "23505" {
				// A row with this (room_id, seq) exists: another writer appended first.
				return event.ErrConcurrencyConflict
			}
			return fmt.Errorf("failed to insert event in batch: %w", err)
		}
	}
	br.Close()

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("failed to commit append events tx: %w", err)
	}

	return nil
}

func (p *PostgresStore) GetEvents(ctx context.Context, roomID string, afterSeq int64, limit int) ([]event.StoredEvent, error) {
	query := `SELECT room_id, seq, type, actor, payload, created_at
	          FROM room_events
	          WHERE room_id = $1 AND seq > $2
	          ORDER BY seq ASC`
	var rows pgx.Rows
	var err error

	if limit > 0 {
		query += fmt.Sprintf(" LIMIT %d", limit)
	}
	rows, err = p.pool.Query(ctx, query, roomID, afterSeq)
	if err != nil {
		return nil, fmt.Errorf("failed to query events: %w", err)
	}
	defer rows.Close()

	out := make([]event.StoredEvent, 0)
	for rows.Next() {
		var ev event.StoredEvent
		var actorBytes []byte
		var payloadBytes []byte
		var ts time.Time

		if err := rows.Scan(&ev.RoomID, &ev.Seq, &ev.Type, &actorBytes, &payloadBytes, &ts); err != nil {
			return nil, fmt.Errorf("failed to scan event row: %w", err)
		}
		_ = json.Unmarshal(actorBytes, &ev.Actor)
		ev.Payload = payloadBytes
		ev.Timestamp = ts
		out = append(out, ev)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to read event rows: %w", err)
	}

	return out, nil
}

func (p *PostgresStore) SaveSnapshot(ctx context.Context, snap event.Snapshot) error {
	query := `INSERT INTO room_snapshots (room_id, seq, phase, state_blob, created_at)
	          VALUES ($1, $2, $3, $4, $5)
	          ON CONFLICT (room_id, seq) DO UPDATE
	          SET phase = EXCLUDED.phase, state_blob = EXCLUDED.state_blob`

	_, err := p.pool.Exec(ctx, query, snap.RoomID, snap.Seq, snap.Phase, snap.StateBlob, snap.Timestamp)
	if err != nil {
		return fmt.Errorf("failed to save snapshot: %w", err)
	}
	return nil
}

func (p *PostgresStore) GetLatestSnapshot(ctx context.Context, roomID string) (*event.Snapshot, error) {
	query := `SELECT room_id, seq, phase, state_blob, created_at
	          FROM room_snapshots
	          WHERE room_id = $1
	          ORDER BY seq DESC LIMIT 1`

	var snap event.Snapshot
	var stateBytes []byte
	err := p.pool.QueryRow(ctx, query, roomID).Scan(&snap.RoomID, &snap.Seq, &snap.Phase, &stateBytes, &snap.Timestamp)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, event.ErrSnapshotNotFound
		}
		return nil, fmt.Errorf("failed to query latest snapshot: %w", err)
	}
	snap.StateBlob = stateBytes
	return &snap, nil
}
