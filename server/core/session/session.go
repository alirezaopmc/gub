package session

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"math/big"
	"sort"
	"strings"
	"sync"
	"time"
	"unicode"
	"unicode/utf8"

	"github.com/google/uuid"
	"github.com/manovaspace/gub/server/core/game"
)

var (
	ErrRoomNotFound      = errors.New("room not found")
	ErrRoomFull          = errors.New("room is full of players")
	ErrInvalidToken      = errors.New("invalid or expired session token")
	ErrSeatOccupied      = errors.New("seat already occupied")
	ErrInvalidSeatIndex  = errors.New("invalid seat index")
	ErrRoomStarted       = errors.New("room already started")
	ErrInvalidName       = errors.New("name must be 1-32 characters without control characters")
	ErrInvalidMaxPlayers = errors.New("max players must be between 1 and 16")
	ErrTooManyRooms      = errors.New("too many active rooms")
	ErrCodeExhausted     = errors.New("could not allocate a unique room code")
)

const (
	codeAlphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ" // 32 chars, no 0/O, 1/I
	codeLength   = 5

	// maxCodeAttempts bounds the join-code uniqueness loop.
	maxCodeAttempts = 100
	// maxRooms caps the number of rooms tracked at once.
	maxRooms = 10000
	// maxNameRunes is the longest accepted player or host name.
	maxNameRunes = 32
	// minMaxPlayers and maxMaxPlayers bound a room's seat count.
	minMaxPlayers = 1
	maxMaxPlayers = 16

	// repoTimeout bounds one repository call. Manager methods take no context.
	repoTimeout = 5 * time.Second
)

func GenerateJoinCode() string {
	b := make([]byte, codeLength)
	for i := 0; i < codeLength; i++ {
		n, _ := rand.Int(rand.Reader, big.NewInt(int64(len(codeAlphabet))))
		b[i] = codeAlphabet[n.Int64()]
	}
	return string(b)
}

// uniqueCode draws codes from gen until taken reports false, giving up after
// maxCodeAttempts draws.
func uniqueCode(gen func() string, taken func(string) bool) (string, error) {
	for i := 0; i < maxCodeAttempts; i++ {
		c := gen()
		if !taken(c) {
			return c, nil
		}
	}
	return "", ErrCodeExhausted
}

// normalizeName trims a name and validates it: 1..32 runes, no control characters.
func normalizeName(name string) (string, error) {
	n := strings.TrimSpace(name)
	if n == "" || !utf8.ValidString(n) || utf8.RuneCountInString(n) > maxNameRunes {
		return "", ErrInvalidName
	}
	for _, r := range n {
		if unicode.IsControl(r) {
			return "", ErrInvalidName
		}
	}
	return n, nil
}

func normalizeCode(code string) string {
	return strings.ToUpper(strings.TrimSpace(code))
}

func GenerateSecretToken() (token string, hash string) {
	bytes := make([]byte, 32)
	_, _ = rand.Read(bytes)
	token = hex.EncodeToString(bytes)
	h := sha256.Sum256([]byte(token))
	hash = hex.EncodeToString(h[:])
	return token, hash
}

func hashToken(token string) string {
	h := sha256.Sum256([]byte(token))
	return hex.EncodeToString(h[:])
}

type Member struct {
	ID        string    `json:"id"`
	RoomID    string    `json:"roomId"`
	Name      string    `json:"name"`
	Seat      int       `json:"seat"` // -1 for viewer
	Role      game.Role `json:"role"`
	TokenHash string    `json:"-"`
	Connected bool      `json:"connected"`
	LastSeen  time.Time `json:"lastSeen"`
}

// RoomSession's mutable fields are guarded by mu. Member fields that change
// after creation (Connected, LastSeen) are also guarded by the owning room's mu.
// config and seed are set once when the room is created or loaded.
type RoomSession struct {
	ID         string             `json:"id"`
	Code       string             `json:"code"`
	GameID     string             `json:"gameId"`
	HostMember string             `json:"hostMemberId"`
	MaxPlayers int                `json:"maxPlayers"`
	Started    bool               `json:"started"`
	Members    map[string]*Member `json:"members"` // memberID -> Member
	Seats      map[int]string     `json:"seats"`   // seatIndex -> memberID
	config     json.RawMessage
	seed       int64
	mu         sync.RWMutex
}

