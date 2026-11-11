package room

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"github.com/manovaspace/gub/server/core/clock"
	"github.com/manovaspace/gub/server/core/event"
	"github.com/manovaspace/gub/server/core/game"
)

var (
	ErrRoomClosed     = errors.New("room is closed")
	ErrTimeout        = errors.New("command timed out")
	ErrNotStarted     = errors.New("room has not started")
	ErrAlreadyStarted = errors.New("room already started")
	// ErrRoomPoisoned is returned once a write failed. The in-memory state may
	// then hold a change that never reached the log, so the room refuses work
	// and closes. The next load rebuilds it from the log.
	ErrRoomPoisoned = errors.New("room is poisoned after a failed write; reload it from the log")
)

// snapshotTimeout bounds one snapshot write. Snapshots are written on close, when
// the room context is already cancelled, so they use their own context.
const snapshotTimeout = 5 * time.Second

// LobbyView is what View returns while a room has not been started.
// Phase is always "lobby".
type LobbyView struct {
	Phase string `json:"phase"`
}

type Config struct {
	ID               string
	Game             game.Game
	Store            event.Store
	SnapshotInterval int64
	IdleTimeout      time.Duration
	// Epoch is the fencing epoch of the room lease this room runs under. When the
	// store implements event.FencedStore and Epoch > 0, every append is fenced.
	Epoch int64
}

type commandEnvelope struct {
	actor game.Actor
	cmd   game.Command
	reply chan error
}

type startEnvelope struct {
	seats  []int
	config json.RawMessage
	seed   int64
	reply  chan error
}

type tickEnvelope struct {
	dt time.Duration
}

type viewQuery struct {
	audience game.Audience
	reply    chan viewReply
}

type viewReply struct {
	view any
	err  error
}

// Room owns the state of one game. A room starts in the lobby (state nil) and
// becomes playable once Start has been called. Only the loop goroutine touches
// state, seq and poisoned.
//
// The store holds the command log: each accepted command is one record with
// seq +1. Events emitted by Apply are fanned out to subscribers with the seq of
// the command that produced them and are not stored separately. Tick-produced
// events are fanned out with the current seq and are not stored at all, so
// realtime games recover their tick-driven changes from snapshots only.
//
// A room closes itself when it goes idle, when a write fails (poisoned) or when
// a fenced write is refused. Done reports the close, after which the room
// accepts no work.
type Room struct {
	id               string
	g                game.Game
	state            game.State // nil while in the lobby
	seq              int64
	store            event.Store
	fenced           event.FencedStore // non-nil when appends carry the lease epoch
	epoch            int64
	clock            clock.Clock
	snapshotInterval int64
	idleTimeout      time.Duration

	// poisoned is set by the loop after a failed write. It stops commands and
	// snapshots, because the state may be ahead of the log.
	poisoned bool

	cmdInbox   chan commandEnvelope
	startInbox chan startEnvelope
	tickInbox  chan tickEnvelope
	viewInbox  chan viewQuery

	subMu      sync.Mutex
	subs       map[chan event.StoredEvent]struct{}
	subsClosed bool

	ctx    context.Context
	cancel context.CancelFunc
	done   chan struct{}
}

func New(cfg Config) (*Room, error) {
	if cfg.SnapshotInterval <= 0 {
		cfg.SnapshotInterval = 20
	}
	if cfg.IdleTimeout <= 0 {
		cfg.IdleTimeout = 30 * time.Minute
	}

	ctx, cancel := context.WithCancel(context.Background())

	initialState, lastSeq, err := event.Replay(ctx, cfg.Store, cfg.ID, cfg.Game)
	if err != nil {
		cancel()
		return nil, fmt.Errorf("failed to initialize room state: %w", err)
	}

	var clk clock.Clock
	if cfg.Game.Def().TickRate > 0 {
		clk = clock.NewFixedTickClock(cfg.Game.Def().TickRate)
	} else {
		clk = clock.NewStepClock()
	}

	r := &Room{
		id:               cfg.ID,
		g:                cfg.Game,
		state:            initialState,
		seq:              lastSeq,
		store:            cfg.Store,
		epoch:            cfg.Epoch,
		clock:            clk,
		snapshotInterval: cfg.SnapshotInterval,
		idleTimeout:      cfg.IdleTimeout,
		cmdInbox:         make(chan commandEnvelope, 64),
		startInbox:       make(chan startEnvelope, 1),
		tickInbox:        make(chan tickEnvelope, 64),
		viewInbox:        make(chan viewQuery, 32),
		subs:             make(map[chan event.StoredEvent]struct{}),
		ctx:              ctx,
		cancel:           cancel,
		done:             make(chan struct{}),
	}
	if fs, ok := cfg.Store.(event.FencedStore); ok && cfg.Epoch > 0 {
		r.fenced = fs
	}

	go r.loop()

	clk.Start(ctx, func(dt time.Duration) {
		select {
		case r.tickInbox <- tickEnvelope{dt: dt}:
		default:
			// Backpressure drop on slow tick consumption
		}
	})

	return r, nil
}

