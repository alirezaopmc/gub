package main

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manovaspace/gub/server/core/event"
	"github.com/manovaspace/gub/server/core/game"
	"github.com/manovaspace/gub/server/core/hub"
	"github.com/manovaspace/gub/server/core/lease"
	"github.com/manovaspace/gub/server/core/registry"
	"github.com/manovaspace/gub/server/core/room"
	"github.com/manovaspace/gub/server/core/session"
	"github.com/manovaspace/gub/server/core/store"
	_ "github.com/manovaspace/gub/server/games/arena"
	_ "github.com/manovaspace/gub/server/games/connectfour"
	_ "github.com/manovaspace/gub/server/games/skullking"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	nodeID := os.Getenv("NODE_ID")
	if nodeID == "" {
		nodeID = "node-" + uuid.NewString()[:8]
	}

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	var eventStore event.Store = event.NewMemStore()
	var leaseMgr lease.Manager = lease.NewMemManager()
	var sessionRepo session.Repository // nil keeps rooms in memory only

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL != "" {
		pool, err := pgxpool.New(ctx, dbURL)
		if err != nil {
			log.Fatalf("failed to connect to postgres: %v", err)
		}
		defer pool.Close()
		// Fail fast: the server must not run against a schema it cannot use.
		if err := store.Migrate(ctx, pool); err != nil {
			log.Fatalf("failed to run migrations: %v", err)
		}
		eventStore = store.NewPostgresStore(pool)
		sessionRepo = store.NewPostgresSessionRepo(pool)
		leaseMgr = store.NewPostgresLeaseManager(pool)
		log.Printf("Connected to Postgres; migrations applied")
	} else {
		log.Printf("Running with in-memory store (DATABASE_URL not set)")
	}

	sessionMgr := session.NewManagerWithRepo(sessionRepo)
	h := hub.New(hub.Config{
		NodeID:   nodeID,
		Registry: registry.Default,
		Sessions: sessionMgr,
		Store:    eventStore,
		Leases:   leaseMgr,
	})

	allowedOrigins := parseCORSOrigins(os.Getenv(corsOriginEnv))

	mux := http.NewServeMux()

	// CORS helper
	withCORS := func(next http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			applyCORS(w, r, allowedOrigins)
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}
			next(w, r)
		}
	}

	// Health check
	mux.HandleFunc("GET /health", withCORS(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(map[string]any{
			"status": "ok",
			"nodeId": nodeID,
			"time":   time.Now().UTC(),
		})
	}))

	// Available games
	mux.HandleFunc("GET /api/games", withCORS(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(registry.List())
	}))

	// Create room
	mux.HandleFunc("POST /api/rooms", withCORS(func(w http.ResponseWriter, r *http.Request) {
		var req hub.CreateRoomRequest
		if status, err := decodeJSON(w, r, &req); err != nil {
			http.Error(w, err.Error(), status)
			return
		}
		resp, err := h.CreateRoom(r.Context(), req)
		if err != nil {
			status := sessionErrorStatus(err)
			if errors.Is(err, hub.ErrShuttingDown) {
				status = http.StatusServiceUnavailable
			}
			http.Error(w, err.Error(), status)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(snapshotResponse(resp))
	}))

	// Start room (host only, token in Authorization: Bearer header)
	mux.HandleFunc("POST /api/rooms/start", withCORS(func(w http.ResponseWriter, r *http.Request) {
		token := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
		if token == "" {
			http.Error(w, "missing token", http.StatusUnauthorized)
			return
		}
		if err := h.StartRoom(r.Context(), token); err != nil {
			status := sessionErrorStatus(err)
			switch {
			case errors.Is(err, session.ErrInvalidToken):
				status = http.StatusUnauthorized
			case errors.Is(err, game.ErrUnauthorized):
				status = http.StatusForbidden
			case errors.Is(err, hub.ErrInvalidPlayerCount), errors.Is(err, room.ErrAlreadyStarted):
				status = http.StatusConflict
			case errors.Is(err, hub.ErrRoomOwnedElsewhere):
				status = http.StatusConflict
			case errors.Is(err, hub.ErrShuttingDown):
				status = http.StatusServiceUnavailable
			}
			http.Error(w, err.Error(), status)
			return
		}
		w.WriteHeader(http.StatusNoContent)
	}))

	// Join room
	mux.HandleFunc("POST /api/rooms/join", withCORS(func(w http.ResponseWriter, r *http.Request) {
		var req hub.JoinRoomRequest
		if status, err := decodeJSON(w, r, &req); err != nil {
			http.Error(w, err.Error(), status)
			return
		}
		resp, err := h.JoinRoom(r.Context(), req)
		if err != nil {
			http.Error(w, err.Error(), sessionErrorStatus(err))
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(snapshotResponse(resp))
	}))

	// Get room summary by code
	mux.HandleFunc("GET /api/rooms/{code}", withCORS(func(w http.ResponseWriter, r *http.Request) {
		code := r.PathValue("code")
		rs, err := sessionMgr.GetRoomByCode(code)
		if err != nil {
			http.Error(w, "Room not found", http.StatusNotFound)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(rs.Snapshot())
	}))

	// WebSocket handler. The server's ReadTimeout sets a read deadline on the
	// connection that would outlive the upgrade, so clear it before handing off.
	mux.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
		_ = http.NewResponseController(w).SetReadDeadline(time.Time{})
		h.HandleWebSocket(w, r)
	})

	srv := &http.Server{
		Addr:              ":" + port,
		Handler:           mux,
		ReadHeaderTimeout: 10 * time.Second,
		ReadTimeout:       30 * time.Second,
		// No WriteTimeout: it would cut off long-lived WebSocket connections.
	}

	go func() {
		log.Printf("GUB Game Server [%s] listening on :%s", nodeID, port)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("listen error: %v", err)
		}
	}()

	<-ctx.Done()
	log.Println("Shutting down server...")

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Printf("Server forced shutdown: %v", err)
	}

	// Stop accepting rooms, save every room and release its lease, so another
	// node can adopt the rooms without waiting for the leases to expire.
	if err := h.Shutdown(shutdownCtx); err != nil {
		log.Printf("Hub forced shutdown: %v", err)
	}

	log.Println("Server exiting")
}
