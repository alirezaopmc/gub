package session_test

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"sync"
	"testing"

	"github.com/manovaspace/gub/server/core/game"
	"github.com/manovaspace/gub/server/core/session"
)

// fakeRepo is an in-memory session.Repository that enforces the foreign key
// from members to rooms, as the Postgres schema does.
type fakeRepo struct {
	mu             sync.Mutex
	rooms          map[string]*fakeRoom
	members        map[string]session.Member
	rejectCodes    int  // SaveRoom returns ErrRoomCodeTaken this many more times
	failSaveMember bool // SaveMember returns an error while set
}

type fakeRoom struct {
	id, code, gameID, host string
	maxPlayers             int
	started                bool
	config                 json.RawMessage
	seed                   int64
}

func newFakeRepo() *fakeRepo {
	return &fakeRepo{rooms: map[string]*fakeRoom{}, members: map[string]session.Member{}}
}

func (f *fakeRepo) SaveRoom(_ context.Context, rs *session.RoomSession, config json.RawMessage, seed int64) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.rejectCodes > 0 {
		f.rejectCodes--
		return session.ErrRoomCodeTaken
	}
	for _, r := range f.rooms {
		if r.code == rs.Code && r.id != rs.ID {
			return session.ErrRoomCodeTaken
		}
	}
	f.rooms[rs.ID] = &fakeRoom{
		id: rs.ID, code: rs.Code, gameID: rs.GameID, host: rs.HostMember,
		maxPlayers: rs.MaxPlayers, started: rs.Started, config: config, seed: seed,
	}
	return nil
}

func (f *fakeRepo) SaveMember(_ context.Context, m *session.Member) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	if f.failSaveMember {
		return errors.New("injected save failure")
	}
	if _, ok := f.rooms[m.RoomID]; !ok {
		return errors.New("foreign key: room missing")
	}
	f.members[m.ID] = *m
	return nil
}

func (f *fakeRepo) SetStarted(_ context.Context, roomID string, started bool) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	r, ok := f.rooms[roomID]
	if !ok {
		return session.ErrRoomNotFound
	}
	r.started = started
	return nil
}

func (f *fakeRepo) loadRoom(match func(*fakeRoom) bool) (*session.RoomSession, json.RawMessage, int64, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	for _, r := range f.rooms {
		if !match(r) {
			continue
		}
		rs := &session.RoomSession{
			ID: r.id, Code: r.code, GameID: r.gameID, HostMember: r.host,
			MaxPlayers: r.maxPlayers, Started: r.started,
			Members: map[string]*session.Member{}, Seats: map[int]string{},
		}
		for _, m := range f.members {
			if m.RoomID != r.id {
				continue
			}
			cp := m
			rs.Members[cp.ID] = &cp
			if cp.Seat >= 0 {
				rs.Seats[cp.Seat] = cp.ID
			}
		}
		return rs, r.config, r.seed, nil
	}
	return nil, nil, 0, session.ErrRoomNotFound
}

func (f *fakeRepo) LoadRoomByCode(_ context.Context, code string) (*session.RoomSession, json.RawMessage, int64, error) {
	return f.loadRoom(func(r *fakeRoom) bool { return r.code == code })
}

func (f *fakeRepo) LoadRoomByID(_ context.Context, id string) (*session.RoomSession, json.RawMessage, int64, error) {
	return f.loadRoom(func(r *fakeRoom) bool { return r.id == id })
}

func (f *fakeRepo) LoadMemberByTokenHash(_ context.Context, hash string) (*session.Member, error) {
	f.mu.Lock()
	defer f.mu.Unlock()
	for _, m := range f.members {
		if m.TokenHash == hash {
			cp := m
			return &cp, nil
		}
	}
	return nil, session.ErrInvalidToken
}

func (f *fakeRepo) DeleteRoom(_ context.Context, id string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	delete(f.rooms, id)
	for mid, m := range f.members {
		if m.RoomID == id {
			delete(f.members, mid)
		}
	}
	return nil
}

func (f *fakeRepo) roomCount() int {
	f.mu.Lock()
	defer f.mu.Unlock()
	return len(f.rooms)
}

func (f *fakeRepo) memberCount(roomID string) int {
	f.mu.Lock()
	defer f.mu.Unlock()
	n := 0
	for _, m := range f.members {
		if m.RoomID == roomID {
			n++
		}
	}
	return n
}

