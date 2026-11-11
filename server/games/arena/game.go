package arena

import (
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"math/rand"
	"time"

	"github.com/manovaspace/gub/server/core/game"
	"github.com/manovaspace/gub/server/core/registry"
)

func init() {
	_ = registry.Register(&ArenaGame{})
}

const (
	FieldWidth   = 1000.0
	FieldHeight  = 1000.0
	PlayerRadius = 25.0
	CoinRadius   = 15.0
	DefaultCoins = 5
)

type Config struct {
	MaxSpeed     float64 `json:"maxSpeed"`     // units/sec, default 300.0
	TargetCoins  int     `json:"targetCoins"`  // default 10
	TimeLimitSec float64 `json:"timeLimitSec"` // default 60.0
	MaxCoins     int     `json:"maxCoins"`     // default 5
}

type Player struct {
	Seat    int     `json:"seat"`
	X       float64 `json:"x"`
	Y       float64 `json:"y"`
	VX      float64 `json:"vx"`
	VY      float64 `json:"vy"`
	Radius  float64 `json:"radius"`
	Coins   int     `json:"coins"`
	Bounces int     `json:"bounces"`
}

type Coin struct {
	ID     int     `json:"id"`
	X      float64 `json:"x"`
	Y      float64 `json:"y"`
	Radius float64 `json:"radius"`
}

type State struct {
	Players     map[int]*Player `json:"players"`
	Coins       []Coin          `json:"coins"`
	ElapsedSec  float64         `json:"elapsedSec"`
	TimeLimit   float64         `json:"timeLimit"`
	TargetCoins int             `json:"targetCoins"`
	WinnerSeat  *int            `json:"winnerSeat,omitempty"`
	IsDraw      bool            `json:"isDraw"`
	Over        bool            `json:"over"`
	PlayerSeats []int           `json:"playerSeats"`
	Config      Config          `json:"config"`
	NextCoinID  int             `json:"nextCoinId"`
	RNG         *rand.Rand      `json:"-"`
}

type ArenaGame struct{}

func (g *ArenaGame) Def() game.GameDef {
	return game.GameDef{
		ID:         "arena",
		Name:       "Realtime Arena",
		MinPlayers: 2,
		MaxPlayers: 4,
		TickRate:   20, // 20 Hz fixed tick
		DefaultConfig: json.RawMessage(`{
			"maxSpeed": 300.0,
			"targetCoins": 10,
			"timeLimitSec": 60.0,
			"maxCoins": 5
		}`),
	}
}

func (g *ArenaGame) Setup(rawConfig json.RawMessage, seed int64, playerSeats []int) (game.State, error) {
	if len(playerSeats) < 2 || len(playerSeats) > 4 {
		return nil, fmt.Errorf("arena requires 2 to 4 players, got %d", len(playerSeats))
	}

	cfg := Config{
		MaxSpeed:     300.0,
		TargetCoins:  10,
		TimeLimitSec: 60.0,
		MaxCoins:     5,
	}
	if len(rawConfig) > 0 {
		_ = json.Unmarshal(rawConfig, &cfg)
	}

	rng := rand.New(rand.NewSource(seed))

	// Spawn initial positions at corners
	spawnPositions := [][2]float64{
		{100.0, 100.0},
		{FieldWidth - 100.0, FieldHeight - 100.0},
		{FieldWidth - 100.0, 100.0},
		{100.0, FieldHeight - 100.0},
	}

	players := make(map[int]*Player)
	for i, seat := range playerSeats {
		pos := spawnPositions[i%len(spawnPositions)]
		players[seat] = &Player{
			Seat:    seat,
			X:       pos[0],
			Y:       pos[1],
			VX:      0,
			VY:      0,
			Radius:  PlayerRadius,
			Coins:   0,
			Bounces: 0,
		}
	}

	state := &State{
		Players:     players,
		Coins:       make([]Coin, 0),
		ElapsedSec:  0,
		TimeLimit:   cfg.TimeLimitSec,
		TargetCoins: cfg.TargetCoins,
		PlayerSeats: playerSeats,
		Config:      cfg,
		NextCoinID:  1,
		RNG:         rng,
	}

	// Spawn initial coins
	for len(state.Coins) < cfg.MaxCoins {
		state.spawnCoin()
	}

	return state, nil
}

