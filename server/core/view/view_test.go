package view_test

import (
	"testing"

	"github.com/manovaspace/gub/server/core/game"
	"github.com/manovaspace/gub/server/core/view"
)

type samplePlayerHandView struct {
	MyCards     []string               `json:"myCards"`
	OtherCounts []view.MaskedCardCount `json:"otherCounts"`
}

func TestViewEnvelopeAndLeakCheck(t *testing.T) {
	v := samplePlayerHandView{
		MyCards: []string{"green:14", "skull_king"},
		OtherCounts: []view.MaskedCardCount{
			{Count: 5},
			{Count: 3},
		},
	}

	env := view.NewEnvelope("room-1", 10, game.Audience{Seat: 0, Role: game.RolePlayer}, v)
	if env.RoomID != "room-1" || env.Seq != 10 {
		t.Errorf("unexpected envelope headers: %+v", env)
	}

	// Opponent's secret cards: "mermaid:alyra", "pirate:rosie" must NOT appear in P0's view
	view.AssertNoHiddenInfoLeak(t, env, "mermaid:alyra", "pirate:rosie")
}
