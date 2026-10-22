// ── The drum grooves a step can be played over ─────────────────────────────
// Settings → Drum groove: every groove a student may hear that is in 4/4,
// grouped by genre and named as the console's Drum Grooves page names them,
// and the chosen one turned into the run's drums (engine/musicLiteracy/
// run.ts RunGroove).
//
//   designed  the console's Drum Grooves, published ones only: a draft
//             never reaches a student (registry.getLiveGroove's rule)
//   code      the grooves the genre lessons play as code (codeGrooves.ts),
//             unless a published designed groove shares the id and
//             replaces it, as it does in the lessons
//   Studio    the Studio's Grooves-tab performances, all published. They
//             load on demand (about 36 KB gzipped for all of them), the
//             first time the list is shown, rather than ride in the bundle
//
// Not the procedural DRUM_GROOVE_LIBRARY (data/drumGrooveLibrary.ts): its
// `positions` count hits rather than place them, so nothing built from it
// sounds like a groove (generatePracticeTrack.ts found the same).

import { useEffect, useSyncExternalStore } from 'react';
import { GENRE_DISPLAY_LABELS } from '@/components/common/CircleOfFifthsSvg';
import {
  CODE_GROOVES,
  type CodeGroove,
} from '@/curriculum/engine/drumGrooves/codeGrooves';
import {
  buildDesignedDrums,
  patternTicks,
  type DrumGroove,
} from '@/curriculum/engine/drumGrooves/drumGroove';
import {
  getLiveGroove,
  listDesignedGrooves,
  loadStudioGrooves,
  preloadStudioGroove,
} from '@/curriculum/engine/drumGrooves/registry';
import type { BackingNote } from '@/curriculum/engine/genreGeneration/backingPatterns';
import {
  applySwing,
  swingPercent,
} from '@/curriculum/engine/genreGeneration/swing';
import { barTicks, isCommonTime } from '@/curriculum/engine/meter';
import type { RunGroove } from '@/curriculum/engine/musicLiteracy/run';

export interface GrooveOption {
  id: string;
  name: string;
}

export interface GrooveGroup {
  /** The genre's id ('hip-hop'), or '' for a groove with none. */
  genre: string;
  /** As shown: 'Hip Hop', 'R&B', 'Other'. */
  label: string;
  grooves: GrooveOption[];
}

const OTHER = 'Other';

/** A genre id as the Learn pages write it ('neo-soul' → 'Neo Soul'). */
function genreLabel(genre: string): string {
  if (!genre) return OTHER;
  return (
    GENRE_DISPLAY_LABELS[genre] ??
    genre
      .split(/[-_\s]+/)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  );
}

const byName = (a: string, b: string) =>
  a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });

/** A groove a student may play along with: published, and in 4/4. */
const playable = (groove: DrumGroove) =>
  groove.status === 'live' && isCommonTime(groove.timeSignature);

/**
 * The grooves on offer, one per id, grouped by genre: the groups A–Z with
 * Other last, the grooves in each by name.
 */
export function grooveGroups({
  designed,
  code,
  studio,
}: {
  designed: readonly DrumGroove[];
  code: readonly CodeGroove[];
  studio: readonly DrumGroove[];
}): GrooveGroup[] {
  const offered = new Map<string, GrooveOption & { genre: string }>();
  const offer = (id: string, name: string, genre: string | undefined) => {
    if (!offered.has(id)) offered.set(id, { id, name, genre: genre ?? '' });
  };

  // A published designed groove replaces the code groove with its id, even
  // one not in 4/4: the lessons would play it, so the code one is gone.
  const replaced = new Set(
    designed.filter((g) => g.status === 'live').map((g) => g.id),
  );
  for (const g of designed) if (playable(g)) offer(g.id, g.name, g.genre);
  for (const g of code) if (!replaced.has(g.id)) offer(g.id, g.label, g.genre);
  for (const g of studio) if (playable(g)) offer(g.id, g.name, g.genre);

  const groups = new Map<string, GrooveGroup>();
  for (const { id, name, genre } of offered.values()) {
    const group = groups.get(genre) ?? {
      genre,
      label: genreLabel(genre),
      grooves: [],
    };
    group.grooves.push({ id, name });
    groups.set(genre, group);
  }
  for (const group of groups.values()) {
    group.grooves.sort((a, b) => byName(a.name, b.name));
  }
  return [...groups.values()].sort(
    (a, b) =>
      Number(a.label === OTHER) - Number(b.label === OTHER) ||
      byName(a.label, b.label),
  );
}

