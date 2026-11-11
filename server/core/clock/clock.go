package clock

import (
	"context"
	"sync"
	"time"
)

type Clock interface {
	Start(ctx context.Context, onTick func(dt time.Duration))
	Stop()
	Mode() string
}

type StepClock struct{}

func NewStepClock() *StepClock {
	return &StepClock{}
}

func (s *StepClock) Start(_ context.Context, _ func(dt time.Duration)) {}
func (s *StepClock) Stop()                                             {}
func (s *StepClock) Mode() string                                      { return "step" }

type FixedTickClock struct {
	tickRate int // ticks per second (e.g. 20)
	mu       sync.Mutex
	cancel   context.CancelFunc
	running  bool
}

func NewFixedTickClock(tickRate int) *FixedTickClock {
	if tickRate <= 0 {
		tickRate = 20
	}
	return &FixedTickClock{
		tickRate: tickRate,
	}
}

func (f *FixedTickClock) Mode() string {
	return "fixed_tick"
}

func (f *FixedTickClock) Start(ctx context.Context, onTick func(dt time.Duration)) {
	f.mu.Lock()
	defer f.mu.Unlock()

	if f.running {
		return
	}

	tickInterval := time.Second / time.Duration(f.tickRate)
	tickCtx, cancel := context.WithCancel(ctx)
	f.cancel = cancel
	f.running = true

	go func() {
		ticker := time.NewTicker(tickInterval)
		defer ticker.Stop()
		last := time.Now()

		for {
			select {
			case <-tickCtx.Done():
				return
			case t := <-ticker.C:
				dt := t.Sub(last)
				last = t
				onTick(dt)
			}
		}
	}()
}

func (f *FixedTickClock) Stop() {
	f.mu.Lock()
	defer f.mu.Unlock()

	if !f.running {
		return
	}
	if f.cancel != nil {
		f.cancel()
		f.cancel = nil
	}
	f.running = false
}
