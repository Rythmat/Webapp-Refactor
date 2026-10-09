import type { ActivitySectionId } from '@/curriculum/types/activity';
import { getTutorial } from '@/daw/components/Tutorial/tutorials';
import { getDemoProject } from '@/daw/data/demoProjects';
import { getProjectTemplate } from '@/daw/data/projectTemplates';
import { readPendingJam } from '@/daw/jam-import/importJamSession';
import { isScaleLesson } from '@/lib/learn/scaleLessons';
import { isDiatonicMode } from '@prism/engine';
import type { OpenError, OpenIntent } from './types';

// ── What an editor URL asks to open (milestone 1.4) ────────────────────────
//
// `/studio/editor?…` names at most one thing to open. parseBootIntent reads
// it, in the order the boot has always checked the parameters (seeded first,
// a bare URL last), and says which keys the open consumes: openSession strips
// exactly those once it is done, and leaves every other key where it is (an
// MSP launch's interactionId, enrollmentId, module, activityRef, expects and
// msp; utm_*; anything else a caller put there).
//
// validateIntent is the synchronous check: an id that names nothing in the
// editor's own data is refused before anything changes. A project, a song, a
// genre practice track and a draft are only known once fetched or read, so
// openSession's prepare step checks those.

/** One parsed editor URL. */
export interface ParsedBoot {
  intent: OpenIntent;
  /**
   * The boot keys in the URL, to strip once the open is done: the winning
   * intent's own keys and any other boot key next to it (a URL that names
   * two things opens the first; the second must not open on the next
   * navigation). Never an MSP key or utm_*.
   */
  consumedKeys: readonly string[];
  /** `?projects=1`: open the Projects dialog once the session is ready. */
  openProjects: boolean;
}

/** Every key an editor URL can carry to name what to open. */
export const BOOT_KEYS: readonly string[] = Object.freeze([
  'seeded',
  'draft',
  'project',
  'saved',
  'template',
  'demo',
  'tutorial',
  'song',
  'transpose',
  'practiceGenre',
  'practiceLevel',
  'practiceSection',
  'practiceMode',
  'practiceRoot',
  'practiceOpen',
  'collab',
  'host',
  'invite',
  'jam',
  'new',
  'projects',
]);

/** MSP launch keys: read by the lesson layer, never stripped by an open. */
export const MSP_KEYS: readonly string[] = Object.freeze([
  'interactionId',
  'enrollmentId',
  'module',
  'activityRef',
  'expects',
  'msp',
]);

const SECTIONS: readonly ActivitySectionId[] = ['A', 'B', 'C', 'D'];

/** The Song page's transposition: an integer from −11 to 11 (0 otherwise). */
function readTranspose(raw: string | null): number {
  if (raw === null || raw.trim() === '') return 0;
  const n = Number(raw);
  if (!Number.isFinite(n)) return 0;
  const steps = Math.trunc(n);
  // `-0` would read as a transposition in a deep equal.
  return Math.max(-11, Math.min(11, steps)) || 0;
}

/** What `params` asks the editor to open (never throws). */
export function parseBootIntent(params: URLSearchParams): ParsedBoot {
  const get = (name: string) => params.get(name);
  const consumedKeys = BOOT_KEYS.filter((key) => params.has(key));
  const openProjects = get('projects') === '1';
  const parsed = (intent: OpenIntent): ParsedBoot => ({
    intent,
    consumedKeys,
    openProjects,
  });
  const isJamImport = get('jam') === '1';

  // The Song page's pre-1.4 hand-off seeded the store before navigating
  // here. 1.4 opens songs by URL (?song=&transpose=); a bookmarked or old
  // tab's ?seeded=1 carries on with the session, as a bare URL does.
  if (get('seeded') === '1') return parsed({ kind: 'resume' });

  const draftId = get('draft')?.trim();
  if (draftId) return parsed({ kind: 'draft', draftId });
  const projectId = get('project')?.trim();
  if (projectId) {
    // `&saved=1`: the cloud copy, not this device's unsaved changes (the
    // 'Open saved version' action once the editor has closed).
    return parsed(
      get('saved') === '1'
        ? { kind: 'project', projectId, fromCloud: true }
        : { kind: 'project', projectId },
    );
  }
  const templateId = get('template');
  if (templateId) return parsed({ kind: 'template', templateId });
  const demoId = get('demo');
  if (demoId) return parsed({ kind: 'demo', demoId });
  const tutorialId = get('tutorial');
  if (tutorialId) return parsed({ kind: 'tutorial', tutorialId });
  const songId = get('song');
  if (songId) {
    return parsed({
      kind: 'song',
      songId,
      transpose: readTranspose(get('transpose')),
    });
  }

  const genre = get('practiceGenre');
  if (genre) {
    const level = Number(get('practiceLevel'));
    const section = get('practiceSection') as ActivitySectionId | null;
    return parsed({
      kind: 'practiceGenre',
      genre,
      level: Number.isFinite(level) && level > 0 ? level : 1,
      section: section && SECTIONS.includes(section) ? section : 'A',
    });
  }

  const mode = get('practiceMode');
  if (mode) {
    // `practiceOpen` defaults to melody when missing or invalid (the
    // evergreen sidebar entry can't know which section was just finished).
    const level = Number(get('practiceLevel'));
    return parsed({
      kind: 'practiceMode',
      mode,
      rootParam: get('practiceRoot'),
      openTrack: get('practiceOpen') === 'chords' ? 'chords' : 'melody',
      level: level === 2 || level === 3 ? level : 1,
    });
  }

  const code = get('collab')?.trim();
  if (code) {
    const isNew = code.toLowerCase() === 'new';
    const host = !isNew && get('host') === '1';
    return parsed({
      kind: 'collab',
      // A room id is used as given here; the join lowercases a joiner's.
      code: isNew ? 'new' : code,
      host,
      jamImport: isJamImport,
      // A link joiner may beat the host to the room: it waits for it.
      awaitHost: !isNew && !host,
    });
  }
  if (isJamImport) return parsed({ kind: 'jam' });
  if (get('new') === '1') return parsed({ kind: 'new' });
  return parsed({ kind: 'resume' });
}

