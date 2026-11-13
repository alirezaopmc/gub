package registry_test

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/manovaspace/gub/server/core/game"
	"github.com/manovaspace/gub/server/core/registry"
)

type mockGame struct {
	id string
}

func (m *mockGame) Def() game.GameDef {
	return game.GameDef{
		ID:         m.id,
		Name:       "Mock " + m.id,
		MinPlayers: 2,
		MaxPlayers: 4,
	}
}

func (m *mockGame) Setup(rawConfig json.RawMessage, seed int64, playerSeats []int) (game.State, error) {
	return "mock_state", nil
}

func (m *mockGame) Validate(state game.State, actor game.Actor, cmd game.Command) error {
	return nil
}

func (m *mockGame) Apply(state game.State, actor game.Actor, cmd game.Command) ([]game.Event, error) {
	return nil, nil
}

func (m *mockGame) Tick(state game.State, dt time.Duration) ([]game.Event, error) {
	return nil, nil
}

func (m *mockGame) View(state game.State, audience game.Audience) (any, error) {
	return state, nil
}

func (m *mockGame) Phase(state game.State) string {
	return "playing"
}

func (m *mockGame) IsOver(state game.State) bool {
	return false
}

func TestRegistry(t *testing.T) {
	reg := registry.New()

	g1 := &mockGame{id: "game1"}
	if err := reg.Register(g1); err != nil {
		t.Fatalf("unexpected error registering game: %v", err)
	}

	// Duplicate registration error
	if err := reg.Register(g1); err == nil {
		t.Fatalf("expected error on duplicate register, got nil")
	}

	// Lookup registered
	got, err := reg.Get("game1")
	if err != nil {
		t.Fatalf("unexpected error getting game: %v", err)
	}
	if got.Def().ID != "game1" {
		t.Errorf("expected ID 'game1', got '%s'", got.Def().ID)
	}

	// Lookup non-existent
	if _, err := reg.Get("nonexistent"); err == nil {
		t.Errorf("expected error getting nonexistent game, got nil")
	}

	// List
	list := reg.List()
	if len(list) != 1 {
		t.Errorf("expected 1 game in list, got %d", len(list))
	}
}
