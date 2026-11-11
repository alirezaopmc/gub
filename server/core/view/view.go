package view

import (
	"encoding/json"
	"strings"
	"testing"
	"time"

	"github.com/manovaspace/gub/server/core/game"
)

type Envelope struct {
	RoomID    string        `json:"roomId"`
	Seq       int64         `json:"seq"`
	Audience  game.Audience `json:"audience"`
	Payload   any           `json:"payload"`
	Timestamp time.Time     `json:"timestamp"`
}

type MaskedCardCount struct {
	Count int `json:"count"`
}

func NewEnvelope(roomID string, seq int64, aud game.Audience, payload any) Envelope {
	return Envelope{
		RoomID:    roomID,
		Seq:       seq,
		Audience:  aud,
		Payload:   payload,
		Timestamp: time.Now(),
	}
}

// AssertNoHiddenInfoLeak verifies that forbidden strings (e.g. secret cards) do not appear in the serialized JSON view.
func AssertNoHiddenInfoLeak(t *testing.T, payload any, forbiddenSubstrings ...string) {
	t.Helper()
	data, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("failed to marshal view payload: %v", err)
	}
	raw := string(data)
	for _, forbidden := range forbiddenSubstrings {
		if strings.Contains(raw, forbidden) {
			t.Errorf("HIDDEN INFO LEAK DETECTED: view contains forbidden string %q in: %s", forbidden, raw)
		}
	}
}
