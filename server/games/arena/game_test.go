package arena_test

import (
	"encoding/json"
	"math"
	"testing"
	"time"

	"github.com/manovaspace/gub/server/core/game"
	"github.com/manovaspace/gub/server/core/registry"
	"github.com/manovaspace/gub/server/games/arena"
)

func TestArenaRegistry(t *testing.T) {
	g, err := registry.Get("arena")
	if err != nil {
		t.Fatalf("failed to get arena from registry: %v", err)
	}
	def := g.Def()
	if def.ID != "arena" || def.MinPlayers != 2 || def.MaxPlayers != 4 || def.TickRate != 20 {
		t.Errorf("unexpected game def: %+v", def)
	}
}

func TestArenaSetup(t *testing.T) {
	g, _ := registry.Get("arena")
	st, err := g.Setup(nil, 12345, []int{0, 1, 2})
	if err != nil {
		t.Fatalf("setup failed: %v", err)
	}

	state := st.(*arena.State)
	if len(state.Players) != 3 {
		t.Errorf("expected 3 players, got %d", len(state.Players))
	}
	if len(state.Coins) != 5 {
		t.Errorf("expected 5 initial coins, got %d", len(state.Coins))
	}
	if g.Phase(st) != "playing" || g.IsOver(st) {
		t.Errorf("game should be playing")
	}
}

func TestArenaVelocityClamping(t *testing.T) {
	g, _ := registry.Get("arena")
	st, _ := g.Setup(nil, 42, []int{0, 1})

	p1 := game.Actor{ID: "p1", Seat: 0, Role: game.RolePlayer}

	// Send huge velocity: vx = 1000, vy = 1000 (hypot ≈ 1414)
	payload, _ := json.Marshal(arena.SetVelocityPayload{VX: 1000, VY: 1000})
	_, err := g.Apply(st, p1, game.Command{Type: "set_velocity", Payload: payload})
	if err != nil {
		t.Fatalf("apply failed: %v", err)
	}

	state := st.(*arena.State)
	player := state.Players[0]
	speed := math.Hypot(player.VX, player.VY)
	if math.Abs(speed-state.Config.MaxSpeed) > 0.001 {
		t.Errorf("expected clamped speed %.2f, got %.2f", state.Config.MaxSpeed, speed)
	}
}

func TestArenaMovementAndWallBounce(t *testing.T) {
	g, _ := registry.Get("arena")
	st, _ := g.Setup(nil, 42, []int{0, 1})

	state := st.(*arena.State)
	p0 := state.Players[0]
	p0.X = 50.0
	p0.Y = 500.0
	p0.VX = -100.0 // moving left towards wall
	p0.VY = 0

	// Tick 1 second: should hit left wall (x = p.Radius = 25.0) and bounce to positive VX
	evs, err := g.Tick(st, 1*time.Second)
	if err != nil {
		t.Fatalf("tick failed: %v", err)
	}
	_ = evs

	if p0.X < p0.Radius {
		t.Errorf("player penetrated left wall: x=%.2f", p0.X)
	}
	if p0.VX <= 0 {
		t.Errorf("expected positive VX after bounce, got %.2f", p0.VX)
	}
}

func TestArenaPlayerCollision(t *testing.T) {
	g, _ := registry.Get("arena")
	st, _ := g.Setup(nil, 42, []int{0, 1})

	state := st.(*arena.State)
	p0 := state.Players[0]
	p1 := state.Players[1]

	// Place them heading towards each other
	p0.X = 400.0
	p0.Y = 500.0
	p0.VX = 100.0
	p0.VY = 0

	p1.X = 440.0 // Distance 40 < 2 * 25 (50)
	p1.Y = 500.0
	p1.VX = -100.0
	p1.VY = 0

	evs, err := g.Tick(st, 50*time.Millisecond) // 20 Hz tick
	if err != nil {
		t.Fatalf("tick failed: %v", err)
	}

	collisionFound := false
	for _, ev := range evs {
		if ev.Type == "player_collision" {
			collisionFound = true
		}
	}
	if !collisionFound {
		t.Errorf("expected player_collision event")
	}
	if p0.Bounces != 1 || p1.Bounces != 1 {
		t.Errorf("expected 1 bounce each, got p0=%d, p1=%d", p0.Bounces, p1.Bounces)
	}
}

func TestArenaCoinCollectionAndTargetWin(t *testing.T) {
	g, _ := registry.Get("arena")
	// Target coins = 2 for quick test
	cfg, _ := json.Marshal(arena.Config{
		MaxSpeed:     300.0,
		TargetCoins:  2,
		TimeLimitSec: 60.0,
		MaxCoins:     3,
	})
	st, _ := g.Setup(cfg, 42, []int{0, 1})

	state := st.(*arena.State)
	p0 := state.Players[0]

	// Put coin right on top of player 0
	state.Coins[0].X = p0.X
	state.Coins[0].Y = p0.Y

	evs, err := g.Tick(st, 50*time.Millisecond)
	if err != nil {
		t.Fatalf("tick failed: %v", err)
	}

	if p0.Coins != 1 {
		t.Errorf("expected 1 coin collected, got %d", p0.Coins)
	}
	if g.IsOver(st) {
		t.Errorf("game should not be over yet (target is 2)")
	}

	// Put another coin on top of player 0
	state.Coins[0].X = p0.X
	state.Coins[0].Y = p0.Y

	evs, err = g.Tick(st, 50*time.Millisecond)
	if err != nil {
		t.Fatalf("tick failed: %v", err)
	}

	if p0.Coins != 2 {
		t.Errorf("expected 2 coins, got %d", p0.Coins)
	}
	if !g.IsOver(st) {
		t.Errorf("game should be over after reaching target coins")
	}
	if g.Phase(st) != "game_over" {
		t.Errorf("expected phase game_over, got %s", g.Phase(st))
	}
	if state.WinnerSeat == nil || *state.WinnerSeat != 0 {
		t.Errorf("expected player 0 to win, got %v", state.WinnerSeat)
	}

	hasWinEvent := false
	for _, ev := range evs {
		if ev.Type == "game_won" {
			hasWinEvent = true
		}
	}
	if !hasWinEvent {
		t.Errorf("expected game_won event")
	}
}

func TestArenaTimeLimitWin(t *testing.T) {
	g, _ := registry.Get("arena")
	cfg, _ := json.Marshal(arena.Config{
		MaxSpeed:     300.0,
		TargetCoins:  10,
		TimeLimitSec: 10.0,
		MaxCoins:     5,
	})
	st, _ := g.Setup(cfg, 42, []int{0, 1})

	state := st.(*arena.State)
	// Player 1 has 3 coins, Player 0 has 1 coin
	state.Players[1].Coins = 3
	state.Players[0].Coins = 1

	// Tick 11 seconds
	evs, err := g.Tick(st, 11*time.Second)
	if err != nil {
		t.Fatalf("tick failed: %v", err)
	}

	if !g.IsOver(st) {
		t.Errorf("game should be over on time limit")
	}
	if state.WinnerSeat == nil || *state.WinnerSeat != 1 {
		t.Errorf("expected player 1 to win on timeout with more coins, got %v", state.WinnerSeat)
	}

	hasWinEvent := false
	for _, ev := range evs {
		if ev.Type == "game_won" {
			hasWinEvent = true
		}
	}
	if !hasWinEvent {
		t.Errorf("expected game_won event")
	}
}
