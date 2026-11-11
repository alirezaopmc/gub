package skullking

type LeadContext struct {
	LeadSuit       *Suit
	MustFollowSuit bool
}

func isCharacter(c Card, tigressMode TigressMode) bool {
	if c.Def.Kind == KindMermaid || c.Def.Kind == KindPirate || c.Def.Kind == KindSkullKing {
		return true
	}
	if c.Def.Kind == KindKraken || c.Def.Kind == KindWhale {
		return true
	}
	if c.Def.Kind == KindTigress && tigressMode == TigressModePirate {
		return true
	}
	return false
}

func ResolveLeadContext(plays []PlayedCard, flags RuleFlags) LeadContext {
	if len(plays) == 0 {
		return LeadContext{LeadSuit: nil, MustFollowSuit: false}
	}

	for _, p := range plays {
		c := p.Card
		if IsEscapeLike(c, p.TigressMode) {
			// Defers suit setting to next card
			continue
		}

		if c.Def.Kind == KindSuited {
			s := c.Def.Suit
			return LeadContext{
				LeadSuit:       &s,
				MustFollowSuit: true,
			}
		}

		if isCharacter(c, p.TigressMode) {
			if flags.EscapeLeadDefersThroughCharacters {
				// Continue deferring until a suited card appears
				continue
			}
			// Default: character ends deferral, no suit established
			return LeadContext{
				LeadSuit:       nil,
				MustFollowSuit: false,
			}
		}
	}

	return LeadContext{
		LeadSuit:       nil,
		MustFollowSuit: false,
	}
}

func HandHasSuit(hand []Card, s Suit) bool {
	for _, c := range hand {
		if c.Def.Kind == KindSuited && c.Def.Suit == s {
			return true
		}
	}
	return false
}

func GetLegalCards(hand []Card, currentTrick []PlayedCard, flags RuleFlags) []Card {
	ctx := ResolveLeadContext(currentTrick, flags)
	if !ctx.MustFollowSuit || ctx.LeadSuit == nil {
		out := make([]Card, len(hand))
		copy(out, hand)
		return out
	}

	lead := *ctx.LeadSuit
	if !HandHasSuit(hand, lead) {
		out := make([]Card, len(hand))
		copy(out, hand)
		return out
	}

	var legal []Card
	for _, c := range hand {
		if IsSpecial(c) {
			legal = append(legal, c)
		} else if c.Def.Kind == KindSuited && c.Def.Suit == lead {
			legal = append(legal, c)
		}
	}
	return legal
}
