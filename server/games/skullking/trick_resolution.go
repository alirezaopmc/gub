package skullking

import (
	"sort"
)

type cardRole struct {
	role string // "escape", "suited", "pirate", "skull_king", "mermaid", "kraken", "whale", "loot"
	suit Suit
	rank int
}

func getCardRole(p PlayedCard) cardRole {
	c := p.Card
	if IsEscapeLike(c, p.TigressMode) {
		return cardRole{role: "escape"}
	}
	switch c.Def.Kind {
	case KindSuited:
		return cardRole{role: "suited", suit: c.Def.Suit, rank: c.Def.Rank}
	case KindPirate:
		return cardRole{role: "pirate"}
	case KindSkullKing:
		return cardRole{role: "skull_king"}
	case KindMermaid:
		return cardRole{role: "mermaid"}
	case KindKraken:
		return cardRole{role: "kraken"}
	case KindWhale:
		return cardRole{role: "whale"}
	case KindLoot:
		return cardRole{role: "loot"}
	case KindTigress:
		if p.TigressMode == TigressModePirate {
			return cardRole{role: "pirate"}
		}
		return cardRole{role: "escape"}
	default:
		return cardRole{role: "escape"}
	}
}

func hasRole(plays []PlayedCard, role string) bool {
	for _, p := range plays {
		if getCardRole(p).role == role {
			return true
		}
	}
	return false
}

func beatsSpecial(aRole, bRole string) bool {
	if aRole == "mermaid" && bRole == "skull_king" {
		return true
	}
	if aRole == "skull_king" && bRole == "pirate" {
		return true
	}
	if aRole == "pirate" && bRole == "mermaid" {
		return true
	}
	return false
}

func compareSpecialWinner(a, b PlayedCard) int {
	ra := getCardRole(a).role
	rb := getCardRole(b).role

	if ra == rb {
		if a.PlayOrder < b.PlayOrder {
			return 1
		}
		return -1
	}
	if beatsSpecial(ra, rb) {
		return 1
	}
	if beatsSpecial(rb, ra) {
		return -1
	}
	if a.PlayOrder < b.PlayOrder {
		return 1
	}
	return -1
}

func compareSuited(a, b PlayedCard, leadSuit Suit) int {
	ra := getCardRole(a)
	rb := getCardRole(b)

	aIsBlack := ra.suit == SuitBlack
	bIsBlack := rb.suit == SuitBlack

	if aIsBlack && !bIsBlack {
		return 1
	}
	if !aIsBlack && bIsBlack {
		return -1
	}
	if aIsBlack && bIsBlack {
		if ra.rank > rb.rank {
			return 1
		}
		if ra.rank < rb.rank {
			return -1
		}
		if a.PlayOrder < b.PlayOrder {
			return 1
		}
		return -1
	}

	aIsLead := ra.suit == leadSuit
	bIsLead := rb.suit == leadSuit

	if aIsLead && !bIsLead {
		return 1
	}
	if !aIsLead && bIsLead {
		return -1
	}
	if aIsLead && bIsLead {
		if ra.rank > rb.rank {
			return 1
		}
		if ra.rank < rb.rank {
			return -1
		}
		if a.PlayOrder < b.PlayOrder {
			return 1
		}
		return -1
	}

	if ra.rank > rb.rank {
		return 1
	}
	if ra.rank < rb.rank {
		return -1
	}
	if a.PlayOrder < b.PlayOrder {
		return 1
	}
	return -1
}

func competingSuited(p PlayedCard, leadSuit Suit) bool {
	r := getCardRole(p)
	if r.role != "suited" {
		return false
	}
	if r.suit == leadSuit || r.suit == SuitBlack {
		return true
	}
	return false
}

func tripleMermaidWins(plays []PlayedCard) *PlayedCard {
	if !hasRole(plays, "pirate") || !hasRole(plays, "skull_king") || !hasRole(plays, "mermaid") {
		return nil
	}
	for _, p := range plays {
		if getCardRole(p).role == "mermaid" {
			res := p
			return &res
		}
	}
	return nil
}

