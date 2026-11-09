import type { TourContext, TourDefinition, TourId } from './types';

// ── Where a player left a tour ─────────────────────────────────────────────
// "Throughout every tutorial we have to allow for users to click on things
// and not lose the tutorial or be able to return to it where they left off"
// (Peter, 2026-10-21). A running tour's place is kept in this browser, so a
// reload, a closed tab or a wander elsewhere never loses it: the tour picks
// up at that step, or offers to. A finished tour clears it; Quit Tutorial
// keeps it, offered again when the player starts that tour once more.

export interface TourPosition {
  tour: TourId;
  index: number;
  ctx: TourContext;
  /** Where the tour last showed a card. */
  lastHref: string | null;
  savedAt: number;
  /** Left by Quit Tutorial: offered only when the tour is started again. */
  quit?: boolean;
}

export const POSITION_KEY = 'music-atlas-learn-tour-position';
/** A month on, a tour starts afresh. */
const KEEP_MS = 30 * 24 * 60 * 60 * 1000;

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function readPosition(
  tours: Readonly<Record<TourId, TourDefinition>>,
  now = Date.now(),
): TourPosition | null {
  try {
    const raw = storage()?.getItem(POSITION_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as Partial<TourPosition>;
    const def = p.tour ? tours[p.tour] : undefined;
    if (
      !def ||
      typeof p.index !== 'number' ||
      p.index < 0 ||
      p.index >= def.steps.length ||
      typeof p.savedAt !== 'number' ||
      now - p.savedAt > KEEP_MS ||
      typeof p.ctx?.returnTo !== 'string'
    )
      return null;
    return p as TourPosition;
  } catch {
    return null;
  }
}

export function writePosition(position: TourPosition | null) {
  try {
    const store = storage();
    if (!position) store?.removeItem(POSITION_KEY);
    else store?.setItem(POSITION_KEY, JSON.stringify(position));
  } catch {
    // Private mode or full: this visit only.
  }
}

/**
 * Where to pick a tour up: the step itself, or the earlier one that opens
 * what it needs (its `resumeFrom`), and never a step that can't get the
 * player to its page (one without an href): the nearest before it that can.
 */
export function resumeIndex(def: TourDefinition, index: number): number {
  const from = def.steps[index]?.resumeFrom;
  let at = from ? def.steps.findIndex((s) => s.id === from) : index;
  if (at < 0 || at > index) at = index;
  while (at > 0 && !def.steps[at].href) at--;
  return at;
}

const stopOf = (href: string) => {
  const [path, query = ''] = href.split('?');
  const tab = new URLSearchParams(query).get('tab') ?? '';
  return `${path.toLowerCase()}|${tab}`;
};

/** The same page: a path, and on Learn its tab. */
export const sameStop = (a: string, b: string) => stopOf(a) === stopOf(b);
