import { getTutorialEntry } from '@/daw/components/Tutorial/tutorialCatalog';
import { getDemoProject } from '@/daw/data/demoProjects';
import { getProjectTemplate } from '@/daw/data/projectTemplates';
import type { OpenIntent } from '@/daw/session/types';
import { DEVICE_USER_KEY } from '@/lib/local-store/userScope';
import {
  draftHasWork,
  draftIsCloudEqual,
  draftIsPristine,
  draftIsReadOnly,
} from '@/lib/studio-projects/drafts/predicates';
import type { DraftMeta } from '@/lib/studio-projects/drafts/types';
import type { StudioProjectSummary } from '@/lib/studio-projects/projectsClient';

// ── The Projects dialog's rows (milestone 1.4, spec E16) ───────────────────
//
// A pure merge of this user's drafts, the device's unowned drafts and the
// account's cloud list into three sections:
// - 'On this device' (device): drafts with work, kept work, copies, drafts a
//   newer version wrote (read-only), and the open draft. Pristine and
//   cloud-equal drafts are caches and stay hidden, unless open.
// - 'Found on this device' (found): '~device' drafts (pre-1.4 work no one
//   has claimed yet).
// - 'Saved to your account' (account): the cloud list.
// A draft of a cloud project keeps its own row; both rows say 'Changes on
// this device'. A draft is 'not in your account' only against a list that
// loaded: a null list (loading, failed, signed out) never proves deletion.

export type ProjectRowTag =
  | 'open-now'
  | 'kept'
  | 'changes-on-device'
  | 'not-in-account'
  | 'copy'
  | 'found-on-device'
  | 'from-earlier-version'
  | 'newer-version'
  | 'other-tab';

export interface ProjectRow {
  /** Unique across sections: 'draft:<id>' or 'cloud:<id>'. */
  key: string;
  section: 'device' | 'found' | 'account';
  name: string;
  subtitle: string;
  /** Recent sort key (ms). */
  updatedAt: number;
  /** Body characters plus stored media bytes; null for a cloud row. */
  sizeChars: number | null;
  draft: DraftMeta | null;
  cloud: StudioProjectSummary | null;
  tags: ProjectRowTag[];
  isOpen: boolean;
  canOpen: boolean;
  canDelete: boolean;
  /** What Open opens; null when there is nothing this build can open. */
  openIntent: OpenIntent | null;
  /**
   * 'Open saved version' (E11): the cloud copy as saved, on an account row
   * this device has changes for. Null otherwise, and in a room.
   */
  openSavedIntent: OpenIntent | null;
}

export interface ProjectRowsInput {
  mine: DraftMeta[];
  device: DraftMeta[];
  /** null never proves a project was deleted. */
  cloud: StudioProjectSummary[] | null;
  /**
   * Whether `cloud` is this opening's fetch (default true). A cached list
   * shown while the fetch runs, or after it failed, still lists rows but
   * never marks a draft 'not in your account'.
   */
  cloudFresh?: boolean;
  locked: ReadonlySet<string>;
  activeDraftId: string | null;
  liveProjectId: string | null;
  inRoom: boolean;
  schemaVersion: number;
  query: string;
  sortBy: 'recent' | 'size';
  /** For the 'Edited 5 min ago' lines (tests). Default Date.now(). */
  now?: number;
}

export interface ProjectRowSections {
  device: ProjectRow[];
  found: ProjectRow[];
  account: ProjectRow[];
}

const UNTITLED = 'Untitled Project';

const nameOf = (value: unknown): string =>
  typeof value === 'string' && value.trim() ? value.trim() : UNTITLED;

const finite = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;

/**
 * The project a draft belongs to: its own link only. A cleared projectId
 * (File ▸ Delete, a fork) means it is no longer linked, whatever its last
 * save's record says; the port's findProjectDraft reads the same field.
 */
export function draftProjectId(meta: DraftMeta): string | null {
  return meta.projectId ?? null;
}

/** Case- and accent-insensitive form for search. */
export function foldForSearch(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase();
}

function timeOf(value: Date | string | number | null | undefined): number {
  if (value instanceof Date) return finite(value.getTime());
  if (typeof value === 'string') return finite(Date.parse(value));
  return finite(value);
}

