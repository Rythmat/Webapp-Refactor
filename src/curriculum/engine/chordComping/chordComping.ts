/**
 * Chord comping patterns (ledger D-087): the back office's third pairable
 * part, beside Drum Grooves and Bass Lines. Like a bass line, a comping
 * pattern is a template — a rhythm of chord hits — and the realizer voices
 * whatever chord is sounding at each hit, so one pattern fits every
 * progression in a style: the reggaeton tresillo, cumbia's offbeats, the
 * mariachi vals' "chord, chord" on 2 and 3.
 *
 * Times use the Bass Lines editor's "bar:beat:sixteenth" (the beat is always
 * a quarter), so the two editors share a grid.
 */

import { quartersToTime, timeToQuarters } from '../bassLines/bassLine';
import type { BackingNote } from '../genreGeneration/backingPatterns';
import type { ChordSymbolTones } from '../genreGeneration/chordSymbolTones';
import { barTicks, PPQ, type TimeSignature } from '../meter';

export { quartersToTime, timeToQuarters };

/** Which of the chord's tones a hit plays. */
export type CompingTones =
  /** Every chord tone (up to four), close position. */
  | 'full'
  /** Without the root — the bass has it (shells, rootless stabs). */
  | 'upper'
  /** The voicing's top note alone: a melodic punch or guitar pick. */
  | 'top';

export interface ChordCompingHit {
  /** "bar:beat:sixteenth", zero-indexed; the beat is a quarter. */
  time: string;
  /** Length in quarter notes. Short = staccato. */
  dur: number;
  /** 0–1. */
  velocity: number;
  /** Defaults to 'full'. */
  tones?: CompingTones;
}

export type CompingGridId = '8n' | '16n' | '8t';

export interface ChordComping {
  /** File name: lowercase, digits, _ and -. */
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  /** Only a published pattern reaches students. */
  status: 'draft' | 'live';
  /** Position in the library list; lower first. */
  order?: number;
  timeSignature: TimeSignature;
  /** Template length in bars, as "Nm". */
  length: string;
  /** The editor's grid only. */
  gridResolution: CompingGridId;
  /**
   * The highest note a voicing may reach (MIDI). 72 = C5, the chord register
   * rule; Hip Hop's chords sit higher.
   */
  ceiling: number;
  /** Drum groove ids this pattern goes with, best first. */
  grooves: string[];
  hits: ChordCompingHit[];
}

export const COMPING_ID_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;
export const DEFAULT_CEILING = 72;

export const COMPING_GRIDS: {
  id: CompingGridId;
  label: string;
  perBeat: number;
}[] = [
  { id: '8n', label: '8ths', perBeat: 2 },
  { id: '16n', label: '16ths', perBeat: 4 },
  { id: '8t', label: '8th triplets', perBeat: 3 },
];

export function compingIdFrom(name: string): string {
  return (
    name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'comping'
  );
}

export function blankComping(id: string, name: string): ChordComping {
  return {
    id,
    name,
    status: 'draft',
    timeSignature: [4, 4],
    length: '1m',
    gridResolution: '8n',
    ceiling: DEFAULT_CEILING,
    grooves: [],
    hits: [{ time: '0:0:0', dur: 3.9, velocity: 0.75 }],
  };
}

export const compingBars = (c: Pick<ChordComping, 'length'>) =>
  Math.max(1, parseInt(c.length, 10) || 1);

const mod12 = (n: number) => ((n % 12) + 12) % 12;

/** The chord's pitch classes, root first, at most four (the 5th goes first). */
export function chordPcs(chord: ChordSymbolTones): number[] {
  const pcs: number[] = [];
  for (const i of chord.intervals) {
    const pc = mod12(chord.rootPc + i);
    if (!pcs.includes(pc)) pcs.push(pc);
  }
  if (pcs.length > 4 && chord.fifth !== undefined) {
    const fifth = mod12(chord.rootPc + chord.fifth);
    pcs.splice(pcs.indexOf(fifth), 1);
  }
  return pcs.slice(0, 4);
}

/**
 * Every close-position voicing of `pcs` with its top note at or under
 * `ceiling` and within an octave of it.
 */
