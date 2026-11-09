/**
 * Groove Lab's levels, by complexity (Peter, 2026-10-21):
 *
 *   Level 1   one bar of 8ths
 *   Level 2   one bar of 16ths
 *   Level 3   two bars of 8ths
 *   Level 4   two bars of 16ths
 *   Level 5   advanced: two bars of 16ths (Drum 'n' Bass, Afrobeat)
 *   Levels 6–10   Levels 1–5 at the groove's own tempo
 *
 * Levels 1–5 play at a learning tempo, four fifths of the groove's own, to
 * the nearest 5 BPM and never under 60.
 *
 * The grooves are the owner's pick (grooveList.ts), each playing one bar,
 * two, or both as he placed it. A groove is an 8th-note or a 16th-note one
 * by what its hits in those bars need, not by the grid it was designed on:
 * a shuffle (8th-note triplets) goes with the 8ths, 32nds and 16th-note
 * triplets with the 16ths. Two bars are for the grooves whose second bar is
 * more than the first again, and for the two-bar figures (the claves of
 * salsa, merengue and samba) however their drums repeat.
 *
 * A streak clears a level and opens the next. The grid and the pads each
 * climb on their own.
 *
 * Pure, no React.
 */

import type { DrumGroove } from '../drumGrooves/drumGroove';
import { GROOVE_LAB_GROOVES, type LabGrooveEntry } from './grooveList';
import { buildLabGroove, secondBarDiffers, type LabGroove } from './labGroove';

export type GrooveLabLevel = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
export const GROOVE_LAB_LEVELS: readonly GrooveLabLevel[] = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10,
];
export const LAST_GROOVE_LAB_LEVEL: GrooveLabLevel = 10;
/** Where the levels at full tempo begin. */
export const FIRST_FULL_TEMPO_LEVEL: GrooveLabLevel = 6;

/** The finest note a level's grooves move in. */
export type GrooveLabGrid = 'eighths' | 'sixteenths';

export interface GrooveLabLevelSpec {
  level: GrooveLabLevel;
  bars: 1 | 2;
  grid: GrooveLabGrid;
  advanced: boolean;
  fullTempo: boolean;
  title: string;
}

const spec = (
  level: GrooveLabLevel,
  bars: 1 | 2,
  grid: GrooveLabGrid,
  advanced: boolean,
  fullTempo: boolean,
): GrooveLabLevelSpec => ({
  level,
  bars,
  grid,
  advanced,
  fullTempo,
  title: `${advanced ? 'Advanced: two' : bars === 1 ? 'One' : 'Two'} ${bars === 1 ? 'bar' : 'bars'} of ${grid === 'eighths' ? '8ths' : '16ths'}${fullTempo ? ', full tempo' : ''}`,
});

export const LEVEL_SPECS: Readonly<Record<GrooveLabLevel, GrooveLabLevelSpec>> =
  {
    1: spec(1, 1, 'eighths', false, false),
    2: spec(2, 1, 'sixteenths', false, false),
    3: spec(3, 2, 'eighths', false, false),
    4: spec(4, 2, 'sixteenths', false, false),
    5: spec(5, 2, 'sixteenths', true, false),
    6: spec(6, 1, 'eighths', false, true),
    7: spec(7, 1, 'sixteenths', false, true),
    8: spec(8, 2, 'eighths', false, true),
    9: spec(9, 2, 'sixteenths', false, true),
    10: spec(10, 2, 'sixteenths', true, true),
  };

/** An 8th-note groove (8ths, or 8th-note triplets) or a 16th-note one. */
export const gridOf = (groove: LabGroove): GrooveLabGrid =>
  groove.stepsPerBeat <= 3 ? 'eighths' : 'sixteenths';

/** A level's share of a groove's own tempo. */
export const LEARNING_TEMPO = 0.8;
const MIN_BPM = 60;

/** The tempo a groove plays at on a level. */
export function levelBpm(level: GrooveLabLevel, groove: LabGroove): number {
  if (LEVEL_SPECS[level].fullTempo) return groove.tempo;
  return Math.max(MIN_BPM, Math.round((groove.tempo * LEARNING_TEMPO) / 5) * 5);
}

/** An entry as a level plays it, if it plays there. */
export function entryOnLevel(
  level: GrooveLabLevel,
  entry: LabGrooveEntry,
  groove: DrumGroove,
): LabGroove | null {
  const { bars, grid, advanced } = LEVEL_SPECS[level];
  if (!!entry.advanced !== advanced) return null;
  if (entry.bars && !entry.bars.includes(bars)) return null;
  const lab = buildLabGroove(groove, bars, {
    key: entry.key,
    name: entry.name,
    style: entry.style,
    lead: entry.lead,
    fromBar: entry.fromBar,
    grid: entry.grid,
    edit: entry.edit,
  });
  if (!lab || gridOf(lab) !== grid) return null;
  if (bars === 2 && !entry.cycle && !secondBarDiffers(lab)) return null;
  return lab;
}

/** The grooves a level plays, in the list's order. */
export function levelPool(
  level: GrooveLabLevel,
  grooves: ReadonlyMap<string, DrumGroove>,
  entries: readonly LabGrooveEntry[] = GROOVE_LAB_GROOVES,
): LabGroove[] {
  return entries.flatMap((entry) => {
    const groove = grooves.get(entry.id);
    const lab = groove ? entryOnLevel(level, entry, groove) : null;
    return lab ? [lab] : [];
  });
}

/**
 * The order a level's grooves come in: each once before any comes again,
 * never the same twice running, and on a level's first deal its lead
 * groove first (Level 1 opens on Straight 8).
 */
export function grooveBag(
  pool: readonly LabGroove[],
  random: () => number,
  last?: string,
  first = false,
): LabGroove[] {
  const bag = [...pool];
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [bag[i], bag[j]] = [bag[j], bag[i]];
  }
  const lead = first ? bag.findIndex((g) => g.lead) : -1;
  if (lead > 0) bag.unshift(...bag.splice(lead, 1));
  else if (bag.length > 1 && bag[0].id === last) bag.push(bag.shift()!);
  return bag;
}
