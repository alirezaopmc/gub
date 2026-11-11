package store

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/manovaspace/gub/server/core/game"
	"github.com/manovaspace/gub/server/core/session"
)

func TestSessionRepoRoundTrip(t *testing.T) {
	pool := openTestDB(t, true)
	ctx := context.Background()
	repo := NewPostgresSessionRepo(pool)

	roomID := uuid.NewString()
	hostID := uuid.NewString()
	rs := &session.RoomSession{
		ID: roomID, Code: session.GenerateJoinCode(), GameID: "skull-king",
		HostMember: hostID, MaxPlayers: 4,
		Members: map[string]*session.Member{}, Seats: map[int]string{},
	}
	config := json.RawMessage(`{"rounds": 3}`)
	if err := repo.SaveRoom(ctx, rs, config, 99); err != nil {
		t.Fatalf("save room: %v", err)
	}
	host := &session.Member{ID: hostID, RoomID: roomID, Name: "Host", Seat: 0, Role: game.RoleHost,
		TokenHash: "hash-host", Connected: true, LastSeen: testTimestamp()}
	if err := repo.SaveMember(ctx, host); err != nil {
		t.Fatalf("save host: %v", err)
	}
	viewer := &session.Member{ID: uuid.NewString(), RoomID: roomID, Name: "TV", Seat: -1, Role: game.RoleViewer,
		TokenHash: "hash-viewer", Connected: true, LastSeen: testTimestamp()}
	if err := repo.SaveMember(ctx, viewer); err != nil {
		t.Fatalf("save viewer: %v", err)
	}

	for name, load := range map[string]func() (*session.RoomSession, json.RawMessage, int64, error){
		"by code": func() (*session.RoomSession, json.RawMessage, int64, error) {
			return repo.LoadRoomByCode(ctx, rs.Code)
		},
		"by id": func() (*session.RoomSession, json.RawMessage, int64, error) {
			return repo.LoadRoomByID(ctx, roomID)
		},
	} {
		got, gotConfig, gotSeed, err := load()
		if err != nil {
			t.Fatalf("load %s: %v", name, err)
		}
		if got.ID != roomID || got.Code != rs.Code || got.GameID != "skull-king" || got.MaxPlayers != 4 || got.HostMember != hostID {
			t.Errorf("load %s: wrong room fields: %+v", name, got)
		}
		if got.Started {
			t.Errorf("load %s: new room reported started", name)
		}
		if len(got.Members) != 2 || len(got.Seats) != 1 || got.Seats[0] != hostID {
			t.Errorf("load %s: members %d seats %v", name, len(got.Members), got.Seats)
		}
		if got.Members[viewer.ID] == nil || got.Members[viewer.ID].Role != game.RoleViewer {
			t.Errorf("load %s: viewer role not restored", name)
		}
		if !bytes.Equal(compact(t, gotConfig), compact(t, config)) || gotSeed != 99 {
			t.Errorf("load %s: config %s seed %d", name, gotConfig, gotSeed)
		}
	}

	if err := repo.SetStarted(ctx, roomID, true); err != nil {
		t.Fatalf("set started: %v", err)
	}
	got, _, _, err := repo.LoadRoomByID(ctx, roomID)
	if err != nil || !got.Started {
		t.Fatalf("started not persisted: %v", err)
	}
	if err := repo.SetStarted(ctx, uuid.NewString(), true); !errors.Is(err, session.ErrRoomNotFound) {
		t.Fatalf("set started on missing room: %v", err)
	}

	m, err := repo.LoadMemberByTokenHash(ctx, "hash-host")
	if err != nil || m.ID != hostID || m.Role != game.RoleHost || m.Seat != 0 {
		t.Fatalf("load member by token: %+v %v", m, err)
	}
	if _, err := repo.LoadMemberByTokenHash(ctx, "no-such-hash"); !errors.Is(err, session.ErrInvalidToken) {
		t.Fatalf("unknown token hash: %v", err)
	}

	// The unique seat index holds: another member cannot take seat 0.
	clash := &session.Member{ID: uuid.NewString(), RoomID: roomID, Name: "Clash", Seat: 0, Role: game.RolePlayer,
		TokenHash: "hash-clash", LastSeen: testTimestamp()}
	if err := repo.SaveMember(ctx, clash); !errors.Is(err, session.ErrSeatOccupied) {
		t.Fatalf("expected ErrSeatOccupied, got %v", err)
	}

	// The join code is unique.
	dup := &session.RoomSession{ID: uuid.NewString(), Code: rs.Code, GameID: "skull-king",
		MaxPlayers: 4, Members: map[string]*session.Member{}, Seats: map[int]string{}}
	if err := repo.SaveRoom(ctx, dup, nil, 0); !errors.Is(err, session.ErrRoomCodeTaken) {
		t.Fatalf("expected ErrRoomCodeTaken, got %v", err)
	}

	if err := repo.DeleteRoom(ctx, roomID); err != nil {
		t.Fatalf("delete room: %v", err)
	}
	if _, _, _, err := repo.LoadRoomByID(ctx, roomID); !errors.Is(err, session.ErrRoomNotFound) {
		t.Fatalf("deleted room still loads: %v", err)
	}
	if _, err := repo.LoadMemberByTokenHash(ctx, "hash-host"); !errors.Is(err, session.ErrInvalidToken) {
		t.Fatalf("member of deleted room still loads: %v", err)
	}
}

