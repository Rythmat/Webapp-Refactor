// ── Room Manager ─────────────────────────────────────────────────────────
// Client-side API calls for room CRUD and invite link management.
// Talks to the Vercel serverless API endpoints.

import type { CollabRole, RoomMetadata } from './types';

const API_BASE =
  (import.meta as Record<string, Record<string, string>>).env
    ?.VITE_API_BASE_URL ?? 'https://api-refactor.vercel.app';

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  token?: string,
): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { ...headers, ...(options.headers as Record<string, string>) },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API error ${res.status}: ${text}`);
  }

  return res.json();
}

// ── Room CRUD ───────────────────────────────────────────────────────────

export async function createRoom(
  projectName: string,
  token: string,
): Promise<RoomMetadata> {
  return apiFetch<RoomMetadata>(
    '/api/collab/rooms',
    {
      method: 'POST',
      body: JSON.stringify({ projectName }),
    },
    token,
  );
}

export async function getRoom(
  roomId: string,
  token: string,
): Promise<RoomMetadata> {
  return apiFetch<RoomMetadata>(
    `/api/collab/rooms/${roomId}`,
    { method: 'GET' },
    token,
  );
}

export async function deleteRoom(roomId: string, token: string): Promise<void> {
  await apiFetch(`/api/collab/rooms/${roomId}`, { method: 'DELETE' }, token);
}

// ── Invites ─────────────────────────────────────────────────────────────

export interface InviteResponse {
  inviteUrl: string;
  token: string;
  expiresAt: number;
}

export async function createInvite(
  roomId: string,
  role: CollabRole,
  authToken: string,
): Promise<InviteResponse> {
  return apiFetch<InviteResponse>(
    `/api/collab/rooms/${roomId}/invite`,
    {
      method: 'POST',
      body: JSON.stringify({ role }),
    },
    authToken,
  );
}

export async function joinRoomWithInvite(
  roomId: string,
  inviteToken: string,
  authToken: string,
): Promise<{ role: CollabRole }> {
  return apiFetch<{ role: CollabRole }>(
    `/api/collab/rooms/${roomId}/join`,
    {
      method: 'POST',
      body: JSON.stringify({ inviteToken }),
    },
    authToken,
  );
}