func (r *Room) ID() string {
	return r.id
}

// Epoch returns the fencing epoch of the lease the room runs under, or 0 when
// the room was built without one.
func (r *Room) Epoch() int64 {
	return r.epoch
}

// Done is closed once the room has closed, whether Close was called or the room
// closed itself. Subscriber channels are closed after Done.
func (r *Room) Done() <-chan struct{} {
	return r.done
}

// Start moves the room from the lobby into a game. It may be called once.
// It persists the room_started record (seq 1) and then calls Game.Setup.
func (r *Room) Start(ctx context.Context, seats []int, config json.RawMessage, seed int64) error {
	reply := make(chan error, 1)
	env := startEnvelope{
		seats:  append([]int(nil), seats...),
		config: config,
		seed:   seed,
		reply:  reply,
	}

	select {
	case <-r.ctx.Done():
		return ErrRoomClosed
	case <-ctx.Done():
		return ctx.Err()
	case r.startInbox <- env:
	}

	select {
	case <-r.ctx.Done():
		return r.replyOrClosed(reply)
	case <-ctx.Done():
		return ctx.Err()
	case err := <-reply:
		return err
	}
}

func (r *Room) Dispatch(ctx context.Context, actor game.Actor, cmd game.Command) error {
	reply := make(chan error, 1)
	env := commandEnvelope{
		actor: actor,
		cmd:   cmd,
		reply: reply,
	}

	select {
	case <-r.ctx.Done():
		return ErrRoomClosed
	case <-ctx.Done():
		return ctx.Err()
	case r.cmdInbox <- env:
	}

	select {
	case <-r.ctx.Done():
		return r.replyOrClosed(reply)
	case <-ctx.Done():
		return ctx.Err()
	case err := <-reply:
		return err
	}
}

// replyOrClosed is used once the room context is done. The loop may have
// answered just before closing, and that answer is the one the caller wants,
// for example the write error that closed the room.
func (r *Room) replyOrClosed(reply chan error) error {
	select {
	case err := <-reply:
		return err
	default:
		return ErrRoomClosed
	}
}

// View returns the game view for the audience, or a LobbyView while the room
// has not been started.
func (r *Room) View(ctx context.Context, audience game.Audience) (any, error) {
	reply := make(chan viewReply, 1)
	query := viewQuery{
		audience: audience,
		reply:    reply,
	}

	select {
	case <-r.ctx.Done():
		return nil, ErrRoomClosed
	case <-ctx.Done():
		return nil, ctx.Err()
	case r.viewInbox <- query:
	}

	select {
	case <-r.ctx.Done():
		return nil, ErrRoomClosed
	case <-ctx.Done():
		return nil, ctx.Err()
	case res := <-reply:
		return res.view, res.err
	}
}

// Subscribe returns a channel of the room's events. A subscriber that does not
// keep up is closed by the room once its buffer is full, so it must treat a
// closed channel as "resync" while Done is still open. The returned function
// removes the subscriber and is safe to call more than once. On a closed room
// the channel is closed at once.
func (r *Room) Subscribe(bufferSize int) (<-chan event.StoredEvent, func()) {
	if bufferSize <= 0 {
		bufferSize = 32
	}
	ch := make(chan event.StoredEvent, bufferSize)

	r.subMu.Lock()
	defer r.subMu.Unlock()
	if r.subsClosed {
		close(ch)
		return ch, func() {}
	}
	r.subs[ch] = struct{}{}

	unsubscribe := func() {
		r.subMu.Lock()
		defer r.subMu.Unlock()
		if _, ok := r.subs[ch]; ok {
			delete(r.subs, ch)
			close(ch)
		}
	}
	return ch, unsubscribe
}