// Manager holds rooms and tokens for this node. With a Repository, every
// creation, join, start and removal is written through, and a lookup that
// misses the cache loads the room from the Repository.
//
// Lock order: m.mu before rs.mu. Repository calls may run under rs.mu, but
// never under m.mu.
type Manager struct {
	mu            sync.RWMutex
	repo          Repository
	roomsByID     map[string]*RoomSession
	roomsByCode   map[string]*RoomSession
	tokenToMember map[string]*Member // tokenHash -> Member
}

// NewManager returns a Manager that keeps all state in memory.
func NewManager() *Manager {
	return NewManagerWithRepo(nil)
}

// NewManagerWithRepo returns a Manager that persists through repo. A nil repo
// behaves exactly like NewManager.
func NewManagerWithRepo(repo Repository) *Manager {
	return &Manager{
		repo:          repo,
		roomsByID:     make(map[string]*RoomSession),
		roomsByCode:   make(map[string]*RoomSession),
		tokenToMember: make(map[string]*Member),
	}
}

func repoContext() (context.Context, context.CancelFunc) {
	return context.WithTimeout(context.Background(), repoTimeout)
}

func (m *Manager) CreateRoom(gameID, hostName string, maxPlayers int) (*RoomSession, *Member, string, error) {
	return m.CreateRoomWithSettings(gameID, hostName, maxPlayers, nil, 0)
}

// CreateRoomWithSettings creates a room that stores its game config and seed,
// so a room loaded later starts with the same settings.
func (m *Manager) CreateRoomWithSettings(gameID, hostName string, maxPlayers int, config json.RawMessage, seed int64) (*RoomSession, *Member, string, error) {
	name, err := normalizeName(hostName)
	if err != nil {
		return nil, nil, "", err
	}
	if maxPlayers < minMaxPlayers || maxPlayers > maxMaxPlayers {
		return nil, nil, "", ErrInvalidMaxPlayers
	}

	// A code can be taken by a room created elsewhere between the check and
	// the insert. Then the attempt is retried with a new code.
	for attempt := 0; attempt < maxCodeAttempts; attempt++ {
		rs, host, token, err := m.tryCreateRoom(gameID, name, maxPlayers, config, seed)
		if errors.Is(err, ErrRoomCodeTaken) {
			continue
		}
		return rs, host, token, err
	}
	return nil, nil, "", ErrCodeExhausted
}

func (m *Manager) tryCreateRoom(gameID, name string, maxPlayers int, config json.RawMessage, seed int64) (*RoomSession, *Member, string, error) {
	roomID := uuid.NewString()
	token, tokenHash := GenerateSecretToken()
	hostMember := &Member{
		ID:        uuid.NewString(),
		RoomID:    roomID,
		Name:      name,
		Seat:      0,
		Role:      game.RoleHost,
		TokenHash: tokenHash,
		Connected: true,
		LastSeen:  time.Now(),
	}
	rs := &RoomSession{
		ID:         roomID,
		GameID:     gameID,
		HostMember: hostMember.ID,
		MaxPlayers: maxPlayers,
		Members:    map[string]*Member{hostMember.ID: hostMember},
		Seats:      map[int]string{0: hostMember.ID},
		config:     config,
		seed:       seed,
	}

	m.mu.RLock()
	if len(m.roomsByID) >= maxRooms {
		m.mu.RUnlock()
		return nil, nil, "", ErrTooManyRooms
	}
	code, err := uniqueCode(GenerateJoinCode, func(c string) bool {
		_, exists := m.roomsByCode[c]
		return exists
	})
	m.mu.RUnlock()
	if err != nil {
		return nil, nil, "", err
	}
	rs.Code = code

	// The rooms row must exist before the room is visible, so that events and
	// leases that reference it satisfy their foreign keys.
	if m.repo != nil {
		if err := m.persistNewRoom(rs, hostMember); err != nil {
			return nil, nil, "", err
		}
	}

	m.mu.Lock()
	full := len(m.roomsByID) >= maxRooms
	_, taken := m.roomsByCode[code]
	if !full && !taken {
		m.roomsByID[roomID] = rs
		m.roomsByCode[code] = rs
		m.tokenToMember[tokenHash] = hostMember
	}
	m.mu.Unlock()

	if full || taken {
		if m.repo != nil {
			m.deleteRoomRow(roomID)
		}
		if full {
			return nil, nil, "", ErrTooManyRooms
		}
		return nil, nil, "", ErrRoomCodeTaken
	}
	return rs, hostMember, token, nil
}

