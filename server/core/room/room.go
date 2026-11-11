package room

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/manovaspace/gub/server/core/clock"
	"github.com/manovaspace/gub/server/core/event"
	"github.com/manovaspace/gub/server/core/game"
)

var (
	ErrRoomClosed = errors.New("room is closed")
	ErrTimeout    = errors.New("command timed out")
)

type Config struct {
	ID               string
	Game             game.Game
	GameConfig       json.RawMessage
	Seed             int64
	PlayerSeats      []int
	Store            event.Store
	SnapshotInterval int64
	IdleTimeout      time.Duration
}

type commandEnvelope struct {
	actor game.Actor
	cmd   game.Command
	reply chan error
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

type Room struct {
	id               string
	g                game.Game
	state            game.State
	seq              int64
	store            event.Store
	clock            clock.Clock
	snapshotInterval int64
	idleTimeout      time.Duration

	cmdInbox  chan commandEnvelope
	tickInbox chan tickEnvelope
	viewInbox chan viewQuery

	subMu sync.RWMutex
	subs  map[chan event.StoredEvent]struct{}

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

	// Replay or setup initial state
	initialState, lastSeq, err := event.Replay(
		ctx,
		cfg.Store,
		cfg.ID,
		cfg.Game,
		cfg.GameConfig,
		cfg.Seed,
		cfg.PlayerSeats,
	)
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
		clock:            clk,
		snapshotInterval: cfg.SnapshotInterval,
		idleTimeout:      cfg.IdleTimeout,
		cmdInbox:         make(chan commandEnvelope, 64),
		tickInbox:        make(chan tickEnvelope, 64),
		viewInbox:        make(chan viewQuery, 32),
		subs:             make(map[chan event.StoredEvent]struct{}),
		ctx:              ctx,
		cancel:           cancel,
		done:             make(chan struct{}),
	}

	go r.loop()

	// Start clock
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
		return ErrRoomClosed
	case <-ctx.Done():
		return ctx.Err()
	case err := <-reply:
		return err
	}
}

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

func (r *Room) Subscribe(bufferSize int) (<-chan event.StoredEvent, func()) {
	if bufferSize <= 0 {
		bufferSize = 32
	}
	ch := make(chan event.StoredEvent, bufferSize)

	r.subMu.Lock()
	r.subs[ch] = struct{}{}
	r.subMu.Unlock()

	unsubscribe := func() {
		r.subMu.Lock()
		delete(r.subs, ch)
		r.subMu.Unlock()
		close(ch)
	}

	return ch, unsubscribe
}

func (r *Room) Close() {
	r.cancel()
	r.clock.Stop()
	<-r.done
}

func (r *Room) loop() {
	defer close(r.done)
	idleTimer := time.NewTimer(r.idleTimeout)
	defer idleTimer.Stop()

	for {
		select {
		case <-r.ctx.Done():
			r.saveSnapshot()
			return

		case <-idleTimer.C:
			// Idle eviction
			r.saveSnapshot()
			r.cancel()
			return

		case q := <-r.viewInbox:
			v, err := r.g.View(r.state, q.audience)
			q.reply <- viewReply{view: v, err: err}

		case t := <-r.tickInbox:
			r.handleTick(t.dt)

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
		}
	}
}

func (r *Room) handleCommand(actor game.Actor, cmd game.Command) error {
	if err := r.g.Validate(r.state, actor, cmd); err != nil {
		return err
	}

	events, err := r.g.Apply(r.state, actor, cmd)
	if err != nil {
		return err
	}

	if len(events) == 0 {
		return nil
	}

	now := time.Now()
	storedEvents := make([]event.StoredEvent, len(events))
	for i, ev := range events {
		r.seq++
		payloadBytes, _ := json.Marshal(ev.Payload)
		storedEvents[i] = event.StoredEvent{
			RoomID:    r.id,
			Seq:       r.seq,
			Type:      ev.Type,
			Actor:     actor,
			Payload:   payloadBytes,
			Timestamp: now,
		}
	}

	expectedSeq := r.seq - int64(len(events))
	if err := r.store.AppendEvents(r.ctx, r.id, expectedSeq, storedEvents); err != nil {
		return fmt.Errorf("failed to persist events: %w", err)
	}

	// Fan out to subscribers
	r.subMu.RLock()
	for ch := range r.subs {
		for _, se := range storedEvents {
			select {
			case ch <- se:
			default:
				// Slow consumer buffer full
			}
		}
	}
	r.subMu.RUnlock()

	// Check periodic snapshot
	if r.seq%r.snapshotInterval == 0 || r.g.IsOver(r.state) {
		r.saveSnapshot()
	}

	return nil
}

func (r *Room) handleTick(dt time.Duration) {
	events, err := r.g.Tick(r.state, dt)
	if err != nil || len(events) == 0 {
		return
	}

	now := time.Now()
	storedEvents := make([]event.StoredEvent, len(events))
	for i, ev := range events {
		r.seq++
		payloadBytes, _ := json.Marshal(ev.Payload)
		storedEvents[i] = event.StoredEvent{
			RoomID:    r.id,
			Seq:       r.seq,
			Type:      ev.Type,
			Actor:     game.Actor{Role: game.RoleSystem},
			Payload:   payloadBytes,
			Timestamp: now,
		}
	}

	expectedSeq := r.seq - int64(len(events))
	_ = r.store.AppendEvents(r.ctx, r.id, expectedSeq, storedEvents)

	r.subMu.RLock()
	for ch := range r.subs {
		for _, se := range storedEvents {
			select {
			case ch <- se:
			default:
			}
		}
	}
	r.subMu.RUnlock()
}

func (r *Room) saveSnapshot() {
	blob, err := json.Marshal(r.state)
	if err != nil {
		return
	}
	snap := event.Snapshot{
		RoomID:    r.id,
		Seq:       r.seq,
		Phase:     r.g.Phase(r.state),
		StateBlob: blob,
		Timestamp: time.Now(),
	}
	_ = r.store.SaveSnapshot(r.ctx, snap)
}