func trickHasOnlyEscapeLike(plays []PlayedCard) bool {
	for _, p := range plays {
		r := getCardRole(p).role
		if r != "escape" && r != "loot" {
			return false
		}
	}
	return true
}

func resolveWhaleWinner(plays []PlayedCard) *PlayedCard {
	var numbered []PlayedCard
	for _, p := range plays {
		if getCardRole(p).role == "suited" {
			numbered = append(numbered, p)
		}
	}
	if len(numbered) == 0 {
		return nil
	}

	best := numbered[0]
	for i := 1; i < len(numbered); i++ {
		c := numbered[i]
		ra := getCardRole(c)
		rb := getCardRole(best)
		if ra.rank > rb.rank {
			best = c
		} else if ra.rank == rb.rank && c.PlayOrder < best.PlayOrder {
			best = c
		}
	}
	return &best
}

func resolveNormalWinner(plays []PlayedCard, flags RuleFlags) PlayedCard {
	triple := tripleMermaidWins(plays)
	if triple != nil {
		return *triple
	}

	if trickHasOnlyEscapeLike(plays) {
		best := plays[0]
		for _, p := range plays[1:] {
			if p.PlayOrder < best.PlayOrder {
				best = p
			}
		}
		return best
	}

	ctx := ResolveLeadContext(plays, flags)
	var competing []PlayedCard

	for _, p := range plays {
		r := getCardRole(p).role
		if r == "escape" || r == "loot" {
			continue
		}
		if r == "pirate" || r == "skull_king" || r == "mermaid" {
			competing = append(competing, p)
			continue
		}
		if r == "suited" && ctx.LeadSuit != nil {
			if competingSuited(p, *ctx.LeadSuit) {
				competing = append(competing, p)
			}
		}
	}

	if len(competing) == 0 {
		best := plays[0]
		for _, p := range plays[1:] {
			if p.PlayOrder < best.PlayOrder {
				best = p
			}
		}
		return best
	}

	best := competing[0]
	for i := 1; i < len(competing); i++ {
		c := competing[i]
		br := getCardRole(best)
		cr := getCardRole(c)

		bestIsSpecial := br.role == "pirate" || br.role == "skull_king" || br.role == "mermaid"
		cIsSpecial := cr.role == "pirate" || cr.role == "skull_king" || cr.role == "mermaid"

		if bestIsSpecial && cIsSpecial {
			if compareSpecialWinner(c, best) > 0 {
				best = c
			}
		} else if cIsSpecial && !bestIsSpecial {
			best = c
		} else if bestIsSpecial && !cIsSpecial {
			// keep best
		} else if ctx.LeadSuit != nil && br.role == "suited" && cr.role == "suited" {
			if compareSuited(c, best, *ctx.LeadSuit) > 0 {
				best = c
			}
		}
	}

	return best
}

func detectCaptures(plays []PlayedCard, winner PlayedCard) []CaptureBonus {
	var captures []CaptureBonus
	winnerRole := getCardRole(winner).role

	for _, p := range plays {
		if p.Card.Def.Kind == KindSuited && p.Card.Def.Rank == 14 {
			captures = append(captures, CaptureBonus{
				Type:             "fourteen",
				Suit:             p.Card.Def.Suit,
				TrickWinnerIndex: winner.PlayerIndex,
			})
		}
	}

	if winnerRole == "mermaid" {
		for _, p := range plays {
			if getCardRole(p).role == "skull_king" && p.PlayerIndex != winner.PlayerIndex {
				captures = append(captures, CaptureBonus{
					Type:             "king_by_mermaid",
					TrickWinnerIndex: winner.PlayerIndex,
				})
			}
		}
	} else if winnerRole == "skull_king" {
		for _, p := range plays {
			if getCardRole(p).role == "pirate" && p.PlayerIndex != winner.PlayerIndex {
				captures = append(captures, CaptureBonus{
					Type:             "pirate_by_king",
					TrickWinnerIndex: winner.PlayerIndex,
				})
			}
		}
	} else if winnerRole == "pirate" {
		for _, p := range plays {
			if getCardRole(p).role == "mermaid" && p.PlayerIndex != winner.PlayerIndex {
				captures = append(captures, CaptureBonus{
					Type:             "mermaid_by_pirate",
					TrickWinnerIndex: winner.PlayerIndex,
				})
			}
		}
	}

	return captures
}

