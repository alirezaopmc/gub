package arena_test

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/manovaspace/gub/server/core/game"
	"github.com/manovaspace/gub/server/games/arena"
)

func arenaJSON(t *testing.T, v any) string {
	t.Helper()
	b, err := json.Marshal(v)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	return string(b)
}

// arenaStep applies one scripted velocity change every few ticks, then ticks.
// Coins respawn through the RNG, so a restored RNG must match the original.
func arenaStep(t *testing.T, g *arena.ArenaGame, s *arena.State, i int) {
	t.Helper()
	if i%7 == 0 {
		seat := i % 3
		raw, _ := json.Marshal(map[string]float64{
			"vx": float64(i%5-2) * 120,
			"vy": float64(i%3-1) * 150,
		})
		cmd := game.Command{Type: "set_velocity", Payload: raw}
		if _, err := g.Apply(s, game.Actor{ID: "p", Seat: seat, Role: game.RolePlayer}, cmd); err != nil {
			t.Fatalf("set_velocity at step %d: %v", i, err)
		}
	}
	if _, err := g.Tick(s, 50*time.Millisecond); err != nil {
		t.Fatalf("tick at step %d: %v", i, err)
	}
}

func TestArenaSnapshotRoundTrip(t *testing.T) {
	tests := []struct {
		name    string
		splitAt int
	}{
		{"snapshot at start", 0},
		{"snapshot mid match", 150},
		{"snapshot after many ticks", 600},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			g := &arena.ArenaGame{}
			cfg := []byte(`{"maxSpeed": 300, "targetCoins": 1000, "timeLimitSec": 1000, "maxCoins": 5}`)
			orig, err := g.Setup(cfg, 4242, []int{0, 1, 2})
			if err != nil {
				t.Fatalf("setup: %v", err)
			}
			a := orig.(*arena.State)

			for i := 0; i < tt.splitAt; i++ {
				arenaStep(t, g, a, i)
			}

			blob, err := json.Marshal(a)
			if err != nil {
				t.Fatalf("snapshot: %v", err)
			}
			restored, err := g.UnmarshalState(blob)
			if err != nil {
				t.Fatalf("unmarshal: %v", err)
			}
			b := restored.(*arena.State)

			if arenaJSON(t, a) != arenaJSON(t, b) {
				t.Fatal("restored state differs right after restore")
			}
			// Draws from the restored RNG must match the original's draws.
			for k := 0; k < 5; k++ {
				if x, y := a.RNG.Float64(), b.RNG.Float64(); x != y {
					t.Fatalf("restored RNG draw %d differs: %v vs %v", k, x, y)
				}
			}

			for i := tt.splitAt; i < tt.splitAt+1500; i++ {
				arenaStep(t, g, a, i)
				arenaStep(t, g, b, i)
				if arenaJSON(t, a) != arenaJSON(t, b) {
					t.Fatalf("state differs at step %d", i)
				}
			}

		})
	}
}
