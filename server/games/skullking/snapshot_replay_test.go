package skullking_test

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/manovaspace/gub/server/core/event"
	"github.com/manovaspace/gub/server/core/game"
	"github.com/manovaspace/gub/server/core/room"
	"github.com/manovaspace/gub/server/games/skullking"
)

func skSeats(n int) []int {
	seats := make([]int, n)
	for i := range seats {
		seats[i] = i
	}
	return seats
}

func skPlayer(seat int) game.Actor {
	return game.Actor{ID: "p", Seat: seat, Role: game.RolePlayer}
}

func skCmd(t *testing.T, cmdType string, payload any) game.Command {
	t.Helper()
	raw, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("encode %s payload: %v", cmdType, err)
	}
	return game.Command{Type: cmdType, Payload: raw}
}

// skNextMove picks the next scripted move from a state. It returns false when
// the match is over. Moves are deterministic: every seat bids, then every seat
// plays its first legal card, and the scoring phase is confirmed by seat 0.
func skNextMove(t *testing.T, st *skullking.MatchState) (game.Actor, game.Command, bool) {
	t.Helper()
	n := st.Config.PlayerCount
	switch st.Phase {
	case "bidding":
		for seat := 0; seat < n; seat++ {
			if st.Bids[seat] == nil {
				bid := seat % 2
				if bid > st.HandSize {
					bid = st.HandSize
				}
				return skPlayer(seat), skCmd(t, "submit_bid", map[string]any{"bid": bid}), true
			}
		}
	case "playing":
		seat := skTurnSeat(st.CurrentTrick, st.TrickLeaderIndex, n, st.Config.TwoPlayerGhost)
		if seat < 0 || seat >= n {
			t.Fatalf("seat %d is the ghost but the ghost should have auto-played", seat)
		}
		legal := skullking.GetLegalCards(st.Hands[seat], st.CurrentTrick, st.Config.RuleFlags)
		if len(legal) == 0 {
			t.Fatalf("seat %d has no legal card", seat)
		}
		return skPlayer(seat), skCmd(t, "play_card", map[string]any{"cardId": legal[0].ID}), true
	case "scoring":
		return skPlayer(0), skCmd(t, "confirm_round", map[string]any{}), true
	}
	return game.Actor{}, game.Command{}, false
}

func mustJSON(t *testing.T, v any) string {
	t.Helper()
	b, err := json.Marshal(v)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	return string(b)
}

// TestSkullKingSnapshotRoundTrip plays part of a match, snapshots it through
// json.Marshal, restores it with UnmarshalState and plays the rest on both
// copies. Events, views and the full state (including RNG state and every
// dealt hand) must match after every command.
func TestSkullKingSnapshotRoundTrip(t *testing.T) {
	tests := []struct {
		name    string
		players int
		split   int // commands played before the snapshot
	}{
		{"2 players at start", 2, 0},
		{"2 players mid bidding", 2, 1},
		{"2 players mid play", 2, 5},
		{"3 players mid round", 3, 9},
		{"3 players after several rounds", 3, 60},
		{"5 players mid play", 5, 31},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			g := &skullking.SkullKingGame{}
			orig, err := g.Setup(nil, 987654321, skSeats(tt.players))
			if err != nil {
				t.Fatalf("setup: %v", err)
			}
			a := orig.(*skullking.MatchState)

			for i := 0; i < tt.split; i++ {
				actor, cmd, ok := skNextMove(t, a)
				if !ok {
					t.Fatalf("match ended before split at %d", i)
				}
				if _, err := g.Apply(a, actor, cmd); err != nil {
					t.Fatalf("apply %d: %v", i, err)
				}
			}

			blob, err := json.Marshal(a)
			if err != nil {
				t.Fatalf("snapshot marshal: %v", err)
			}
			restored, err := g.UnmarshalState(blob)
			if err != nil {
				t.Fatalf("unmarshal state: %v", err)
			}
			b := restored.(*skullking.MatchState)

			if mustJSON(t, a) != mustJSON(t, b) {
				t.Fatal("restored state differs from original right after restore")
			}

			steps := 0
			for {
				actor, cmd, ok := skNextMove(t, a)
				if !ok {
					break
				}
				if err := g.Validate(a, actor, cmd); err != nil {
					t.Fatalf("step %d validate: %v", steps, err)
				}
				evA, err := g.Apply(a, actor, cmd)
				if err != nil {
					t.Fatalf("step %d apply original: %v", steps, err)
				}
				evB, err := g.Apply(b, actor, cmd)
				if err != nil {
					t.Fatalf("step %d apply restored: %v", steps, err)
				}
				if mustJSON(t, evA) != mustJSON(t, evB) {
					t.Fatalf("step %d events differ", steps)
				}
				for seat := 0; seat < tt.players; seat++ {
					va, _ := g.View(a, game.Audience{Seat: seat, Role: game.RolePlayer})
					vb, _ := g.View(b, game.Audience{Seat: seat, Role: game.RolePlayer})
					if mustJSON(t, va) != mustJSON(t, vb) {
						t.Fatalf("step %d view for seat %d differs", steps, seat)
					}
				}
				if mustJSON(t, a) != mustJSON(t, b) {
					t.Fatalf("step %d full state differs", steps)
				}
				steps++
			}

			if steps == 0 {
				t.Fatal("no moves were played after the snapshot")
			}
			if !g.IsOver(a) || !g.IsOver(b) {
				t.Fatalf("match did not reach game over, phase %q", a.Phase)
			}
		})
	}
}

