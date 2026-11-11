package session

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"math/big"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/manovaspace/gub/server/core/game"
)

var (
	ErrRoomNotFound     = errors.New("room not found")
	ErrRoomFull         = errors.New("room is full of players")
	ErrInvalidToken     = errors.New("invalid or expired session token")
	ErrSeatOccupied     = errors.New("seat already occupied")
	ErrInvalidSeatIndex = errors.New("invalid seat index")
)

const (
	codeAlphabet = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ" // 32 chars, no 0/O, 1/I
	codeLength   = 5
)

func GenerateJoinCode() string {
	b := make([]byte, codeLength)
	for i := 0; i < codeLength; i++ {
		n, _ := rand.Int(rand.Reader, big.NewInt(int64(len(codeAlphabet))))
		b[i] = codeAlphabet[n.Int64()]
	}
	return string(b)
}

func GenerateSecretToken() (token string, hash string) {
	bytes := make([]byte, 32)
	_, _ = rand.Read(bytes)
	token = hex.EncodeToString(bytes)
	h := sha256.Sum256([]byte(token))
	hash = hex.EncodeToString(h[:])
	return token, hash
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

type RoomSession struct {
	ID         string             `json:"id"`
	Code       string             `json:"code"`
	GameID     string             `json:"gameId"`
	HostMember string             `json:"hostMemberId"`
	MaxPlayers int                `json:"maxPlayers"`
	Members    map[string]*Member `json:"members"` // memberID -> Member
	Seats      map[int]string     `json:"seats"`   // seatIndex -> memberID
	mu         sync.RWMutex
}

type Manager struct {
	mu            sync.RWMutex
	roomsByID     map[string]*RoomSession
	roomsByCode   map[string]*RoomSession
	tokenToMember map[string]*Member // tokenHash -> Member
}

func NewManager() *Manager {
	return &Manager{
		roomsByID:     make(map[string]*RoomSession),
		roomsByCode:   make(map[string]*RoomSession),
		tokenToMember: make(map[string]*Member),
	}
}

func (m *Manager) CreateRoom(gameID, hostName string, maxPlayers int) (*RoomSession, *Member, string, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	roomID := uuid.NewString()

	// Unique code
	var code string
	for {
		code = GenerateJoinCode()
		if _, exists := m.roomsByCode[code]; !exists {
			break
		}
	}

	token, tokenHash := GenerateSecretToken()
	hostMember := &Member{
		ID:        uuid.NewString(),
		RoomID:    roomID,
		Name:      hostName,
		Seat:      0,
		Role:      game.RoleHost,
		TokenHash: tokenHash,
		Connected: true,
		LastSeen:  time.Now(),
	}

	rs := &RoomSession{
		ID:         roomID,
		Code:       code,
		GameID:     gameID,
		HostMember: hostMember.ID,
		MaxPlayers: maxPlayers,
		Members:    map[string]*Member{hostMember.ID: hostMember},
		Seats:      map[int]string{0: hostMember.ID},
	}

	m.roomsByID[roomID] = rs
	m.roomsByCode[code] = rs
	m.tokenToMember[tokenHash] = hostMember

	return rs, hostMember, token, nil
}

func (m *Manager) JoinRoom(code, name string, asRole game.Role) (*RoomSession, *Member, string, error) {
	m.mu.Lock()
	defer m.mu.Unlock()

	code = strings.ToUpper(strings.TrimSpace(code))
	rs, exists := m.roomsByCode[code]
	if !exists {
		return nil, nil, "", ErrRoomNotFound
	}

	rs.mu.Lock()
	defer rs.mu.Unlock()

	seat := -1
	if asRole == game.RolePlayer {
		// Find first available seat
		for s := 0; s < rs.MaxPlayers; s++ {
			if _, taken := rs.Seats[s]; !taken {
				seat = s
				break
			}
		}
		if seat == -1 {
			return nil, nil, "", ErrRoomFull
		}
	}

	token, tokenHash := GenerateSecretToken()
	member := &Member{
		ID:        uuid.NewString(),
		RoomID:    rs.ID,
		Name:      name,
		Seat:      seat,
		Role:      asRole,
		TokenHash: tokenHash,
		Connected: true,
		LastSeen:  time.Now(),
	}

	rs.Members[member.ID] = member
	if seat != -1 {
		rs.Seats[seat] = member.ID
	}
	m.tokenToMember[tokenHash] = member

	return rs, member, token, nil
}

func (m *Manager) AuthenticateToken(token string) (*RoomSession, *Member, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	h := sha256.Sum256([]byte(token))
	tokenHash := hex.EncodeToString(h[:])

	member, exists := m.tokenToMember[tokenHash]
	if !exists {
		return nil, nil, ErrInvalidToken
	}

	rs, roomExists := m.roomsByID[member.RoomID]
	if !roomExists {
		return nil, nil, ErrRoomNotFound
	}

	member.LastSeen = time.Now()
	member.Connected = true

	return rs, member, nil
}

func (m *Manager) GetRoomByCode(code string) (*RoomSession, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	code = strings.ToUpper(strings.TrimSpace(code))
	rs, exists := m.roomsByCode[code]
	if !exists {
		return nil, ErrRoomNotFound
	}
	return rs, nil
}

func (m *Manager) GetRoomByID(roomID string) (*RoomSession, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	rs, exists := m.roomsByID[roomID]
	if !exists {
		return nil, ErrRoomNotFound
	}
	return rs, nil
}
