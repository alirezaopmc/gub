package skullking_test

import (
	"fmt"
	"math/rand"
	"testing"

	"github.com/manovaspace/gub/server/core/game"
	"github.com/manovaspace/gub/server/games/skullking"
)

func gbPtr(v int) *int { return &v }

func gbGreen(rank int) skullking.Card {
	return skullking.NewCard(skullking.CardDef{Kind: skullking.KindSuited, Suit: skullking.SuitGreen, Rank: rank})
}

// graybeardBotMove picks a random legal human move. It only ever asks the
// game to validate moves, so a deadlock shows up as "no legal move".
func graybeardBotMove(t *testing.T, g *skullking.SkullKingGame, st *skullking.MatchState, rng *rand.Rand) (game.Actor, game.Command, bool) {
	t.Helper()
	n := st.Config.PlayerCount
	switch st.Phase {
	case "bidding":
		for seat := 0; seat < n; seat++ {
			if st.Bids[seat] == nil {
				return skPlayer(seat), skCmd(t, "submit_bid", map[string]any{"bid": rng.Intn(st.HandSize + 1)}), true
			}
		}
	case "playing":
		type candidate struct {
			actor game.Actor
			cmd   game.Command
		}
		var cands []candidate
		for seat := 0; seat < n; seat++ {
			actor := skPlayer(seat)
			for _, c := range st.Hands[seat] {
				cmd := skCmd(t, "play_card", map[string]any{"cardId": c.ID})
				if g.Validate(st, actor, cmd) == nil {
					cands = append(cands, candidate{actor, cmd})
				}
			}
		}
		if len(cands) == 0 {
			t.Fatalf("deadlock: no legal human move while playing (trick has %d cards, leader %d)",
				len(st.CurrentTrick), st.TrickLeaderIndex)
		}
		pick := cands[rng.Intn(len(cands))]
		return pick.actor, pick.cmd, true
	case "scoring":
		return skPlayer(0), skCmd(t, "confirm_round", map[string]any{}), true
	}
	return game.Actor{}, game.Command{}, false
}

// TestTwoPlayerGraybeardMatchesRunToEnd drives seeded two-player matches to game
// over with a legal-move bot. It asserts that no move is ever stuck, that every
// round is scored, and that the ghost leads at least one trick across the seeds.
func TestTwoPlayerGraybeardMatchesRunToEnd(t *testing.T) {
	seeds := []int64{1, 2, 3, 4, 5, 6, 7, 8}
	ghostLeads := 0

	for _, seed := range seeds {
		t.Run(fmt.Sprintf("seed %d", seed), func(t *testing.T) {
			g := &skullking.SkullKingGame{}
			stAny, err := g.Setup(nil, seed, []int{0, 1})
			if err != nil {
				t.Fatalf("setup: %v", err)
			}
			st := stAny.(*skullking.MatchState)
			rng := rand.New(rand.NewSource(seed))

			for moves := 0; ; moves++ {
				if moves > 5000 {
					t.Fatalf("match did not finish after %d moves, phase %q", moves, st.Phase)
				}
				actor, cmd, ok := graybeardBotMove(t, g, st, rng)
				if !ok {
					break
				}
				evs, err := g.Apply(st, actor, cmd)
				if err != nil {
					t.Fatalf("move %d (%s) rejected after validation: %v", moves, cmd.Type, err)
				}
				for _, ev := range evs {
					if ev.Type != "trick_completed" {
						continue
					}
					if p, ok := ev.Payload.(map[string]any); ok {
						if next, ok := p["nextLeader"].(int); ok && next == 2 {
							ghostLeads++
						}
					}
				}
			}

			if st.Phase != "game_over" {
				t.Fatalf("expected game_over, got %q", st.Phase)
			}
			if got, want := len(st.RoundHistory), len(st.Config.RoundsSchema); got != want {
				t.Fatalf("scored %d rounds, want %d", got, want)
			}
			for i, rec := range st.RoundHistory {
				if len(rec.Scores) != 2 {
					t.Errorf("round %d: %d score breakdowns, want 2 human players", i, len(rec.Scores))
				}
			}
			if len(st.CumulativeScores) != 2 {
				t.Errorf("cumulative scores for %d seats, want 2", len(st.CumulativeScores))
			}
		})
	}

	if ghostLeads == 0 {
		t.Error("the ghost never led a trick across the seeds, so the ghost-lead path was not exercised")
	}
}

