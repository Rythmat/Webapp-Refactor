import { updateLibraryMeta, type LibraryProject } from './libraryLocalMeta';

// ── The student's projects: folders of sessions (owner, 2026-11-11) ────────
// Samply's projects, which hold its tracks; here they hold Studio sessions,
// in the student's order. A session is in one project at most, so adding
// it to one takes it out of the one it was in. Kept on this device
// (libraryLocalMeta) until the account has a place for them.

/** The key a project is favourited and listed under. */
export const projectKey = (id: string) => `folder:${id}`;

export const UNTITLED_PROJECT = 'Untitled Project';

function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}${Math.random().toString(36).slice(2)}`;
}

/** Each project with `keys` taken out, the one `except` left alone. */
function without(
  projects: LibraryProject[],
  keys: readonly string[],
  except: string | null,
  now: number,
): LibraryProject[] {
  const drop = new Set(keys);
  return projects.map((p) =>
    p.id !== except && p.sessions.some((k) => drop.has(k))
      ? {
          ...p,
          sessions: p.sessions.filter((k) => !drop.has(k)),
          updatedAt: now,
        }
      : p,
  );
}

/** A new project, holding `sessions` (taken from wherever they were).
 *  Returns its id; null while the user isn't known yet. */
export function createProject(
  name: string,
  sessions: readonly string[] = [],
): string | null {
  const id = newId();
  let made = false;
  updateLibraryMeta(({ projects }) => {
    made = true;
    const now = Date.now();
    return {
      projects: [
        ...without(projects, sessions, null, now),
        {
          id,
          name: name.trim() || UNTITLED_PROJECT,
          createdAt: now,
          updatedAt: now,
          sessions: [...new Set(sessions)],
        },
      ],
    };
  });
  return made ? id : null;
}

export function renameProject(id: string, name: string): void {
  const trimmed = name.trim();
  if (!trimmed) return;
  updateLibraryMeta(({ projects }) => ({
    projects: projects.map((p) =>
      p.id === id ? { ...p, name: trimmed, updatedAt: Date.now() } : p,
    ),
  }));
}

/** Give the project an image (projectCovers.ts), or back to its
 *  sessions' covers (null). */
export function setProjectCover(id: string, cover: string | null): void {
  updateLibraryMeta(({ projects }) => ({
    projects: projects.map((p) =>
      p.id === id ? { ...p, cover, updatedAt: Date.now() } : p,
    ),
  }));
}

/** Delete the project; its sessions stay in the Library. */
export function deleteProject(id: string): void {
  updateLibraryMeta(({ projects, favorites }) => ({
    projects: projects.filter((p) => p.id !== id),
    favorites: favorites.filter((k) => k !== projectKey(id)),
  }));
}

/** Put sessions at the end of a project, out of any other. */
export function addToProject(id: string, sessions: readonly string[]): void {
  updateLibraryMeta(({ projects }) => {
    const now = Date.now();
    return {
      projects: without(projects, sessions, id, now).map((p) =>
        p.id === id
          ? {
              ...p,
              sessions: [
                ...p.sessions,
                ...sessions.filter((k) => !p.sessions.includes(k)),
              ],
              updatedAt: now,
            }
          : p,
      ),
    };
  });
}

/** Take sessions out of whatever project holds them (they stay in the
 *  Library); a deleted session goes this way too. */
export function removeFromProjects(sessions: readonly string[]): void {
  updateLibraryMeta(({ projects }) => ({
    projects: without(projects, sessions, null, Date.now()),
  }));
}

/** Move a session one place up (-1) or down (+1) in its project. */
export function moveInProject(id: string, session: string, by: -1 | 1): void {
  updateLibraryMeta(({ projects }) => ({
    projects: projects.map((p) => {
      if (p.id !== id) return p;
      const from = p.sessions.indexOf(session);
      const to = from + by;
      if (from < 0 || to < 0 || to >= p.sessions.length) return p;
      const sessions = [...p.sessions];
      [sessions[from], sessions[to]] = [sessions[to], sessions[from]];
      return { ...p, sessions, updatedAt: Date.now() };
    }),
  }));
}

/** The project holding `session`, if any. */
export function projectOf(
  projects: readonly LibraryProject[],
  session: string,
): LibraryProject | null {
  return projects.find((p) => p.sessions.includes(session)) ?? null;
}
