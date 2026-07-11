import { getCurrentAppSessionId } from '@/auth/app-session-store';
import { Env } from '@/constants/env';

/**
 * Teacher announcement as returned by the (to-be-built) classroom announcements
 * endpoint. See docs/classroom-announcements-contract.md — the client already
 * calls this and degrades to an empty list until the backend ships.
 */
export interface TeacherAnnouncementDTO {
  id: string;
  classroomId: string;
  /** Display name of the authoring teacher (the classroom list only exposes
   *  teacherId, so the server includes the name here for the student view). */
  teacherName?: string;
  title: string;
  body?: string;
  /** ISO timestamp. */
  createdAt: string;
  /** Higher shows first; optional. */
  priority?: number;
}

function apiBase() {
  return Env.get('VITE_MUSIC_ATLAS_API_URL').replace(/\/+$/, '');
}

async function listForClassroom(
  token: string,
  classroomId: string,
): Promise<TeacherAnnouncementDTO[]> {
  const appSessionId = getCurrentAppSessionId();
  // Same host + path convention as the generated classroom endpoints
  // (`${base}/classrooms/:id/...`), same Bearer auth as experienceApi.
  const res = await fetch(
    `${apiBase()}/classrooms/${encodeURIComponent(classroomId)}/announcements`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        ...(appSessionId ? { 'X-App-Session': appSessionId } : {}),
      },
    },
  );
  if (!res.ok) throw new Error(`announcements GET ${res.status}`);
  const data = (await res.json()) as unknown;
  if (Array.isArray(data)) return data as TeacherAnnouncementDTO[];
  const wrapped = (data as { announcements?: TeacherAnnouncementDTO[] })
    ?.announcements;
  return Array.isArray(wrapped) ? wrapped : [];
}

export const announcementsApi = {
  /**
   * Fetch announcements across the user's classrooms in parallel. A missing
   * endpoint or any per-classroom error degrades to `[]` for that classroom, so
   * the feature is inert (no errors surfaced) until the backend exists.
   */
  listForClassrooms: async (
    token: string,
    classroomIds: string[],
  ): Promise<TeacherAnnouncementDTO[]> => {
    const results = await Promise.all(
      classroomIds.map((id) =>
        listForClassroom(token, id).catch(() => [] as TeacherAnnouncementDTO[]),
      ),
    );
    return results.flat();
  },
};
