package skullking

import (
	"math"
)

type AmmoChoice string

const (
	AmmoGrapeshot  AmmoChoice = "grapeshot"
	AmmoCannonball AmmoChoice = "cannonball"
)

type ScoringSystem string

const (
	ScoringClassic ScoringSystem = "classic"
	ScoringRascal  ScoringSystem = "rascal"
)

type RoundEventType string

const (
	EventFourteenBonus    RoundEventType = "fourteenBonus"
	EventCharacterCapture RoundEventType = "characterCapture"
	EventAlliance         RoundEventType = "alliance"
	EventPirateAbility    RoundEventType = "pirateAbility"
)

type RoundEvent struct {
	Type             RoundEventType `json:"type"`
	PlayerIndex      int            `json:"playerIndex,omitempty"`
	Suit             Suit           `json:"suit,omitempty"`
	CapturerIndex    int            `json:"capturerIndex,omitempty"`
	CapturingCard    string         `json:"capturingCard,omitempty"` // "pirate", "mermaid", "king"
	Count            int            `json:"count,omitempty"`
	LootPlayerIndex  int            `json:"lootPlayerIndex,omitempty"`
	TrickWinnerIndex int            `json:"trickWinnerIndex,omitempty"`
	OwnerIndex       int            `json:"ownerIndex,omitempty"`
	Pirate           PirateID       `json:"pirate,omitempty"`
	Wager            int            `json:"wager,omitempty"` // 10, 20
}

type PlayerRoundData struct {
	Bid                *int         `json:"bid"`
	Won                *int         `json:"won"`
	Events             []RoundEvent `json:"events"`
	HarryGiantBidDelta *int         `json:"harryGiantBidDelta"`
	AmmoChoice         AmmoChoice   `json:"ammoChoice,omitempty"`
	Score              int          `json:"score"`
}

type RoundScoreBreakdown struct {
	Main  int `json:"main"`
	Bonus int `json:"bonus"`
	Total int `json:"total"`
}

type ScoreBreakdownContext struct {
	HandSize      int
	PlayerIndex   int
	Player        PlayerRoundData
	RoundPlayers  []PlayerRoundData
	ScoringSystem ScoringSystem
}

func EffectiveTricksBid(handSize int, bid *int, harryDelta *int) *int {
	if bid == nil {
		if harryDelta != nil {
			val := clamp(0, handSize, *harryDelta)
			return &val
		}
		return nil
	}
	base := *bid
	if harryDelta != nil {
		base += *harryDelta
	}
	val := clamp(0, handSize, base)
	return &val
}

func clamp(min, max, val int) int {
	if val < min {
		return min
	}
	if val > max {
		return max
	}
	return val
}

func ScoreBidWon(handSize int, effectiveBid, won *int) int {
	if effectiveBid == nil || won == nil {
		return 0
	}
	eff := *effectiveBid
	w := *won

	if eff != 0 {
		if eff == w {
			return 20 * eff
		}
		diff := eff - w
		if diff < 0 {
			diff = -diff
		}
		return -10 * diff
	}

	if w == 0 {
		return 10 * handSize
	}
	return -10 * handSize
}

func ScoreRascalBidWon(handSize int, effectiveBid, won *int, ammo AmmoChoice) (int, float64) {
	if effectiveBid == nil || won == nil {
		return 0, 0
	}
	diff := *effectiveBid - *won
	if diff < 0 {
		diff = -diff
	}

	if ammo == AmmoCannonball {
		if diff == 0 {
			return 15 * handSize, 1.0
		}
		return 0, 0.0
	}

	if diff == 0 {
		return 10 * handSize, 1.0
	}
	if diff == 1 {
		return 5 * handSize, 0.5
	}
	return 0, 0.0
}

func scoreFourteenBonus(events []RoundEvent) int {
	total := 0
	for _, e := range events {
		if e.Type == EventFourteenBonus {
			if e.Suit == SuitBlack {
				total += 20
			} else {
				total += 10
			}
		}
	}
	return total
}

func scoreHeroCaptures(events []RoundEvent) int {
	total := 0
	for _, e := range events {
		if e.Type == EventCharacterCapture {
			c := e.Count
			if c <= 0 {
				c = 1
			}
			switch e.CapturingCard {
			case "mermaid":
				total += 40
			case "pirate":
				total += 20 * c
			case "king":
				total += 30 * c
			}
		}
	}
	return total
}

