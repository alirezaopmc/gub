import type { MemberInfo } from "./use-game-socket";

export type StoredSession = {
  token: string;
  roomCode: string;
  member: MemberInfo;
};

const STORAGE_PREFIX = "gub:session:";

export function getHttpBaseUrl(): string {
  if (typeof window === "undefined") return "http://localhost:8080";
  if (process.env.NEXT_PUBLIC_GAME_HTTP_URL) {
    return process.env.NEXT_PUBLIC_GAME_HTTP_URL;
  }
  const host = window.location.hostname;
  return `${window.location.protocol}//${host}:8080`;
}

export function saveGameSession(session: StoredSession): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      `${STORAGE_PREFIX}${session.roomCode.toUpperCase()}`,
      JSON.stringify(session),
    );
    // Also save last active session
    localStorage.setItem(`${STORAGE_PREFIX}latest`, JSON.stringify(session));
  } catch {
    // Ignore storage quota errors
  }
}

export function loadGameSession(roomCode?: string): StoredSession | null {
  if (typeof window === "undefined") return null;
  try {
    const key = roomCode
      ? `${STORAGE_PREFIX}${roomCode.toUpperCase()}`
      : `${STORAGE_PREFIX}latest`;
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as StoredSession;
  } catch {
    return null;
  }
}

export function clearGameSession(roomCode?: string): void {
  if (typeof window === "undefined") return;
  try {
    if (roomCode) {
      localStorage.removeItem(`${STORAGE_PREFIX}${roomCode.toUpperCase()}`);
    } else {
      localStorage.removeItem(`${STORAGE_PREFIX}latest`);
    }
  } catch {
    // Ignore
  }
}

export async function createGameRoom(
  gameId: string,
  hostName: string,
  maxPlayers: number,
  config?: any,
): Promise<{ room: any; member: MemberInfo; token: string }> {
  const url = `${getHttpBaseUrl()}/api/rooms`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      gameId,
      hostName,
      maxPlayers,
      config,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `Failed to create room: ${res.status}`);
  }

  const data = await res.json();
  saveGameSession({
    token: data.token,
    roomCode: data.room.code,
    member: data.member,
  });
  return data;
}

export async function joinGameRoom(
  roomCode: string,
  name: string,
  role: "player" | "viewer" = "player",
): Promise<{ room: any; member: MemberInfo; token: string }> {
  const url = `${getHttpBaseUrl()}/api/rooms/join`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      roomCode: roomCode.trim().toUpperCase(),
      name: name.trim(),
      role,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(err || `Failed to join room: ${res.status}`);
  }

  const data = await res.json();
  saveGameSession({
    token: data.token,
    roomCode: data.room.code,
    member: data.member,
  });
  return data;
}
