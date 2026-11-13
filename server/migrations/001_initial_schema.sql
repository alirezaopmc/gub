-- 001_initial_schema.sql
-- GUB platform core schema (Postgres)

CREATE TABLE IF NOT EXISTS rooms (
    id VARCHAR(64) PRIMARY KEY,
    code VARCHAR(16) NOT NULL UNIQUE,
    game_id VARCHAR(64) NOT NULL,
    config JSONB NOT NULL DEFAULT '{}'::jsonb,
    seed BIGINT NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'lobby',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS room_members (
    id VARCHAR(64) PRIMARY KEY,
    room_id VARCHAR(64) NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    seat INT NOT NULL DEFAULT -1,
    role VARCHAR(32) NOT NULL DEFAULT 'player',
    name VARCHAR(128) NOT NULL,
    token_hash VARCHAR(64) NOT NULL UNIQUE,
    connected BOOLEAN NOT NULL DEFAULT FALSE,
    last_seen TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_room_members_room ON room_members(room_id);
CREATE INDEX IF NOT EXISTS idx_room_members_token ON room_members(token_hash);

CREATE TABLE IF NOT EXISTS room_events (
    room_id VARCHAR(64) NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    seq BIGINT NOT NULL,
    type VARCHAR(64) NOT NULL,
    actor JSONB NOT NULL DEFAULT '{}'::jsonb,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (room_id, seq)
);

CREATE INDEX IF NOT EXISTS idx_room_events_room_seq ON room_events(room_id, seq ASC);

CREATE TABLE IF NOT EXISTS room_snapshots (
    room_id VARCHAR(64) NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    seq BIGINT NOT NULL,
    phase VARCHAR(64) NOT NULL DEFAULT '',
    state_blob JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (room_id, seq)
);

CREATE TABLE IF NOT EXISTS room_leases (
    room_id VARCHAR(64) PRIMARY KEY REFERENCES rooms(id) ON DELETE CASCADE,
    owner_node VARCHAR(128) NOT NULL,
    epoch BIGINT NOT NULL DEFAULT 1,
    lease_expiry TIMESTAMPTZ NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS matches_summary (
    id VARCHAR(64) PRIMARY KEY,
    room_id VARCHAR(64) NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
    game_id VARCHAR(64) NOT NULL,
    results JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