/** 'just now', '5 min ago', '3 h ago', 'yesterday', or 'Oct 3'. */
export function relativeWhen(at: number, now: number): string {
  const diff = Math.max(0, now - at);
  const minute = 60_000;
  if (diff < minute) return 'just now';
  if (diff < 60 * minute) return `${Math.floor(diff / minute)} min ago`;
  const then = new Date(at);
  const today = new Date(now);
  if (then.toDateString() === today.toDateString()) {
    return `${Math.floor(diff / (60 * minute))} h ago`;
  }
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (then.toDateString() === yesterday.toDateString()) return 'yesterday';
  return then.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(then.getFullYear() !== today.getFullYear()
      ? { year: 'numeric' as const }
      : {}),
  });
}

/** Where the draft started, in a student's words; null when nothing useful. */
function sourcePhrase(meta: DraftMeta): string | null {
  const baseline = meta.baseline as DraftMeta['baseline'] | undefined;
  const ref = baseline?.ref;
  switch (baseline?.source) {
    case 'template': {
      const label = ref ? getProjectTemplate(ref)?.label : undefined;
      return label ? `From template ${label}` : 'From a template';
    }
    case 'demo': {
      const label = ref ? getDemoProject(ref)?.label : undefined;
      return label ? `From demo ${label}` : 'From a demo';
    }
    case 'tutorial': {
      const title = ref ? getTutorialEntry(ref)?.title : undefined;
      return title ? `Lesson: ${title}` : 'Lesson';
    }
    case 'song':
      return 'From a song';
    case 'practiceMode':
    case 'practiceGenre':
      return 'Practice track';
    case 'jam':
      return 'From a jam';
    case 'collab':
      return 'Shared session';
    case 'project':
      return 'From your account';
    case 'import':
      return 'From an earlier version';
    default:
      return null;
  }
}

function draftSubtitle(meta: DraftMeta, now: number): string {
  const when =
    meta.origin === 'kept' && finite(meta.keptAt) > 0
      ? `Kept ${relativeWhen(finite(meta.keptAt), now)}`
      : `Edited ${relativeWhen(finite(meta.updatedAt), now)}`;
  const from = sourcePhrase(meta);
  return from ? `${from} · ${when}` : when;
}

function cloudSubtitle(project: StudioProjectSummary, now: number): string {
  const parts: string[] = [];
  if (typeof project.bpm === 'number' && Number.isFinite(project.bpm)) {
    parts.push(`${Math.round(project.bpm)} BPM`);
  }
  const at = timeOf(project.updatedAt);
  if (at > 0) parts.push(`Edited ${relativeWhen(at, now)}`);
  return parts.join(' · ');
}

function draftSize(meta: DraftMeta): number {
  const media = Array.isArray(meta.media) ? meta.media : [];
  return (
    finite(meta.chars) + media.reduce((sum, ref) => sum + finite(ref.size), 0)
  );
}

/** Whether a draft belongs in its section's list. */
function draftVisible(meta: DraftMeta, isOpen: boolean, readOnly: boolean) {
  if (isOpen) return true;
  if (readOnly) return true;
  if (draftIsPristine(meta) || draftIsCloudEqual(meta)) return false;
  return draftHasWork(meta) || meta.origin === 'kept' || meta.origin === 'fork';
}

function draftRow(
  meta: DraftMeta,
  section: 'device' | 'found',
  input: ProjectRowsInput,
  cloudIds: ReadonlySet<string> | null,
  now: number,
): ProjectRow | null {
  const isOpen = meta.draftId === input.activeDraftId;
  const readOnly = draftIsReadOnly(meta, input.schemaVersion);
  if (!draftVisible(meta, isOpen, readOnly)) return null;
  const locked = input.locked.has(meta.draftId) && !isOpen;

  const tags: ProjectRowTag[] = [];
  if (isOpen) tags.push('open-now');
  if (meta.origin === 'kept') tags.push('kept');
  if (meta.origin === 'fork') tags.push('copy');
  if (meta.origin === 'migrated' || meta.origin === 'recovered') {
    tags.push('from-earlier-version');
  }
  if (section === 'found') tags.push('found-on-device');
  const projectId = draftProjectId(meta);
  if (projectId !== null && draftHasWork(meta)) {
    tags.push(
      cloudIds !== null && !cloudIds.has(projectId)
        ? 'not-in-account'
        : 'changes-on-device',
    );
  }
  if (readOnly) tags.push('newer-version');
  if (locked) tags.push('other-tab');

  return {
    key: `draft:${meta.draftId}`,
    section,
    name: nameOf(meta.name),
    subtitle: readOnly
      ? 'Made by a newer version of Music Atlas'
      : draftSubtitle(meta, now),
    updatedAt: Math.max(finite(meta.updatedAt), finite(meta.keptAt)),
    sizeChars: draftSize(meta),
    draft: meta,
    cloud: null,
    tags,
    isOpen,
    canOpen: !input.inRoom && !isOpen && !readOnly,
    // 'Found on this device' work belongs to nobody yet (E6): perhaps another
    // student's only copy. It is claimed by opening, or ages out after 30
    // days; no one else may delete it.
    canDelete:
      section === 'device' &&
      meta.userKey !== DEVICE_USER_KEY &&
      !isOpen &&
      !input.locked.has(meta.draftId),
    openIntent: readOnly ? null : { kind: 'draft', draftId: meta.draftId },
    openSavedIntent: null,
  };
}

