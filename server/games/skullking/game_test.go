package skullking_test

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/manovaspace/gub/server/core/game"
	"github.com/manovaspace/gub/server/core/view"
	"github.com/manovaspace/gub/server/games/skullking"
)

func TestSkullKingGameLifecycle(t *testing.T) {
	g := &skullking.SkullKingGame{}
	cfg := skullking.DefaultConfig(3)
	cfg.RoundsSchema = []int{1, 2}
	cfgBytes, _ := json.Marshal(cfg)

	st, err := g.Setup(cfgBytes, 12345, []int{0, 1, 2})
	if err != nil {
		t.Fatalf("setup failed: %v", err)
	}

	if g.Phase(st) != "bidding" {
		t.Errorf("expected phase 'bidding', got '%s'", g.Phase(st))
	}

	// 1. Check hidden information leak: Player 0 view must NOT contain player 1's cards
	v0, err := g.View(st, game.Audience{Seat: 0, Role: game.RolePlayer})
	if err != nil {
		t.Fatalf("view failed: %v", err)
	}
	p0View := v0.(skullking.SkullKingView)
	if len(p0View.MyHand) != 1 {
		t.Errorf("expected 1 card in myHand, got %d", len(p0View.MyHand))
	}

	// Viewer sees NO private hands
	vViewer, err := g.View(st, game.Audience{Seat: -1, Role: game.RoleViewer})
	if err != nil {
		t.Fatalf("viewer view failed: %v", err)
	}
	viewerProj := vViewer.(skullking.SkullKingView)
	if len(viewerProj.MyHand) != 0 {
		t.Errorf("viewer should have empty MyHand, got %d", len(viewerProj.MyHand))
	}

	// 2. Submit bids for all 3 players
	for i := 0; i < 3; i++ {
		cmd := game.Command{
			Type:    "submit_bid",
			Payload: json.RawMessage(`{"bid": 1}`),
		}
		actor := game.Actor{Seat: i, Role: game.RolePlayer}
		if err := g.Validate(st, actor, cmd); err != nil {
			t.Fatalf("validate bid for %d failed: %v", i, err)
		}
		if _, err := g.Apply(st, actor, cmd); err != nil {
			t.Fatalf("apply bid for %d failed: %v", i, err)
		}
	}

	// Phase should now be playing
	if g.Phase(st) != "playing" {
		t.Errorf("expected phase 'playing', got '%s'", g.Phase(st))
	}

	// 3. Play trick
	for step := 0; step < 3; step++ {
		v, _ := g.View(st, game.Audience{Seat: 0, Role: game.RoleViewer})
		curLeader := v.(skullking.SkullKingView).TrickLeaderIndex
		curTrick := v.(skullking.SkullKingView).CurrentTrick
		expectedPlayer := curLeader
		if len(curTrick) > 0 {
			expectedPlayer = (curTrick[len(curTrick)-1].PlayerIndex + 1) % 3
		}

		// Get that player's card
		pv, _ := g.View(st, game.Audience{Seat: expectedPlayer, Role: game.RolePlayer})
		cardToPlay := pv.(skullking.SkullKingView).MyHand[0]

		payload, _ := json.Marshal(map[string]any{"cardId": cardToPlay.ID})
		cmd := game.Command{Type: "play_card", Payload: payload}
		actor := game.Actor{Seat: expectedPlayer, Role: game.RolePlayer}

		if err := g.Validate(st, actor, cmd); err != nil {
			t.Fatalf("validate play_card failed: %v", err)
		}
		if _, err := g.Apply(st, actor, cmd); err != nil {
			t.Fatalf("apply play_card failed: %v", err)
		}
	}

	// Round 1 (1 trick) should now be in scoring phase
	if g.Phase(st) != "scoring" {
		t.Errorf("expected phase 'scoring', got '%s'", g.Phase(st))
	}

	// 4. Confirm round -> advances to round 2
	confirmCmd := game.Command{Type: "confirm_round"}
	if _, err := g.Apply(st, game.Actor{Seat: 0, Role: game.RoleHost}, confirmCmd); err != nil {
		t.Fatalf("apply confirm_round failed: %v", err)
	}

	if g.Phase(st) != "bidding" {
		t.Errorf("expected phase 'bidding' for round 2, got '%s'", g.Phase(st))
	}
}

func TestTwoPlayerGraybeard(t *testing.T) {
	g := &skullking.SkullKingGame{}
	cfg := skullking.DefaultConfig(2)
	cfg.RoundsSchema = []int{1}
	cfg.TwoPlayerGhost = true
	cfgBytes, _ := json.Marshal(cfg)

	st, err := g.Setup(cfgBytes, 9999, []int{0, 1})
	if err != nil {
		t.Fatalf("setup 2p failed: %v", err)
	}

	// Bid both players
	for i := 0; i < 2; i++ {
		cmd := game.Command{Type: "submit_bid", Payload: json.RawMessage(`{"bid": 0}`)}
		_, _ = g.Apply(st, game.Actor{Seat: i, Role: game.RolePlayer}, cmd)
	}

	if g.Phase(st) != "playing" {
		t.Fatalf("expected phase 'playing', got '%s'", g.Phase(st))
	}

	// Play P0
	v0, _ := g.View(st, game.Audience{Seat: 0, Role: game.RolePlayer})
	c0 := v0.(skullking.SkullKingView).MyHand[0]
	p0, _ := json.Marshal(map[string]any{"cardId": c0.ID})
	_, _ = g.Apply(st, game.Actor{Seat: 0, Role: game.RolePlayer}, game.Command{Type: "play_card", Payload: p0})

	// Play P1
	v1, _ := g.View(st, game.Audience{Seat: 1, Role: game.RolePlayer})
	c1 := v1.(skullking.SkullKingView).MyHand[0]
	p1, _ := json.Marshal(map[string]any{"cardId": c1.ID})
	_, err = g.Apply(st, game.Actor{Seat: 1, Role: game.RolePlayer}, game.Command{Type: "play_card", Payload: p1})
	if err != nil {
		t.Fatalf("apply P1 play_card failed: %v", err)
	}

	// Ghost should have played automatically, completing the 3-card trick, transitioning to scoring
	if g.Phase(st) != "scoring" {
		t.Errorf("expected phase 'scoring' after ghost auto-play, got '%s'", g.Phase(st))
	}
}

func TestViewHiddenInfoLeak(t *testing.T) {
	g := &skullking.SkullKingGame{}
	cfg := skullking.DefaultConfig(4)
	cfgBytes, _ := json.Marshal(cfg)

	st, err := g.Setup(cfgBytes, 42, []int{0, 1, 2, 3})
	if err != nil {
		t.Fatalf("setup failed: %v", err)
	}

	// Get P1's private card
	v1, _ := g.View(st, game.Audience{Seat: 1, Role: game.RolePlayer})
	p1Hand := v1.(skullking.SkullKingView).MyHand
	secretCardID := p1Hand[0].ID

	// P0 view must NOT leak secretCardID
	v0, _ := g.View(st, game.Audience{Seat: 0, Role: game.RolePlayer})
	view.AssertNoHiddenInfoLeak(t, v0, secretCardID)

	// Viewer view must NOT leak secretCardID
	vViewer, _ := g.View(st, game.Audience{Seat: -1, Role: game.RoleViewer})
	view.AssertNoHiddenInfoLeak(t, vViewer, secretCardID)
}

func init() {
	_ = context.Background()
}
