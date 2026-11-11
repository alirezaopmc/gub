package skullking

import (
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/manovaspace/gub/server/core/game"
	"github.com/manovaspace/gub/server/core/registry"
)

func init() {
	_ = registry.Register(&SkullKingGame{})
}

type ArtifactsConfig struct {
	PirateAbilities  bool `json:"pirateAbilities"`
	CharacterCapture bool `json:"characterCapture"`
	Whale            bool `json:"whale"`
	Kraken           bool `json:"kraken"`
	Loot             bool `json:"loot"`
	FourteenBonus    bool `json:"fourteenBonus"`
}

type MatchConfig struct {
	PlayerCount    int             `json:"playerCount"`
	PlayerNames    []string        `json:"playerNames"`
	RoundsSchema   []int           `json:"roundsSchema"`
	ScoringSystem  ScoringSystem   `json:"scoringSystem"`
	Artifacts      ArtifactsConfig `json:"artifacts"`
	RuleFlags      RuleFlags       `json:"ruleFlags"`
	TwoPlayerGhost bool            `json:"twoPlayerGhost"` // Graybeard
}

func DefaultConfig(playerCount int) MatchConfig {
	names := make([]string, playerCount)
	for i := 0; i < playerCount; i++ {
		names[i] = fmt.Sprintf("Player %d", i+1)
	}
	return MatchConfig{
		PlayerCount:   playerCount,
		PlayerNames:   names,
		RoundsSchema:  []int{1, 2, 3, 4, 5, 6, 7, 8, 9, 10},
		ScoringSystem: ScoringClassic,
		Artifacts: ArtifactsConfig{
			PirateAbilities:  false,
			CharacterCapture: true,
			Whale:            false,
			Kraken:           false,
			Loot:             false,
			FourteenBonus:    true,
		},
		TwoPlayerGhost: playerCount == 2,
	}
}

type PendingAbility struct {
	Pirate       PirateID `json:"pirate"`
	WinnerIndex  int      `json:"winnerIndex"`
	TrickIndex   int      `json:"trickIndex"`
	IsFinalTrick bool     `json:"isFinalTrick"`
}

type MatchState struct {
	Config           MatchConfig          `json:"config"`
	Seed             int64                `json:"seed"`
	RNG              func() float64       `json:"-"`
	Phase            string               `json:"phase"` // "bidding", "playing", "ability", "scoring", "game_over"
	RoundIndex       int                  `json:"roundIndex"`
	HandSize         int                  `json:"handSize"`
	Hands            [][]Card             `json:"hands"`
	Undealt          []Card               `json:"undealt"`
	GhostHand        []Card               `json:"ghostHand,omitempty"` // 2p Graybeard
	DealerIndex      int                  `json:"dealerIndex"`
	TrickLeaderIndex int                  `json:"trickLeaderIndex"`
	CurrentTrick     []PlayedCard         `json:"currentTrick"`
	CompletedTricks  []TrickResult        `json:"completedTricks"`
	Bids             []*int               `json:"bids"`
	AmmoChoices      []AmmoChoice         `json:"ammoChoices,omitempty"`
	TricksWon        []int                `json:"tricksWon"`
	RoundEvents      [][]RoundEvent       `json:"roundEvents"`
	PendingAbility   *PendingAbility      `json:"pendingAbility,omitempty"`
	CumulativeScores []int                `json:"cumulativeScores"`
	RoundScores      []int                `json:"roundScores,omitempty"`
	RoundHistory     []RoundHistoryRecord `json:"roundHistory"`
}

type RoundHistoryRecord struct {
	RoundIndex int                   `json:"roundIndex"`
	HandSize   int                   `json:"handSize"`
	Scores     []RoundScoreBreakdown `json:"scores"`
}

type SkullKingGame struct{}

func (s *SkullKingGame) Def() game.GameDef {
	defCfg, _ := json.Marshal(DefaultConfig(4))
	return game.GameDef{
		ID:            "skull-king",
		Name:          "Skull King",
		MinPlayers:    2,
		MaxPlayers:    8,
		TickRate:      0,
		DefaultConfig: defCfg,
	}
}

