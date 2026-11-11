package store

import (
	"context"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manovaspace/gub/server/core/session"
)

// openTestDB returns a pool whose search_path is a fresh schema. The schema is
// dropped when the test ends. Without TEST_DATABASE_URL the test is skipped.
func openTestDB(t *testing.T, migrate bool) *pgxpool.Pool {
	t.Helper()
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL not set; skipping database test")
	}

	ctx := context.Background()
	schema := "gub_test_" + strings.ReplaceAll(uuid.NewString(), "-", "")

	admin, err := pgxpool.New(ctx, url)
	if err != nil {
		t.Fatalf("connect: %v", err)
	}
	if _, err := admin.Exec(ctx, `CREATE SCHEMA "`+schema+`"`); err != nil {
		admin.Close()
		t.Fatalf("create schema: %v", err)
	}
	t.Cleanup(func() {
		_, _ = admin.Exec(context.Background(), `DROP SCHEMA IF EXISTS "`+schema+`" CASCADE`)
		admin.Close()
	})

	cfg, err := pgxpool.ParseConfig(url)
	if err != nil {
		t.Fatalf("parse TEST_DATABASE_URL: %v", err)
	}
	if cfg.ConnConfig.RuntimeParams == nil {
		cfg.ConnConfig.RuntimeParams = make(map[string]string)
	}
	cfg.ConnConfig.RuntimeParams["search_path"] = schema
	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		t.Fatalf("connect with schema: %v", err)
	}
	t.Cleanup(pool.Close)

	if migrate {
		if err := Migrate(ctx, pool); err != nil {
			t.Fatalf("migrate: %v", err)
		}
	}
	return pool
}

// newTestRoom inserts a rooms row through the session repository and returns its ID.
func newTestRoom(t *testing.T, pool *pgxpool.Pool) string {
	t.Helper()
	rs := &session.RoomSession{
		ID:         uuid.NewString(),
		Code:       session.GenerateJoinCode(),
		GameID:     "test-game",
		MaxPlayers: 4,
		Members:    map[string]*session.Member{},
		Seats:      map[int]string{},
	}
	if err := NewPostgresSessionRepo(pool).SaveRoom(context.Background(), rs, nil, 0); err != nil {
		t.Fatalf("save room: %v", err)
	}
	return rs.ID
}

func testTimestamp() time.Time {
	return time.Now().UTC().Truncate(time.Microsecond)
}
