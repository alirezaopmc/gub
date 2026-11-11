package connectfour

import (
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/manovaspace/gub/server/core/game"
	"github.com/manovaspace/gub/server/core/registry"
)

func init() {
	_ = registry.Register(&ConnectFourGame{})
}

const (
	Cols         = 7
	Rows         = 6
	ConnectToWin = 4
)

var (
	ErrColumnFull = errors.New("column is full")
	ErrInvalidCol = errors.New("column out of range")
)

type Config struct {
	TimeLimitSeconds int `json:"timeLimitSeconds"` // 0 for unlimited, or e.g. 30
}

type ConnectFourGame struct{}

type State struct {
	Board         [Rows][Cols]int `json:"board"`                // 0 = empty, 1 = Player 1 (seat 0), 2 = Player 2 (seat 1)
	CurrentTurn   int             `json:"currentTurn"`          // seat 0 or 1
	WinnerSeat    *int            `json:"winnerSeat,omitempty"` // nil if ongoing, pointer to winning seat
	IsDraw        bool            `json:"isDraw"`
	WinningCells  [][2]int        `json:"winningCells,omitempty"` // [{r, c}, ...]
	MoveCount     int             `json:"moveCount"`
	PlayerSeats   []int           `json:"playerSeats"`
	TimeLimitSec  int             `json:"timeLimitSec"`
	TimeRemainSec float64         `json:"timeRemainSec"`
}

func (g *ConnectFourGame) Def() game.GameDef {
	return game.GameDef{
		ID:            "connectfour",
		Name:          "Connect Four",
		MinPlayers:    2,
		MaxPlayers:    2,
		TickRate:      0, // turn-based discrete
		DefaultConfig: json.RawMessage(`{"timeLimitSeconds": 0}`),
	}
}

func (g *ConnectFourGame) Setup(rawConfig json.RawMessage, seed int64, playerSeats []int) (game.State, error) {
	if len(playerSeats) != 2 {
		return nil, fmt.Errorf("connectfour requires exactly 2 players, got %d", len(playerSeats))
	}

	cfg := Config{}
	if len(rawConfig) > 0 {
		_ = json.Unmarshal(rawConfig, &cfg)
	}

	state := &State{
		CurrentTurn:   playerSeats[0],
		PlayerSeats:   playerSeats,
		TimeLimitSec:  cfg.TimeLimitSeconds,
		TimeRemainSec: float64(cfg.TimeLimitSeconds),
	}
	return state, nil
}

// UnmarshalState restores a State from a snapshot blob.
func (g *ConnectFourGame) UnmarshalState(data []byte) (game.State, error) {
	var st State
	if err := json.Unmarshal(data, &st); err != nil {
		return nil, err
	}
	return &st, nil
}

type DropDiscPayload struct {
	Column int `json:"column"`
}

func (g *ConnectFourGame) Validate(st game.State, actor game.Actor, cmd game.Command) error {
	state, ok := st.(*State)
	if !ok {
		return errors.New("invalid state type")
	}

	if state.WinnerSeat != nil || state.IsDraw {
		return game.ErrGameFinished
	}

	if actor.Role != game.RolePlayer {
		return game.ErrUnauthorized
	}

	if actor.Seat != state.CurrentTurn {
		return game.ErrNotYourTurn
	}

	switch cmd.Type {
	case "drop_disc":
		var p DropDiscPayload
		if err := json.Unmarshal(cmd.Payload, &p); err != nil {
			return game.ErrInvalidCommand
		}
		if p.Column < 0 || p.Column >= Cols {
			return ErrInvalidCol
		}
		if state.Board[0][p.Column] != 0 {
			return ErrColumnFull
		}
		return nil
	default:
		return game.ErrInvalidCommand
	}
}