// TestSkullKingRoomReplayFromLog plays a scripted match through a Room backed
// by a MemStore, then rebuilds a second Room from the same store and checks
// that both rooms have identical views. Cases with a high snapshot interval
// rebuild from the command log alone. Cases with a low interval rebuild from a
// snapshot plus the commands after it.
func TestSkullKingRoomReplayFromLog(t *testing.T) {
	tests := []struct {
		name     string
		players  int
		maxMoves int // 0 means play to the end of the match
		interval int64
	}{
		{"log only, 2 players", 2, 6, 100000},
		{"log only, 3 players across a round boundary", 3, 30, 100000},
		{"full match, snapshot at game over", 3, 0, 100000},
		{"full match, frequent snapshots", 3, 0, 7},
		{"two-player Graybeard full match", 2, 0, 100000},
		{"two-player Graybeard, frequent snapshots", 2, 0, 5},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ctx := context.Background()
			store := event.NewMemStore()
			const roomID = "skull-replay"

			rm1, err := room.New(room.Config{ID: roomID, Game: &skullking.SkullKingGame{}, Store: store, SnapshotInterval: tt.interval})
			if err != nil {
				t.Fatalf("room: %v", err)
			}
			if err := rm1.Start(ctx, skSeats(tt.players), nil, 20260101); err != nil {
				t.Fatalf("start: %v", err)
			}

			moves := 0
			for tt.maxMoves == 0 || moves < tt.maxMoves {
				actor, cmd, ok := skRoomNextMove(t, ctx, rm1, tt.players)
				if !ok {
					break
				}
				if err := rm1.Dispatch(ctx, actor, cmd); err != nil {
					t.Fatalf("dispatch move %d (%s): %v", moves, cmd.Type, err)
				}
				moves++
			}

			rm2, err := room.New(room.Config{ID: roomID, Game: &skullking.SkullKingGame{}, Store: store, SnapshotInterval: tt.interval})
			if err != nil {
				t.Fatalf("rebuild room: %v", err)
			}
			defer rm2.Close()

			for seat := 0; seat < tt.players; seat++ {
				aud := game.Audience{Seat: seat, Role: game.RolePlayer}
				v1, err := rm1.View(ctx, aud)
				if err != nil {
					t.Fatalf("view original: %v", err)
				}
				v2, err := rm2.View(ctx, aud)
				if err != nil {
					t.Fatalf("view rebuilt: %v", err)
				}
				if mustJSON(t, v1) != mustJSON(t, v2) {
					t.Errorf("seat %d view differs after rebuild", seat)
				}
			}
			rm1.Close()
		})
	}
}

// skRoomNextMove mirrors skNextMove using only the public room views.
func skRoomNextMove(t *testing.T, ctx context.Context, rm *room.Room, players int) (game.Actor, game.Command, bool) {
	t.Helper()
	views := make([]skullking.SkullKingView, players)
	for seat := 0; seat < players; seat++ {
		v, err := rm.View(ctx, game.Audience{Seat: seat, Role: game.RolePlayer})
		if err != nil {
			t.Fatalf("view seat %d: %v", seat, err)
		}
		views[seat] = v.(skullking.SkullKingView)
	}
	head := views[0]
	switch head.Phase {
	case "bidding":
		for seat := 0; seat < players; seat++ {
			if views[seat].Bids[seat] == nil {
				bid := seat % 2
				if bid > head.HandSize {
					bid = head.HandSize
				}
				return skPlayer(seat), skCmd(t, "submit_bid", map[string]any{"bid": bid}), true
			}
		}
	case "playing":
		seat := skTurnSeat(head.CurrentTrick, head.TrickLeaderIndex, players, players == 2)
		if seat < 0 || seat >= players {
			t.Fatalf("seat %d is the ghost but the ghost should have auto-played", seat)
		}
		legal := skullking.GetLegalCards(views[seat].MyHand, head.CurrentTrick, skullking.RuleFlags{})
		if len(legal) == 0 {
			t.Fatalf("seat %d has no legal card", seat)
		}
		return skPlayer(seat), skCmd(t, "play_card", map[string]any{"cardId": legal[0].ID}), true
	case "scoring":
		return skPlayer(0), skCmd(t, "confirm_round", map[string]any{}), true
	}
	return game.Actor{}, game.Command{}, false
}

var _ event.StateUnmarshaler = (*skullking.SkullKingGame)(nil)

// skTurnSeat is the test-side mirror of the turn order: Graybeard second after a
// human lead, then the lowest unplayed human. It returns -1 when no seat is due.
func skTurnSeat(trick []skullking.PlayedCard, leaderAtStart, players int, ghost bool) int {
	if len(trick) == 0 {
		return leaderAtStart
	}
	if !ghost {
		return (trick[len(trick)-1].PlayerIndex + 1) % players
	}
	played := map[int]bool{}
	for _, p := range trick {
		played[p.PlayerIndex] = true
	}
	if len(trick) == 1 && trick[0].PlayerIndex != 2 && !played[2] {
		return 2
	}
	for seat := 0; seat < players; seat++ {
		if !played[seat] {
			return seat
		}
	}
	return -1
}