/** Whether `params` carries a boot key (the boot hook's later runs). */
export function hasBootKeys(params: URLSearchParams): boolean {
  return BOOT_KEYS.some((key) => params.has(key));
}

/**
 * `search` without `keys`, as `?a=1&b=2` (or '' when nothing is left). Every
 * other key, its order and its value stay as they were.
 */
export function stripSearchKeys(
  search: string,
  keys: readonly string[],
): string {
  const params = new URLSearchParams(search);
  for (const key of keys) params.delete(key);
  const rest = params.toString();
  return rest ? `?${rest}` : '';
}

/** The lookups a link's ids are checked against (the editor's data). */
export interface BootCatalog {
  hasTemplate(id: string): boolean;
  hasDemo(id: string): boolean;
  hasTutorial(id: string): boolean;
  isPracticeMode(mode: string): boolean;
  /** A recorded jam is waiting to be opened. */
  hasPendingJam(): boolean;
}

/** The editor's catalog: each lookup runs when it is asked. */
export function editorBootCatalog(): BootCatalog {
  return {
    hasTemplate: (id) => Boolean(getProjectTemplate(id)),
    hasDemo: (id) => Boolean(getDemoProject(id)),
    hasTutorial: (id) => Boolean(getTutorial(id)),
    isPracticeMode: (mode) => isDiatonicMode(mode) || isScaleLesson(mode),
    hasPendingJam: () => readPendingJam() !== null,
  };
}

// Room codes are eight hex characters (crypto.randomUUID().slice(0, 8)), and
// a classroom showcase links its own room id; this admits any plain id, in
// either case, and turns away what can't be one.
const COLLAB_CODE = /^[\w-]{4,64}$/;

/** The plain messages of a link that names nothing (kept from pre-1.4). */
export const NOT_FOUND_MESSAGES = Object.freeze({
  template: 'That template could not be found.',
  demo: 'That demo could not be found.',
  tutorial: 'That lesson could not be found.',
  practiceMode: 'That practice track mode could not be found.',
  practiceGenre: 'That practice track could not be found.',
  collab: 'That session link is not valid.',
  jam: 'That jam could not be found.',
  draft: "That draft couldn't be found.",
  song: 'That song could not be found.',
  project: 'That project could not be found.',
});

/** A refusal for an id that names nothing: a toast, nothing changed. */
export function notFoundError(message: string): OpenError {
  return { kind: 'not-found', message, retryable: false, surface: 'toast' };
}

/**
 * Why `intent` can't be opened, from what is known without a fetch, or null
 * when it may be. A project, a song, a genre practice track and a draft are
 * checked once fetched or read (openSession's prepare step).
 */
export function validateIntent(
  intent: OpenIntent,
  catalog: BootCatalog,
): OpenError | null {
  switch (intent.kind) {
    case 'draft':
      return intent.draftId.trim()
        ? null
        : notFoundError(NOT_FOUND_MESSAGES.draft);
    case 'project':
      return intent.projectId.trim()
        ? null
        : notFoundError(NOT_FOUND_MESSAGES.project);
    case 'template':
      return catalog.hasTemplate(intent.templateId)
        ? null
        : notFoundError(NOT_FOUND_MESSAGES.template);
    case 'demo':
      return catalog.hasDemo(intent.demoId)
        ? null
        : notFoundError(NOT_FOUND_MESSAGES.demo);
    case 'tutorial':
      return catalog.hasTutorial(intent.tutorialId)
        ? null
        : notFoundError(NOT_FOUND_MESSAGES.tutorial);
    case 'practiceMode':
      return catalog.isPracticeMode(intent.mode)
        ? null
        : notFoundError(NOT_FOUND_MESSAGES.practiceMode);
    case 'collab':
      if (intent.code !== 'new' && !COLLAB_CODE.test(intent.code)) {
        return notFoundError(NOT_FOUND_MESSAGES.collab);
      }
      // A host bringing a jam into the room needs that jam.
      return intent.jamImport && !catalog.hasPendingJam()
        ? notFoundError(NOT_FOUND_MESSAGES.jam)
        : null;
    case 'jam':
      return catalog.hasPendingJam()
        ? null
        : notFoundError(NOT_FOUND_MESSAGES.jam);
    default:
      return null;
  }
}