// TestGraybeardHoldsSecondSeatUntilCardPlayed checks the mid-trick state after a
// human lead: Graybeard is due second, so the other human cannot play yet.
func TestGraybeardHoldsSecondSeatUntilCardPlayed(t *testing.T) {
	for _, leader := range []int{0, 1} {
		other := 1 - leader
		t.Run(fmt.Sprintf("leader %d", leader), func(t *testing.T) {
			g := &skullking.SkullKingGame{}
			st := &skullking.MatchState{
				Config: skullking.MatchConfig{
					PlayerCount:    2,
					RoundsSchema:   []int{1},
					ScoringSystem:  skullking.ScoringClassic,
					TwoPlayerGhost: true,
				},
				Phase:            "playing",
				HandSize:         1,
				Hands:            make([][]skullking.Card, 2),
				GhostHand:        []skullking.Card{gbGreen(9)},
				DealerIndex:      1,
				TrickLeaderIndex: leader,
				CurrentTrick: []skullking.PlayedCard{
					{Card: gbGreen(1), PlayerIndex: leader, PlayOrder: 0},
				},
				Bids:             []*int{gbPtr(0), gbPtr(0)},
				AmmoChoices:      make([]skullking.AmmoChoice, 2),
				TricksWon:        make([]int, 2),
				RoundEvents:      make([][]skullking.RoundEvent, 2),
				CumulativeScores: make([]int, 2),
			}
			st.Hands[leader] = []skullking.Card{}
			st.Hands[other] = []skullking.Card{gbGreen(2)}

			cmd := skCmd(t, "play_card", map[string]any{"cardId": gbGreen(2).ID})
			if err := g.Validate(st, skPlayer(other), cmd); err == nil {
				t.Fatal("the non-leading human played before Graybeard's card was on the table")
			}
		})
	}
}

// TestGraybeardWinsAndLeadsNext builds a two-player state where seat 0 leads and
// Graybeard wins the trick. Graybeard plays second right after the lead, then
// leads the next trick by playing its top card at once. The humans then follow
// in order: seat 0, then seat 1.
func TestGraybeardWinsAndLeadsNext(t *testing.T) {
	g := &skullking.SkullKingGame{}
	st := &skullking.MatchState{
		Config: skullking.MatchConfig{
			PlayerCount:    2,
			RoundsSchema:   []int{2},
			ScoringSystem:  skullking.ScoringClassic,
			TwoPlayerGhost: true,
		},
		Phase:            "playing",
		HandSize:         2,
		Hands:            [][]skullking.Card{{gbGreen(1), gbGreen(3)}, {gbGreen(2), gbGreen(4)}},
		GhostHand:        []skullking.Card{gbGreen(14), gbGreen(5)},
		DealerIndex:      1,
		TrickLeaderIndex: 0,
		CurrentTrick:     []skullking.PlayedCard{},
		Bids:             []*int{gbPtr(0), gbPtr(0)},
		AmmoChoices:      make([]skullking.AmmoChoice, 2),
		TricksWon:        make([]int, 2),
		RoundEvents:      make([][]skullking.RoundEvent, 2),
		CumulativeScores: make([]int, 2),
	}

	play := func(seat int, card skullking.Card) []game.Event {
		t.Helper()
		actor, cmd := skPlayer(seat), skCmd(t, "play_card", map[string]any{"cardId": card.ID})
		if err := g.Validate(st, actor, cmd); err != nil {
			t.Fatalf("seat %d play %s rejected: %v", seat, card.ID, err)
		}
		evs, err := g.Apply(st, actor, cmd)
		if err != nil {
			t.Fatalf("seat %d apply: %v", seat, err)
		}
		return evs
	}
	assertTypes := func(evs []game.Event, want ...string) {
		t.Helper()
		if len(evs) != len(want) {
			t.Fatalf("got %d events, want %d (%v)", len(evs), len(want), want)
		}
		for i := range want {
			if evs[i].Type != want[i] {
				t.Errorf("event %d: got %s, want %s", i, evs[i].Type, want[i])
			}
		}
	}

	// Seat 1 is not the leader and cannot act first.
	if err := g.Validate(st, skPlayer(1), skCmd(t, "play_card", map[string]any{"cardId": gbGreen(2).ID})); err == nil {
		t.Fatal("seat 1 played before the leader")
	}

	// Seat 0 leads green 1. Graybeard is second and plays green 14 at once.
	evs := play(0, gbGreen(1))
	assertTypes(evs, "card_played", "card_played")
	if evs[1].Actor.Role != game.RoleBot || evs[1].Actor.Seat != 2 {
		t.Errorf("ghost card_played actor = %+v, want bot seat 2", evs[1].Actor)
	}
	if len(st.CurrentTrick) != 2 || st.CurrentTrick[1].PlayerIndex != 2 {
		t.Fatalf("Graybeard should be second on the table, got %+v", st.CurrentTrick)
	}
	if err := g.Validate(st, skPlayer(0), skCmd(t, "play_card", map[string]any{"cardId": gbGreen(3).ID})); err == nil {
		t.Fatal("seat 0 played again before seat 1")
	}

	// Seat 1 completes the trick. Graybeard wins with green 14 and leads the next trick with green 5.
	evs = play(1, gbGreen(2))
	assertTypes(evs, "card_played", "trick_completed", "card_played")
	if payload, ok := evs[1].Payload.(map[string]any); !ok || payload["nextLeader"] != 2 {
		t.Errorf("trick_completed nextLeader = %v, want 2", evs[1].Payload)
	}
	if st.TrickLeaderIndex != 2 {
		t.Fatalf("TrickLeaderIndex = %d, want 2", st.TrickLeaderIndex)
	}
	if len(st.CurrentTrick) != 1 || st.CurrentTrick[0].PlayerIndex != 2 {
		t.Fatalf("new trick should hold Graybeard's lead card, got %+v", st.CurrentTrick)
	}
	if st.Phase != "playing" {
		t.Fatalf("phase = %q, want playing", st.Phase)
	}
	if st.TricksWon[0] != 0 || st.TricksWon[1] != 0 {
		t.Errorf("Graybeard's trick must not count for a human: %v", st.TricksWon)
	}

	// Seat 1 cannot act out of turn: seat 0 is next.
	if err := g.Validate(st, skPlayer(1), skCmd(t, "play_card", map[string]any{"cardId": gbGreen(4).ID})); err == nil {
		t.Fatal("seat 1 played out of turn")
	}

	// Seat 0 follows, then seat 1 completes the trick. Graybeard wins with green 5 and the round ends.
	assertTypes(play(0, gbGreen(3)), "card_played")
	evs = play(1, gbGreen(4))
	if st.Phase != "scoring" {
		t.Errorf("phase = %q after the final trick, want scoring", st.Phase)
	}
	if len(evs) < 2 || evs[1].Type != "trick_completed" {
		t.Errorf("final play should complete the trick, got %v", evs)
	}
}