function closeVoicings(pcs: number[], ceiling: number): number[][] {
  const out: number[][] = [];
  for (let r = 0; r < pcs.length; r++) {
    const order = [...pcs.slice(r), ...pcs.slice(0, r)];
    for (let base = ceiling - 24; base <= ceiling; base++) {
      if (mod12(base) !== order[0]) continue;
      const notes = [base];
      for (const pc of order.slice(1)) {
        const prev = notes[notes.length - 1];
        notes.push(prev + (mod12(pc - prev) || 12));
      }
      const top = notes[notes.length - 1];
      if (top <= ceiling && top > ceiling - 12) out.push(notes);
    }
  }
  return out;
}

const distance = (a: number[], b: number[]) => {
  const n = Math.min(a.length, b.length);
  let d = 0;
  for (let i = 0; i < n; i++) d += Math.abs(a[i] - b[i]);
  return d + Math.abs(a.length - b.length) * 6;
};

/**
 * The voicing for a chord: close position under the ceiling, the one nearest
 * the previous voicing (voice leading), else the one whose top sits highest.
 */
export function voiceChord(
  chord: ChordSymbolTones,
  ceiling: number,
  previous: number[] | null,
): number[] {
  const options = closeVoicings(chordPcs(chord), ceiling);
  if (!options.length) return [];
  if (!previous?.length)
    return options.reduce((best, v) =>
      v[v.length - 1] > best[best.length - 1] ? v : best,
    );
  return options.reduce((best, v) =>
    distance(v, previous) < distance(best, previous) ? v : best,
  );
}

function hitNotes(
  voicing: number[],
  chord: ChordSymbolTones,
  tones: CompingTones,
) {
  if (tones === 'top') return voicing.slice(-1);
  if (tones === 'upper') {
    const rest = voicing.filter((m) => mod12(m) !== chord.rootPc);
    return rest.length ? rest : voicing;
  }
  return voicing;
}

/**
 * The pattern over `bars` bars of the lesson's chords, as backing chord
 * notes (ticks at 480 per quarter). Unswung: the caller swings it.
 */
export function realizeComping(
  pattern: Pick<ChordComping, 'timeSignature' | 'length' | 'hits' | 'ceiling'>,
  chordAt: (tick: number) => ChordSymbolTones,
  bars: number,
  timeSignature: TimeSignature = pattern.timeSignature ?? [4, 4],
): BackingNote[] {
  const tplTs = pattern.timeSignature ?? timeSignature;
  const loop = compingBars(pattern) * barTicks(tplTs);
  const total = bars * barTicks(timeSignature);
  const hits = (pattern.hits ?? [])
    .map((h) => ({
      ...h,
      tick: Math.round(timeToQuarters(h.time, tplTs) * PPQ),
    }))
    .filter((h) => h.tick < loop)
    .sort((a, b) => a.tick - b.tick);
  const ceiling = pattern.ceiling ?? DEFAULT_CEILING;
  const notes: BackingNote[] = [];
  if (!hits.length || loop <= 0) return notes;
  let previous: number[] | null = null;
  let previousKey = '';
  for (let start = 0; start < total; start += loop) {
    for (const hit of hits) {
      const onset = start + hit.tick;
      if (onset >= total) break;
      const chord = chordAt(onset);
      const key = `${chord.rootPc}:${chord.bassPc}:${chord.intervals.join(',')}`;
      // The same chord keeps its voicing; a new one leads from the last.
      const voicing: number[] =
        key === previousKey && previous
          ? previous
          : voiceChord(chord, ceiling, previous);
      previous = voicing;
      previousKey = key;
      const duration = Math.max(30, Math.round(hit.dur * PPQ));
      const velocity = Math.max(
        1,
        Math.min(127, Math.round(hit.velocity * 127)),
      );
      for (const note of hitNotes(voicing, chord, hit.tones ?? 'full')) {
        notes.push({
          note,
          onset,
          duration: Math.min(duration, total - onset),
          velocity,
          part: 'chords',
        });
      }
    }
  }
  return notes;
}
