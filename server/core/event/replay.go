package event

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"

	"github.com/manovaspace/gub/server/core/game"
)

// RoomStartedType is the Type of the first log record of every started room.
// Its payload is a RoomStartedPayload. The record is the persistent copy of
// the seats, game config and seed that Game.Setup was called with.
const RoomStartedType = "room_started"

// RoomStartedPayload is the payload of the room_started log record.
type RoomStartedPayload struct {
	Seats  []int           `json:"seats"`
	Config json.RawMessage `json:"config"`
	Seed   int64           `json:"seed"`
}

// StateUnmarshaler is implemented by games whose state can be restored from a snapshot blob.
type StateUnmarshaler interface {
	UnmarshalState(data []byte) (game.State, error)
}

// Replay rebuilds the state of a room from its store.
//
// The log holds commands, not events: every record after room_started is a
// command (Type = command type, Payload = raw command payload, Actor = the
// actor that issued it). Replay restores the latest snapshot when the game
// implements StateUnmarshaler, otherwise it calls Setup from the room_started
// record. It then re-applies the commands after the snapshot seq through
// Validate and Apply.
//
// It returns a nil state and seq 0 when the log is empty, which means the room
// is still in the lobby.
func Replay(ctx context.Context, store Store, roomID string, g game.Game) (game.State, int64, error) {
	var state game.State
	var afterSeq int64

	snap, err := store.GetLatestSnapshot(ctx, roomID)
	switch {
	case err == nil && snap != nil:
		if unmarshaler, ok := g.(StateUnmarshaler); ok {
			s, err := unmarshaler.UnmarshalState(snap.StateBlob)
			if err != nil {
				return nil, 0, fmt.Errorf("failed to unmarshal snapshot state: %w", err)
			}
			state = s
			afterSeq = snap.Seq
		}
	case err != nil && !errors.Is(err, ErrSnapshotNotFound):
		return nil, 0, fmt.Errorf("failed to load snapshot: %w", err)
	}

	events, err := store.GetEvents(ctx, roomID, afterSeq, 0)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get events for replay: %w", err)
	}

	lastSeq := afterSeq
	if state == nil {
		if len(events) == 0 {
			return nil, 0, nil // lobby
		}
		first := events[0]
		if first.Type != RoomStartedType {
			return nil, 0, fmt.Errorf("log of room %s starts with %q, expected %q", roomID, first.Type, RoomStartedType)
		}
		var started RoomStartedPayload
		if err := json.Unmarshal(first.Payload, &started); err != nil {
			return nil, 0, fmt.Errorf("failed to decode room_started payload: %w", err)
		}
		s, err := g.Setup(started.Config, started.Seed, started.Seats)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to setup game: %w", err)
		}
		state = s
		lastSeq = first.Seq
		events = events[1:]
	}

	for _, ev := range events {
		if ev.Type == RoomStartedType {
			lastSeq = ev.Seq
			continue
		}
		cmd := game.Command{
			Type:    ev.Type,
			Payload: ev.Payload,
		}
		if err := g.Validate(state, ev.Actor, cmd); err != nil {
			return nil, 0, fmt.Errorf("failed to validate command seq %d (%s): %w", ev.Seq, ev.Type, err)
		}
		if _, err := g.Apply(state, ev.Actor, cmd); err != nil {
			return nil, 0, fmt.Errorf("failed to apply command seq %d (%s): %w", ev.Seq, ev.Type, err)
		}
		lastSeq = ev.Seq
	}

	return state, lastSeq, nil
}
