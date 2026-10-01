/**
 * chordVoicings.ts — The two ways a Chords Practice Track lights a chord on the
 * keyboard, and the chord-tone numbers written over the keys.
 *
 * **Root Position** stacks the chord up from its root in chord-tone order —
 * 1-3-5, 1-3-5-7, 1-3-5-7-9 — between C3 and C5. A chord is always read left to
 * right the way it is spelled, never 1-9-3-5-7, which is what sorting its tones
 * by semitone inside one octave would give.
 *
 * **The lesson's own voicings** ("Stylistic Voicings", or a level's named sets
 * such as Pop L1's Triads and Power Chords) are what a Chords activity had the
 * student play — Funk's 3-7-9 and 7-3-5, Pop's inversions with a left-hand
 * root — lifted note for note, so the Practice Track asks for exactly what the
 * lesson taught.
 */

import { chordSymbolTones } from '@/curriculum/engine/genreGeneration/chordSymbolTones';
import {
  noteNameToPitchClass,
  spellChord,
} from '@/curriculum/engine/genreGeneration/enharmonicEngine';
import type { TargetNote } from '@/curriculum/types/activity.v2';

/** C3 and C5: the span a root-position chord is drawn in. */
const ROOT_POSITION_LOW = 48;
const ROOT_POSITION_HIGH = 72;
const BAR_TICKS = 1920;

export interface ChordTone {
  /** As written over the key: '1', '♭3', '5', '♭7', '9', '𝄫7'. */
  label: string;
  /** Stacking order: the tone's number, so 1 < 3 < 5 < 7 < 9 < 11 < 13. */
  order: number;
}

const mod12 = (n: number) => ((n % 12) + 12) % 12;

/**
 * What each pitch class of a chord is, as a chord tone. Which name a semitone
 * gets depends on the rest of the chord: 2 is a 9 over a third and a 2 in a
 * sus2, 9 is a 13 over a seventh, a 6 in a sixth chord and a 𝄫7 in a dim7.
 *
 * `pcs` are pitch classes above the root (0-11), the whole chord.
 */
export function chordTones(pcs: readonly number[]): Map<number, ChordTone> {
  const has = new Set(pcs.map(mod12));
  const third = has.has(3) || has.has(4);
  const seventh = has.has(10) || has.has(11);
  const perfectFifth = has.has(7);
  const dim7 = has.has(3) && has.has(6) && has.has(9) && !seventh;

  const tone = (pc: number): ChordTone => {
    switch (pc) {
      case 0:
        return { label: '1', order: 1 };
      case 1:
        return { label: '♭9', order: 9 };
      case 2:
        return third ? { label: '9', order: 9 } : { label: '2', order: 2 };
      case 3:
        return has.has(4)
          ? { label: '♯9', order: 9.5 }
          : { label: '♭3', order: 3 };
      case 4:
        return { label: '3', order: 3 };
      case 5:
        return third ? { label: '11', order: 11 } : { label: '4', order: 4 };
      case 6:
        return perfectFifth
          ? { label: '♯11', order: 11.5 }
          : { label: '♭5', order: 5 };
      case 7:
        return { label: '5', order: 5 };
      case 8:
        return perfectFifth
          ? { label: '♭13', order: 13 }
          : { label: '♯5', order: 5 };
      case 9:
        if (seventh) return { label: '13', order: 13 };
        return dim7 ? { label: '𝄫7', order: 7 } : { label: '6', order: 6 };
      case 10:
        return { label: '♭7', order: 7 };
      default:
        return { label: '7', order: 7 };
    }
  };

  return new Map([...has].map((pc) => [pc, tone(pc)]));
}

/**
 * White keys the chord spelling can name by a neighbour's letter. Over a key a
 * student is about to press, B♯ reads as a puzzle, so the key's own name is
 * shown and the chord-tone number (♯5) carries the theory.
 */
const WHITE_KEY_NAMES: Record<string, string> = {
  'B♯': 'C',
  'E♯': 'F',
  'C♭': 'B',
  'F♭': 'E',
};

