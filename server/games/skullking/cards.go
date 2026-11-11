package skullking

import (
	"fmt"
)

type Suit string

const (
	SuitGreen  Suit = "green"
	SuitYellow Suit = "yellow"
	SuitPurple Suit = "purple"
	SuitBlack  Suit = "black"
)

type PirateID string

const (
	PirateRosie   PirateID = "rosie"
	PirateBendt   PirateID = "bendt"
	PirateRascal  PirateID = "rascal"
	PirateJuanita PirateID = "juanita"
	PirateHarry   PirateID = "harry"
)

type MermaidID string

const (
	MermaidAlyra  MermaidID = "alyra"
	MermaidSirena MermaidID = "sirena"
)

type CardKind string

const (
	KindSuited    CardKind = "suited"
	KindEscape    CardKind = "escape"
	KindPirate    CardKind = "pirate"
	KindTigress   CardKind = "tigress"
	KindSkullKing CardKind = "skull_king"
	KindMermaid   CardKind = "mermaid"
	KindKraken    CardKind = "kraken"
	KindLoot      CardKind = "loot"
	KindWhale     CardKind = "whale"
)

type CardDef struct {
	Kind    CardKind  `json:"kind"`
	Suit    Suit      `json:"suit,omitempty"`
	Rank    int       `json:"rank,omitempty"`
	Pirate  PirateID  `json:"pirate,omitempty"`
	Mermaid MermaidID `json:"mermaid,omitempty"`
	Index   int       `json:"index,omitempty"`
}

type Card struct {
	ID  string  `json:"id"`
	Def CardDef `json:"def"`
}

func CardID(def CardDef) string {
	switch def.Kind {
	case KindSuited:
		return fmt.Sprintf("%s:%d", def.Suit, def.Rank)
	case KindEscape:
		return fmt.Sprintf("escape:%d", def.Index)
	case KindPirate:
		return fmt.Sprintf("pirate:%s", def.Pirate)
	case KindTigress:
		return "tigress"
	case KindSkullKing:
		return "skull_king"
	case KindMermaid:
		return fmt.Sprintf("mermaid:%s", def.Mermaid)
	case KindKraken:
		return "kraken"
	case KindLoot:
		return fmt.Sprintf("loot:%d", def.Index)
	case KindWhale:
		return "whale"
	default:
		return "unknown"
	}
}

func NewCard(def CardDef) Card {
	return Card{
		ID:  CardID(def),
		Def: def,
	}
}

type TigressMode string

const (
	TigressModePirate TigressMode = "pirate"
	TigressModeEscape TigressMode = "escape"
)

type PlayedCard struct {
	Card        Card        `json:"card"`
	PlayerIndex int         `json:"playerIndex"`
	PlayOrder   int         `json:"playOrder"`
	TigressMode TigressMode `json:"tigressMode,omitempty"`
}

type RuleFlags struct {
	EscapeLeadDefersThroughCharacters bool `json:"escapeLeadDefersThroughCharacters"`
}

type CaptureBonus struct {
	Type             string `json:"type"`
	Suit             Suit   `json:"suit,omitempty"`
	TrickWinnerIndex int    `json:"trickWinnerIndex"`
}

type LootAlliance struct {
	LootPlayerIndex  int `json:"lootPlayerIndex"`
	TrickWinnerIndex int `json:"trickWinnerIndex"`
}

type TrickOutcome struct {
	Type               string       `json:"type"` // "won", "destroyed", "discarded"
	WinnerIndex        *int         `json:"winnerIndex,omitempty"`
	WouldBeWinnerIndex *int         `json:"wouldBeWinnerIndex,omitempty"`
	Plays              []PlayedCard `json:"plays"`
}

type TrickResult struct {
	Outcome       TrickOutcome   `json:"outcome"`
	Captures      []CaptureBonus `json:"captures"`
	LootAlliances []LootAlliance `json:"lootAlliances"`
}

func IsEscapeLike(c Card, tigressMode TigressMode) bool {
	if c.Def.Kind == KindEscape || c.Def.Kind == KindLoot {
		return true
	}
	if c.Def.Kind == KindTigress && tigressMode == TigressModeEscape {
		return true
	}
	return false
}

func IsSpecial(c Card) bool {
	return c.Def.Kind != KindSuited
}
