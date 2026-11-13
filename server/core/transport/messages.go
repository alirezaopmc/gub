package transport

import (
	"encoding/json"
	"time"

	"github.com/manovaspace/gub/server/core/event"
	"github.com/manovaspace/gub/server/core/game"
	"github.com/manovaspace/gub/server/core/session"
)

type MsgType string

const (
	// Client -> Server
	MsgJoin    MsgType = "join"
	MsgCommand MsgType = "command"
	MsgResync  MsgType = "resync"
	MsgPing    MsgType = "ping"

	// Server -> Client
	MsgWelcome MsgType = "welcome"
	MsgEvent   MsgType = "event"
	MsgView    MsgType = "view"
	MsgPong    MsgType = "pong"
	MsgError   MsgType = "error"
)

type ClientMessage struct {
	Type     MsgType         `json:"type"`
	Token    string          `json:"token,omitempty"`
	RoomCode string          `json:"roomCode,omitempty"`
	LastSeq  int64           `json:"lastSeq,omitempty"`
	CmdType  string          `json:"cmdType,omitempty"`
	Payload  json.RawMessage `json:"payload,omitempty"`
}

type ServerMessage struct {
	Type      MsgType             `json:"type"`
	Error     string              `json:"error,omitempty"`
	ErrorCode string              `json:"errorCode,omitempty"`
	Seq       int64               `json:"seq,omitempty"`
	Member    *session.Member     `json:"member,omitempty"`
	Event     *event.StoredEvent  `json:"event,omitempty"`
	Events    []event.StoredEvent `json:"events,omitempty"`
	View      any                 `json:"view,omitempty"`
	Audience  *game.Audience      `json:"audience,omitempty"`
	Timestamp time.Time           `json:"timestamp"`
}

func ErrorMessage(code, msg string) ServerMessage {
	return ServerMessage{
		Type:      MsgError,
		ErrorCode: code,
		Error:     msg,
		Timestamp: time.Now(),
	}
}

func WelcomeMessage(member *session.Member, v any, aud game.Audience, seq int64) ServerMessage {
	return ServerMessage{
		Type:      MsgWelcome,
		Member:    member,
		View:      v,
		Audience:  &aud,
		Seq:       seq,
		Timestamp: time.Now(),
	}
}

func EventMessage(ev event.StoredEvent) ServerMessage {
	return ServerMessage{
		Type:      MsgEvent,
		Seq:       ev.Seq,
		Event:     &ev,
		Timestamp: time.Now(),
	}
}

func ViewMessage(v any, aud game.Audience, seq int64) ServerMessage {
	return ServerMessage{
		Type:      MsgView,
		View:      v,
		Audience:  &aud,
		Seq:       seq,
		Timestamp: time.Now(),
	}
}
