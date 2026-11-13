package transport_test

import (
	"context"
	"net/http"
	"net/http/httptest"
	"reflect"
	"strings"
	"testing"
	"time"

	"github.com/coder/websocket"
	"github.com/manovaspace/gub/server/core/transport"
)

func TestParseOriginPatterns(t *testing.T) {
	tests := []struct {
		name string
		raw  string
		want []string
	}{
		{name: "empty means wildcard", raw: "", want: []string{"*"}},
		{name: "blank entries mean wildcard", raw: " , ,", want: []string{"*"}},
		{name: "single host", raw: "gub.manova.space", want: []string{"gub.manova.space"}},
		{name: "comma list trimmed", raw: " a.test , b.test,c.test ", want: []string{"a.test", "b.test", "c.test"}},
		{name: "scheme and slash stripped", raw: "https://gub.manova.space/, http://localhost:11003", want: []string{"gub.manova.space", "localhost:11003"}},
		{name: "wildcard subdomain", raw: "*.manova.space", want: []string{"*.manova.space"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := transport.ParseOriginPatterns(tt.raw)
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("ParseOriginPatterns(%q) = %q, want %q", tt.raw, got, tt.want)
			}
		})
	}
}

func TestDefaultOriginPatternsFromEnv(t *testing.T) {
	tests := []struct {
		name string
		env  string
		set  bool
		want []string
	}{
		{name: "unset", set: false, want: []string{"*"}},
		{name: "set empty", env: "", set: true, want: []string{"*"}},
		{name: "set list", env: "gub.manova.space,localhost:11003", set: true, want: []string{"gub.manova.space", "localhost:11003"}},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if tt.set {
				t.Setenv(transport.OriginEnv, tt.env)
			} else {
				t.Setenv(transport.OriginEnv, "")
			}
			got := transport.DefaultOriginPatterns()
			if !reflect.DeepEqual(got, tt.want) {
				t.Errorf("DefaultOriginPatterns() = %q, want %q", got, tt.want)
			}
		})
	}
}

func dialWithOrigin(t *testing.T, serverURL, origin string) (*websocket.Conn, *http.Response, error) {
	t.Helper()
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	t.Cleanup(cancel)
	hdr := http.Header{}
	if origin != "" {
		hdr.Set("Origin", origin)
	}
	return websocket.Dial(ctx, serverURL, &websocket.DialOptions{HTTPHeader: hdr})
}

func TestAcceptWSOriginEnv(t *testing.T) {
	tests := []struct {
		name   string
		env    string
		origin string
		wantOK bool
	}{
		{name: "unset allows any origin", env: "", origin: "https://evil.example", wantOK: true},
		{name: "listed origin allowed", env: "https://gub.manova.space", origin: "https://gub.manova.space", wantOK: true},
		{name: "unlisted origin rejected", env: "gub.manova.space", origin: "https://evil.example", wantOK: false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Setenv(transport.OriginEnv, tt.env)
			s := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				conn, err := transport.AcceptWS(w, r, nil)
				if err == nil {
					_ = conn.Close()
				}
			}))
			defer s.Close()

			wsURL := "ws" + strings.TrimPrefix(s.URL, "http")
			conn, _, err := dialWithOrigin(t, wsURL, tt.origin)
			if tt.wantOK {
				if err != nil {
					t.Fatalf("dial with origin %q: %v", tt.origin, err)
				}
				_ = conn.CloseNow()
			} else if err == nil {
				_ = conn.CloseNow()
				t.Fatalf("dial with origin %q succeeded, want rejection", tt.origin)
			}
		})
	}
}

func TestReadLimit(t *testing.T) {
	tests := []struct {
		name    string
		size    int
		wantErr bool
	}{
		{name: "small message", size: 1024, wantErr: false},
		{name: "just over limit", size: int(transport.MaxReadBytes) + 1, wantErr: true},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			errCh := make(chan error, 1)
			s := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				conn, err := transport.AcceptWS(w, r, nil)
				if err != nil {
					errCh <- err
					return
				}
				defer conn.Close()
				ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
				defer cancel()
				_, err = conn.Receive(ctx)
				errCh <- err
			}))
			defer s.Close()

			wsURL := "ws" + strings.TrimPrefix(s.URL, "http")
			ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
			defer cancel()
			client, _, err := websocket.Dial(ctx, wsURL, nil)
			if err != nil {
				t.Fatalf("dial: %v", err)
			}
			defer client.CloseNow()

			payload := `{"type":"ping","payload":"` + strings.Repeat("x", tt.size) + `"}`
			_ = client.Write(ctx, websocket.MessageText, []byte(payload))

			select {
			case err := <-errCh:
				if (err != nil) != tt.wantErr {
					t.Fatalf("receive err = %v, wantErr %v", err, tt.wantErr)
				}
			case <-time.After(3 * time.Second):
				t.Fatal("timeout waiting for server receive")
			}
		})
	}
}
