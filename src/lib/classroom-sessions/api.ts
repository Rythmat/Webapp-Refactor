import { authFetch } from '@/auth/authFetch';
import { Env } from '@/constants/env';

/**
 * Live classroom session as returned by `GET /classrooms/:id/sessions?status=live`
 * (contract addition in docs/classroom-v2/openapi.yaml). Same degrade-to-empty
 * pattern as `announcementsApi` — the client calls this and treats any error
 * (including 404 while the endpoint doesn't exist) as "no live sessions", so
 * the feature is inert until the backend ships.
 */
export interface LiveSessionDTO {
  id: string;
  classroomId: string;
  status: 'live' | 'ended';
  startedAt: string;
}

function apiBase() {
  return Env.get('VITE_MUSIC_ATLAS_API_URL').replace(/\/+$/, '');
}

async function listLiveForClassroom(
  token: string,
  classroomId: string,
): Promise<LiveSessionDTO[]> {
  const res = await authFetch(
    `${apiBase()}/classrooms/${encodeURIComponent(classroomId)}/sessions?status=live`,
    token,
  );
  if (!res.ok) throw new Error(`sessions GET ${res.status}`);
  const data = (await res.json()) as unknown;
  if (Array.isArray(data)) return data as LiveSessionDTO[];
  const wrapped = (data as { sessions?: LiveSessionDTO[] })?.sessions;
  return Array.isArray(wrapped) ? wrapped : [];
}

export const classroomSessionsApi = {
  /** Live sessions across the user's classrooms; per-classroom errors degrade to []. */
  listLiveForClassrooms: async (
    token: string,
    classroomIds: string[],
  ): Promise<LiveSessionDTO[]> => {
    const results = await Promise.all(
      classroomIds.map((id) =>
        listLiveForClassroom(token, id).catch(() => [] as LiveSessionDTO[]),
      ),
    );
    return results.flat().filter((s) => s.status === 'live');
  },
};
