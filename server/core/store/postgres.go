package store

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manovaspace/gub/server/core/event"
)

type PostgresStore struct {
	pool *pgxpool.Pool
}

func NewPostgresStore(pool *pgxpool.Pool) *PostgresStore {
	return &PostgresStore{pool: pool}
}

func (p *PostgresStore) AppendEvents(ctx context.Context, roomID string, expectedSeq int64, events []event.StoredEvent) error {
	if len(events) == 0 {
		return nil
	}

	tx, err := p.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

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
