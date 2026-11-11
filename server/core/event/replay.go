package event

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/manovaspace/gub/server/core/game"
)

type StateUnmarshaler interface {
	UnmarshalState(data []byte) (game.State, error)
}

func Replay(
	ctx context.Context,
	store Store,
	roomID string,
	g game.Game,
	setupConfig json.RawMessage,
	seed int64,
	playerSeats []int,
) (game.State, int64, error) {
	var state game.State
	var afterSeq int64 = 0

	snap, err := store.GetLatestSnapshot(ctx, roomID)
	if err == nil && snap != nil {
		if unmarshaler, ok := g.(StateUnmarshaler); ok {
			s, err := unmarshaler.UnmarshalState(snap.StateBlob)
			if err != nil {
				return nil, 0, fmt.Errorf("failed to unmarshal snapshot state: %w", err)
			}
			state = s
			afterSeq = snap.Seq
		}
	}

	if state == nil {
		s, err := g.Setup(setupConfig, seed, playerSeats)
		if err != nil {
			return nil, 0, fmt.Errorf("failed to setup game: %w", err)
		}
		state = s
		afterSeq = 0
	}

	events, err := store.GetEvents(ctx, roomID, afterSeq, 0)
	if err != nil {
		return nil, 0, fmt.Errorf("failed to get events for replay: %w", err)
	}

	lastSeq := afterSeq
	for _, ev := range events {
		cmd := game.Command{
			Type:    ev.Type,
			Payload: ev.Payload,
		}
		if _, err := g.Apply(state, ev.Actor, cmd); err != nil {
			return nil, 0, fmt.Errorf("failed to apply event seq %d (%s): %w", ev.Seq, ev.Type, err)
		}
		lastSeq = ev.Seq
	}

	return state, lastSeq, nil
}
