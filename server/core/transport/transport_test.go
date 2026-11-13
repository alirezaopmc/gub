package transport_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/coder/websocket"
	"github.com/manovaspace/gub/server/core/transport"
)

func TestWebSocketTransport(t *testing.T) {
	serverReceived := make(chan transport.ClientMessage, 1)

	s := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		conn, err := transport.AcceptWS(w, r, nil)
		if err != nil {
			t.Errorf("accept failed: %v", err)
			return
		}
		defer conn.Close()

		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()

		msg, err := conn.Receive(ctx)
		if err != nil {
			t.Errorf("server receive failed: %v", err)
			return
		}
		serverReceived <- msg

		// Send back welcome
		err = conn.Send(ctx, transport.ServerMessage{
			Type: transport.MsgWelcome,
			Seq:  1,
		})
		if err != nil {
			t.Errorf("server send failed: %v", err)
		}
	}))
	defer s.Close()

	wsURL := "ws" + strings.TrimPrefix(s.URL, "http")

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	clientWS, _, err := websocket.Dial(ctx, wsURL, nil)
	if err != nil {
		t.Fatalf("client dial failed: %v", err)
	}
	clientConn := transport.WrapWS(clientWS)
	defer clientConn.Close()

	// Client sends join
	joinMsg := transport.ClientMessage{
		Type:     transport.MsgJoin,
		RoomCode: "ABCDE",
		Token:    "test-token",
	}
	rawJoin := []byte(`{"type":"join","roomCode":"ABCDE","token":"test-token"}`)
	if err := clientWS.Write(ctx, websocket.MessageText, rawJoin); err != nil {
		t.Fatalf("client write failed: %v", err)
	}

	select {
	case msg := <-serverReceived:
		if msg.Type != transport.MsgJoin || msg.RoomCode != "ABCDE" || msg.Token != "test-token" {
			t.Errorf("unexpected message received by server: %+v", msg)
		}
	case <-time.After(time.Second):
		t.Fatalf("timeout waiting for server to receive message")
	}

	// Client receives welcome
	receivedServerMsg, err := clientConn.Receive(ctx)
	if err != nil {
		t.Fatalf("client receive failed: %v", err)
	}
	if receivedServerMsg.Type != transport.MsgWelcome {
		t.Errorf("expected welcome message, got %+v", receivedServerMsg)
	}
	_ = joinMsg
}
