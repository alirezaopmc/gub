package skullking_test

import (
	"encoding/json"
	"os"
	"path/filepath"
	"reflect"
	"testing"

	"github.com/manovaspace/gub/server/games/skullking"
)

func findTestDataDir(t *testing.T) string {
	t.Helper()
	// Check relative to current test location
	candidates := []string{
		"../../../../testdata/skull-king",
		"../../../testdata/skull-king",
		"../../testdata/skull-king",
	}
	for _, c := range candidates {
		if _, err := os.Stat(c); err == nil {
			abs, _ := filepath.Abs(c)
			return abs
		}
	}
	t.Fatalf("testdata/skull-king not found in candidate paths")
	return ""
}

type trickVector struct {
	ID          string                 `json:"id"`
	Name        string                 `json:"name"`
	RuleFlags   skullking.RuleFlags    `json:"ruleFlags"`
	PlayerCount int                    `json:"playerCount"`
	Plays       []skullking.PlayedCard `json:"plays"`
	Expected    struct {
		LeadSuit      *skullking.Suit          `json:"leadSuit"`
		Outcome       skullking.TrickOutcome   `json:"outcome"`
		Captures      []skullking.CaptureBonus `json:"captures"`
		LootAlliances []skullking.LootAlliance `json:"lootAlliances"`
		NextLeader    int                      `json:"nextLeader"`
	} `json:"expected"`
}

func TestGoldenTricks(t *testing.T) {
	dir := findTestDataDir(t)
	raw, err := os.ReadFile(filepath.Join(dir, "tricks.json"))
	if err != nil {
		t.Fatalf("failed to read tricks.json: %v", err)
	}

	var vectors []trickVector
	if err := json.Unmarshal(raw, &vectors); err != nil {
		t.Fatalf("failed to parse tricks.json: %v", err)
	}

	if len(vectors) < 200 {
		t.Fatalf("expected at least 200 trick vectors, got %d", len(vectors))
	}

	for _, v := range vectors {
		leadCtx := skullking.ResolveLeadContext(v.Plays, v.RuleFlags)
		if v.Expected.LeadSuit == nil {
			if leadCtx.LeadSuit != nil {
				t.Errorf("[%s %s] expected nil lead suit, got %v", v.ID, v.Name, *leadCtx.LeadSuit)
			}
		} else {
			if leadCtx.LeadSuit == nil || *leadCtx.LeadSuit != *v.Expected.LeadSuit {
				t.Errorf("[%s %s] expected lead suit %v, got %v", v.ID, v.Name, *v.Expected.LeadSuit, leadCtx.LeadSuit)
			}
		}

		res := skullking.ResolveTrick(v.Plays, v.PlayerCount, v.RuleFlags)

		if res.Outcome.Type != v.Expected.Outcome.Type {
			t.Errorf("[%s %s] expected outcome type %s, got %s", v.ID, v.Name, v.Expected.Outcome.Type, res.Outcome.Type)
		}

		if v.Expected.Outcome.Type == "won" {
			if res.Outcome.WinnerIndex == nil || *res.Outcome.WinnerIndex != *v.Expected.Outcome.WinnerIndex {
				t.Errorf("[%s %s] expected winner %v, got %v", v.ID, v.Name, v.Expected.Outcome.WinnerIndex, res.Outcome.WinnerIndex)
			}
		} else {
			if res.Outcome.WouldBeWinnerIndex == nil || *res.Outcome.WouldBeWinnerIndex != *v.Expected.Outcome.WouldBeWinnerIndex {
				t.Errorf("[%s %s] expected wouldBeWinner %v, got %v", v.ID, v.Name, v.Expected.Outcome.WouldBeWinnerIndex, res.Outcome.WouldBeWinnerIndex)
			}
		}

		if len(res.Captures) != len(v.Expected.Captures) {
			t.Errorf("[%s %s] captures length mismatch: expected %d, got %d", v.ID, v.Name, len(v.Expected.Captures), len(res.Captures))
		} else {
			for i := range res.Captures {
				if res.Captures[i].Type != v.Expected.Captures[i].Type ||
					res.Captures[i].TrickWinnerIndex != v.Expected.Captures[i].TrickWinnerIndex ||
					res.Captures[i].Suit != v.Expected.Captures[i].Suit {
					t.Errorf("[%s %s] capture %d mismatch: expected %+v, got %+v", v.ID, v.Name, i, v.Expected.Captures[i], res.Captures[i])
				}
			}
		}

		if len(res.LootAlliances) != len(v.Expected.LootAlliances) {
			t.Errorf("[%s %s] loot alliances length mismatch: expected %d, got %d", v.ID, v.Name, len(v.Expected.LootAlliances), len(res.LootAlliances))
		}
	}
}