func (s *SkullKingGame) Setup(rawConfig json.RawMessage, seed int64, playerSeats []int) (game.State, error) {
	pCount := len(playerSeats)
	if pCount < 2 {
		pCount = 2
	}
	cfg := DefaultConfig(pCount)
	if len(rawConfig) > 0 {
		_ = json.Unmarshal(rawConfig, &cfg)
	}
	if cfg.PlayerCount != pCount {
		cfg.PlayerCount = pCount
	}

	rng := NewMulberry32(seed)
	initialDealer := int(rng() * float64(pCount))

	st := &MatchState{
		Config:           cfg,
		Seed:             seed,
		RNG:              rng,
		Phase:            "bidding",
		RoundIndex:       0,
		DealerIndex:      initialDealer,
		CumulativeScores: make([]int, pCount),
		RoundHistory:     make([]RoundHistoryRecord, 0),
	}

	startNewRound(st, 0)
	return st, nil
}

func startNewRound(st *MatchState, roundIdx int) {
	st.RoundIndex = roundIdx
	pCount := st.Config.PlayerCount
	schemaSize := st.Config.RoundsSchema[roundIdx]

	deckCfg := DeckConfig{
		IncludeKraken: st.Config.Artifacts.Kraken,
		IncludeWhale:  st.Config.Artifacts.Whale,
		IncludeLoot:   st.Config.Artifacts.Loot,
	}

	dealCount := pCount
	if st.Config.TwoPlayerGhost {
		dealCount = 3 // Graybeard gets a hand
	}

	res := DealRound(deckCfg, dealCount, schemaSize, st.RNG)
	st.HandSize = res.HandSize
	st.Hands = res.Hands[:pCount]
	st.Undealt = res.Undealt

	if st.Config.TwoPlayerGhost {
		st.GhostHand = res.Hands[2]
	} else {
		st.GhostHand = nil
	}

	st.DealerIndex = (st.DealerIndex + 1) % pCount
	st.TrickLeaderIndex = (st.DealerIndex + 1) % pCount
	st.Phase = "bidding"
	st.CurrentTrick = make([]PlayedCard, 0)
	st.CompletedTricks = make([]TrickResult, 0)
	st.Bids = make([]*int, pCount)
	st.AmmoChoices = make([]AmmoChoice, pCount)
	st.TricksWon = make([]int, pCount)
	st.RoundEvents = make([][]RoundEvent, pCount)
	st.PendingAbility = nil
	st.RoundScores = nil
}

func (s *SkullKingGame) Validate(state game.State, actor game.Actor, cmd game.Command) error {
	st := state.(*MatchState)

	switch cmd.Type {
	case "submit_bid":
		if st.Phase != "bidding" {
			return errors.New("not in bidding phase")
		}
		if actor.Seat < 0 || actor.Seat >= st.Config.PlayerCount {
			return errors.New("invalid player seat")
		}
		var payload struct {
			Bid        int        `json:"bid"`
			AmmoChoice AmmoChoice `json:"ammoChoice,omitempty"`
		}
		if err := json.Unmarshal(cmd.Payload, &payload); err != nil {
			return err
		}
		if payload.Bid < 0 || payload.Bid > st.HandSize {
			return fmt.Errorf("bid must be between 0 and %d", st.HandSize)
		}
		return nil

	case "play_card":
		if st.Phase != "playing" {
			return errors.New("not in playing phase")
		}
		expectedTurn := st.TrickLeaderIndex
		if len(st.CurrentTrick) > 0 {
			lastPlayer := st.CurrentTrick[len(st.CurrentTrick)-1].PlayerIndex
			expectedTurn = (lastPlayer + 1) % st.Config.PlayerCount
		}
		if actor.Seat != expectedTurn {
			return game.ErrNotYourTurn
		}

		var payload struct {
			CardID      string      `json:"cardId"`
			TigressMode TigressMode `json:"tigressMode,omitempty"`
		}
		if err := json.Unmarshal(cmd.Payload, &payload); err != nil {
			return err
		}

		hand := st.Hands[actor.Seat]
		legal := GetLegalCards(hand, st.CurrentTrick, st.Config.RuleFlags)
		isLegal := false
		for _, c := range legal {
			if c.ID == payload.CardID {
				isLegal = true
				break
			}
		}
		if !isLegal {
			return game.ErrIllegalMove
		}
		return nil

	case "resolve_ability":
		if st.Phase != "ability" || st.PendingAbility == nil {
			return errors.New("no ability pending")
		}
		if actor.Seat != st.PendingAbility.WinnerIndex {
			return errors.New("only ability owner can resolve ability")
		}
		return nil

	case "confirm_round":
		if st.Phase != "scoring" {
			return errors.New("not in scoring phase")
		}
		return nil

	default:
		return game.ErrInvalidCommand
	}
}

