package store

import (
	"context"
	"fmt"
	"io/fs"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manovaspace/gub/server/migrations"
)

// migrationLockKey is the Postgres advisory lock key that serializes migration
// runs across all server nodes sharing one database.
const migrationLockKey int64 = 727361001

// Migrate applies every embedded migration that is not yet recorded in
// schema_migrations. Each file runs in its own transaction together with its
// record. Concurrent callers (for example several nodes starting at once) are
// serialized by a session-level advisory lock, so each file runs once.
func Migrate(ctx context.Context, pool *pgxpool.Pool) error {
	conn, err := pool.Acquire(ctx)
	if err != nil {
		return fmt.Errorf("failed to acquire migration connection: %w", err)
	}
	defer conn.Release()

	if _, err := conn.Exec(ctx, "SELECT pg_advisory_lock($1)", migrationLockKey); err != nil {
		return fmt.Errorf("failed to take migration lock: %w", err)
	}
	defer func() {
		if _, err := conn.Exec(context.Background(), "SELECT pg_advisory_unlock($1)", migrationLockKey); err != nil {
			// The session may still hold the lock. Close the connection so the
			// lock is released and the pool never hands out a locked session.
			_ = conn.Conn().Close(context.Background())
		}
	}()

	if _, err := conn.Exec(ctx, `CREATE TABLE IF NOT EXISTS schema_migrations (
		version TEXT PRIMARY KEY,
		applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
	)`); err != nil {
		return fmt.Errorf("failed to create schema_migrations: %w", err)
	}

	applied, err := appliedMigrations(ctx, conn.Conn())
	if err != nil {
		return err
	}

	entries, err := fs.ReadDir(migrations.FS, ".")
	if err != nil {
		return fmt.Errorf("failed to list migrations: %w", err)
	}
	// fs.ReadDir returns entries sorted by name, which is the apply order.
	for _, entry := range entries {
		name := entry.Name()
		if entry.IsDir() || !strings.HasSuffix(name, ".sql") || applied[name] {
			continue
		}
		if err := applyMigration(ctx, conn.Conn(), name); err != nil {
			return err
		}
	}
	return nil
}

func appliedMigrations(ctx context.Context, conn *pgx.Conn) (map[string]bool, error) {
	rows, err := conn.Query(ctx, "SELECT version FROM schema_migrations")
	if err != nil {
		return nil, fmt.Errorf("failed to read schema_migrations: %w", err)
	}
	defer rows.Close()

	applied := make(map[string]bool)
	for rows.Next() {
		var version string
		if err := rows.Scan(&version); err != nil {
			return nil, fmt.Errorf("failed to scan schema_migrations: %w", err)
		}
		applied[version] = true
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("failed to read schema_migrations: %w", err)
	}
	return applied, nil
}

func applyMigration(ctx context.Context, conn *pgx.Conn, name string) error {
	sql, err := fs.ReadFile(migrations.FS, name)
	if err != nil {
		return fmt.Errorf("failed to read migration %s: %w", name, err)
	}

	tx, err := conn.Begin(ctx)
	if err != nil {
		return fmt.Errorf("failed to begin migration %s: %w", name, err)
	}
	defer tx.Rollback(ctx)

	// Exec without arguments uses the simple protocol, so a file may hold
	// several statements.
	if _, err := tx.Exec(ctx, string(sql)); err != nil {
		return fmt.Errorf("failed to apply migration %s: %w", name, err)
	}
	if _, err := tx.Exec(ctx, "INSERT INTO schema_migrations (version) VALUES ($1)", name); err != nil {
		return fmt.Errorf("failed to record migration %s: %w", name, err)
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("failed to commit migration %s: %w", name, err)
	}
	return nil
}
