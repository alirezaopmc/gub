package session

import (
	"errors"
	"testing"
)

func TestUniqueCode(t *testing.T) {
	tests := []struct {
		name      string
		takenCnt  int // first N generated codes are taken
		wantErr   error
		wantCalls int
	}{
		{name: "first try", takenCnt: 0, wantCalls: 1},
		{name: "third try", takenCnt: 2, wantCalls: 3},
		{name: "last allowed try", takenCnt: maxCodeAttempts - 1, wantCalls: maxCodeAttempts},
		{name: "exhausted", takenCnt: maxCodeAttempts, wantErr: ErrCodeExhausted, wantCalls: maxCodeAttempts},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			calls := 0
			gen := func() string {
				calls++
				return "CODE" + string(rune('A'+calls))
			}
			taken := func(c string) bool {
				// Codes are numbered by call order; the first takenCnt are taken.
				for i := 1; i <= tt.takenCnt; i++ {
					if c == "CODE"+string(rune('A'+i)) {
						return true
					}
				}
				return false
			}
			code, err := uniqueCode(gen, taken)
			if !errors.Is(err, tt.wantErr) {
				t.Fatalf("err = %v, want %v", err, tt.wantErr)
			}
			if calls != tt.wantCalls {
				t.Errorf("gen calls = %d, want %d", calls, tt.wantCalls)
			}
			if tt.wantErr == nil && code != "CODE"+string(rune('A'+tt.takenCnt+1)) {
				t.Errorf("code = %q", code)
			}
		})
	}
}

func TestMaxRoomsCap(t *testing.T) {
	mgr := NewManager()
	for i := 0; i < maxRooms; i++ {
		if _, _, _, err := mgr.CreateRoom("g", "Host", 2); err != nil {
			t.Fatalf("CreateRoom #%d: %v", i, err)
		}
	}
	if _, _, _, err := mgr.CreateRoom("g", "Host", 2); !errors.Is(err, ErrTooManyRooms) {
		t.Fatalf("room %d: err = %v, want ErrTooManyRooms", maxRooms+1, err)
	}

	// Freeing a slot lets a new room in.
	mgr.mu.RLock()
	var anyID string
	for id := range mgr.roomsByID {
		anyID = id
		break
	}
	mgr.mu.RUnlock()
	if err := mgr.RemoveRoom(anyID); err != nil {
		t.Fatalf("RemoveRoom: %v", err)
	}
	if _, _, _, err := mgr.CreateRoom("g", "Host", 2); err != nil {
		t.Fatalf("CreateRoom after removal: %v", err)
	}
}