func (s *SkullKingGame) Apply(state game.State, actor game.Actor, cmd game.Command) ([]game.Event, error) {
	st := state.(*MatchState)

	switch cmd.Type {
	case "submit_bid":
		var payload struct {
			Bid        int        `json:"bid"`
			AmmoChoice AmmoChoice `json:"ammoChoice,omitempty"`
		}
		_ = json.Unmarshal(cmd.Payload, &payload)
		b := payload.Bid
		st.Bids[actor.Seat] = &b
		if payload.AmmoChoice != "" {
			st.AmmoChoices[actor.Seat] = payload.AmmoChoice
		} else {
			st.AmmoChoices[actor.Seat] = AmmoGrapeshot
		}

		evs := []game.Event{{
			Type:  "bid_submitted",
			Actor: actor,
			Payload: map[string]any{
				"seat":       actor.Seat,
				"bid":        payload.Bid,
				"ammoChoice": st.AmmoChoices[actor.Seat],
			},
		}}

		// Check if all bids are in
		allIn := true
		for _, bid := range st.Bids {
			if bid == nil {
				allIn = false
				break
			}
		}
		if allIn {
			st.Phase = "playing"
			evs = append(evs, game.Event{
				Type:  "phase_changed",
				Actor: game.Actor{Role: game.RoleSystem},
				Payload: map[string]any{
					"phase": "playing",
					"bids":  st.Bids,
				},
			})
		}
		return evs, nil

	case "play_card":
		var payload struct {
			CardID      string      `json:"cardId"`
			TigressMode TigressMode `json:"tigressMode,omitempty"`
		}
		_ = json.Unmarshal(cmd.Payload, &payload)

		hand := st.Hands[actor.Seat]
		var playedCard Card
		newHand := make([]Card, 0, len(hand)-1)
		for _, c := range hand {
			if c.ID == payload.CardID && playedCard.ID == "" {
				playedCard = c
			} else {
				newHand = append(newHand, c)
			}
		}
		st.Hands[actor.Seat] = newHand

		play := PlayedCard{
			Card:        playedCard,
			PlayerIndex: actor.Seat,
			PlayOrder:   len(st.CurrentTrick),
			TigressMode: payload.TigressMode,
		}
		st.CurrentTrick = append(st.CurrentTrick, play)

		evs := []game.Event{{
			Type:    "card_played",
			Actor:   actor,
			Payload: play,
		}}

		// If 2-player with ghost, and both humans have played, ghost automatically plays top card
		if st.Config.TwoPlayerGhost && len(st.CurrentTrick) == 2 && len(st.GhostHand) > 0 {
			ghostCard := st.GhostHand[0]
			st.GhostHand = st.GhostHand[1:]
			ghostPlay := PlayedCard{
				Card:        ghostCard,
				PlayerIndex: 2, // Seat 2 is Graybeard ghost
				PlayOrder:   2,
				TigressMode: TigressModeEscape, // Graybeard plays Tigress as Escape
			}
			st.CurrentTrick = append(st.CurrentTrick, ghostPlay)
			evs = append(evs, game.Event{
				Type:    "card_played",
				Actor:   game.Actor{Seat: 2, Role: game.RoleBot, ID: "graybeard"},
				Payload: ghostPlay,
			})
		}

		targetTrickLen := st.Config.PlayerCount
		if st.Config.TwoPlayerGhost {
			targetTrickLen = 3
		}

		// If trick complete, resolve it
		if len(st.CurrentTrick) >= targetTrickLen {
			result := ResolveTrick(st.CurrentTrick, targetTrickLen, st.Config.RuleFlags)
			st.CompletedTricks = append(st.CompletedTricks, result)

			var nextLeader int
			if result.Outcome.Type == "won" && result.Outcome.WinnerIndex != nil {
				winner := *result.Outcome.WinnerIndex
				nextLeader = winner
				if winner < st.Config.PlayerCount {
					st.TricksWon[winner]++
				}

				// Record captures
				for _, cap := range result.Captures {
					if cap.TrickWinnerIndex < st.Config.PlayerCount {
						if cap.Type == "fourteen" {
							st.RoundEvents[cap.TrickWinnerIndex] = append(
								st.RoundEvents[cap.TrickWinnerIndex],
								RoundEvent{Type: EventFourteenBonus, Suit: cap.Suit, PlayerIndex: cap.TrickWinnerIndex},
							)
						} else {
							st.RoundEvents[cap.TrickWinnerIndex] = append(
								st.RoundEvents[cap.TrickWinnerIndex],
								RoundEvent{
									Type:          EventCharacterCapture,
									CapturerIndex: cap.TrickWinnerIndex,
									CapturingCard: cap.Type,
									Count:         1,
								},
							)
						}
					}
				}

				// Record alliances
				for _, all := range result.LootAlliances {
					if all.LootPlayerIndex < st.Config.PlayerCount && all.TrickWinnerIndex < st.Config.PlayerCount {
						st.RoundEvents[all.LootPlayerIndex] = append(
							st.RoundEvents[all.LootPlayerIndex],
							RoundEvent{
								Type:             EventAlliance,
								LootPlayerIndex:  all.LootPlayerIndex,
								TrickWinnerIndex: all.TrickWinnerIndex,
							},
						)
						st.RoundEvents[all.TrickWinnerIndex] = append(
							st.RoundEvents[all.TrickWinnerIndex],
							RoundEvent{
								Type:             EventAlliance,
								LootPlayerIndex:  all.LootPlayerIndex,
								TrickWinnerIndex: all.TrickWinnerIndex,
							},
						)
					}
				}
			} else if result.Outcome.WouldBeWinnerIndex != nil {
				nextLeader = *result.Outcome.WouldBeWinnerIndex
			}

			// If Graybeard won, next trick is led by Graybeard (seat 2)
			st.TrickLeaderIndex = nextLeader
			st.CurrentTrick = make([]PlayedCard, 0)

			evs = append(evs, game.Event{
				Type:  "trick_completed",
				Actor: game.Actor{Role: game.RoleSystem},
				Payload: map[string]any{
					"result":     result,
					"nextLeader": nextLeader,
				},
			})

			// Check if round is over
			if len(st.CompletedTricks) >= st.HandSize {
				st.Phase = "scoring"
				st.RoundScores = make([]int, st.Config.PlayerCount)
				breakdowns := make([]RoundScoreBreakdown, st.Config.PlayerCount)
				playersData := make([]PlayerRoundData, st.Config.PlayerCount)

				for i := 0; i < st.Config.PlayerCount; i++ {
					won := st.TricksWon[i]
					playersData[i] = PlayerRoundData{
						Bid:        st.Bids[i],
						Won:        &won,
						Events:     st.RoundEvents[i],
						AmmoChoice: st.AmmoChoices[i],
					}
				}

				for i := 0; i < st.Config.PlayerCount; i++ {
					ctx := ScoreBreakdownContext{
						HandSize:      st.HandSize,
						PlayerIndex:   i,
						Player:        playersData[i],
						RoundPlayers:  playersData,
						ScoringSystem: st.Config.ScoringSystem,
					}
					bd := ComputeRoundScoreBreakdown(ctx)
					breakdowns[i] = bd
					st.RoundScores[i] = bd.Total
				}

				evs = append(evs, game.Event{
					Type:  "round_scoring",
					Actor: game.Actor{Role: game.RoleSystem},
					Payload: map[string]any{
						"roundIndex":  st.RoundIndex,
						"breakdowns":  breakdowns,
						"roundScores": st.RoundScores,
					},
				})
			}
		}
		return evs, nil

	case "confirm_round":
		for i := 0; i < st.Config.PlayerCount; i++ {
			st.CumulativeScores[i] += st.RoundScores[i]
		}

		var breakdowns []RoundScoreBreakdown
		// Reconstruct breakdowns for history
		playersData := make([]PlayerRoundData, st.Config.PlayerCount)
		for i := 0; i < st.Config.PlayerCount; i++ {
			won := st.TricksWon[i]
			playersData[i] = PlayerRoundData{
				Bid:        st.Bids[i],
				Won:        &won,
				Events:     st.RoundEvents[i],
				AmmoChoice: st.AmmoChoices[i],
			}
		}
		for i := 0; i < st.Config.PlayerCount; i++ {
			bd := ComputeRoundScoreBreakdown(ScoreBreakdownContext{
				HandSize:      st.HandSize,
				PlayerIndex:   i,
				Player:        playersData[i],
				RoundPlayers:  playersData,
				ScoringSystem: st.Config.ScoringSystem,
			})
			breakdowns = append(breakdowns, bd)
		}

		st.RoundHistory = append(st.RoundHistory, RoundHistoryRecord{
			RoundIndex: st.RoundIndex,
			HandSize:   st.HandSize,
			Scores:     breakdowns,
		})

		nextRoundIdx := st.RoundIndex + 1
		if nextRoundIdx >= len(st.Config.RoundsSchema) {
			st.Phase = "game_over"
			return []game.Event{{
				Type:  "game_over",
				Actor: game.Actor{Role: game.RoleSystem},
				Payload: map[string]any{
					"cumulativeScores": st.CumulativeScores,
				},
			}}, nil
		}

		startNewRound(st, nextRoundIdx)
		return []game.Event{{
			Type:  "round_started",
			Actor: game.Actor{Role: game.RoleSystem},
			Payload: map[string]any{
				"roundIndex": nextRoundIdx,
				"handSize":   st.HandSize,
			},
		}}, nil
	}

	return nil, nil
}