// persistNewRoom writes the room and its host. It must run before the room is
// published in the caches.
func (m *Manager) persistNewRoom(rs *RoomSession, host *Member) error {
	ctx, cancel := repoContext()
	defer cancel()

	if err := m.repo.SaveRoom(ctx, rs, rs.config, rs.seed); err != nil {
		return fmt.Errorf("failed to save room: %w", err)
	}
	if err := m.repo.SaveMember(ctx, host); err != nil {
		m.deleteRoomRow(rs.ID)
		return fmt.Errorf("failed to save host: %w", err)
	}
	return nil
}

// deleteRoomRow removes a room row on a best-effort basis. It is used to undo
// a persist that cannot be published.
func (m *Manager) deleteRoomRow(roomID string) {
	ctx, cancel := repoContext()
	defer cancel()
	_ = m.repo.DeleteRoom(ctx, roomID)
}

// RemoveRoom deletes a room, its join code, and the tokens of all its members.
func (m *Manager) RemoveRoom(roomID string) error {
	rs, err := m.GetRoomByID(roomID)
	if err != nil {
		return err
	}

	if m.repo != nil {
		ctx, cancel := repoContext()
		err := m.repo.DeleteRoom(ctx, roomID)
		cancel()
		if err != nil {
			return fmt.Errorf("failed to delete room: %w", err)
		}
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	if cur, exists := m.roomsByID[roomID]; !exists || cur != rs {
		return ErrRoomNotFound
	}

	// Lock order: m.mu then rs.mu.
	rs.mu.RLock()
	for _, member := range rs.Members {
		delete(m.tokenToMember, member.TokenHash)
	}
	code := rs.Code
	rs.mu.RUnlock()

	delete(m.roomsByID, roomID)
	if cur, ok := m.roomsByCode[code]; ok && cur == rs {
		delete(m.roomsByCode, code)
	}
	return nil
}

func (m *Manager) JoinRoom(code, name string, asRole game.Role) (*RoomSession, *Member, string, error) {
	memberName, err := normalizeName(name)
	if err != nil {
		return nil, nil, "", err
	}

	rs, err := m.GetRoomByCode(normalizeCode(code))
	if err != nil {
		return nil, nil, "", err
	}

	token, tokenHash := GenerateSecretToken()

	rs.mu.Lock()
	seat := -1
	if asRole == game.RolePlayer {
		if rs.Started {
			rs.mu.Unlock()
			return nil, nil, "", ErrRoomStarted
		}
		// Find first available seat
		for s := 0; s < rs.MaxPlayers; s++ {
			if _, taken := rs.Seats[s]; !taken {
				seat = s
				break
			}
		}
		if seat == -1 {
			rs.mu.Unlock()
			return nil, nil, "", ErrRoomFull
		}
	}

	member := &Member{
		ID:        uuid.NewString(),
		RoomID:    rs.ID,
		Name:      memberName,
		Seat:      seat,
		Role:      asRole,
		TokenHash: tokenHash,
		Connected: true,
		LastSeen:  time.Now(),
	}

	if m.repo != nil {
		ctx, cancel := repoContext()
		err := m.repo.SaveMember(ctx, member)
		cancel()
		if err != nil {
			rs.mu.Unlock()
			return nil, nil, "", fmt.Errorf("failed to save member: %w", err)
		}
	}

	rs.Members[member.ID] = member
	if seat != -1 {
		rs.Seats[seat] = member.ID
	}
	rs.mu.Unlock()

	m.mu.Lock()
	defer m.mu.Unlock()
	if cur, exists := m.roomsByID[rs.ID]; !exists || cur != rs {
		// The room was removed while the member was being saved.
		return nil, nil, "", ErrRoomNotFound
	}
	m.tokenToMember[tokenHash] = member

	return rs, member, token, nil
}

func (m *Manager) AuthenticateToken(token string) (*RoomSession, *Member, error) {
	tokenHash := hashToken(token)

	m.mu.RLock()
	member, exists := m.tokenToMember[tokenHash]
	if exists {
		rs, roomExists := m.roomsByID[member.RoomID]
		if !roomExists {
			m.mu.RUnlock()
			return nil, nil, ErrRoomNotFound
		}
		// Lock order: m.mu (read) then rs.mu (write), same as JoinRoom.
		rs.mu.Lock()
		member.LastSeen = time.Now()
		member.Connected = true
		rs.mu.Unlock()
		m.mu.RUnlock()
		return rs, member, nil
	}
	m.mu.RUnlock()

	return m.authenticateMiss(tokenHash)
}

// authenticateMiss handles a token this node has not cached: it loads the
// member's room from the Repository and caches both.
func (m *Manager) authenticateMiss(tokenHash string) (*RoomSession, *Member, error) {
	if m.repo == nil {
		return nil, nil, ErrInvalidToken
	}

	ctx, cancel := repoContext()
	loaded, err := m.repo.LoadMemberByTokenHash(ctx, tokenHash)
	cancel()
	if err != nil {
		if errors.Is(err, ErrInvalidToken) {
			return nil, nil, ErrInvalidToken
		}
		return nil, nil, fmt.Errorf("failed to load member: %w", err)
	}

	rs, err := m.GetRoomByID(loaded.RoomID)
	if err != nil {
		return nil, nil, err
	}

	// Lock order: m.mu then rs.mu.
	m.mu.Lock()
	defer m.mu.Unlock()
	cur, exists := m.roomsByID[rs.ID]
	if !exists || cur != rs {
		return nil, nil, ErrRoomNotFound
	}

	rs.mu.Lock()
	member, known := rs.Members[loaded.ID]
	if !known {
		// Joined on another node after this node cached the room.
		rs.Members[loaded.ID] = loaded
		if loaded.Seat >= 0 {
			rs.Seats[loaded.Seat] = loaded.ID
		}
		member = loaded
	}
	member.LastSeen = time.Now()
	member.Connected = true
	rs.mu.Unlock()

	m.tokenToMember[tokenHash] = member
	return rs, member, nil
}

func (m *Manager) GetRoomByCode(code string) (*RoomSession, error) {
	code = normalizeCode(code)

	m.mu.RLock()
	rs, exists := m.roomsByCode[code]
	m.mu.RUnlock()
	if exists {
		return rs, nil
	}

	if m.repo == nil {
		return nil, ErrRoomNotFound
	}
	ctx, cancel := repoContext()
	defer cancel()
	loaded, config, seed, err := m.repo.LoadRoomByCode(ctx, code)
	if err != nil {
		return nil, loadError(err)
	}
	return m.adoptRoom(loaded, config, seed), nil
}

func (m *Manager) GetRoomByID(roomID string) (*RoomSession, error) {
	m.mu.RLock()
	rs, exists := m.roomsByID[roomID]
	m.mu.RUnlock()
	if exists {
		return rs, nil
	}

	if m.repo == nil {
		return nil, ErrRoomNotFound
	}
	ctx, cancel := repoContext()
	defer cancel()
	loaded, config, seed, err := m.repo.LoadRoomByID(ctx, roomID)
	if err != nil {
		return nil, loadError(err)
	}
	return m.adoptRoom(loaded, config, seed), nil
}

func loadError(err error) error {
	if errors.Is(err, ErrRoomNotFound) {
		return ErrRoomNotFound
	}
	return fmt.Errorf("failed to load room: %w", err)
}

// adoptRoom caches a room loaded from the Repository and returns the cached
// copy. If another goroutine cached the room first, that copy is returned.
func (m *Manager) adoptRoom(loaded *RoomSession, config json.RawMessage, seed int64) *RoomSession {
	m.mu.Lock()
	defer m.mu.Unlock()

	if cur, exists := m.roomsByID[loaded.ID]; exists {
		return cur
	}
	loaded.config = config
	loaded.seed = seed
	m.roomsByID[loaded.ID] = loaded
	m.roomsByCode[loaded.Code] = loaded
	for _, member := range loaded.Members {
		m.tokenToMember[member.TokenHash] = member
	}
	return loaded
}

// Snapshot returns a deep copy of the room taken under rs.mu. The copy has
// its own zero mutex and is safe to encode to JSON or mutate without affecting rs.
func (rs *RoomSession) Snapshot() *RoomSession {
	rs.mu.RLock()
	defer rs.mu.RUnlock()

	out := &RoomSession{
		ID:         rs.ID,
		Code:       rs.Code,
		GameID:     rs.GameID,
		HostMember: rs.HostMember,
		MaxPlayers: rs.MaxPlayers,
		Started:    rs.Started,
		Members:    make(map[string]*Member, len(rs.Members)),
		Seats:      make(map[int]string, len(rs.Seats)),
		config:     rs.config,
		seed:       rs.seed,
	}
	for id, member := range rs.Members {
		cp := *member
		out.Members[id] = &cp
	}
	for seat, id := range rs.Seats {
		out.Seats[seat] = id
	}
	return out
}

// Settings returns the game config and seed chosen when the room was created.
// They are passed to Game.Setup when the room starts.
func (rs *RoomSession) Settings() (json.RawMessage, int64) {
	rs.mu.RLock()
	defer rs.mu.RUnlock()
	return rs.config, rs.seed
}

// SeatIndexes returns the occupied player seat indexes in ascending order.
func (rs *RoomSession) SeatIndexes() []int {
	rs.mu.RLock()
	defer rs.mu.RUnlock()

	out := make([]int, 0, len(rs.Seats))
	for s := range rs.Seats {
		out = append(out, s)
	}
	sort.Ints(out)
	return out
}

// MarkStarted locks the player roster. Viewers may still join afterwards.
func (m *Manager) MarkStarted(roomID string) error {
	rs, err := m.GetRoomByID(roomID)
	if err != nil {
		return err
	}
	rs.mu.Lock()
	defer rs.mu.Unlock()
	if rs.Started {
		return ErrRoomStarted
	}
	if err := m.persistStarted(rs.ID, true); err != nil {
		if errors.Is(err, ErrRoomStarted) {
			rs.Started = true // another node started it; refresh our cache
		}
		return err
	}
	rs.Started = true
	return nil
}

// UnmarkStarted reopens the roster after a failed start so the host can retry.
// The in-memory roster reopens even if the write-through fails, and the error
// is returned so the caller can see that the stored flag may be stale.
func (m *Manager) UnmarkStarted(roomID string) error {
	rs, err := m.GetRoomByID(roomID)
	if err != nil {
		return err
	}
	rs.mu.Lock()
	defer rs.mu.Unlock()
	rs.Started = false
	return m.persistStarted(rs.ID, false)
}

func (m *Manager) persistStarted(roomID string, started bool) error {
	if m.repo == nil {
		return nil
	}
	ctx, cancel := repoContext()
	defer cancel()
	if err := m.repo.SetStarted(ctx, roomID, started); err != nil {
		return fmt.Errorf("failed to save started flag: %w", err)
	}
	return nil
}
