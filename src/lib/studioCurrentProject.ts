/**
 * The Studio project a student has open, as the Studio last saw it.
 *
 * Classroom slides open the Studio in a NEW TAB, so the live-session tab keeps
 * its session socket (StudioCollabAction, AppRouteLaunch). That tab then has
 * no Studio of its own to ask what the student is working on, so the Studio
 * writes a note here and the session's "Show the class" offer
 * (ShowcaseInput) reads it. localStorage is shared by every tab of the
 * origin, and the note is kept per signed-in user, so on a shared computer
 * one student's project is never offered as another's.
 *
 * Ids and a name only — nothing a student surface should not hold. No DAW
 * imports, so the live-session chunk can read it without loading the Studio.
 */

const STORAGE_KEY = 'ma:studio:current:v1';

/** Older than this, a note is someone's earlier session, not today's work. */
export const STUDIO_NOTE_MAX_AGE_MS = 12 * 60 * 60 * 1000;

export interface StudioCurrentProject {
  /** The saved cloud project, or null while it has never been saved. */
  projectId: string | null;
  /** The collab room the Studio is in, or null when working alone. */
  roomId: string | null;
  name: string;
  /** When the Studio wrote this (ISO). */
  updatedAt: string;
}

const keyFor = (userId: string | null | undefined): string =>
  `${STORAGE_KEY}:${userId || 'anon'}`;

export const writeStudioCurrentProject = (
  userId: string | null | undefined,
  project: Omit<StudioCurrentProject, 'updatedAt'>,
  now: Date = new Date(),
): void => {
  try {
    window.localStorage.setItem(
      keyFor(userId),
      JSON.stringify({ ...project, updatedAt: now.toISOString() }),
    );
  } catch {
    // Storage full or blocked: the offer falls back to its own tab's Studio.
  }
};

/** The note, unless it is missing, unreadable or stale. */
export const readStudioCurrentProject = (
  userId: string | null | undefined,
  now: Date = new Date(),
): StudioCurrentProject | null => {
  try {
    const raw = window.localStorage.getItem(keyFor(userId));
    if (!raw) return null;
    const note = JSON.parse(raw) as Partial<StudioCurrentProject>;
    const at = Date.parse(note.updatedAt ?? '');
    if (!Number.isFinite(at) || now.getTime() - at > STUDIO_NOTE_MAX_AGE_MS)
      return null;
    return {
      projectId: typeof note.projectId === 'string' ? note.projectId : null,
      roomId: typeof note.roomId === 'string' ? note.roomId : null,
      name: typeof note.name === 'string' ? note.name : '',
      updatedAt: new Date(at).toISOString(),
    };
  } catch {
    return null;
  }
};
