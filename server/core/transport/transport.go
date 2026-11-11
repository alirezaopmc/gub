package transport

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"

	"github.com/coder/websocket"
)

type Conn interface {
	Send(ctx context.Context, msg ServerMessage) error
	Receive(ctx context.Context) (ClientMessage, error)
	Close() error
}

type WSConn struct {
	ws *websocket.Conn
}

func AcceptWS(w http.ResponseWriter, r *http.Request, opts *websocket.AcceptOptions) (*WSConn, error) {
	if opts == nil {
		opts = &websocket.AcceptOptions{
			OriginPatterns: []string{"*"},
		}
	}
	conn, err := websocket.Accept(w, r, opts)
	if err != nil {
		return nil, fmt.Errorf("websocket accept failed: %w", err)
	}
	return &WSConn{ws: conn}, nil
}

func WrapWS(ws *websocket.Conn) *WSConn {
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
