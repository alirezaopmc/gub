package hub_test

import (
	"bytes"
	"context"
	"encoding/json"
	"sync"
	"testing"
	"time"

	"github.com/manovaspace/gub/server/core/event"
	"github.com/manovaspace/gub/server/core/game"
	"github.com/manovaspace/gub/server/core/hub"
	"github.com/manovaspace/gub/server/core/registry"
	"github.com/manovaspace/gub/server/core/session"
)

// recordGame remembers the config and seed that Setup was called with.
type recordGame struct {
	mu        sync.Mutex
	setupCfg  json.RawMessage
	setupSeed int64
	setups    int
}

func (g *recordGame) Def() game.GameDef {
	return game.GameDef{ID: "recorder", Name: "Recorder", MinPlayers: 1, MaxPlayers: 2}
}

func (g *recordGame) Setup(cfg json.RawMessage, seed int64, _ []int) (game.State, error) {
	g.mu.Lock()
	defer g.mu.Unlock()
	g.setupCfg = cfg
	g.setupSeed = seed
	g.setups++
	return &clickerState{}, nil
}

func (g *recordGame) Validate(_ game.State, _ game.Actor, _ game.Command) error { return nil }

func (g *recordGame) Apply(_ game.State, _ game.Actor, _ game.Command) ([]game.Event, error) {
	return nil, nil
}

func (g *recordGame) Tick(_ game.State, _ time.Duration) ([]game.Event, error) { return nil, nil }

func (g *recordGame) View(state game.State, _ game.Audience) (any, error) { return state, nil }

func (g *recordGame) Phase(_ game.State) string { return "playing" }

func (g *recordGame) IsOver(_ game.State) bool { return false }

func (g *recordGame) recorded() (json.RawMessage, int64, int) {
	g.mu.Lock()
	defer g.mu.Unlock()
	return g.setupCfg, g.setupSeed, g.setups
}

// hubRepo is a minimal in-memory session.Repository for hub tests.
type hubRepo struct {
	mu      sync.Mutex
	rooms   map[string]*hubRoom
	members map[string]session.Member
}

type hubRoom struct {
	rs     session.RoomSession
	config json.RawMessage
	seed   int64
}

func newHubRepo() *hubRepo {
	return &hubRepo{rooms: map[string]*hubRoom{}, members: map[string]session.Member{}}
}

func (r *hubRepo) SaveRoom(_ context.Context, rs *session.RoomSession, config json.RawMessage, seed int64) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.rooms[rs.ID] = &hubRoom{
		rs:     session.RoomSession{ID: rs.ID, Code: rs.Code, GameID: rs.GameID, HostMember: rs.HostMember, MaxPlayers: rs.MaxPlayers},
		config: config,
		seed:   seed,
	}
	return nil
}

func (r *hubRepo) SaveMember(_ context.Context, m *session.Member) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.members[m.ID] = *m
	return nil
}

func (r *hubRepo) SetStarted(_ context.Context, roomID string, started bool) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	room, ok := r.rooms[roomID]
	if !ok {
		return session.ErrRoomNotFound
	}
	room.rs.Started = started
	return nil
}

func (r *hubRepo) load(match func(*hubRoom) bool) (*session.RoomSession, json.RawMessage, int64, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	for _, room := range r.rooms {
		if !match(room) {
			continue
		}
		rs := &session.RoomSession{
			ID: room.rs.ID, Code: room.rs.Code, GameID: room.rs.GameID,
			HostMember: room.rs.HostMember, MaxPlayers: room.rs.MaxPlayers, Started: room.rs.Started,
			Members: map[string]*session.Member{}, Seats: map[int]string{},
		}
		for _, m := range r.members {
			if m.RoomID == room.rs.ID {
				cp := m
				rs.Members[cp.ID] = &cp
				if cp.Seat >= 0 {
					rs.Seats[cp.Seat] = cp.ID
				}
			}
		}
		return rs, room.config, room.seed, nil
	}
	return nil, nil, 0, session.ErrRoomNotFound
}

func (r *hubRepo) LoadRoomByCode(_ context.Context, code string) (*session.RoomSession, json.RawMessage, int64, error) {
	return r.load(func(h *hubRoom) bool { return h.rs.Code == code })
}

func (r *hubRepo) LoadRoomByID(_ context.Context, id string) (*session.RoomSession, json.RawMessage, int64, error) {
	return r.load(func(h *hubRoom) bool { return h.rs.ID == id })
}

func (r *hubRepo) LoadMemberByTokenHash(_ context.Context, hash string) (*session.Member, error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	for _, m := range r.members {
		if m.TokenHash == hash {
			cp := m
			return &cp, nil
		}
	}
	return nil, session.ErrInvalidToken
}

func (r *hubRepo) DeleteRoom(_ context.Context, id string) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	delete(r.rooms, id)
	return nil
}

func (r *hubRepo) storedSettings(roomID string) (json.RawMessage, int64) {
	r.mu.Lock()
	defer r.mu.Unlock()
	room := r.rooms[roomID]
	return room.config, room.seed
}

// A lobby room created on one node must start on another node with the config
// and seed it was created with.
func TestRehydratedLobbyStartsWithStoredConfigAndSeed(t *testing.T) {
	ctx := context.Background()
	repo := newHubRepo()
	g := &recordGame{}
	reg := registry.New()
	if err := reg.Register(g); err != nil {
		t.Fatalf("register: %v", err)
	}

	h1 := hub.New(hub.Config{NodeID: "node-a", Registry: reg, Sessions: session.NewManagerWithRepo(repo), Store: event.NewMemStore()})
	cfg := json.RawMessage(`{"rounds":4,"variant":"rascal"}`)
	resp, err := h1.CreateRoom(ctx, hub.CreateRoomRequest{GameID: "recorder", HostName: "Alice", MaxPlayers: 2, Config: cfg})
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	wantCfg, wantSeed := repo.storedSettings(resp.Room.ID)
	if !bytes.Equal(wantCfg, cfg) || wantSeed == 0 {
		t.Fatalf("settings not persisted: %s %d", wantCfg, wantSeed)
	}

	// Node B has no rooms in memory. The start request loads the room.
	h2 := hub.New(hub.Config{NodeID: "node-b", Registry: reg, Sessions: session.NewManagerWithRepo(repo), Store: event.NewMemStore()})
	if err := h2.StartRoom(ctx, resp.Token); err != nil {
		t.Fatalf("start on node B: %v", err)
	}

	gotCfg, gotSeed, setups := g.recorded()
	if setups != 1 {
		t.Fatalf("expected one Setup, got %d", setups)
	}
	if !bytes.Equal(gotCfg, cfg) {
		t.Errorf("Setup config = %s, want %s", gotCfg, cfg)
	}
	if gotSeed != wantSeed {
		t.Errorf("Setup seed = %d, want %d", gotSeed, wantSeed)
	}
}