// TestGraybeardLeadsFirstTrickWhenRotationReachesIt covers the case where the
// trick leader at round start is seat 2. Graybeard must play its top card as
// soon as the first trick opens, and then seat 0 plays before seat 1.
func TestGraybeardLeadsFirstTrickWhenRotationReachesIt(t *testing.T) {
	g := &skullking.SkullKingGame{}
	st := &skullking.MatchState{
		Config: skullking.MatchConfig{
			PlayerCount:    2,
			RoundsSchema:   []int{1},
			ScoringSystem:  skullking.ScoringClassic,
			TwoPlayerGhost: true,
		},
		Phase:            "bidding",
		HandSize:         1,
		Hands:            [][]skullking.Card{{gbGreen(1)}, {gbGreen(2)}},
		GhostHand:        []skullking.Card{gbGreen(9)},
		DealerIndex:      1,
		TrickLeaderIndex: 2,
		CurrentTrick:     []skullking.PlayedCard{},
		Bids:             make([]*int, 2),
		AmmoChoices:      make([]skullking.AmmoChoice, 2),
		TricksWon:        make([]int, 2),
		RoundEvents:      make([][]skullking.RoundEvent, 2),
		CumulativeScores: make([]int, 2),
	}

	for seat := 0; seat < 2; seat++ {
		cmd := skCmd(t, "submit_bid", map[string]any{"bid": 0})
		if _, err := g.Apply(st, skPlayer(seat), cmd); err != nil {
			t.Fatalf("bid seat %d: %v", seat, err)
		}
	}
	if st.Phase != "playing" {
		t.Fatalf("phase = %q, want playing", st.Phase)
	}
	if len(st.CurrentTrick) != 1 || st.CurrentTrick[0].PlayerIndex != 2 {
		t.Fatalf("Graybeard should have led the first trick, got %+v", st.CurrentTrick)
	}

	play := func(seat int, card skullking.Card) {
		t.Helper()
		cmd := skCmd(t, "play_card", map[string]any{"cardId": card.ID})
		if _, err := g.Apply(st, skPlayer(seat), cmd); err != nil {
			t.Fatalf("seat %d play: %v", seat, err)
		}
	}
	if err := g.Validate(st, skPlayer(1), skCmd(t, "play_card", map[string]any{"cardId": gbGreen(2).ID})); err == nil {
		t.Fatal("seat 1 played before seat 0 after Graybeard's lead")
	}
	play(0, gbGreen(1))
	play(1, gbGreen(2))
	if st.Phase != "scoring" {
		t.Errorf("phase = %q, want scoring", st.Phase)
	}
}
