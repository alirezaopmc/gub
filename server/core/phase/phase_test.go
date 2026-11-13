package phase_test

import (
	"testing"
	"time"

	"github.com/manovaspace/gub/server/core/phase"
)

func TestPhaseMachine(t *testing.T) {
	trans := phase.Transitions{
		"lobby":   {"bidding"},
		"bidding": {"playing"},
		"playing": {"scoring", "ability"},
		"ability": {"playing", "scoring"},
		"scoring": {"bidding", "game_over"},
	}

	m := phase.NewMachine("lobby", trans)
	if m.Current() != "lobby" {
		t.Errorf("expected current 'lobby', got '%s'", m.Current())
	}

	// Invalid transition: lobby -> playing directly
	if err := m.Transition("playing"); err != phase.ErrInvalidTransition {
		t.Errorf("expected ErrInvalidTransition, got %v", err)
	}

	// Valid transition: lobby -> bidding
	if err := m.Transition("bidding"); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if m.Current() != "bidding" {
		t.Errorf("expected current 'bidding', got '%s'", m.Current())
	}

	// Deadlines
	if m.IsExpired() {
		t.Errorf("expected not expired when no deadline set")
	}
	m.SetDeadline(50 * time.Millisecond)
	if m.IsExpired() {
		t.Errorf("expected not expired immediately")
	}
	time.Sleep(60 * time.Millisecond)
	if !m.IsExpired() {
		t.Errorf("expected expired after duration")
	}
	m.ClearDeadline()
	if m.IsExpired() {
		t.Errorf("expected not expired after clear")
	}
}

func TestSimultaneousStage(t *testing.T) {
	seats := []int{0, 1, 2}
	stage := phase.NewSimultaneousStage[int](seats)

	if stage.IsComplete() {
		t.Errorf("expected incomplete stage")
	}

	// Submit seat 0
	if err := stage.Submit(0, 2); err != nil {
		t.Fatalf("unexpected submit error: %v", err)
	}
	if !stage.HasSubmitted(0) {
		t.Errorf("expected seat 0 to be marked as submitted")
	}
	if stage.HasSubmitted(1) {
		t.Errorf("expected seat 1 not submitted")
	}

	// Duplicate submit
	if err := stage.Submit(0, 3); err != phase.ErrStageAlreadySubmitted {
		t.Errorf("expected ErrStageAlreadySubmitted, got %v", err)
	}

	// Invalid seat
	if err := stage.Submit(99, 1); err != phase.ErrStageNotExpected {
		t.Errorf("expected ErrStageNotExpected, got %v", err)
	}

	// Submit rest
	if err := stage.Submit(1, 0); err != nil {
		t.Fatalf("unexpected submit error: %v", err)
	}
	if stage.IsComplete() {
		t.Errorf("expected still incomplete (2/3)")
	}

	if err := stage.Submit(2, 1); err != nil {
		t.Fatalf("unexpected submit error: %v", err)
	}
	if !stage.IsComplete() {
		t.Errorf("expected complete stage")
	}

	subs := stage.Submissions()
	if len(subs) != 3 || subs[0] != 2 || subs[1] != 0 || subs[2] != 1 {
		t.Errorf("unexpected submissions map: %v", subs)
	}
}