function cloudRow(
  project: StudioProjectSummary,
  input: ProjectRowsInput,
  draftsWithWork: ReadonlySet<string>,
  now: number,
): ProjectRow {
  const isOpen =
    input.liveProjectId !== null && input.liveProjectId === project.id;
  const tags: ProjectRowTag[] = [];
  if (isOpen) tags.push('open-now');
  const changed = draftsWithWork.has(project.id);
  if (changed) tags.push('changes-on-device');
  return {
    key: `cloud:${project.id}`,
    section: 'account',
    name: nameOf(project.name),
    subtitle: cloudSubtitle(project, now),
    updatedAt: timeOf(project.updatedAt),
    sizeChars: null,
    draft: null,
    cloud: project,
    tags,
    isOpen,
    canOpen: !input.inRoom && !isOpen,
    canDelete: false,
    openIntent: { kind: 'project', projectId: project.id },
    openSavedIntent:
      changed && !input.inRoom
        ? { kind: 'project', projectId: project.id, fromCloud: true }
        : null,
  };
}

function sortRows(rows: ProjectRow[], sortBy: 'recent' | 'size'): void {
  rows.sort((a, b) => {
    // The open session leads its section.
    if (a.isOpen !== b.isOpen) return a.isOpen ? -1 : 1;
    if (sortBy === 'size') {
      const diff = (b.sizeChars ?? -1) - (a.sizeChars ?? -1);
      if (diff !== 0) return diff;
    }
    const diff = b.updatedAt - a.updatedAt;
    return diff !== 0 ? diff : a.key.localeCompare(b.key);
  });
}

/** The Projects dialog's three sections, filtered by `query` and sorted. */
export function buildProjectRows(input: ProjectRowsInput): ProjectRowSections {
  const now = input.now ?? Date.now();
  const cloudIds =
    input.cloud === null || input.cloudFresh === false
      ? null
      : new Set(input.cloud.map((p) => p.id));

  // Cloud projects a draft of this user's has changes for.
  const draftsWithWork = new Set<string>();
  for (const meta of input.mine) {
    const projectId = draftProjectId(meta);
    if (
      projectId !== null &&
      draftHasWork(meta) &&
      !draftIsReadOnly(meta, input.schemaVersion)
    ) {
      draftsWithWork.add(projectId);
    }
  }

  const device: ProjectRow[] = [];
  for (const meta of input.mine) {
    if (meta.userKey === DEVICE_USER_KEY) continue;
    const row = draftRow(meta, 'device', input, cloudIds, now);
    if (row) device.push(row);
  }
  const found: ProjectRow[] = [];
  for (const meta of input.device) {
    const row = draftRow(meta, 'found', input, cloudIds, now);
    if (row) found.push(row);
  }
  const account = (input.cloud ?? []).map((project) =>
    cloudRow(project, input, draftsWithWork, now),
  );

  const query = foldForSearch(input.query.trim());
  const sections: ProjectRowSections = { device, found, account };
  for (const key of ['device', 'found', 'account'] as const) {
    let rows = sections[key];
    if (query) {
      rows = rows.filter((row) => foldForSearch(row.name).includes(query));
    }
    sortRows(rows, input.sortBy);
    sections[key] = rows;
  }
  return sections;
}