func (f *fakeRepo) roomStarted(roomID string) bool {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.rooms[roomID].started
}

func TestWriteThroughCreateJoinStartRemove(t *testing.T) {
	repo := newFakeRepo()
	mgr := session.NewManagerWithRepo(repo)
	config := json.RawMessage(`{"rounds":3}`)

	rs, host, _, err := mgr.CreateRoomWithSettings("skull-king", "Host", 4, config, 42)
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if repo.memberCount(rs.ID) != 1 {
		t.Fatalf("host not written through")
	}
	if _, _, _, err := mgr.JoinRoom(rs.Code, "Bob", game.RolePlayer); err != nil {
		t.Fatalf("join: %v", err)
	}
	if repo.memberCount(rs.ID) != 2 {
		t.Fatalf("joiner not written through: %d members", repo.memberCount(rs.ID))
	}

	if err := mgr.MarkStarted(rs.ID); err != nil {
		t.Fatalf("mark started: %v", err)
	}
	if !repo.roomStarted(rs.ID) {
		t.Fatal("MarkStarted not written through")
	}
	if err := mgr.UnmarkStarted(rs.ID); err != nil {
		t.Fatalf("unmark started: %v", err)
	}
	if repo.roomStarted(rs.ID) {
		t.Fatal("UnmarkStarted not written through")
	}

	if err := mgr.RemoveRoom(rs.ID); err != nil {
		t.Fatalf("remove: %v", err)
	}
	if repo.roomCount() != 0 || repo.memberCount(rs.ID) != 0 {
		t.Fatal("RemoveRoom not written through")
	}
	_ = host
}

func TestSecondManagerServesRoomFromRepo(t *testing.T) {
	repo := newFakeRepo()
	a := session.NewManagerWithRepo(repo)
	config := json.RawMessage(`{"rounds":5}`)

	rs, _, _, err := a.CreateRoomWithSettings("skull-king", "Host", 4, config, 7)
	if err != nil {
		t.Fatalf("create on A: %v", err)
	}
	_, ann, annToken, err := a.JoinRoom(rs.Code, "Ann", game.RolePlayer)
	if err != nil {
		t.Fatalf("join on A: %v", err)
	}

	b := session.NewManagerWithRepo(repo)
	got, err := b.GetRoomByCode(rs.Code)
	if err != nil {
		t.Fatalf("get by code on B: %v", err)
	}
	if got.ID != rs.ID || len(got.Members) != 2 {
		t.Fatalf("B loaded room %s with %d members", got.ID, len(got.Members))
	}
	gotConfig, gotSeed := got.Settings()
	if !bytes.Equal(gotConfig, config) || gotSeed != 7 {
		t.Fatalf("settings not restored: %s %d", gotConfig, gotSeed)
	}

	authRS, authMember, err := b.AuthenticateToken(annToken)
	if err != nil {
		t.Fatalf("auth Ann on B: %v", err)
	}
	if authRS.ID != rs.ID || authMember.ID != ann.ID || authMember.Seat != 1 {
		t.Fatalf("B authenticated the wrong member: %+v", authMember)
	}

	_, bo, boToken, err := b.JoinRoom(rs.Code, "Bo", game.RolePlayer)
	if err != nil {
		t.Fatalf("join on B: %v", err)
	}
	if bo.Seat != 2 {
		t.Fatalf("B gave seat %d, want 2", bo.Seat)
	}

	// A has not seen Bo join. Authenticating Bo's token on A loads Bo.
	if _, _, err := a.AuthenticateToken(boToken); err != nil {
		t.Fatalf("auth Bo on A: %v", err)
	}
	aRoom, err := a.GetRoomByID(rs.ID)
	if err != nil {
		t.Fatalf("get by id on A: %v", err)
	}
	if len(aRoom.Members) != 3 || len(aRoom.SeatIndexes()) != 3 {
		t.Fatalf("A cache missing Bo: %d members, seats %v", len(aRoom.Members), aRoom.SeatIndexes())
	}
}

func TestRemovedRoomIsGoneForOtherManagers(t *testing.T) {
	repo := newFakeRepo()
	a := session.NewManagerWithRepo(repo)
	rs, _, token, err := a.CreateRoom("skull-king", "Host", 2)
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if err := a.RemoveRoom(rs.ID); err != nil {
		t.Fatalf("remove: %v", err)
	}

	b := session.NewManagerWithRepo(repo)
	if _, err := b.GetRoomByCode(rs.Code); !errors.Is(err, session.ErrRoomNotFound) {
		t.Fatalf("expected ErrRoomNotFound by code, got %v", err)
	}
	if _, _, err := b.AuthenticateToken(token); !errors.Is(err, session.ErrInvalidToken) {
		t.Fatalf("expected ErrInvalidToken, got %v", err)
	}
}

