package transport

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strings"

	"github.com/coder/websocket"
)

// MaxReadBytes caps a single inbound WebSocket message.
const MaxReadBytes int64 = 64 << 10

// OriginEnv names the environment variable listing allowed WebSocket origins.
const OriginEnv = "WS_ALLOWED_ORIGINS"

type Conn interface {
	Send(ctx context.Context, msg ServerMessage) error
	Receive(ctx context.Context) (ClientMessage, error)
	Close() error
}

type WSConn struct {
	ws *websocket.Conn
}

// ParseOriginPatterns turns a comma-separated list into websocket origin
// patterns. Entries are trimmed, empty entries dropped, and a scheme prefix
// ("https://") and trailing slash are removed because the library matches
// host patterns. An empty list yields "*", the local-dev default.
func ParseOriginPatterns(raw string) []string {
	var out []string
	for _, part := range strings.Split(raw, ",") {
		p := strings.TrimSpace(part)
		if i := strings.Index(p, "://"); i >= 0 {
			p = p[i+len("://"):]
		}
		p = strings.TrimSuffix(p, "/")
		if p == "" {
			continue
		}
		out = append(out, p)
	}
	if len(out) == 0 {
		return []string{"*"}
	}
	return out
}

// DefaultOriginPatterns reads OriginEnv. Unset means "*".
func DefaultOriginPatterns() []string {
	return ParseOriginPatterns(os.Getenv(OriginEnv))
}

func AcceptWS(w http.ResponseWriter, r *http.Request, opts *websocket.AcceptOptions) (*WSConn, error) {
	if opts == nil {
		opts = &websocket.AcceptOptions{
			OriginPatterns: DefaultOriginPatterns(),
		}
	}
	conn, err := websocket.Accept(w, r, opts)
	if err != nil {
		return nil, fmt.Errorf("websocket accept failed: %w", err)
	}
	conn.SetReadLimit(MaxReadBytes)
	return &WSConn{ws: conn}, nil
}

func WrapWS(ws *websocket.Conn) *WSConn {
	ws.SetReadLimit(MaxReadBytes)
	return &WSConn{ws: ws}
}

func (w *WSConn) Send(ctx context.Context, msg ServerMessage) error {
	data, err := json.Marshal(msg)
	if err != nil {
		return err
	}
	return w.ws.Write(ctx, websocket.MessageText, data)
}

func (w *WSConn) Receive(ctx context.Context) (ClientMessage, error) {
	var msg ClientMessage
	_, data, err := w.ws.Read(ctx)
	if err != nil {
		return msg, err
	}
	if err := json.Unmarshal(data, &msg); err != nil {
		return msg, fmt.Errorf("invalid json message: %w", err)
	}
	return msg, nil
}

func (w *WSConn) Close() error {
	return w.ws.Close(websocket.StatusNormalClosure, "closing connection")
}
