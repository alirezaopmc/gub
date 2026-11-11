package session_test

import (
	"sync"
	"testing"

	"github.com/manovaspace/gub/server/core/game"
	"github.com/manovaspace/gub/server/core/session"
)

// TestConcurrentAuthJoinSnapshot exercises AuthenticateToken (writes member
// fields), JoinRoom (writes members and seats) and Snapshot (reads them) at
// the same time. Run with -race.
func TestConcurrentAuthJoinSnapshot(t *testing.T) {
	mgr := session.NewManager()
	rs, _, hostToken, err := mgr.CreateRoom("g", "Host", 16)
	if err != nil {
		t.Fatalf("CreateRoom: %v", err)
	}

	const workers = 8
	const iters = 50
	var wg sync.WaitGroup

	for w := 0; w < workers; w++ {
		wg.Add(3)
		go func() {
			defer wg.Done()
			for i := 0; i < iters; i++ {
				if _, _, err := mgr.AuthenticateToken(hostToken); err != nil {
					t.Errorf("AuthenticateToken: %v", err)
					return
				}
			}
		}()
		go func() {
			defer wg.Done()
			for i := 0; i < iters; i++ {
				if _, _, _, err := mgr.JoinRoom(rs.Code, "Player", game.RoleViewer); err != nil {
					t.Errorf("JoinRoom: %v", err)
					return
				}
			}
		}()
		go func() {
			defer wg.Done()
			for i := 0; i < iters; i++ {
				snap := rs.Snapshot()
				for _, m := range snap.Members {
					_ = m.Connected
					_ = m.LastSeen
				}
			}
		}()
	}
	wg.Wait()

	if got := len(rs.Snapshot().Members); got != 1+workers*iters {
		t.Errorf("member count = %d, want %d", got, 1+workers*iters)
	}
}