func scoreAlliance(playerIndex int, player PlayerRoundData, roundPlayers []PlayerRoundData, handSize int, scoringSystem ScoringSystem) int {
	total := 0
	effA := EffectiveTricksBid(handSize, player.Bid, player.HarryGiantBidDelta)
	hitA := false
	if scoringSystem == ScoringRascal {
		hitA = effA != nil && player.Won != nil && *effA == *player.Won
	} else {
		hitA = effA != nil && player.Won != nil && *effA == *player.Won
	}

	if !hitA {
		return 0
	}

	for _, e := range player.Events {
		if e.Type != EventAlliance {
			continue
		}
		partnerIndex := e.LootPlayerIndex
		if playerIndex == e.LootPlayerIndex {
			partnerIndex = e.TrickWinnerIndex
		}

		if partnerIndex < 0 || partnerIndex >= len(roundPlayers) {
			continue
		}
		pb := roundPlayers[partnerIndex]
		effB := EffectiveTricksBid(handSize, pb.Bid, pb.HarryGiantBidDelta)
		hitB := effB != nil && pb.Won != nil && *effB == *pb.Won
		if hitA && hitB {
			total += 20
		}
	}
	return total
}

func scoreRascal(events []RoundEvent, playerIndex int, effectiveBid, won *int) int {
	if effectiveBid == nil || won == nil {
		return 0
	}
	total := 0
	for _, e := range events {
		if e.Type == EventPirateAbility && e.Pirate == PirateRascal && e.OwnerIndex == playerIndex {
			if *effectiveBid == *won {
				total += e.Wager
			} else {
				total -= e.Wager
			}
		}
	}
	return total
}

func ComputeRoundScoreBreakdown(ctx ScoreBreakdownContext) RoundScoreBreakdown {
	handSize := ctx.HandSize
	playerIndex := ctx.PlayerIndex
	player := ctx.Player
	roundPlayers := ctx.RoundPlayers
	scoringSystem := ctx.ScoringSystem
	if scoringSystem == "" {
		scoringSystem = ScoringClassic
	}

	eff := EffectiveTricksBid(handSize, player.Bid, player.HarryGiantBidDelta)
	madeBid := eff != nil && player.Won != nil && *eff == *player.Won

	if scoringSystem == ScoringRascal {
		ammo := player.AmmoChoice
		if ammo == "" {
			ammo = AmmoGrapeshot
		}
		main, multiplier := ScoreRascalBidWon(handSize, eff, player.Won, ammo)

		rascalPenalty := 0
		if eff != nil && player.Won != nil && *eff != *player.Won {
			rascalPenalty = scoreRascal(player.Events, playerIndex, eff, player.Won)
		}

		if multiplier == 0 {
			return RoundScoreBreakdown{
				Main:  main,
				Bonus: rascalPenalty,
				Total: main + rascalPenalty,
			}
		}

		rawFourteen := scoreFourteenBonus(player.Events)
		rawCaptures := scoreHeroCaptures(player.Events)
		rawAlliance := scoreAlliance(playerIndex, player, roundPlayers, handSize, scoringSystem)
		rawRascal := 0
		if multiplier == 1 {
			r := scoreRascal(player.Events, playerIndex, eff, player.Won)
			if r > 0 {
				rawRascal = r
			}
		}

		rawBonus := rawFourteen + rawCaptures + rawAlliance + rawRascal
		bonus := int(math.Floor(float64(rawBonus)*multiplier)) + rascalPenalty
		return RoundScoreBreakdown{
			Main:  main,
			Bonus: bonus,
			Total: main + bonus,
		}
	}

	main := ScoreBidWon(handSize, eff, player.Won)
	positiveBonus := 0
	if madeBid {
		positiveBonus = scoreFourteenBonus(player.Events) +
			scoreHeroCaptures(player.Events) +
			scoreAlliance(playerIndex, player, roundPlayers, handSize, scoringSystem)
	}
	rascal := scoreRascal(player.Events, playerIndex, eff, player.Won)
	bonus := positiveBonus + rascal

	return RoundScoreBreakdown{
		Main:  main,
		Bonus: bonus,
		Total: main + bonus,
	}
}