func (s *State) spawnCoin() {
	padding := CoinRadius + 50.0
	x := padding + s.RNG.Float64()*(FieldWidth-2*padding)
	y := padding + s.RNG.Float64()*(FieldHeight-2*padding)
	s.Coins = append(s.Coins, Coin{
		ID:     s.NextCoinID,
		X:      x,
		Y:      y,
		Radius: CoinRadius,
	})
	s.NextCoinID++
}

type SetVelocityPayload struct {
	VX float64 `json:"vx"`
	VY float64 `json:"vy"`
}

func (g *ArenaGame) Validate(st game.State, actor game.Actor, cmd game.Command) error {
	state, ok := st.(*State)
	if !ok {
		return errors.New("invalid state type")
	}

	if state.Over {
		return game.ErrGameFinished
	}

	if actor.Role != game.RolePlayer {
		return game.ErrUnauthorized
	}

	if _, ok := state.Players[actor.Seat]; !ok {
		return game.ErrUnauthorized
	}

	switch cmd.Type {
	case "set_velocity":
		var p SetVelocityPayload
		if err := json.Unmarshal(cmd.Payload, &p); err != nil {
			return game.ErrInvalidCommand
		}
		return nil
	default:
		return game.ErrInvalidCommand
	}
}

func (g *ArenaGame) Apply(st game.State, actor game.Actor, cmd game.Command) ([]game.Event, error) {
	if err := g.Validate(st, actor, cmd); err != nil {
		return nil, err
	}

	state := st.(*State)
	p := state.Players[actor.Seat]

	var payload SetVelocityPayload
	_ = json.Unmarshal(cmd.Payload, &payload)

	// Clamp speed to maxSpeed
	vx := payload.VX
	vy := payload.VY
	speed := math.Hypot(vx, vy)
	if speed > state.Config.MaxSpeed && speed > 0 {
		scale := state.Config.MaxSpeed / speed
		vx *= scale
		vy *= scale
	}

	p.VX = vx
	p.VY = vy

	return []game.Event{
		{
			Type:  "velocity_set",
			Actor: actor,
			Payload: map[string]any{
				"seat": actor.Seat,
				"vx":   vx,
				"vy":   vy,
			},
		},
	}, nil
}

