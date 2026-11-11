package connectfour_test

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/manovaspace/gub/server/core/game"
	"github.com/manovaspace/gub/server/core/registry"
	"github.com/manovaspace/gub/server/games/connectfour"
)

func TestConnectFourRegistry(t *testing.T) {
	g, err := registry.Get("connectfour")
	if err != nil {
		t.Fatalf("failed to get connectfour from registry: %v", err)
	}
	def := g.Def()
	if def.ID != "connectfour" || def.MinPlayers != 2 || def.MaxPlayers != 2 {
		t.Errorf("unexpected game def: %+v", def)
	}
}

func TestConnectFourBasicFlow(t *testing.T) {
	g, _ := registry.Get("connectfour")
	st, err := g.Setup(nil, 42, []int{0, 1})
	if err != nil {
		t.Fatalf("setup failed: %v", err)
	}

	p1 := game.Actor{ID: "p1", Seat: 0, Role: game.RolePlayer}
	p2 := game.Actor{ID: "p2", Seat: 1, Role: game.RolePlayer}

	if g.Phase(st) != "playing" {
		t.Errorf("expected phase playing, got %s", g.Phase(st))
	}
	if g.IsOver(st) {
		t.Errorf("game should not be over")
	}

	// Player 1 drops in column 3
	payload, _ := json.Marshal(connectfour.DropDiscPayload{Column: 3})
	evs, err := g.Apply(st, p1, game.Command{Type: "drop_disc", Payload: payload})
	if err != nil {
		t.Fatalf("player 1 move failed: %v", err)
	}
	if len(evs) != 2 || evs[0].Type != "disc_dropped" || evs[1].Type != "turn_changed" {
		t.Errorf("unexpected events: %+v", evs)
	}

	// It's player 2's turn now; player 1 trying to play should fail
	err = g.Validate(st, p1, game.Command{Type: "drop_disc", Payload: payload})
	if err != game.ErrNotYourTurn {
		t.Errorf("expected ErrNotYourTurn, got %v", err)
	}

	// Player 2 drops in column 3 (stacked on top of player 1's disc)
	_, err = g.Apply(st, p2, game.Command{Type: "drop_disc", Payload: payload})
	if err != nil {
		t.Fatalf("player 2 move failed: %v", err)
	}

	// Check view
	view1, _ := g.View(st, game.Audience{ID: "p1", Seat: 0, Role: game.RolePlayer})
	viewViewer, _ := g.View(st, game.Audience{ID: "viewer", Role: game.RoleViewer})

	s1 := view1.(*connectfour.State)
	sV := viewViewer.(*connectfour.State)

	if s1.Board[5][3] != 1 || s1.Board[4][3] != 2 {
		t.Errorf("unexpected board state: %+v", s1.Board)
	}
	if s1.Board != sV.Board {
		t.Errorf("viewer and player should see identical board")
	}
}

func TestConnectFourHorizontalWin(t *testing.T) {
	g, _ := registry.Get("connectfour")
	st, _ := g.Setup(nil, 42, []int{0, 1})

	p1 := game.Actor{ID: "p1", Seat: 0, Role: game.RolePlayer}
	p2 := game.Actor{ID: "p2", Seat: 1, Role: game.RolePlayer}

	// Moves:
	// P1: col 0, P2: col 0
	// P1: col 1, P2: col 1
	// P1: col 2, P2: col 2
	// P1: col 3 -> P1 wins horizontally on row 5!
	moves := []struct {
		actor  game.Actor
		column int
	}{
		{p1, 0}, {p2, 0},
		{p1, 1}, {p2, 1},
		{p1, 2}, {p2, 2},
		{p1, 3},
	}

	for i, m := range moves {
		payload, _ := json.Marshal(connectfour.DropDiscPayload{Column: m.column})
		evs, err := g.Apply(st, m.actor, game.Command{Type: "drop_disc", Payload: payload})
		if err != nil {
			t.Fatalf("move %d failed: %v", i, err)
		}
		if i == len(moves)-1 {
			// Winning move
			hasWin := false
			for _, ev := range evs {
				if ev.Type == "game_won" {
					hasWin = true
				}
			}
			if !hasWin {
				t.Errorf("expected game_won event on final move")
			}
		}
	}

	if !g.IsOver(st) {
		t.Errorf("game should be over")
	}
	if g.Phase(st) != "game_over" {
		t.Errorf("expected phase game_over, got %s", g.Phase(st))
	}
	s := st.(*connectfour.State)
	if s.WinnerSeat == nil || *s.WinnerSeat != 0 {
		t.Errorf("expected player 1 (seat 0) to win, got %v", s.WinnerSeat)
	}
	if len(s.WinningCells) < 4 {
		t.Errorf("expected at least 4 winning cells, got %d", len(s.WinningCells))
	}
}

