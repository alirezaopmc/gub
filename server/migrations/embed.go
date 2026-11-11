// Package migrations embeds the SQL migration files applied by store.Migrate.
package migrations

import "embed"

// FS holds every *.sql file in this directory. Files are applied in name order.
//
//go:embed *.sql
var FS embed.FS
