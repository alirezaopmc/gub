package session

import (
	"context"
	"encoding/json"
	"errors"
)

// ErrRoomCodeTaken is returned by a Repository when the join code is already used
// by another room. CreateRoom draws a new code and tries again.
var ErrRoomCodeTaken = errors.New("room code already taken")

// Repository persists rooms and members so that any node can serve a room. A nil
// Repository on the Manager keeps all state in memory only.
//
// Load methods return ErrRoomNotFound or ErrInvalidToken when no row matches.
type Repository interface {
	// SaveRoom inserts a room or updates its mutable fields. The config and seed
	// are stored once, at creation. A nil config is stored as JSON null.
	SaveRoom(ctx context.Context, rs *RoomSession, config json.RawMessage, seed int64) error
	// SaveMember inserts a member or updates its mutable fields. The room row must exist.
	SaveMember(ctx context.Context, member *Member) error
	// SetStarted records whether the room's player roster is locked.
	SetStarted(ctx context.Context, roomID string, started bool) error
	// LoadRoomByCode returns the room with its members, plus its config and seed.
	LoadRoomByCode(ctx context.Context, code string) (*RoomSession, json.RawMessage, int64, error)
	// LoadRoomByID returns the room with its members, plus its config and seed.
	LoadRoomByID(ctx context.Context, roomID string) (*RoomSession, json.RawMessage, int64, error)
	// LoadMemberByTokenHash returns the member that owns the token hash.
	LoadMemberByTokenHash(ctx context.Context, tokenHash string) (*Member, error)
	// DeleteRoom removes the room and its members. Deleting a missing room is not an error.
	DeleteRoom(ctx context.Context, roomID string) error
}