type legalMoveVector struct {
	ID                   string                 `json:"id"`
	Name                 string                 `json:"name"`
	Hand                 []skullking.Card       `json:"hand"`
	Trick                []skullking.PlayedCard `json:"trick"`
	RuleFlags            skullking.RuleFlags    `json:"ruleFlags"`
	ExpectedLegalCardIDs []string               `json:"expectedLegalCardIds"`
}

func TestGoldenLegalMoves(t *testing.T) {
	dir := findTestDataDir(t)
	raw, err := os.ReadFile(filepath.Join(dir, "legal_moves.json"))
	if err != nil {
		t.Fatalf("failed to read legal_moves.json: %v", err)
	}

	var vectors []legalMoveVector
	if err := json.Unmarshal(raw, &vectors); err != nil {
		t.Fatalf("failed to parse legal_moves.json: %v", err)
	}

	for _, v := range vectors {
		legal := skullking.GetLegalCards(v.Hand, v.Trick, v.RuleFlags)
		ids := make([]string, len(legal))
		for i, c := range legal {
			ids[i] = c.ID
		}

		if !reflect.DeepEqual(ids, v.ExpectedLegalCardIDs) {
			t.Errorf("[%s %s] legal moves mismatch:\nexpected: %v\ngot:      %v", v.ID, v.Name, v.ExpectedLegalCardIDs, ids)
		}
	}
}

type scoringVector struct {
	ID            string                        `json:"id"`
	Name          string                        `json:"name"`
	HandSize      int                           `json:"handSize"`
	PlayerIndex   int                           `json:"playerIndex"`
	ScoringSystem skullking.ScoringSystem       `json:"scoringSystem"`
	Player        skullking.PlayerRoundData     `json:"player"`
	RoundPlayers  []skullking.PlayerRoundData   `json:"roundPlayers"`
	Expected      skullking.RoundScoreBreakdown `json:"expected"`
}

func TestGoldenScoring(t *testing.T) {
	dir := findTestDataDir(t)
	raw, err := os.ReadFile(filepath.Join(dir, "scoring.json"))
	if err != nil {
		t.Fatalf("failed to read scoring.json: %v", err)
	}

	var vectors []scoringVector
	if err := json.Unmarshal(raw, &vectors); err != nil {
		t.Fatalf("failed to parse scoring.json: %v", err)
	}

	for _, v := range vectors {
		ctx := skullking.ScoreBreakdownContext{
			HandSize:      v.HandSize,
			PlayerIndex:   v.PlayerIndex,
			Player:        v.Player,
			RoundPlayers:  v.RoundPlayers,
			ScoringSystem: v.ScoringSystem,
		}
		got := skullking.ComputeRoundScoreBreakdown(ctx)

		if got.Main != v.Expected.Main || got.Bonus != v.Expected.Bonus || got.Total != v.Expected.Total {
			t.Errorf("[%s %s] scoring mismatch:\nexpected: %+v\ngot:      %+v", v.ID, v.Name, v.Expected, got)
		}
	}
}
