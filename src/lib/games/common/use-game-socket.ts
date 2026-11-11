import * as React from "react";

export type ConnectionStatus =
  | "connecting"
  | "connected"
  | "disconnected"
  | "reconnecting";

export type MemberInfo = {
  id: string;
  roomId: string;
  name: string;
  seat: number;
  role: "host" | "player" | "viewer" | "bot";
};

export type ServerMessage<T = any> = {
  type: "welcome" | "event" | "view" | "error" | "pong";
  error?: string;
  errorCode?: string;
  seq?: number;
  member?: MemberInfo;
  event?: any;
  view?: T;
  timestamp: string;
};

export type UseGameSocketOptions<T> = {
  token: string | null;
  roomCode?: string;
  url?: string;
  onEvent?: (event: any) => void;
  onError?: (err: string) => void;
  initialView?: T;
};

export function getWsBaseUrl(): string {
  if (typeof window === "undefined") return "ws://localhost:8080/ws";
  if (process.env.NEXT_PUBLIC_GAME_WS_URL) {
    return process.env.NEXT_PUBLIC_GAME_WS_URL;
  }
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  // If running Next dev on port 11003, default backend is port 8080
  const host = window.location.hostname;
  return `${protocol}//${host}:8080/ws`;
}

export function useGameSocket<T = any>({
  token,
  roomCode,
  url,
  onEvent,
  onError,
  initialView,
}: UseGameSocketOptions<T>) {
  const [status, setStatus] = React.useState<ConnectionStatus>("disconnected");
  const [view, setView] = React.useState<T | null>(initialView ?? null);
  const [member, setMember] = React.useState<MemberInfo | null>(null);
  const [lastSeq, setLastSeq] = React.useState<number>(0);
  const [error, setError] = React.useState<string | null>(null);

  const wsRef = React.useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = React.useRef<number | null>(null);
  const pingIntervalRef = React.useRef<number | null>(null);
  const shouldReconnect = React.useRef<boolean>(true);

  const resolvedUrl = React.useMemo(() => {
    const base = url || getWsBaseUrl();
    if (!token) return base;
    const delim = base.includes("?") ? "&" : "?";
    return `${base}${delim}token=${encodeURIComponent(token)}`;
  }, [url, token]);

  const connect = React.useCallback(() => {
    if (!token) {
      setStatus("disconnected");
      return;
    }

    if (wsRef.current) {
      wsRef.current.close();
    }

    setStatus("connecting");
    setError(null);

    const ws = new WebSocket(resolvedUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("connected");
      setError(null);

      // Setup ping heartbeat
      pingIntervalRef.current = window.setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: "ping" }));
        }
      }, 15000);
    };

    ws.onmessage = (event) => {
      try {
        const msg: ServerMessage<T> = JSON.parse(event.data);
        if (msg.seq) {
          setLastSeq(msg.seq);
        }

        switch (msg.type) {
          case "welcome":
            if (msg.member) setMember(msg.member);
            if (msg.view) setView(msg.view);
            break;

          case "view":
            if (msg.view) setView(msg.view);
            break;

          case "event":
            if (msg.event && onEvent) onEvent(msg.event);
            break;

          case "error":
            setError(msg.error || "Unknown server error");
            if (onError) onError(msg.error || "Unknown server error");
            break;

          case "pong":
            break;
        }
      } catch {
        // Ignored unparsable
      }
    };

    ws.onclose = () => {
      setStatus("disconnected");
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
        pingIntervalRef.current = null;
      }

      if (shouldReconnect.current) {
        setStatus("reconnecting");
        reconnectTimeoutRef.current = window.setTimeout(() => {
          connect();
        }, 2000);
      }
    };

    ws.onerror = () => {
      setError("WebSocket connection failed");
    };
  }, [resolvedUrl, token, onEvent, onError]);

  React.useEffect(() => {
    shouldReconnect.current = true;
    connect();

    return () => {
      shouldReconnect.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const dispatch = React.useCallback((cmdType: string, payload?: any) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
      return false;
    }
    wsRef.current.send(
      JSON.stringify({
        type: "command",
        cmdType,
        payload,
      }),
    );
    return true;
  }, []);

  const resync = React.useCallback(() => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "resync",
          lastSeq,
        }),
      );
    }
  }, [lastSeq]);

  return {
    status,
    view,
    member,
    lastSeq,
    error,
    dispatch,
    resync,
    reconnect: connect,
  };
}