// Close stops the room, saves a final snapshot unless a write has failed, and
// waits for the loop to exit. It is safe to call after the room closed itself.
func (r *Room) Close() {
	r.cancel()
	r.clock.Stop()
	<-r.done
}

func (r *Room) loop() {
	defer r.shutdown()
	idleTimer := time.NewTimer(r.idleTimeout)
	defer idleTimer.Stop()

	for {
		select {
		case <-r.ctx.Done():
			r.saveSnapshot()
			return

		case <-idleTimer.C:
			// Idle eviction: save and close. The hub drops the room on Done.
			slog.Info("room idle; closing", "room", r.id, "idle_timeout", r.idleTimeout)
			r.saveSnapshot()
			return

		case q := <-r.viewInbox:
			if r.poisoned {
				q.reply <- viewReply{err: ErrRoomPoisoned}
				continue
			}
			if r.state == nil {
				q.reply <- viewReply{view: LobbyView{Phase: "lobby"}}
				continue
			}
			v, err := r.g.View(r.state, q.audience)
			q.reply <- viewReply{view: v, err: err}

		case t := <-r.tickInbox:
			r.handleTick(t.dt)

		case env := <-r.startInbox:
			env.reply <- r.handleStart(env)
			if r.poisoned {
				return
			}

		case env := <-r.cmdInbox:
			if !idleTimer.Stop() {
				select {
				case <-idleTimer.C:
				default:
				}
			}
			idleTimer.Reset(r.idleTimeout)

			err := r.handleCommand(env.actor, env.cmd)
			env.reply <- err
			if r.poisoned {
				// Close after the reply, so the caller receives the write error
				// and not a generic closed error.
				return
			}
		}
	}
}

// shutdown runs when the loop exits. It cancels the room context, stops the
// clock and closes Done, then closes every subscriber. The order matters: a
// subscriber that sees its channel closed must find Done already closed.
func (r *Room) shutdown() {
	r.cancel()
	r.clock.Stop()
	close(r.done)
	r.closeSubscribers()
}

func (r *Room) handleStart(env startEnvelope) error {
	if r.poisoned {
		return ErrRoomPoisoned
	}
	if r.state != nil {
		return ErrAlreadyStarted
	}

	// Setup is pure: it builds the state without touching the store, so a
	// failing setup leaves no room_started record behind.
	state, err := r.g.Setup(env.config, env.seed, env.seats)
	if err != nil {
		return fmt.Errorf("failed to setup game: %w", err)
	}

	payload, err := json.Marshal(event.RoomStartedPayload{
		Seats:  env.seats,
		Config: env.config,
		Seed:   env.seed,
	})
	if err != nil {
		return fmt.Errorf("failed to encode room_started payload: %w", err)
	}

	rec := event.StoredEvent{
		RoomID:    r.id,
		Seq:       r.seq + 1,
		Type:      event.RoomStartedType,
		Actor:     game.Actor{ID: "system", Role: game.RoleSystem},
		Payload:   payload,
		Timestamp: time.Now(),
	}
	if err := r.persist(r.seq, []event.StoredEvent{rec}); err != nil {
		if errors.Is(err, event.ErrFenced) {
			// The state was not assigned yet, but this node no longer owns the room.
			r.poison(err)
		}
		return fmt.Errorf("failed to persist room_started: %w", err)
	}

	r.seq = rec.Seq
	r.state = state
	r.fanOut(rec)
	return nil
}

