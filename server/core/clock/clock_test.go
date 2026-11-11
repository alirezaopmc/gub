package clock_test

import (
	"context"
	"sync/atomic"
	"testing"
	"time"

	"github.com/manovaspace/gub/server/core/clock"
)

func TestStepClock(t *testing.T) {
	c := clock.NewStepClock()
	if c.Mode() != "step" {
		t.Errorf("expected mode 'step', got '%s'", c.Mode())
	}
	c.Start(context.Background(), func(_ time.Duration) {
		t.Error("onTick should never be called on StepClock")
	})
	c.Stop()
}

func TestFixedTickClock(t *testing.T) {
	c := clock.NewFixedTickClock(50) // 50 Hz -> 20ms per tick
	if c.Mode() != "fixed_tick" {
		t.Errorf("expected mode 'fixed_tick', got '%s'", c.Mode())
	}

	var ticks int64
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	c.Start(ctx, func(_ time.Duration) {
		atomic.AddInt64(&ticks, 1)
	})

	time.Sleep(100 * time.Millisecond)
	c.Stop()

	count := atomic.LoadInt64(&ticks)
	if count < 3 {
		t.Errorf("expected at least 3 ticks in 100ms at 50Hz, got %d", count)
	}

	// Make sure ticks stop after Stop
	time.Sleep(50 * time.Millisecond)
	afterStopCount := atomic.LoadInt64(&ticks)
	if afterStopCount > count+1 {
		t.Errorf("ticks continued after stop: %d -> %d", count, afterStopCount)
	}
}
