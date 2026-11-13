package registry

import (
	"errors"
	"fmt"
	"sync"

	"github.com/manovaspace/gub/server/core/game"
)

var (
	ErrGameNotFound      = errors.New("game not found")
	ErrGameAlreadyExists = errors.New("game already registered")
)

type Registry struct {
	mu    sync.RWMutex
	games map[string]game.Game
}

func New() *Registry {
	return &Registry{
		games: make(map[string]game.Game),
	}
}

var Default = New()

func Register(g game.Game) error {
	return Default.Register(g)
}

func Get(gameID string) (game.Game, error) {
	return Default.Get(gameID)
}

func List() []game.GameDef {
	return Default.List()
}

func (r *Registry) Register(g game.Game) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	def := g.Def()
	if def.ID == "" {
		return errors.New("game ID cannot be empty")
	}
	if _, exists := r.games[def.ID]; exists {
		return fmt.Errorf("%w: %s", ErrGameAlreadyExists, def.ID)
	}
	r.games[def.ID] = g
	return nil
}

func (r *Registry) Get(gameID string) (game.Game, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	g, exists := r.games[gameID]
	if !exists {
		return nil, fmt.Errorf("%w: %s", ErrGameNotFound, gameID)
	}
	return g, nil
}

func (r *Registry) List() []game.GameDef {
	r.mu.RLock()
	defer r.mu.RUnlock()

	defs := make([]game.GameDef, 0, len(r.games))
	for _, g := range r.games {
		defs = append(defs, g.Def())
	}
	return defs
}