func (r *Room) handleCommand(actor game.Actor, cmd game.Command) error {
	if r.poisoned {
		return ErrRoomPoisoned
	}
	if r.state == nil {
		return ErrNotStarted
	}

	if err := r.g.Validate(r.state, actor, cmd); err != nil {
		return err
	}

	events, err := r.g.Apply(r.state, actor, cmd)
	if err != nil {
		return err
	}

	payload := cmd.Payload
	if len(payload) == 0 {
		payload = json.RawMessage("null")
	}

	// The log stores the accepted command, one record per command. Apply has
	// already changed the state, so a failed write cannot be rolled back. The
	// room is poisoned instead and rebuilt from the log on the next load.
	r.seq++
	rec := event.StoredEvent{
		RoomID:    r.id,
		Seq:       r.seq,
		Type:      cmd.Type,
		Actor:     actor,
		Payload:   payload,
		Timestamp: time.Now(),
	}
	if err := r.persist(r.seq-1, []event.StoredEvent{rec}); err != nil {
		r.poison(err)
		return fmt.Errorf("failed to persist command: %w", err)
	}

	// Events from Apply are fanned out with the command's seq but not stored.
	for _, ev := range events {
		r.fanOut(r.storedEvent(ev, actor, r.seq))
	}

	if r.seq%r.snapshotInterval == 0 || r.g.IsOver(r.state) {
		r.saveSnapshot()
	}

	return nil
}

// persist appends records after expectedSeq, fenced when the room has a lease.
func (r *Room) persist(expectedSeq int64, recs []event.StoredEvent) error {
	if r.fenced != nil {
		return r.fenced.AppendEventsFenced(r.ctx, r.id, r.epoch, expectedSeq, recs)
	}
	return r.store.AppendEvents(r.ctx, r.id, expectedSeq, recs)
}

// poison marks the room as diverged from its log. It runs on the loop goroutine,
// which returns right after it replies, so the room closes and writes no
// snapshot. The log stays the source for the next load.
func (r *Room) poison(err error) {
	r.poisoned = true
	slog.Error("room write failed; closing room so it reloads from the log",
		"room", r.id,
		"epoch", r.epoch,
		"seq", r.seq,
		"fenced", errors.Is(err, event.ErrFenced),
		"err", err,
	)
}

// handleTick fans out tick-produced events. They are not stored, and they carry
// the seq of the last stored record.
func (r *Room) handleTick(dt time.Duration) {
	if r.state == nil || r.poisoned {
		return
	}

	events, err := r.g.Tick(r.state, dt)
	if err != nil || len(events) == 0 {
		return
	}

	system := game.Actor{Role: game.RoleSystem}
	for _, ev := range events {
		r.fanOut(r.storedEvent(ev, system, r.seq))
	}
}

func (r *Room) storedEvent(ev game.Event, actor game.Actor, seq int64) event.StoredEvent {
	payload, _ := json.Marshal(ev.Payload)
	return event.StoredEvent{
		RoomID:    r.id,
		Seq:       seq,
		Type:      ev.Type,
		Actor:     actor,
		Payload:   payload,
		Timestamp: time.Now(),
	}
}

// fanOut sends to every subscriber without blocking. A subscriber whose buffer
// is full is closed and removed, so it resyncs rather than missing events.
func (r *Room) fanOut(se event.StoredEvent) {
	r.subMu.Lock()
	defer r.subMu.Unlock()
	for ch := range r.subs {
		select {
		case ch <- se:
		default:
			slog.Warn("closing slow room subscriber", "room", r.id, "seq", se.Seq)
			delete(r.subs, ch)
			close(ch)
		}
	}
}

// closeSubscribers closes every subscriber and refuses new ones.
func (r *Room) closeSubscribers() {
	r.subMu.Lock()
	defer r.subMu.Unlock()
	r.subsClosed = true
	for ch := range r.subs {
		delete(r.subs, ch)
		close(ch)
	}
}

func (r *Room) saveSnapshot() {
	if r.state == nil || r.poisoned {
		return
	}
	blob, err := json.Marshal(r.state)
	if err != nil {
		slog.Error("room snapshot encode failed", "room", r.id, "seq", r.seq, "err", err)
		return
	}
	snap := event.Snapshot{
		RoomID:    r.id,
		Seq:       r.seq,
		Phase:     r.g.Phase(r.state),
		StateBlob: blob,
		Timestamp: time.Now(),
	}
	ctx, cancel := context.WithTimeout(context.Background(), snapshotTimeout)
	defer cancel()
	if err := r.store.SaveSnapshot(ctx, snap); err != nil {
		slog.Error("room snapshot save failed", "room", r.id, "seq", r.seq, "err", err)
	}
}
