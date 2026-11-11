package connectfour_test

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/manovaspace/gub/server/core/event"
	"github.com/manovaspace/gub/server/core/game"
	"github.com/manovaspace/gub/server/core/room"
	"github.com/manovaspace/gub/server/games/connectfour"
)

// cfMoves is a scripted game in which seat 0 wins with a vertical four in column 0.
var cfMoves = []int{0, 1, 0, 1, 0, 1, 0}

func cfActor(seat int) game.Actor {
	return game.Actor{ID: "p", Seat: seat, Role: game.RolePlayer}
}

func cfDrop(t *testing.T, column int) game.Command {
	t.Helper()
	raw, err := json.Marshal(map[string]int{"column": column})
	if err != nil {
		t.Fatalf("encode: %v", err)
	}
	return game.Command{Type: "drop_disc", Payload: raw}
}

func cfJSON(t *testing.T, v any) string {
	t.Helper()
	b, err := json.Marshal(v)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	return string(b)
}

// TestConnectFourSnapshotRoundTrip snapshots after every possible number of
// moves, restores the snapshot and plays the rest on both copies.
func TestConnectFourSnapshotRoundTrip(t *testing.T) {
	for split := 0; split <= len(cfMoves); split++ {
		g := &connectfour.ConnectFourGame{}
		orig, err := g.Setup(nil, 1, []int{0, 1})
		if err != nil {
			t.Fatalf("setup: %v", err)
		}
		a := orig.(*connectfour.State)

		for i := 0; i < split; i++ {
			if _, err := g.Apply(a, cfActor(i%2), cfDrop(t, cfMoves[i])); err != nil {
				t.Fatalf("split %d: apply %d: %v", split, i, err)
			}
		}

		blob, err := json.Marshal(a)
		if err != nil {
			t.Fatalf("snapshot: %v", err)
		}
		restored, err := g.UnmarshalState(blob)
		if err != nil {
			t.Fatalf("unmarshal: %v", err)
		}
		b := restored.(*connectfour.State)

		for i := split; i < len(cfMoves); i++ {
			actor, cmd := cfActor(i%2), cfDrop(t, cfMoves[i])
			evA, errA := g.Apply(a, actor, cmd)
			evB, errB := g.Apply(b, actor, cmd)
			if (errA == nil) != (errB == nil) {
				t.Fatalf("split %d move %d: error mismatch %v vs %v", split, i, errA, errB)
			}
			if cfJSON(t, evA) != cfJSON(t, evB) {
				t.Fatalf("split %d move %d: events differ", split, i)
			}
			if cfJSON(t, a) != cfJSON(t, b) {
				t.Fatalf("split %d move %d: state differs", split, i)
			}
		}

		if !g.IsOver(a) || !g.IsOver(b) {
			t.Fatalf("split %d: expected game over", split)
		}
	}
}

// TestConnectFourRoomReplayFromLog plays scripted moves through a Room backed by
// a MemStore, rebuilds a second Room from the same store and compares views.
// A high snapshot interval rebuilds from the command log alone. A low interval
// rebuilds from a snapshot, including the game-over snapshot.
func TestConnectFourRoomReplayFromLog(t *testing.T) {
	tests := []struct {
		name     string
		moves    int
		interval int64
	}{
		{"log only, mid game", 3, 100000},
		{"log only, one move short of the win", 6, 100000},
		{"game over with snapshot at the win", len(cfMoves), 100000},
		{"frequent snapshots", len(cfMoves), 2},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctx := context.Background()
			store := event.NewMemStore()
			const roomID = "c4-replay"

			rm1, err := room.New(room.Config{ID: roomID, Game: &connectfour.ConnectFourGame{}, Store: store, SnapshotInterval: tt.interval})
			if err != nil {
				t.Fatalf("room: %v", err)
			}
			if err := rm1.Start(ctx, []int{0, 1}, nil, 1); err != nil {
				t.Fatalf("start: %v", err)
			}
			for i := 0; i < tt.moves; i++ {
				if err := rm1.Dispatch(ctx, cfActor(i%2), cfDrop(t, cfMoves[i])); err != nil {
					t.Fatalf("dispatch %d: %v", i, err)
				}
			}

			rm2, err := room.New(room.Config{ID: roomID, Game: &connectfour.ConnectFourGame{}, Store: store, SnapshotInterval: tt.interval})
			if err != nil {
				t.Fatalf("rebuild: %v", err)
			}
			defer rm2.Close()

			v1, err := rm1.View(ctx, game.Audience{Seat: 0, Role: game.RolePlayer})
			if err != nil {
				t.Fatalf("view original: %v", err)
			}
			v2, err := rm2.View(ctx, game.Audience{Seat: 0, Role: game.RolePlayer})
			if err != nil {
				t.Fatalf("view rebuilt: %v", err)
			}
			if cfJSON(t, v1) != cfJSON(t, v2) {
				t.Errorf("view differs after rebuild:\noriginal: %s\nrebuilt:  %s", cfJSON(t, v1), cfJSON(t, v2))
			}
			rm1.Close()
		})
	}
}