func (g *ArenaGame) Tick(st game.State, dt time.Duration) ([]game.Event, error) {
	state, ok := st.(*State)
	if !ok || state.Over {
		return nil, nil
	}

	dtSec := dt.Seconds()
	state.ElapsedSec += dtSec

	var events []game.Event

	// 1. Move players & handle boundary collisions
	for _, p := range state.Players {
		p.X += p.VX * dtSec
		p.Y += p.VY * dtSec

		// Wall bounces
		if p.X-p.Radius < 0 {
			p.X = p.Radius
			p.VX = math.Abs(p.VX)
		} else if p.X+p.Radius > FieldWidth {
			p.X = FieldWidth - p.Radius
			p.VX = -math.Abs(p.VX)
		}

		if p.Y-p.Radius < 0 {
			p.Y = p.Radius
			p.VY = math.Abs(p.VY)
		} else if p.Y+p.Radius > FieldHeight {
			p.Y = FieldHeight - p.Radius
			p.VY = -math.Abs(p.VY)
		}
	}

	// 2. Player-to-player circle collisions
	seats := state.PlayerSeats
	for i := 0; i < len(seats); i++ {
		p1 := state.Players[seats[i]]
		for j := i + 1; j < len(seats); j++ {
			p2 := state.Players[seats[j]]

			dx := p2.X - p1.X
			dy := p2.Y - p1.Y
			dist := math.Hypot(dx, dy)
			minDist := p1.Radius + p2.Radius

			if dist < minDist && dist > 0 {
				// Overlap separation
				overlap := minDist - dist
				nx := dx / dist
				ny := dy / dist

				p1.X -= nx * overlap * 0.5
				p1.Y -= ny * overlap * 0.5
				p2.X += nx * overlap * 0.5
				p2.Y += ny * overlap * 0.5

				// Elastic collision response: swap velocity components along normal
				// k = (v1 - v2) . n
				k := (p1.VX-p2.VX)*nx + (p1.VY-p2.VY)*ny
				if k > 0 {
					p1.VX -= k * nx
					p1.VY -= k * ny
					p2.VX += k * nx
					p2.VY += k * ny
				}

				p1.Bounces++
				p2.Bounces++

				events = append(events, game.Event{
					Type: "player_collision",
					Actor: game.Actor{
						ID:   "system",
						Role: game.RoleSystem,
					},
					Payload: map[string]any{
						"seat1": p1.Seat,
						"seat2": p2.Seat,
					},
				})
			}
		}
	}

	// 3. Coin collection
	remainingCoins := make([]Coin, 0, len(state.Coins))
	for _, coin := range state.Coins {
		collected := false
		for _, p := range state.Players {
			dist := math.Hypot(p.X-coin.X, p.Y-coin.Y)
			if dist < p.Radius+coin.Radius {
				p.Coins++
				collected = true
				events = append(events, game.Event{
					Type: "coin_collected",
					Actor: game.Actor{
						ID:   fmt.Sprintf("player-%d", p.Seat),
						Seat: p.Seat,
						Role: game.RolePlayer,
					},
					Payload: map[string]any{
						"seat":   p.Seat,
						"coinId": coin.ID,
						"coins":  p.Coins,
					},
				})

				// Check target coins win condition
				if p.Coins >= state.TargetCoins && !state.Over {
					seat := p.Seat
					state.WinnerSeat = &seat
					state.Over = true
					events = append(events, game.Event{
						Type: "game_won",
						Actor: game.Actor{
							ID:   fmt.Sprintf("player-%d", p.Seat),
							Seat: p.Seat,
							Role: game.RolePlayer,
						},
						Payload: map[string]any{
							"winnerSeat": seat,
							"reason":     "target_coins_reached",
						},
					})
				}
				break
			}
		}

		if !collected {
			remainingCoins = append(remainingCoins, coin)
		}
	}
	state.Coins = remainingCoins

	// Respawn coins if under maxCoins and game not over
	if !state.Over {
		for len(state.Coins) < state.Config.MaxCoins {
			state.spawnCoin()
		}
	}

	// 4. Time limit check
	if !state.Over && state.ElapsedSec >= state.TimeLimit {
		state.Over = true
		// Find player with highest coins
		maxCoins := -1
		bestSeat := -1
		isTie := false

		for _, seat := range state.PlayerSeats {
			p := state.Players[seat]
			if p.Coins > maxCoins {
				maxCoins = p.Coins
				bestSeat = seat
				isTie = false
			} else if p.Coins == maxCoins {
				isTie = true
			}
		}

		if isTie {
			state.IsDraw = true
			events = append(events, game.Event{
				Type: "game_draw",
				Actor: game.Actor{
					ID:   "system",
					Role: game.RoleSystem,
				},
				Payload: map[string]any{
					"reason": "time_limit_reached",
					"coins":  maxCoins,
				},
			})
		} else {
			state.WinnerSeat = &bestSeat
			events = append(events, game.Event{
				Type: "game_won",
				Actor: game.Actor{
					ID:   fmt.Sprintf("player-%d", bestSeat),
					Seat: bestSeat,
					Role: game.RolePlayer,
				},
				Payload: map[string]any{
					"winnerSeat": bestSeat,
					"reason":     "time_limit_reached",
				},
			})
		}
	}

	return events, nil
}

func (g *ArenaGame) View(st game.State, audience game.Audience) (any, error) {
	state, ok := st.(*State)
	if !ok {
		return nil, errors.New("invalid state type")
	}
	// Open continuous information
	return state, nil
}

func (g *ArenaGame) Phase(st game.State) string {
	state, ok := st.(*State)
	if !ok {
		return "unknown"
	}
	if state.Over {
		return "game_over"
	}
	return "playing"
}

func (g *ArenaGame) IsOver(st game.State) bool {
	state, ok := st.(*State)
	if !ok {
		return true
	}
	return state.Over
}
