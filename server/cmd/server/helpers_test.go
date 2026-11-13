package main

import (
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"reflect"
	"strings"
	"testing"

	"github.com/manovaspace/gub/server/core/session"
)

func TestParseCORSOrigins(t *testing.T) {
	tests := []struct {
		raw  string
		want []string
	}{
		{raw: "", want: []string{"*"}},
		{raw: " , ", want: []string{"*"}},
		{raw: "https://gub.manova.space", want: []string{"https://gub.manova.space"}},
		{raw: " https://a.test , https://b.test,", want: []string{"https://a.test", "https://b.test"}},
	}
	for _, tt := range tests {
		t.Run(tt.raw, func(t *testing.T) {
			if got := parseCORSOrigins(tt.raw); !reflect.DeepEqual(got, tt.want) {
				t.Errorf("parseCORSOrigins(%q) = %q, want %q", tt.raw, got, tt.want)
			}
		})
	}
}

func TestCORSAllowOrigin(t *testing.T) {
	tests := []struct {
		name    string
		allowed []string
		origin  string
		wantVal string
		wantOK  bool
	}{
		{name: "wildcard any origin", allowed: []string{"*"}, origin: "https://x.test", wantVal: "*", wantOK: true},
		{name: "wildcard no origin", allowed: []string{"*"}, origin: "", wantVal: "*", wantOK: true},
		{name: "exact match echoed", allowed: []string{"https://a.test", "https://b.test"}, origin: "https://b.test", wantVal: "https://b.test", wantOK: true},
		{name: "unlisted origin", allowed: []string{"https://a.test"}, origin: "https://evil.test", wantOK: false},
		{name: "missing origin header", allowed: []string{"https://a.test"}, origin: "", wantOK: false},
		{name: "scheme mismatch", allowed: []string{"https://a.test"}, origin: "http://a.test", wantOK: false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			val, ok := corsAllowOrigin(tt.allowed, tt.origin)
			if ok != tt.wantOK || val != tt.wantVal {
				t.Errorf("corsAllowOrigin(%q, %q) = (%q, %v), want (%q, %v)",
					tt.allowed, tt.origin, val, ok, tt.wantVal, tt.wantOK)
			}
		})
	}
}

func TestApplyCORSHeaders(t *testing.T) {
	tests := []struct {
		name      string
		allowed   []string
		origin    string
		wantAllow string
		wantVary  bool
	}{
		{name: "wildcard", allowed: []string{"*"}, origin: "https://x.test", wantAllow: "*", wantVary: false},
		{name: "listed", allowed: []string{"https://a.test"}, origin: "https://a.test", wantAllow: "https://a.test", wantVary: true},
		{name: "unlisted", allowed: []string{"https://a.test"}, origin: "https://evil.test", wantAllow: "", wantVary: true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/api/games", nil)
			if tt.origin != "" {
				req.Header.Set("Origin", tt.origin)
			}
			rec := httptest.NewRecorder()
			applyCORS(rec, req, tt.allowed)

			if got := rec.Header().Get("Access-Control-Allow-Origin"); got != tt.wantAllow {
				t.Errorf("Allow-Origin = %q, want %q", got, tt.wantAllow)
			}
			if got := rec.Header().Get("Vary") != ""; got != tt.wantVary {
				t.Errorf("Vary present = %v, want %v", got, tt.wantVary)
			}
			if rec.Header().Get("Access-Control-Allow-Methods") == "" {
				t.Errorf("Allow-Methods header missing")
			}
		})
	}
}

func TestDecodeJSONLimit(t *testing.T) {
	tests := []struct {
		name       string
		body       string
		wantStatus int
		wantErr    bool
	}{
		{name: "valid", body: `{"gameId":"x"}`, wantStatus: http.StatusOK},
		{name: "malformed", body: `{"gameId":`, wantStatus: http.StatusBadRequest, wantErr: true},
		{name: "over 64KiB", body: `{"hostName":"` + strings.Repeat("a", int(maxBodyBytes)) + `"}`, wantStatus: http.StatusRequestEntityTooLarge, wantErr: true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/api/rooms", strings.NewReader(tt.body))
			rec := httptest.NewRecorder()
			var dst map[string]any
			status, err := decodeJSON(rec, req, &dst)
			if status != tt.wantStatus {
				t.Errorf("status = %d, want %d", status, tt.wantStatus)
			}
			if (err != nil) != tt.wantErr {
				t.Errorf("err = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestSessionErrorStatus(t *testing.T) {
	tests := []struct {
		err  error
		want int
	}{
		{session.ErrInvalidName, http.StatusBadRequest},
		{session.ErrInvalidMaxPlayers, http.StatusBadRequest},
		{fmt.Errorf("wrapped: %w", session.ErrInvalidName), http.StatusBadRequest},
		{session.ErrRoomNotFound, http.StatusNotFound},
		{session.ErrRoomFull, http.StatusConflict},
		{session.ErrRoomStarted, http.StatusConflict},
		{session.ErrTooManyRooms, http.StatusServiceUnavailable},
		{session.ErrCodeExhausted, http.StatusServiceUnavailable},
		{errors.New("boom"), http.StatusInternalServerError},
	}
	for _, tt := range tests {
		t.Run(tt.err.Error(), func(t *testing.T) {
			if got := sessionErrorStatus(tt.err); got != tt.want {
				t.Errorf("sessionErrorStatus(%v) = %d, want %d", tt.err, got, tt.want)
			}
		})
	}
}
