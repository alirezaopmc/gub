-- 002_room_state.sql
-- Room state needed to rehydrate a lobby room on another node or after a restart.

ALTER TABLE rooms ADD COLUMN IF NOT EXISTS started BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS max_players INT NOT NULL DEFAULT 0;
ALTER TABLE rooms ADD COLUMN IF NOT EXISTS host_member_id VARCHAR(64);

-- A seat is held by at most one member. Viewers use seat -1 and are not constrained.
CREATE UNIQUE INDEX IF NOT EXISTS uq_room_members_seat
    ON room_members (room_id, seat)
    WHERE seat >= 0;