func TestSessionRepoNilConfigRoundTrip(t *testing.T) {
	pool := openTestDB(t, true)
	ctx := context.Background()
	repo := NewPostgresSessionRepo(pool)

	rs := &session.RoomSession{ID: uuid.NewString(), Code: session.GenerateJoinCode(), GameID: "g",
		MaxPlayers: 2, Members: map[string]*session.Member{}, Seats: map[int]string{}}
	if err := repo.SaveRoom(ctx, rs, nil, 0); err != nil {
		t.Fatalf("save room: %v", err)
	}
	_, config, seed, err := repo.LoadRoomByID(ctx, rs.ID)
	if err != nil {
		t.Fatalf("load: %v", err)
	}
	if config != nil || seed != 0 {
		t.Fatalf("nil config came back as %s, seed %d", config, seed)
	}
}

// Two managers share one Postgres repository, as two nodes would.
func TestTwoManagersShareRepo(t *testing.T) {
	pool := openTestDB(t, true)
	repo := NewPostgresSessionRepo(pool)
	a := session.NewManagerWithRepo(repo)
	b := session.NewManagerWithRepo(repo)

	config := json.RawMessage(`{"rounds":5}`)
	rs, host, hostToken, err := a.CreateRoomWithSettings("skull-king", "Host", 4, config, 1234)
	if err != nil {
		t.Fatalf("create on A: %v", err)
	}

	_, joiner, joinerToken, err := b.JoinRoom(rs.Code, "Bob", game.RolePlayer)
	if err != nil {
		t.Fatalf("join on B: %v", err)
	}
	if joiner.Seat != 1 {
		t.Fatalf("joiner seat %d, want 1", joiner.Seat)
	}

	authRS, authMember, err := b.AuthenticateToken(hostToken)
	if err != nil {
		t.Fatalf("host token on B: %v", err)
	}
	if authRS.ID != rs.ID || authMember.ID != host.ID {
		t.Fatalf("B authenticated the wrong host")
	}

	if _, m, err := a.AuthenticateToken(joinerToken); err != nil || m.ID != joiner.ID {
		t.Fatalf("joiner token on A: %v", err)
	}

	gotRoom, gotConfig, gotSeed := mustLoadByCode(t, b, rs.Code)
	if gotRoom.ID != rs.ID || !bytes.Equal(compact(t, gotConfig), compact(t, config)) || gotSeed != 1234 {
		t.Fatalf("settings not shared: %s %d", gotConfig, gotSeed)
	}

	if err := b.MarkStarted(rs.ID); err != nil {
		t.Fatalf("mark started on B: %v", err)
	}
	if err := a.MarkStarted(rs.ID); !errors.Is(err, session.ErrRoomStarted) {
		t.Fatalf("A should see the start made on B: %v", err)
	}
	if err := a.RemoveRoom(rs.ID); err != nil {
		t.Fatalf("remove on A: %v", err)
	}
	// Caches are per node (one owner per room), so check with a node that never cached it.
	c := session.NewManagerWithRepo(repo)
	if _, err := c.GetRoomByID(rs.ID); !errors.Is(err, session.ErrRoomNotFound) {
		t.Fatalf("removed room still visible on a fresh node: %v", err)
	}
}

func mustLoadByCode(t *testing.T, mgr *session.Manager, code string) (*session.RoomSession, json.RawMessage, int64) {
	t.Helper()
	rs, err := mgr.GetRoomByCode(code)
	if err != nil {
		t.Fatalf("get by code: %v", err)
	}
	config, seed := rs.Settings()
	return rs, config, seed
}

// compact normalizes JSON: Postgres stores jsonb with its own spacing.
func compact(t *testing.T, raw json.RawMessage) []byte {
	t.Helper()
	if raw == nil {
		return nil
	}
	var buf bytes.Buffer
	if err := json.Compact(&buf, raw); err != nil {
		t.Fatalf("compact %s: %v", raw, err)
	}
	return buf.Bytes()
}
