package skullking

import (
	"math"
)

type DeckConfig struct {
	IncludeKraken bool `json:"includeKraken"`
	IncludeWhale  bool `json:"includeWhale"`
	IncludeLoot   bool `json:"includeLoot"`
}

func BuildDeck(cfg DeckConfig) []Card {
	deck := make([]Card, 0, 74)

	// 56 Suited cards
	suits := []Suit{SuitGreen, SuitYellow, SuitPurple, SuitBlack}
	for _, s := range suits {
		for rank := 1; rank <= 14; rank++ {
			deck = append(deck, NewCard(CardDef{Kind: KindSuited, Suit: s, Rank: rank}))
		}
	}

	// 5 Escapes
	for i := 0; i < 5; i++ {
		deck = append(deck, NewCard(CardDef{Kind: KindEscape, Index: i}))
	}

	// 5 Pirates
	pirates := []PirateID{PirateRosie, PirateBendt, PirateRascal, PirateJuanita, PirateHarry}
	for _, p := range pirates {
		deck = append(deck, NewCard(CardDef{Kind: KindPirate, Pirate: p}))
	}

	// 1 Tigress
	deck = append(deck, NewCard(CardDef{Kind: KindTigress}))

	// 1 Skull King
	deck = append(deck, NewCard(CardDef{Kind: KindSkullKing}))

	// 2 Mermaids
	mermaids := []MermaidID{MermaidAlyra, MermaidSirena}
	for _, m := range mermaids {
		deck = append(deck, NewCard(CardDef{Kind: KindMermaid, Mermaid: m}))
	}

	// Expansions
	if cfg.IncludeKraken {
		deck = append(deck, NewCard(CardDef{Kind: KindKraken}))
	}
	if cfg.IncludeWhale {
		deck = append(deck, NewCard(CardDef{Kind: KindWhale}))
	}
	if cfg.IncludeLoot {
		deck = append(deck, NewCard(CardDef{Kind: KindLoot, Index: 0}))
		deck = append(deck, NewCard(CardDef{Kind: KindLoot, Index: 1}))
	}

	return deck
}

// Mulberry32 matches the TS engine's Mulberry32 PRNG for deterministic dealing.
// Its entire state is S, so it serializes into snapshots. Use Next as a
// func() float64 wherever a random source is needed.
type Mulberry32 struct {
	S uint32 `json:"s"`
}

func NewMulberry32(seed int64) *Mulberry32 {
	return &Mulberry32{S: uint32(seed)}
}

func (m *Mulberry32) Next() float64 {
	m.S += 0x6d2b79f5
	t := m.S ^ (m.S >> 15)
	t = t * (1 | m.S)
	t ^= t + (t^(t>>7))*(61|t)
	res := (t ^ (t >> 14))
	return float64(res) / 4294967296.0
}

func ShuffleDeck(deck []Card, rng func() float64) []Card {
	out := make([]Card, len(deck))
	copy(out, deck)
	for i := len(out) - 1; i > 0; i-- {
		j := int(math.Floor(rng() * float64(i+1)))
		out[i], out[j] = out[j], out[i]
	}
	return out
}

func EffectiveHandSize(schemaHandSize, playerCount, deckCardCount int) int {
	maxPerPlayer := deckCardCount / playerCount
	if schemaHandSize < maxPerPlayer {
		return schemaHandSize
	}
	return maxPerPlayer
}

type DealResult struct {
	Hands    [][]Card
	Undealt  []Card
	HandSize int
}

func DealRound(cfg DeckConfig, playerCount, schemaHandSize int, rng func() float64) DealResult {
	deck := ShuffleDeck(BuildDeck(cfg), rng)
	handSize := EffectiveHandSize(schemaHandSize, playerCount, len(deck))
	hands := make([][]Card, playerCount)
	for i := 0; i < playerCount; i++ {
		hands[i] = make([]Card, 0, handSize)
	}

	cursor := 0
	for c := 0; c < handSize; c++ {
		for p := 0; p < playerCount; p++ {
			hands[p] = append(hands[p], deck[cursor])
			cursor++
		}
	}

	return DealResult{
		Hands:    hands,
		Undealt:  deck[cursor:],
		HandSize: handSize,
	}
}
