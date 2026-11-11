package phase

import (
	"errors"
	"sync"
	"time"
)

var (
	ErrInvalidTransition     = errors.New("invalid phase transition")
	ErrStageAlreadySubmitted = errors.New("player already submitted in this stage")
	ErrStageNotExpected      = errors.New("player not expected in this stage")
)

type Transitions map[string][]string

func (t Transitions) CanTransition(from, to string) bool {
	valid, ok := t[from]
	if !ok {
		return false
	}
	for _, target := range valid {
		if target == to {
			return true
		}
	}
	return false
}

type Machine struct {
	mu          sync.RWMutex
	current     string
	transitions Transitions
	deadline    *time.Time
}

func NewMachine(initial string, transitions Transitions) *Machine {
	return &Machine{
		current:     initial,
		transitions: transitions,
	}
}

func (m *Machine) Current() string {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.current
}

func (m *Machine) Transition(next string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	if !m.transitions.CanTransition(m.current, next) {
		return ErrInvalidTransition
	}
	m.current = next
	m.deadline = nil
	return nil
}

func (m *Machine) SetDeadline(d time.Duration) {
	m.mu.Lock()
	defer m.mu.Unlock()
	t := time.Now().Add(d)
	m.deadline = &t
}

func (m *Machine) ClearDeadline() {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.deadline = nil
}

func (m *Machine) Deadline() *time.Time {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.deadline
}

func (m *Machine) IsExpired() bool {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if m.deadline == nil {
		return false
	}
	return time.Now().After(*m.deadline)
}

// SimultaneousStage tracks submissions from expected player seats (e.g. Skull King bidding).
type SimultaneousStage[T any] struct {
	mu          sync.RWMutex
	expected    map[int]bool
	submissions map[int]T
}

func NewSimultaneousStage[T any](expectedSeats []int) *SimultaneousStage[T] {
	exp := make(map[int]bool, len(expectedSeats))
	for _, s := range expectedSeats {
		exp[s] = true
	}
	return &SimultaneousStage[T]{
		expected:    exp,
		submissions: make(map[int]T, len(expectedSeats)),
	}
}

func (s *SimultaneousStage[T]) Submit(seat int, val T) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if !s.expected[seat] {
		return ErrStageNotExpected
	}
	if _, exists := s.submissions[seat]; exists {
		return ErrStageAlreadySubmitted
	}

	s.submissions[seat] = val
	return nil
}

func (s *SimultaneousStage[T]) HasSubmitted(seat int) bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	_, exists := s.submissions[seat]
	return exists
}

func (s *SimultaneousStage[T]) IsComplete() bool {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return len(s.submissions) == len(s.expected)
}

func (s *SimultaneousStage[T]) Submissions() map[int]T {
	s.mu.RLock()
	defer s.mu.RUnlock()

	out := make(map[int]T, len(s.submissions))
	for k, v := range s.submissions {
		out[k] = v
	}
	return out
}

func (s *SimultaneousStage[T]) RemainingSeats() []int {
	s.mu.RLock()
	defer s.mu.RUnlock()

	rem := make([]int, 0)
	for seat := range s.expected {
		if _, exists := s.submissions[seat]; !exists {
			rem = append(rem, seat)
		}
	}
	return rem
}