func TestConnectFourVerticalWin(t *testing.T) {
	g, _ := registry.Get("connectfour")
	st, _ := g.Setup(nil, 42, []int{0, 1})

	p1 := game.Actor{ID: "p1", Seat: 0, Role: game.RolePlayer}
	p2 := game.Actor{ID: "p2", Seat: 1, Role: game.RolePlayer}

	// P1 stacks column 0, P2 stacks column 1
	// P1: 0, P2: 1
	// P1: 0, P2: 1
	// P1: 0, P2: 1
	// P1: 0 -> P1 wins vertically!
	moves := []struct {
		actor  game.Actor
		column int
	}{
		{p1, 0}, {p2, 1},
		{p1, 0}, {p2, 1},
		{p1, 0}, {p2, 1},
		{p1, 0},
	}

	for _, m := range moves {
		payload, _ := json.Marshal(connectfour.DropDiscPayload{Column: m.column})
		if _, err := g.Apply(st, m.actor, game.Command{Type: "drop_disc", Payload: payload}); err != nil {
			t.Fatalf("move failed: %v", err)
		}
	}

	if !g.IsOver(st) {
		t.Errorf("game should be over")
	}
	s := st.(*connectfour.State)
	if s.WinnerSeat == nil || *s.WinnerSeat != 0 {
		t.Errorf("expected player 1 to win vertically")
	}
}

func TestConnectFourDiagonalWin(t *testing.T) {
	g, _ := registry.Get("connectfour")
	st, _ := g.Setup(nil, 42, []int{0, 1})

	p1 := game.Actor{ID: "p1", Seat: 0, Role: game.RolePlayer}
	p2 := game.Actor{ID: "p2", Seat: 1, Role: game.RolePlayer}

	// Diagonal setup:
	// Col 0: P1 (row 5)
	// Col 1: P2 (row 5), P1 (row 4)
	// Col 2: P2 (row 5), P2 (row 4), P1 (row 3)
	// Col 3: P2 (row 5), P2 (row 4), P2 (row 3), P1 (row 2)
	moves := []struct {
		actor  game.Actor
		column int
	}{
		{p1, 0}, // P1 (5,0)
		{p2, 1}, // P2 (5,1)
		{p1, 1}, // P1 (4,1)
		{p2, 2}, // P2 (5,2)
		{p1, 3}, // P1 (5,3)
		{p2, 2}, // P2 (4,2)
		{p1, 2}, // P1 (3,2)
		{p2, 3}, // P2 (4,3)
		{p1, 4}, // P1 (5,4)
		{p2, 3}, // P2 (3,3)
		{p1, 3}, // P1 (2,3) -> Diagonal win! (5,0), (4,1), (3,2), (2,3)
	}

	for i, m := range moves {
		payload, _ := json.Marshal(connectfour.DropDiscPayload{Column: m.column})
		_, err := g.Apply(st, m.actor, game.Command{Type: "drop_disc", Payload: payload})
		if err != nil {
			t.Fatalf("move %d failed: %v", i, err)
		}
	}

	if !g.IsOver(st) {
		t.Errorf("game should be over from diagonal win")
	}
	s := st.(*connectfour.State)
	if s.WinnerSeat == nil || *s.WinnerSeat != 0 {
		t.Errorf("expected player 1 to win diagonally")
	}
}

func TestConnectFourColumnFull(t *testing.T) {
	g, _ := registry.Get("connectfour")
	st, _ := g.Setup(nil, 42, []int{0, 1})

	p1 := game.Actor{ID: "p1", Seat: 0, Role: game.RolePlayer}
	p2 := game.Actor{ID: "p2", Seat: 1, Role: game.RolePlayer}

	// Fill column 0 (6 rows)
	for i := 0; i < 6; i++ {
		actor := p1
		if i%2 == 1 {
			actor = p2
		}
		payload, _ := json.Marshal(connectfour.DropDiscPayload{Column: 0})
		if _, err := g.Apply(st, actor, game.Command{Type: "drop_disc", Payload: payload}); err != nil {
			t.Fatalf("move %d failed: %v", i, err)
		}
	}

	// 7th disc in column 0 must fail
	payload, _ := json.Marshal(connectfour.DropDiscPayload{Column: 0})
	err := g.Validate(st, p1, game.Command{Type: "drop_disc", Payload: payload})
	if err != connectfour.ErrColumnFull {
		t.Errorf("expected ErrColumnFull, got %v", err)
	}
}

func TestConnectFourTimeout(t *testing.T) {
	g, _ := registry.Get("connectfour")
	cfg, _ := json.Marshal(connectfour.Config{TimeLimitSeconds: 10})
	st, _ := g.Setup(cfg, 42, []int{0, 1})

	// Advance time by 5 seconds: still ongoing
	evs, err := g.Tick(st, 5*time.Second)
	if err != nil || len(evs) != 0 {
		t.Fatalf("unexpected tick: %v, %v", evs, err)
	}
	if g.IsOver(st) {
		t.Errorf("game should not be over after 5 seconds")
	}

	// Advance time by another 6 seconds (total 11s > 10s): timeout!
	evs, err = g.Tick(st, 6*time.Second)
	if err != nil {
		t.Fatalf("tick error: %v", err)
	}
	if len(evs) != 1 || evs[0].Type != "game_timeout" {
		t.Errorf("expected game_timeout event, got %+v", evs)
	}
	if !g.IsOver(st) {
		t.Errorf("game should be over on timeout")
	}
	s := st.(*connectfour.State)
	// Player 0 timed out, so player 1 should be the winner
	if s.WinnerSeat == nil || *s.WinnerSeat != 1 {
		t.Errorf("expected opponent (seat 1) to win on timeout, got %v", s.WinnerSeat)
	}
}
