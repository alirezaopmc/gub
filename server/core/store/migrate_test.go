package store

import (
	"context"
	"io/fs"
	"sync"
	"testing"

	"github.com/manovaspace/gub/server/migrations"
)

func TestMigrateIdempotentAndConcurrent(t *testing.T) {
	pool := openTestDB(t, false)
	ctx := context.Background()

	// Several callers race on an empty schema. The advisory lock makes each
	// file run once, and no caller fails.
	const callers = 4
	var wg sync.WaitGroup
	errs := make(chan error, callers)
	for i := 0; i < callers; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			errs <- Migrate(ctx, pool)
		}()
	}
	wg.Wait()
	close(errs)
	for err := range errs {
		if err != nil {
			t.Fatalf("concurrent migrate: %v", err)
		}
	}

	// A later run finds everything applied and changes nothing.
	if err := Migrate(ctx, pool); err != nil {
		t.Fatalf("second migrate: %v", err)
	}

	files, err := fs.Glob(migrations.FS, "*.sql")
	if err != nil {
		t.Fatalf("glob: %v", err)
	}
	var recorded int
	if err := pool.QueryRow(ctx, "SELECT COUNT(*) FROM schema_migrations").Scan(&recorded); err != nil {
		t.Fatalf("count: %v", err)
	}
	if recorded != len(files) {
		t.Fatalf("recorded %d migrations, want %d", recorded, len(files))
	}

	var hasStarted int
	if err := pool.QueryRow(ctx, `SELECT COUNT(*) FROM information_schema.columns
		WHERE table_schema = current_schema() AND table_name = 'rooms' AND column_name = 'started'`).Scan(&hasStarted); err != nil {
		t.Fatalf("columns: %v", err)
	}
	if hasStarted != 1 {
		t.Fatalf("rooms.started missing after migration 002")
	}

	var hasSeatIndex int
	if err := pool.QueryRow(ctx, `SELECT COUNT(*) FROM pg_indexes
		WHERE schemaname = current_schema() AND indexname = 'uq_room_members_seat'`).Scan(&hasSeatIndex); err != nil {
		t.Fatalf("indexes: %v", err)
	}
	if hasSeatIndex != 1 {
		t.Fatalf("uq_room_members_seat missing after migration 002")
	}
}
