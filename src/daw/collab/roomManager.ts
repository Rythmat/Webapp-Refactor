// ── Room Manager ─────────────────────────────────────────────────────────
// Client-side API calls for room CRUD.
// Talks to the Music Atlas API /rooms endpoints.

import { getCurrentAppSessionId } from '@/auth/app-session-store';
import { Env } from '@/constants/env';

const API_BASE = Env.get('VITE_MUSIC_ATLAS_API_URL', { nullable: true }) ?? '';

// ── Response types (matches StoredRoomMetadata from API) ────────────────

export interface RoomResponse {
  roomId: string;
  projectName: string;
  ownerId: string;
  createdAt: number;
  members: Record<
    string,
    { role: 'owner' | 'editor' | 'viewer'; joinedAt: number }
  >;
}

export interface RoomListItem {
  roomId: string;
  projectName: string;
  ownerId: string;
  createdAt: number;
}

// ── Fetch helper ────────────────────────────────────────────────────────

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const appSessionId = getCurrentAppSessionId();
  if (appSessionId) headers['X-App-Session'] = appSessionId;

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers as Record<string, string>) },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(
      (body as { error?: string }).error ?? `API error ${res.status}`,
    );
  }

  return res.json();
}

// ── Room CRUD ───────────────────────────────────────────────────────────

export async function createRoom(
  params: { projectName: string },
  token: string,
): Promise<RoomResponse> {
  return apiFetch<RoomResponse>(
    '/api/collab/rooms',
    {
      method: 'POST',
      body: JSON.stringify(params),
    },
    token,
  );
}

export async function getRoom(
  idOrCode: string,
  token: string,
): Promise<RoomResponse> {
  return apiFetch<RoomResponse>(
    `/api/collab/rooms/${encodeURIComponent(idOrCode)}`,
    { method: 'GET' },
    token,
  );
}

export async function listRooms(
  query: { type?: 'daw' | 'jam'; status?: 'active' | 'closed' },
  token: string,
): Promise<RoomListItem[]> {
  const params = new URLSearchParams();
  if (query.type) params.set('type', query.type);
  if (query.status) params.set('status', query.status);
  const qs = params.toString();
  return apiFetch<RoomListItem[]>(
    `/api/collab/rooms${qs ? `?${qs}` : ''}`,
    { method: 'GET' },
    token,
  );
}

export async function closeRoom(roomId: string, token: string): Promise<void> {
  await apiFetch(`/api/collab/rooms/${roomId}`, { method: 'DELETE' }, token);
}

// ── Invite helpers (generate a share link from the room code) ───────────

export function getRoomInviteUrl(code: string): string {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}/join/${code}`;
}
