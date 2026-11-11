package session_test

import (
	"errors"
	"strings"
	"testing"

	"github.com/manovaspace/gub/server/core/game"
	"github.com/manovaspace/gub/server/core/session"
)

func TestCreateRoomNameValidation(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		want    string
		wantErr error
	}{
		{name: "plain", input: "Alice", want: "Alice"},
		{name: "trimmed", input: "  Alice \t", want: "Alice"},
		{name: "empty", input: "", wantErr: session.ErrInvalidName},
		{name: "spaces only", input: "   ", wantErr: session.ErrInvalidName},
		{name: "32 runes ascii", input: strings.Repeat("a", 32), want: strings.Repeat("a", 32)},
		{name: "33 runes", input: strings.Repeat("a", 33), wantErr: session.ErrInvalidName},
		{name: "32 runes persian", input: strings.Repeat("ش", 32), want: strings.Repeat("ش", 32)},
		{name: "33 multibyte runes", input: strings.Repeat("ش", 33), wantErr: session.ErrInvalidName},
		{name: "newline inside", input: "a\nb", wantErr: session.ErrInvalidName},
		{name: "tab inside", input: "a\tb", wantErr: session.ErrInvalidName},
		{name: "nul inside", input: "a\x00b", wantErr: session.ErrInvalidName},
		{name: "invalid utf8", input: "a\xff", wantErr: session.ErrInvalidName},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mgr := session.NewManager()
			_, host, _, err := mgr.CreateRoom("g", tt.input, 4)
			if !errors.Is(err, tt.wantErr) {
				t.Fatalf("CreateRoom err = %v, want %v", err, tt.wantErr)
			}
			if tt.wantErr == nil && host.Name != tt.want {
				t.Errorf("host name = %q, want %q", host.Name, tt.want)
			}
		})
	}
}

func TestJoinRoomNameValidation(t *testing.T) {
	tests := []struct {
		name    string
		input   string
		want    string
		wantErr error
	}{
		{name: "trimmed", input: " Bob ", want: "Bob"},
		{name: "empty", input: "  ", wantErr: session.ErrInvalidName},
		{name: "too long", input: strings.Repeat("b", 33), wantErr: session.ErrInvalidName},
		{name: "control char", input: "Bo\x07b", wantErr: session.ErrInvalidName},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mgr := session.NewManager()
			rs, _, _, err := mgr.CreateRoom("g", "Host", 4)
			if err != nil {
				t.Fatalf("CreateRoom: %v", err)
			}
			_, member, _, err := mgr.JoinRoom(rs.Code, tt.input, game.RolePlayer)
			if !errors.Is(err, tt.wantErr) {
				t.Fatalf("JoinRoom err = %v, want %v", err, tt.wantErr)
			}
			if tt.wantErr == nil && member.Name != tt.want {
				t.Errorf("member name = %q, want %q", member.Name, tt.want)
			}
		})
	}
}

func TestCreateRoomMaxPlayersValidation(t *testing.T) {
	tests := []struct {
		name       string
		maxPlayers int
		wantErr    error
	}{
		{name: "zero", maxPlayers: 0, wantErr: session.ErrInvalidMaxPlayers},
		{name: "negative", maxPlayers: -3, wantErr: session.ErrInvalidMaxPlayers},
		{name: "min", maxPlayers: 1},
		{name: "max", maxPlayers: 16},
		{name: "over max", maxPlayers: 17, wantErr: session.ErrInvalidMaxPlayers},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			mgr := session.NewManager()
			_, _, _, err := mgr.CreateRoom("g", "Host", tt.maxPlayers)
			if !errors.Is(err, tt.wantErr) {
				t.Fatalf("CreateRoom(maxPlayers=%d) err = %v, want %v", tt.maxPlayers, err, tt.wantErr)
			}
		})
	}
}

func TestRemoveRoom(t *testing.T) {
	mgr := session.NewManager()
	rs, host, hostToken, err := mgr.CreateRoom("g", "Host", 4)
	if err != nil {
		t.Fatalf("CreateRoom: %v", err)
	}
	_, player, playerToken, err := mgr.JoinRoom(rs.Code, "Bob", game.RolePlayer)
	if err != nil {
		t.Fatalf("JoinRoom: %v", err)
	}
	other, _, otherToken, err := mgr.CreateRoom("g", "Other", 4)
	if err != nil {
		t.Fatalf("CreateRoom other: %v", err)
	}

	if err := mgr.RemoveRoom(rs.ID); err != nil {
		t.Fatalf("RemoveRoom: %v", err)
	}

	if _, err := mgr.GetRoomByID(rs.ID); !errors.Is(err, session.ErrRoomNotFound) {
		t.Errorf("GetRoomByID after remove: %v", err)
	}
	if _, err := mgr.GetRoomByCode(rs.Code); !errors.Is(err, session.ErrRoomNotFound) {
		t.Errorf("GetRoomByCode after remove: %v", err)
	}
	for name, tok := range map[string]string{"host": hostToken, "player": playerToken} {
		if _, _, err := mgr.AuthenticateToken(tok); !errors.Is(err, session.ErrInvalidToken) {
			t.Errorf("%s token after remove: err = %v, want ErrInvalidToken", name, err)
		}
	}
	_ = host
	_ = player

	// Unrelated room is untouched.
	if _, _, err := mgr.AuthenticateToken(otherToken); err != nil {
		t.Errorf("other room token broken by RemoveRoom: %v", err)
	}
	if _, err := mgr.GetRoomByID(other.ID); err != nil {
		t.Errorf("other room removed: %v", err)
	}

	if err := mgr.RemoveRoom(rs.ID); !errors.Is(err, session.ErrRoomNotFound) {
		t.Errorf("second RemoveRoom err = %v, want ErrRoomNotFound", err)
	}
}

func TestSnapshotIsIndependentCopy(t *testing.T) {
	mgr := session.NewManager()
	rs, _, _, err := mgr.CreateRoom("g", "Host", 4)
	if err != nil {
		t.Fatalf("CreateRoom: %v", err)
	}
	_, _, _, err = mgr.JoinRoom(rs.Code, "Bob", game.RolePlayer)
	if err != nil {
		t.Fatalf("JoinRoom: %v", err)
	}

	snap := rs.Snapshot()
	if snap == rs {
		t.Fatal("Snapshot returned the live room pointer")
	}
	if snap.ID != rs.ID || snap.Code != rs.Code || len(snap.Members) != 2 || len(snap.Seats) != 2 {
		t.Fatalf("snapshot content mismatch: %+v", snap)
	}

	snap.Members[snap.HostMember].Name = "mutated"
	snap.Seats[9] = "ghost"
	delete(snap.Members, snap.HostMember)

	if rs.Members[rs.HostMember].Name != "Host" {
		t.Errorf("mutating snapshot member changed live room")
	}
	if _, ok := rs.Seats[9]; ok {
		t.Errorf("mutating snapshot seats changed live room")
	}
	if len(rs.Members) != 2 {
		t.Errorf("deleting from snapshot changed live room")
	}
}
