package game

import (
	"encoding/json"
	"errors"
	"time"
)

var (
	ErrInvalidCommand = errors.New("invalid command")
	ErrIllegalMove    = errors.New("illegal move")
	ErrNotYourTurn    = errors.New("not your turn")
	ErrGameFinished   = errors.New("game finished")
	ErrUnauthorized   = errors.New("unauthorized action")
)

type Role string

const (
	RoleHost   Role = "host"
	RolePlayer Role = "player"
	RoleViewer Role = "viewer"
	RoleBot    Role = "bot"
	RoleSystem Role = "system"
)

type Actor struct {
	ID   string `json:"id"`
	Seat int    `json:"seat"`
	Role Role   `json:"role"`
}

type Audience struct {
	ID   string `json:"id"`
	Seat int    `json:"seat"`
	Role Role   `json:"role"`
}

type Command struct {
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload"`
}

type Event struct {
	Type    string `json:"type"`
	Actor   Actor  `json:"actor"`
	Payload any    `json:"payload"`
}

type GameDef struct {
	ID            string          `json:"id"`
	Name          string          `json:"name"`
	MinPlayers    int             `json:"minPlayers"`
	MaxPlayers    int             `json:"maxPlayers"`
	TickRate      int             `json:"tickRate"` // 0 for turn-based, > 0 for ticks/sec
	DefaultConfig json.RawMessage `json:"defaultConfig"`
}

type State any

type Game interface {
	Def() GameDef
	Setup(rawConfig json.RawMessage, seed int64, playerSeats []int) (State, error)
	Validate(state State, actor Actor, cmd Command) error
	Apply(state State, actor Actor, cmd Command) ([]Event, error)
	Tick(state State, dt time.Duration) ([]Event, error)
	View(state State, audience Audience) (any, error)
	Phase(state State) string
	IsOver(state State) bool
}