// ── The list as the Settings sheet reads it ────────────────────────────────

let studio: readonly DrumGroove[] = [];
let studioLoad: Promise<void> | null = null;
let groups: GrooveGroup[] | null = null;
const listeners = new Set<() => void>();

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function currentGroups(): GrooveGroup[] {
  groups ??= grooveGroups({
    designed: listDesignedGrooves(),
    code: CODE_GROOVES,
    studio,
  });
  return groups;
}

/** Fetch the Studio's grooves into the list (once; again after a failure). */
export function loadStudioGrooveOptions(): Promise<void> {
  studioLoad ??= loadStudioGrooves().then(
    (list) => {
      studio = list;
      groups = null;
      listeners.forEach((listener) => listener());
    },
    (error: unknown) => {
      studioLoad = null;
      console.warn('[MusicLiteracy] the Studio grooves did not load', error);
    },
  );
  return studioLoad;
}

/** The grooves on offer; the Studio's join once they've loaded. */
export function useLiteracyGrooves(): GrooveGroup[] {
  useEffect(() => {
    void loadStudioGrooveOptions();
  }, []);
  return useSyncExternalStore(subscribe, currentGroups, currentGroups);
}

// ── A groove as the run's drums ────────────────────────────────────────────

/** The drums of a run, and the kit they play on. */
export interface LiteracyDrums {
  groove: RunGroove;
  kit: string;
}

/** The drums' notes as a loop's hits; one jittered early sounds on the bar. */
const hitsOf = (notes: readonly BackingNote[]) =>
  notes
    .filter((n) => n.part === 'drums')
    .map((n) => ({
      tick: Math.max(0, n.onset),
      note: n.note,
      velocity: n.velocity,
    }));

/**
 * A designed groove's loop as the lessons play it (pad trims, feel and
 * humanize in its hits), swung by its own swing: the drums alone swing,
 * the step's notes and their grading stay straight.
 */
export function designedRunGroove(groove: DrumGroove): RunGroove {
  const loopTicks = patternTicks(groove);
  const notes = buildDesignedDrums(
    groove,
    groove.bars,
    barTicks(groove.timeSignature),
  );
  return {
    loopTicks,
    hits: hitsOf(applySwing(notes, swingPercent(groove.swing))),
    padGains: groove.padGains,
  };
}

/** The kit a code groove plays on in a lesson with no kit of its own. */
const CODE_GROOVE_KIT = 'natural';

/**
 * The groove `id` as a run's drums: a designed (or Studio) groove loops;
 * a code groove is built `bars` long, as its phrase is written. Null when
 * the id no longer names a live groove in 4/4.
 */
export async function drumsForGroove(
  id: string,
  bars: number,
): Promise<LiteracyDrums | null> {
  await preloadStudioGroove(id);
  const designed = getLiveGroove(id);
  if (designed) {
    return playable(designed)
      ? { groove: designedRunGroove(designed), kit: designed.kit }
      : null;
  }
  if (!CODE_GROOVES.some((g) => g.id === id)) return null;
  // The lessons' pattern code, fetched only when a code groove is chosen.
  const { buildCodeGrooveDrums } = await import(
    '@/curriculum/engine/genreGeneration/backingPatterns'
  );
  const length = Math.max(1, Math.ceil(bars));
  return {
    groove: {
      loopTicks: length * barTicks(),
      hits: hitsOf(buildCodeGrooveDrums(id, length)),
    },
    kit: CODE_GROOVE_KIT,
  };
}