func (g *ConnectFourGame) Apply(st game.State, actor game.Actor, cmd game.Command) ([]game.Event, error) {
	if err := g.Validate(st, actor, cmd); err != nil {
		return nil, err
	}

	state := st.(*State)

	var p DropDiscPayload
	_ = json.Unmarshal(cmd.Payload, &p)

	// Determine player disc: seat 0 is 1, seat 1 is 2
	disc := 1
	if actor.Seat == state.PlayerSeats[1] {
		disc = 2
	}

	// Drop into lowest available row in column p.Column
	rowPlaced := -1
	for r := Rows - 1; r >= 0; r-- {
		if state.Board[r][p.Column] == 0 {
			state.Board[r][p.Column] = disc
			rowPlaced = r
			break
		}
	}

	state.MoveCount++
	state.TimeRemainSec = float64(state.TimeLimitSec)

	events := []game.Event{
		{
			Type:  "disc_dropped",
			Actor: actor,
			Payload: map[string]any{
				"column": p.Column,
				"row":    rowPlaced,
				"seat":   actor.Seat,
				"disc":   disc,
			},
		},
	}

	// Check if this move wins the game
	if winCells, won := checkWin(state.Board, rowPlaced, p.Column, disc); won {
		seat := actor.Seat
		state.WinnerSeat = &seat
		state.WinningCells = winCells
		events = append(events, game.Event{
			Type:  "game_won",
			Actor: actor,
			Payload: map[string]any{
				"winnerSeat":   seat,
				"winningCells": winCells,
			},
		})
		return events, nil
	}

	// Check draw (all slots filled)
	if state.MoveCount == Rows*Cols {
		state.IsDraw = true
		events = append(events, game.Event{
			Type:  "game_draw",
			Actor: actor,
			Payload: map[string]any{
				"moves": state.MoveCount,
			},
		})
		return events, nil
	}

	// Switch turn to next player
	if state.CurrentTurn == state.PlayerSeats[0] {
		state.CurrentTurn = state.PlayerSeats[1]
	} else {
		state.CurrentTurn = state.PlayerSeats[0]
	}

	events = append(events, game.Event{
		Type:  "turn_changed",
		Actor: actor,
		Payload: map[string]any{
			"currentTurn": state.CurrentTurn,
		},
	})

	return events, nil
}

func (g *ConnectFourGame) Tick(st game.State, dt time.Duration) ([]game.Event, error) {
	state, ok := st.(*State)
	if !ok || state.WinnerSeat != nil || state.IsDraw || state.TimeLimitSec <= 0 {
		return nil, nil
	}

	state.TimeRemainSec -= dt.Seconds()
	if state.TimeRemainSec <= 0 {
		state.TimeRemainSec = 0
		// Current player timed out, opponent wins
		opponentSeat := state.PlayerSeats[0]
		if state.CurrentTurn == state.PlayerSeats[0] {
			opponentSeat = state.PlayerSeats[1]
		}
		state.WinnerSeat = &opponentSeat
		return []game.Event{
			{
				Type: "game_timeout",
				Actor: game.Actor{
					ID:   "system",
					Role: game.RoleSystem,
				},
				Payload: map[string]any{
					"timedOutSeat": state.CurrentTurn,
					"winnerSeat":   opponentSeat,
				},
			},
		}, nil
	}

	return nil, nil
}

func (g *ConnectFourGame) View(st game.State, audience game.Audience) (any, error) {
	state, ok := st.(*State)
	if !ok {
		return nil, errors.New("invalid state type")
	}
	// Open information: every audience sees the identical board and game status
	return state, nil
}

func (g *ConnectFourGame) Phase(st game.State) string {
	state, ok := st.(*State)
	if !ok {
		return "unknown"
	}
	if state.WinnerSeat != nil || state.IsDraw {
		return "game_over"
	}
	return "playing"
}

func (g *ConnectFourGame) IsOver(st game.State) bool {
	state, ok := st.(*State)
	if !ok {
		return true
	}
	return state.WinnerSeat != nil || state.IsDraw
}

// checkWin inspects 4 directions around (row, col) for 4 in a row of target disc.
func checkWin(board [Rows][Cols]int, row, col, disc int) ([][2]int, bool) {
	directions := [][2]int{
		{0, 1},  // horizontal
		{1, 0},  // vertical
		{1, 1},  // diagonal down-right
		{1, -1}, // diagonal down-left
	}

	for _, d := range directions {
		dr, dc := d[0], d[1]
		cells := [][2]int{{row, col}}

		// Scan forward
		r, c := row+dr, col+dc
		for r >= 0 && r < Rows && c >= 0 && c < Cols && board[r][c] == disc {
			cells = append(cells, [2]int{r, c})
			r += dr
			c += dc
		}

		// Scan backward
		r, c = row-dr, col-dc
		for r >= 0 && r < Rows && c >= 0 && c < Cols && board[r][c] == disc {
			cells = append([][2]int{{r, c}}, cells...)
			r -= dr
			c -= dc
		}

		if len(cells) >= ConnectToWin {
			return cells, true
		}
	}

	return nil, false
}