func (s *SkullKingGame) Tick(_ game.State, _ time.Duration) ([]game.Event, error) {
	return nil, nil
}

type SkullKingView struct {
	Phase            string               `json:"phase"`
	RoundIndex       int                  `json:"roundIndex"`
	HandSize         int                  `json:"handSize"`
	MySeat           int                  `json:"mySeat"`
	MyHand           []Card               `json:"myHand,omitempty"`
	HandCounts       []int                `json:"handCounts"`
	TrickLeaderIndex int                  `json:"trickLeaderIndex"`
	CurrentTrick     []PlayedCard         `json:"currentTrick"`
	CompletedTricks  []TrickResult        `json:"completedTricks"`
	Bids             []*int               `json:"bids,omitempty"`
	TricksWon        []int                `json:"tricksWon"`
	CumulativeScores []int                `json:"cumulativeScores"`
	RoundScores      []int                `json:"roundScores,omitempty"`
	RoundHistory     []RoundHistoryRecord `json:"roundHistory"`
}

func (s *SkullKingGame) View(state game.State, audience game.Audience) (any, error) {
	st := state.(*MatchState)
	pCount := st.Config.PlayerCount

	handCounts := make([]int, pCount)
	for i := 0; i < pCount; i++ {
		handCounts[i] = len(st.Hands[i])
	}

	var myHand []Card
	if audience.Seat >= 0 && audience.Seat < pCount {
		myHand = st.Hands[audience.Seat]
	}

	// Mask bids during simultaneous bidding phase for other seats
	visibleBids := make([]*int, pCount)
	if st.Phase == "bidding" {
		for i := 0; i < pCount; i++ {
			if audience.Seat == i && st.Bids[i] != nil {
				visibleBids[i] = st.Bids[i]
			}
		}
	} else {
		visibleBids = st.Bids
	}

	return SkullKingView{
		Phase:            st.Phase,
		RoundIndex:       st.RoundIndex,
		HandSize:         st.HandSize,
		MySeat:           audience.Seat,
		MyHand:           myHand,
		HandCounts:       handCounts,
		TrickLeaderIndex: st.TrickLeaderIndex,
		CurrentTrick:     st.CurrentTrick,
		CompletedTricks:  st.CompletedTricks,
		Bids:             visibleBids,
		TricksWon:        st.TricksWon,
		CumulativeScores: st.CumulativeScores,
		RoundScores:      st.RoundScores,
		RoundHistory:     st.RoundHistory,
	}, nil
}

func (s *SkullKingGame) Phase(state game.State) string {
	return state.(*MatchState).Phase
}

func (s *SkullKingGame) IsOver(state game.State) bool {
	return state.(*MatchState).Phase == "game_over"
}
