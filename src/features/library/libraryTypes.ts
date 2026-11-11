import { LibraryRoutes, StudioRoutes } from '@/constants/routes';

// ── What the Library holds and plays (owner, 2026-11-11) ───────────────────
// Sessions: what the Studio makes, saved to the account or kept on this
// device. Projects: folders of sessions, the student's own (Samply's
// projects, which hold its tracks). A session is heard here without the
// editor, its mix rendered in the browser and kept on the device
// (preview/previewCache.ts): nothing is uploaded. Opened, it opens in the
// Studio (owner, 2026-11-11: no page of its own in the Library).

/** Where a session's data lives. */
export type LibrarySource =
  | { kind: 'cloud'; projectId: string }
  | { kind: 'draft'; draftId: string };

/** One thing in the player's queue. */
export interface PlayItem {
  /** Unique in a queue: the session's source key. */
  key: string;
  source: LibrarySource;
  /**
   * The small line over the title in the player: the Library project it
   * was played from, else the session's name.
   */
  context: string;
  /** The session's name. */
  title: string;
  /** The session's cover seed (generateStudioTileSvg). */
  artSeed: string;
  /**
   * The version of the session the audio is for (its updatedAt, or its
   * revision): a cached render of another version is never played. Unknown
   * (an activity item), it is read when the item is prepared.
   */
  version?: string;
}

/** A time the API sends as a Date or an ISO string, in ms (0 if none). */
export function timeOf(
  value: Date | string | number | null | undefined,
): number {
  const ms =
    value instanceof Date
      ? value.getTime()
      : typeof value === 'string'
        ? Date.parse(value)
        : (value ?? 0);
  return Number.isFinite(ms) ? ms : 0;
}

/** A cloud session's version: its revision, else when it was last written. */
export function cloudVersion(project: {
  revision?: number;
  updatedAt: Date | string;
}): string {
  return typeof project.revision === 'number'
    ? `r${project.revision}`
    : `t${timeOf(project.updatedAt)}`;
}

export function sourceKey(source: LibrarySource): string {
  return source.kind === 'cloud'
    ? `cloud:${source.projectId}`
    : `draft:${source.draftId}`;
}

/** The source a source key names; null for anything else. */
export function sourceOfKey(key: string): LibrarySource | null {
  if (key.startsWith('cloud:'))
    return { kind: 'cloud', projectId: key.slice(6) };
  if (key.startsWith('draft:')) return { kind: 'draft', draftId: key.slice(6) };
  return null;
}

/** The cover seed a session's tile is drawn from, as Home's and the
 *  Studio's lists draw it, so a session wears one cover everywhere. */
export function artSeedOf(source: LibrarySource): string {
  return source.kind === 'cloud'
    ? `project:${source.projectId}`
    : `draft:${source.draftId}`;
}

/** A Library project's page. */
export function projectHrefOf(projectId: string): string {
  return LibraryRoutes.project({ projectId });
}

/** Where the Studio opens it. */
export function studioHrefOf(source: LibrarySource): string {
  const editor = StudioRoutes.editor.definition;
  return source.kind === 'cloud'
    ? `${editor}?project=${encodeURIComponent(source.projectId)}`
    : `${editor}?draft=${encodeURIComponent(source.draftId)}`;
}

/**
 * The session a Studio link opens (`?project=` or `?draft=`), or null: the
 * link of a Recent activity item, so the bar can play it.
 */
export function sourceOfStudioHref(href: string): LibrarySource | null {
  const at = href.indexOf('?');
  if (at < 0) return null;
  const params = new URLSearchParams(href.slice(at + 1));
  const projectId = params.get('project');
  if (projectId) return { kind: 'cloud', projectId };
  const draftId = params.get('draft');
  if (draftId) return { kind: 'draft', draftId };
  return null;
}

/** A session's mix as a queue item; `context` is the Library project it is
 *  played from, when it is. */
export function mixItem(
  source: LibrarySource,
  name: string,
  version?: string,
  context?: string,
): PlayItem {
  return {
    key: sourceKey(source),
    source,
    context: context ?? name,
    title: name,
    artSeed: artSeedOf(source),
    version,
  };
}
