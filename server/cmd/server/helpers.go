package main

import (
	"encoding/json"
	"errors"
	"net/http"
	"strings"

	"github.com/manovaspace/gub/server/core/hub"
	"github.com/manovaspace/gub/server/core/session"
)

// corsOriginEnv names the environment variable listing allowed CORS origins.
const corsOriginEnv = "CORS_ALLOWED_ORIGINS"

// maxBodyBytes caps the JSON body of POST routes.
const maxBodyBytes int64 = 64 << 10

// parseCORSOrigins splits a comma-separated origin list. Empty means "*".
func parseCORSOrigins(raw string) []string {
	var out []string
	for _, part := range strings.Split(raw, ",") {
		if p := strings.TrimSpace(part); p != "" {
			out = append(out, p)
		}
	}
	if len(out) == 0 {
		return []string{"*"}
	}
	return out
}

// corsAllowOrigin returns the Access-Control-Allow-Origin value for a request
// origin. A "*" entry in allowed yields "*". Otherwise an exact match echoes
// the request origin. ok is false when no header should be sent.
func corsAllowOrigin(allowed []string, origin string) (value string, ok bool) {
	for _, a := range allowed {
		if a == "*" {
			return "*", true
		}
	}
	origin = strings.TrimSpace(origin)
	if origin == "" {
		return "", false
	}
	for _, a := range allowed {
		if a == origin {
			return origin, true
		}
	}
	return "", false
}

// applyCORS sets the CORS response headers for r on w.
func applyCORS(w http.ResponseWriter, r *http.Request, allowed []string) {
	value, ok := corsAllowOrigin(allowed, r.Header.Get("Origin"))
	if ok {
		w.Header().Set("Access-Control-Allow-Origin", value)
	}
	if !(len(allowed) == 1 && allowed[0] == "*") {
		w.Header().Add("Vary", "Origin")
	}
	w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
}

// decodeJSON reads a size-limited JSON body into dst. On failure it returns
// the HTTP status to send.
func decodeJSON(w http.ResponseWriter, r *http.Request, dst any) (int, error) {
	r.Body = http.MaxBytesReader(w, r.Body, maxBodyBytes)
	if err := json.NewDecoder(r.Body).Decode(dst); err != nil {
		var tooBig *http.MaxBytesError
		if errors.As(err, &tooBig) {
			return http.StatusRequestEntityTooLarge, err
		}
		return http.StatusBadRequest, err
	}
	return http.StatusOK, nil
}

// sessionErrorStatus maps session and room errors to HTTP status codes.
func sessionErrorStatus(err error) int {
	switch {
	case errors.Is(err, session.ErrInvalidName), errors.Is(err, session.ErrInvalidMaxPlayers):
		return http.StatusBadRequest
	case errors.Is(err, session.ErrRoomNotFound):
		return http.StatusNotFound
	case errors.Is(err, session.ErrRoomFull), errors.Is(err, session.ErrRoomStarted):
		return http.StatusConflict
	case errors.Is(err, session.ErrTooManyRooms), errors.Is(err, session.ErrCodeExhausted):
		return http.StatusServiceUnavailable
	default:
		return http.StatusInternalServerError
	}
}

// snapshotResponse replaces the live room and member in resp with copies taken
// under the room lock, so JSON encoding cannot race with session writers.
func snapshotResponse(resp *hub.RoomResponse) *hub.RoomResponse {
	if resp == nil || resp.Room == nil {
		return resp
	}
	snap := resp.Room.Snapshot()
	out := *resp
	out.Room = snap
	if resp.Member != nil {
		if m, ok := snap.Members[resp.Member.ID]; ok {
			out.Member = m
		}
	}
	return &out
}