func getLootAlliances(plays []PlayedCard, winner PlayedCard) []LootAlliance {
	var alliances []LootAlliance
	for _, p := range plays {
		if p.Card.Def.Kind == KindLoot && p.PlayerIndex != winner.PlayerIndex {
			alliances = append(alliances, LootAlliance{
				LootPlayerIndex:  p.PlayerIndex,
				TrickWinnerIndex: winner.PlayerIndex,
			})
		}
	}
	return alliances
}

func ResolveTrick(plays []PlayedCard, _ int, flags RuleFlags) TrickResult {
	sorted := make([]PlayedCard, len(plays))
	copy(sorted, plays)
	sort.Slice(sorted, func(i, j int) bool {
		return sorted[i].PlayOrder < sorted[j].PlayOrder
	})

	var kraken *PlayedCard
	var whale *PlayedCard
	for i := range sorted {
		p := &sorted[i]
		if p.Card.Def.Kind == KindKraken {
			kraken = p
		}
		if p.Card.Def.Kind == KindWhale {
			whale = p
		}
	}

	var outcome TrickOutcome
	var winner *PlayedCard

	if kraken != nil && whale != nil {
		second := kraken
		if whale.PlayOrder > kraken.PlayOrder {
			second = whale
		}
		if second.Card.Def.Kind == KindKraken {
			var withoutCreatures []PlayedCard
			for _, p := range sorted {
				if p.Card.Def.Kind != KindKraken && p.Card.Def.Kind != KindWhale {
					withoutCreatures = append(withoutCreatures, p)
				}
			}
			wouldBe := resolveNormalWinner(withoutCreatures, flags)
			idx := wouldBe.PlayerIndex
			outcome = TrickOutcome{
				Type:               "destroyed",
				WouldBeWinnerIndex: &idx,
				Plays:              sorted,
			}
		} else {
			winner = resolveWhaleWinner(sorted)
			if winner == nil {
				idx := whale.PlayerIndex
				outcome = TrickOutcome{
					Type:               "discarded",
					WouldBeWinnerIndex: &idx,
					Plays:              sorted,
				}
			} else {
				idx := winner.PlayerIndex
				outcome = TrickOutcome{
					Type:        "won",
					WinnerIndex: &idx,
					Plays:       sorted,
				}
			}
		}
	} else if kraken != nil {
		var withoutKraken []PlayedCard
		for _, p := range sorted {
			if p.Card.Def.Kind != KindKraken {
				withoutKraken = append(withoutKraken, p)
			}
		}
		wouldBe := resolveNormalWinner(withoutKraken, flags)
		idx := wouldBe.PlayerIndex
		outcome = TrickOutcome{
			Type:               "destroyed",
			WouldBeWinnerIndex: &idx,
			Plays:              sorted,
		}
	} else if whale != nil {
		winner = resolveWhaleWinner(sorted)
		if winner == nil {
			idx := whale.PlayerIndex
			outcome = TrickOutcome{
				Type:               "discarded",
				WouldBeWinnerIndex: &idx,
				Plays:              sorted,
			}
		} else {
			idx := winner.PlayerIndex
			outcome = TrickOutcome{
				Type:        "won",
				WinnerIndex: &idx,
				Plays:       sorted,
			}
		}
	} else {
		w := resolveNormalWinner(sorted, flags)
		winner = &w
		idx := winner.PlayerIndex
		outcome = TrickOutcome{
			Type:        "won",
			WinnerIndex: &idx,
			Plays:       sorted,
		}
	}

	var captures []CaptureBonus
	var alliances []LootAlliance
	if outcome.Type == "won" && winner != nil {
		captures = detectCaptures(sorted, *winner)
		alliances = getLootAlliances(sorted, *winner)
	}

	return TrickResult{
		Outcome:       outcome,
		Captures:      captures,
		LootAlliances: alliances,
	}
}
