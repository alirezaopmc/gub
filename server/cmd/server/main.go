package main

import (
	"context"
	"encoding/json"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/manovaspace/gub/server/core/event"
	"github.com/manovaspace/gub/server/core/hub"
	"github.com/manovaspace/gub/server/core/lease"
	"github.com/manovaspace/gub/server/core/registry"
	"github.com/manovaspace/gub/server/core/session"
	"github.com/manovaspace/gub/server/core/store"
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

	dbURL := os.Getenv("DATABASE_URL")
	if dbURL != "" {
		pool, err := pgxpool.New(ctx, dbURL)
		if err != nil {
			log.Fatalf("failed to connect to postgres: %v", err)
		}
		defer pool.Close()
		eventStore = store.NewPostgresStore(pool)
		log.Printf("Connected to Postgres: %s", dbURL)
	} else {
		log.Printf("Running with in-memory store (DATABASE_URL not set)")
	}

	sessionMgr := session.NewManager()
	h := hub.New(hub.Config{
		NodeID:   nodeID,
		Registry: registry.Default,
		Sessions: sessionMgr,
		Store:    eventStore,
		Leases:   leaseMgr,
	})

	mux := http.NewServeMux()

	// CORS helper
	withCORS := func(next http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Access-Control-Allow-Origin", "*")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
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
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		resp, err := h.CreateRoom(r.Context(), req)
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(resp)
	}))

	// Join room
	mux.HandleFunc("POST /api/rooms/join", withCORS(func(w http.ResponseWriter, r *http.Request) {
		var req hub.JoinRoomRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		resp, err := h.JoinRoom(r.Context(), req)
		if err != nil {
			if errors.Is(err, session.ErrRoomNotFound) {
				http.Error(w, err.Error(), http.StatusNotFound)
				return
			}
			if errors.Is(err, session.ErrRoomFull) {
				http.Error(w, err.Error(), http.StatusConflict)
				return
			}
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(resp)
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
		_ = json.NewEncoder(w).Encode(rs)
	}))

	// WebSocket handler
	mux.HandleFunc("/ws", h.HandleWebSocket)

	srv := &http.Server{
		Addr:    ":" + port,
		Handler: mux,
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

	log.Println("Server exiting")
}