/**
 * A voicing's note names, spelled as one chord from its root (enharmonic Rule
 * 3): E7♯5's 3rd is G♯ in any key, not the A♭ the key would give it. Spelled
 * with the whole chord as context, so a three-note shell takes the same
 * letters as the full chord it stands for. A white key is always named as
 * itself: E7♯5's ♯5 is C, not B♯.
 *
 * `symbol` is the chord as charted ('E7♯5', 'A min'); its letter names the
 * root. Falls back to `fallbackRoot` when that letter doesn't match `rootMidi`.
 */
export function spellVoicing(
  symbol: string,
  fallbackRoot: string,
  rootMidi: number,
  chordMidis: readonly number[],
  notes: readonly number[],
): string[] {
  const written = /^[A-G](?:[#b♯♭])?/.exec(symbol)?.[0];
  const rootName =
    written && noteNameToPitchClass(written) === mod12(rootMidi)
      ? written
      : fallbackRoot;
  const context = [...new Set(chordMidis.map((m) => mod12(m - rootMidi)))];
  const spelled = spellChord(rootName, [
    ...context,
    ...notes.map((m) => mod12(m - rootMidi)),
  ]);
  return spelled
    .slice(context.length)
    .map((name) => WHITE_KEY_NAMES[name] ?? name);
}

/**
 * The chord built up from its root in chord-tone order, each tone the next one
 * above the last: Am9 is A-C-E-G-B, never A-B-C-E-G.
 *
 * Placed as high as it fits between C3 and C5, so a triad sits around middle C
 * rather than down in the bass. A chord too tall to fit goes in the octave that
 * leaves the fewest notes outside, the higher one on a tie: a ninth on B runs
 * B3 to C♯5, one note over, while a thirteenth on B would put three over C5 and
 * starts from B2 instead, one under C3.
 *
 * `rootMidi` is the root in any octave; `pcs` the chord's tones above it.
 */
export function rootPositionVoicing(
  rootMidi: number,
  pcs: readonly number[],
): number[] {
  const tones = chordTones(pcs);
  const stack = [...tones.entries()]
    .sort(([pcA, a], [pcB, b]) => a.order - b.order || pcA - pcB)
    .map(([pc]) => pc);

  const voice = (root: number) => {
    const notes: number[] = [];
    for (const pc of stack) {
      const below = notes.length ? notes[notes.length - 1] : root - 1;
      notes.push(below + 1 + mod12(root + pc - below - 1));
    }
    return notes;
  };

  const outside = (notes: number[]) =>
    notes.filter((n) => n < ROOT_POSITION_LOW || n > ROOT_POSITION_HIGH).length;
  const lowest = ROOT_POSITION_LOW - 12 + mod12(rootMidi - ROOT_POSITION_LOW);
  let best = voice(lowest);
  for (let root = lowest + 12; root <= ROOT_POSITION_HIGH; root += 12) {
    const next = voice(root);
    if (outside(next) <= outside(best)) best = next;
  }
  return best;
}

/** Two symbols that name the same chord ('G7' and 'G7', 'Ddom13' and 'D13'). */
function chordKey(symbol: string): string | null {
  const tones = chordSymbolTones(symbol);
  return tones
    ? `${tones.rootPc}/${tones.bassPc}:${tones.intervals.join(',')}`
    : null;
}

/** Whether every note of a voicing is a tone of the chord the symbol names. */
function spells(symbol: string, voicing: readonly number[]): boolean {
  const tones = chordSymbolTones(symbol);
  if (!tones) return false;
  const pcs = new Set(tones.intervals.map((i) => mod12(tones.rootPc + i)));
  pcs.add(tones.bassPc);
  return voicing.every((midi) => pcs.has(mod12(midi)));
}

/**
 * Each distinct chord a bar sounds, in order: the notes sounding at each of its
 * onsets, two or more of them.
 */
function barChords(notes: readonly TargetNote[], bar: number): number[][] {
  const start = bar * BAR_TICKS;
  const onsets = [
    ...new Set(
      notes
        .filter((n) => n.onset >= start && n.onset < start + BAR_TICKS)
        .map((n) => n.onset),
    ),
  ].sort((a, b) => a - b);
  const seen = new Set<string>();
  const chords: number[][] = [];
  for (const t of onsets) {
    const sounding = [
      ...new Set(
        notes
          .filter((n) => n.onset <= t && t < n.onset + n.duration)
          .map((n) => n.midi),
      ),
    ].sort((a, b) => a - b);
    const id = sounding.join(',');
    if (sounding.length > 1 && !seen.has(id)) {
      seen.add(id);
      chords.push(sounding);
    }
  }
  return chords;
}

/**
 * The voicing a bar of an activity plays: every note sounding at the fullest
 * moment of the bar, the earliest if several tie. Held notes count, so a
 * left-hand root struck on the downbeat stays part of a right-hand chord
 * pushed on beat two.
 */
function barVoicing(notes: readonly TargetNote[], bar: number): number[] {
  const start = bar * BAR_TICKS;
  const end = start + BAR_TICKS;
  const onsets = [
    ...new Set(
      notes
        .filter((n) => n.onset >= start && n.onset < end)
        .map((n) => n.onset),
    ),
  ].sort((a, b) => a - b);

  let best: number[] = [];
  for (const t of onsets) {
    const sounding = [
      ...new Set(
        notes
          .filter((n) => n.onset <= t && t < n.onset + n.duration)
          .map((n) => n.midi),
      ),
    ].sort((a, b) => a - b);
    if (sounding.length > best.length) best = sounding;
  }
  return best;
}

/** One activity's writing: its notes and the chord each bar is over. */
export interface VoicedActivity {
  notes: readonly TargetNote[];
  chordSymbols: readonly string[];
}

/**
 * The voicing each chord of a Practice Track's progression was played in,
 * taken from the activities that taught it — the final one first, then earlier
 * ones for any chord it doesn't play. Null for a chord none of them voices; the
 * screen shows that one in root position.
 *
 * `activities` are latest first.
 */
export function stylisticVoicings(
  progression: readonly string[],
  activities: readonly VoicedActivity[],
): (number[] | null)[] {
  const found = new Map<string, number[]>();
  for (const { notes, chordSymbols } of activities) {
    if (chordSymbols.length === 0 || notes.length === 0) continue;
    let bars = Math.ceil(
      Math.max(...notes.map((n) => n.onset + 1)) / BAR_TICKS,
    );
    // A last bar that is one hit on its downbeat, on notes that aren't the
    // chord the list gives that bar, is the phrase landing back home, not a bar
    // of the progression: Funk L1's D2.3 plays a bar of Dm7 and lands on Dm7's
    // D-F-C, which its chord list, read bar by bar, would file as G7.
    const lastBar = bars - 1;
    const lastBarStart = lastBar * BAR_TICKS;
    const lastTones = chordSymbolTones(
      chordSymbols[lastBar % chordSymbols.length],
    );
    const lastBarNotes = notes.filter((n) => n.onset >= lastBarStart);
    if (
      bars > 1 &&
      lastTones &&
      lastBarNotes.every((n) => n.onset === lastBarStart) &&
      lastBarNotes.some(
        (n) =>
          !lastTones.intervals.includes(mod12(n.midi - lastTones.rootPc)) &&
          mod12(n.midi) !== lastTones.bassPc,
      )
    )
      bars -= 1;
    for (let bar = 0; bar < bars; bar++) {
      const symbol = chordSymbols[bar % chordSymbols.length];
      const key = chordKey(symbol);
      const chords = barChords(notes, bar);
      // A bar can hold more than one chord — Hip Hop L2's sus2 groove plays
      // Am sus2 then Am in one bar — so each chord it sounds is filed under
      // the symbol its notes spell, not just the bar's own.
      for (const voicing of chords) {
        const owners = [
          ...new Set(
            chordSymbols
              .filter((s) => spells(s, voicing))
              .map(chordKey)
              .filter((k): k is string => k !== null),
          ),
        ];
        const owner = owners.length === 1 ? owners[0] : null;
        if (owner && owner !== key && !found.has(owner)) {
          found.set(owner, voicing);
        }
      }
      if (key === null || found.has(key)) continue;
      const own = chords
        .filter((voicing) => spells(symbol, voicing))
        .sort((a, b) => b.length - a.length)[0];
      const voicing = own ?? barVoicing(notes, bar);
      if (voicing.length > 1) found.set(key, voicing);
    }
  }
  return progression.map((symbol) => {
    const key = chordKey(symbol);
    return key === null ? null : (found.get(key) ?? null);
  });
}
