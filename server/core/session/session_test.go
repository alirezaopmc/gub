package session_test

import (
	"testing"

	"github.com/manovaspace/gub/server/core/game"
	"github.com/manovaspace/gub/server/core/session"
)

func TestSessionManager(t *testing.T) {
	mgr := session.NewManager()

	// 1. Host creates room
	rs, host, hostToken, err := mgr.CreateRoom("skull-king", "Host Alice", 3)
	if err != nil {
		t.Fatalf("failed to create room: %v", err)
	}
	if host.Seat != 0 || host.Role != game.RoleHost {
		t.Errorf("unexpected host member: %+v", host)
	}
	if len(rs.Code) != 5 {
		t.Errorf("expected 5-char code, got %s", rs.Code)
	}

	// 2. Auth host token
	authRS, authMember, err := mgr.AuthenticateToken(hostToken)
	if err != nil {
		t.Fatalf("auth token failed: %v", err)
	}
	if authRS.ID != rs.ID || authMember.ID != host.ID {
		t.Errorf("auth mismatch: got room %s member %s", authRS.ID, authMember.ID)
	}

	// 3. Player 2 joins
	rs2, p2, p2Token, err := mgr.JoinRoom(rs.Code, "Bob", game.RolePlayer)
	if err != nil {
		t.Fatalf("p2 join failed: %v", err)
	}
	if p2.Seat != 1 {
		t.Errorf("expected p2 seat 1, got %d", p2.Seat)
	}
	_ = rs2
	_ = p2Token

	// 4. Player 3 joins
	_, p3, _, err := mgr.JoinRoom(rs.Code, "Charlie", game.RolePlayer)
	if err != nil {
		t.Fatalf("p3 join failed: %v", err)
	}
	if p3.Seat != 2 {
		t.Errorf("expected p3 seat 2, got %d", p3.Seat)
	}

	// 5. Room is full for players (maxPlayers = 3)
	_, _, _, err = mgr.JoinRoom(rs.Code, "Dave", game.RolePlayer)
	if err != session.ErrRoomFull {
		t.Errorf("expected ErrRoomFull, got %v", err)
	}

	// 6. Viewer can still join (seat -1)
	_, viewer, viewerToken, err := mgr.JoinRoom(rs.Code, "Table TV", game.RoleViewer)
	if err != nil {
		t.Fatalf("viewer join failed: %v", err)
	}
	if viewer.Seat != -1 || viewer.Role != game.RoleViewer {
		t.Errorf("unexpected viewer member: %+v", viewer)
	}

	// 7. Viewer token auth
	_, vAuth, err := mgr.AuthenticateToken(viewerToken)
	if err != nil {
		t.Fatalf("auth viewer failed: %v", err)
	}
	if vAuth.ID != viewer.ID {
		t.Errorf("viewer auth ID mismatch")
	}

	// 8. Bad token
	if _, _, err := mgr.AuthenticateToken("invalid-token"); err != session.ErrInvalidToken {
		t.Errorf("expected ErrInvalidToken, got %v", err)
	}
}
