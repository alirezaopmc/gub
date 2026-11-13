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
	"github.com/manovaspace/gub/server/core/game"
	"github.com/manovaspace/gub/server/core/session"
)

const (
	roomCodeConstraint = "rooms_code_key"
	seatConstraint     = "uq_room_members_seat"
)

// PostgresSessionRepo implements session.Repository on the rooms and room_members tables.
type PostgresSessionRepo struct {
	pool *pgxpool.Pool
}

var _ session.Repository = (*PostgresSessionRepo)(nil)

func NewPostgresSessionRepo(pool *pgxpool.Pool) *PostgresSessionRepo {
	return &PostgresSessionRepo{pool: pool}
}

func (r *PostgresSessionRepo) SaveRoom(ctx context.Context, rs *session.RoomSession, config json.RawMessage, seed int64) error {
	// The config column is NOT NULL JSONB. A nil config is stored as JSON null
	// and read back as nil.
	cfg := []byte(config)
	if len(cfg) == 0 {
		cfg = []byte("null")
	}

	_, err := r.pool.Exec(ctx, `
		INSERT INTO rooms (id, code, game_id, config, seed, started, max_players, host_member_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		ON CONFLICT (id) DO UPDATE SET
			started = EXCLUDED.started,
			max_players = EXCLUDED.max_players,
			host_member_id = EXCLUDED.host_member_id,
			updated_at = NOW()`,
		rs.ID, rs.Code, rs.GameID, cfg, seed, rs.Started, rs.MaxPlayers, rs.HostMember)
	if isUniqueViolation(err, roomCodeConstraint) {
		return session.ErrRoomCodeTaken
	}
	if err != nil {
		return fmt.Errorf("failed to save room: %w", err)
	}
	return nil
}

func (r *PostgresSessionRepo) SaveMember(ctx context.Context, m *session.Member) error {
	_, err := r.pool.Exec(ctx, `
		INSERT INTO room_members (id, room_id, seat, role, name, token_hash, connected, last_seen)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		ON CONFLICT (id) DO UPDATE SET
			seat = EXCLUDED.seat,
			role = EXCLUDED.role,
			name = EXCLUDED.name,
			connected = EXCLUDED.connected,
			last_seen = EXCLUDED.last_seen`,
		m.ID, m.RoomID, m.Seat, string(m.Role), m.Name, m.TokenHash, m.Connected, m.LastSeen)
	if isUniqueViolation(err, seatConstraint) {
		return session.ErrSeatOccupied
	}
	if err != nil {
		return fmt.Errorf("failed to save member: %w", err)
	}
	return nil
}

func (r *PostgresSessionRepo) SetStarted(ctx context.Context, roomID string, started bool) error {
	// Locking the roster is compare-and-set so two nodes cannot both start a room.
	query := `UPDATE rooms SET started = $2, updated_at = NOW() WHERE id = $1`
	if started {
		query += ` AND started = FALSE`
	}
	tag, err := r.pool.Exec(ctx, query, roomID, started)
	if err != nil {
		return fmt.Errorf("failed to set started: %w", err)
	}
	if tag.RowsAffected() == 0 {
		var exists bool
		if err := r.pool.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM rooms WHERE id = $1)`, roomID).Scan(&exists); err != nil {
			return fmt.Errorf("failed to check room: %w", err)
		}
		if exists {
			return session.ErrRoomStarted
		}
		return session.ErrRoomNotFound
	}
	return nil
}

func (r *PostgresSessionRepo) LoadRoomByCode(ctx context.Context, code string) (*session.RoomSession, json.RawMessage, int64, error) {
	return r.loadRoom(ctx, `WHERE code = $1`, code)
}

func (r *PostgresSessionRepo) LoadRoomByID(ctx context.Context, roomID string) (*session.RoomSession, json.RawMessage, int64, error) {
	return r.loadRoom(ctx, `WHERE id = $1`, roomID)
}

func (r *PostgresSessionRepo) loadRoom(ctx context.Context, where string, arg any) (*session.RoomSession, json.RawMessage, int64, error) {
	var (
		rs     session.RoomSession
		cfgRaw []byte
		seed   int64
	)
	err := r.pool.QueryRow(ctx, `
		SELECT id, code, game_id, config, seed, started, max_players, COALESCE(host_member_id, '')
		FROM rooms `+where, arg).
		Scan(&rs.ID, &rs.Code, &rs.GameID, &cfgRaw, &seed, &rs.Started, &rs.MaxPlayers, &rs.HostMember)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, nil, 0, session.ErrRoomNotFound
	}
	if err != nil {
		return nil, nil, 0, fmt.Errorf("failed to load room: %w", err)
	}

	rs.Members = make(map[string]*session.Member)
	rs.Seats = make(map[int]string)

	rows, err := r.pool.Query(ctx, `
		SELECT id, room_id, seat, role, name, token_hash, connected, last_seen
		FROM room_members WHERE room_id = $1`, rs.ID)
	if err != nil {
		return nil, nil, 0, fmt.Errorf("failed to load room members: %w", err)
	}
	defer rows.Close()
	for rows.Next() {
		var m session.Member
		var role string
		var seenAt time.Time
		if err := rows.Scan(&m.ID, &m.RoomID, &m.Seat, &role, &m.Name, &m.TokenHash, &m.Connected, &seenAt); err != nil {
			return nil, nil, 0, fmt.Errorf("failed to scan room member: %w", err)
		}
		m.Role = game.Role(role)
		m.LastSeen = seenAt
		rs.Members[m.ID] = &m
		if m.Seat >= 0 {
			rs.Seats[m.Seat] = m.ID
		}
	}
	if err := rows.Err(); err != nil {
		return nil, nil, 0, fmt.Errorf("failed to read room members: %w", err)
	}

	var config json.RawMessage
	if string(cfgRaw) != "null" {
		config = cfgRaw
	}
	return &rs, config, seed, nil
}

func (r *PostgresSessionRepo) LoadMemberByTokenHash(ctx context.Context, tokenHash string) (*session.Member, error) {
	var m session.Member
	var role string
	var seenAt time.Time
	err := r.pool.QueryRow(ctx, `
		SELECT id, room_id, seat, role, name, token_hash, connected, last_seen
		FROM room_members WHERE token_hash = $1`, tokenHash).
		Scan(&m.ID, &m.RoomID, &m.Seat, &role, &m.Name, &m.TokenHash, &m.Connected, &seenAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, session.ErrInvalidToken
	}
	if err != nil {
		return nil, fmt.Errorf("failed to load member: %w", err)
	}
	m.Role = game.Role(role)
	m.LastSeen = seenAt
	return &m, nil
}

func (r *PostgresSessionRepo) DeleteRoom(ctx context.Context, roomID string) error {
	if _, err := r.pool.Exec(ctx, `DELETE FROM rooms WHERE id = $1`, roomID); err != nil {
		return fmt.Errorf("failed to delete room: %w", err)
	}
	return nil
}

// isUniqueViolation reports whether err is a unique violation on the named constraint.
func isUniqueViolation(err error, constraint string) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505" && pgErr.ConstraintName == constraint
}