func TestStartedFlagRehydrates(t *testing.T) {
	repo := newFakeRepo()
	a := session.NewManagerWithRepo(repo)
	rs, _, _, err := a.CreateRoom("skull-king", "Host", 4)
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if err := a.MarkStarted(rs.ID); err != nil {
		t.Fatalf("mark started: %v", err)
	}

	b := session.NewManagerWithRepo(repo)
	got, err := b.GetRoomByID(rs.ID)
	if err != nil {
		t.Fatalf("get on B: %v", err)
	}
	if !got.Started {
		t.Fatal("started flag not loaded")
	}
	if _, _, _, err := b.JoinRoom(rs.Code, "Late", game.RolePlayer); !errors.Is(err, session.ErrRoomStarted) {
		t.Fatalf("expected ErrRoomStarted on B, got %v", err)
	}
}

func TestCreateRoomRetriesWhenCodeTaken(t *testing.T) {
	repo := newFakeRepo()
	repo.rejectCodes = 2
	mgr := session.NewManagerWithRepo(repo)

	if _, _, _, err := mgr.CreateRoom("skull-king", "Host", 4); err != nil {
		t.Fatalf("create should retry past taken codes: %v", err)
	}
	if repo.roomCount() != 1 {
		t.Fatalf("expected one room, got %d", repo.roomCount())
	}
}

func TestCreateRoomFailureLeavesNoRoom(t *testing.T) {
	repo := newFakeRepo()
	repo.failSaveMember = true
	mgr := session.NewManagerWithRepo(repo)

	if _, _, _, err := mgr.CreateRoom("skull-king", "Host", 4); err == nil {
		t.Fatal("expected create to fail")
	}
	if repo.roomCount() != 0 {
		t.Fatalf("failed create left %d rooms in the repo", repo.roomCount())
	}
}

func TestJoinFailureRollsBackSeat(t *testing.T) {
	repo := newFakeRepo()
	mgr := session.NewManagerWithRepo(repo)
	rs, _, _, err := mgr.CreateRoom("skull-king", "Host", 4)
	if err != nil {
		t.Fatalf("create: %v", err)
	}

	repo.failSaveMember = true
	if _, _, _, err := mgr.JoinRoom(rs.Code, "Bob", game.RolePlayer); err == nil {
		t.Fatal("expected join to fail")
	}
	if len(rs.SeatIndexes()) != 1 {
		t.Fatalf("failed join took a seat: %v", rs.SeatIndexes())
	}

	repo.failSaveMember = false
	_, bob, _, err := mgr.JoinRoom(rs.Code, "Bob", game.RolePlayer)
	if err != nil {
		t.Fatalf("join after recovery: %v", err)
	}
	if bob.Seat != 1 {
		t.Fatalf("expected seat 1 after rollback, got %d", bob.Seat)
	}
}

func TestAuthenticateUnknownTokenInRepo(t *testing.T) {
	mgr := session.NewManagerWithRepo(newFakeRepo())
	if _, _, err := mgr.AuthenticateToken("no-such-token"); !errors.Is(err, session.ErrInvalidToken) {
		t.Fatalf("expected ErrInvalidToken, got %v", err)
	}
}

func TestNilRepoKeepsMemoryBehaviour(t *testing.T) {
	mgr := session.NewManagerWithRepo(nil)
	rs, _, _, err := mgr.CreateRoom("skull-king", "Host", 2)
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if _, err := mgr.GetRoomByCode("ZZZZZ"); !errors.Is(err, session.ErrRoomNotFound) {
		t.Fatalf("unknown code: %v", err)
	}
	if _, err := mgr.GetRoomByID("missing"); !errors.Is(err, session.ErrRoomNotFound) {
		t.Fatalf("unknown id: %v", err)
	}
	if err := mgr.RemoveRoom(rs.ID); err != nil {
		t.Fatalf("remove: %v", err)
	}
	if err := mgr.RemoveRoom(rs.ID); !errors.Is(err, session.ErrRoomNotFound) {
		t.Fatalf("second remove: %v", err)
	}
}
