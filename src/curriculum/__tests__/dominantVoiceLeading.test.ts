/**
 * Dominant resolutions voice-lead (Peter, 30 Oct 2026). A dominant that
 * resolves down a 5th — V to I, or a secondary dominant like A7♭9 to Dm9 —
 * is voiced so it moves as little as it can into the chord after it: of every
 * close-position arrangement of its own notes, in its register and above the
 * left hand, the one written moves no more than a semitone further than the
 * best. A7♭9 to Dm9 in the jazz blues is G–B♭–C♯–E, not C♯–E–G–B♭: G falls to
 * F, B♭ to A, C♯ to C, and E holds.
 *
 * It holds the Jazz and Blues lessons and their pianists' parts to it. A
 * voicing with the root on the bottom (1-7, 1-3-7 shells) moves with its bass
 * by design, and one without both its 3rd and ♭7 (a triad pair) isn't voicing
 * the dominant, so neither is held to it.
 */
import { describe, expect, it } from 'vitest';
import { loadAllFlows } from '@/content/flowStore';
import { chordSymbolTones } from '@/curriculum/engine/genreGeneration/chordSymbolTones';
import { chordStrikes } from '@/curriculum/engine/genreGeneration/chordTimeline';
import { resolveStepContent } from '@/curriculum/engine/genreGeneration/resolveStepContent';
import { barTicks } from '@/curriculum/engine/meter';
import { listParts } from '@/curriculum/engine/parts/registry';
import type {
  ActivityFlowV2,
  ActivityStepV2,
} from '@/curriculum/types/activity.v2';

const GENRES = new Set(['jazz', 'blues']);

/**
 * Kept as Peter wrote them: Jazz Level 1 teaches 7-3-5 as one shape on every
 * chord, which jumps by design ("in Level 1, 7-3-5 stays 7-3-5"; Level 2 adds
 * 3-7-9 and voice-leads the same blues), and his own Quartal ii–V–I #1.
 */
const AS_WRITTEN = new Set([
  'jazz:l1_735_iivi',
  'jazz:l1_735_iivi_play',
  'jazz:l1_735_blues_play',
  'jazz-pianist-1-system-rootless-7-3-5',
  'jazz:l3_perf_quartal_iivi',
  'jazz-pianist-1-two-hand-quartal-iivi-1',
]);

const KEY_ROOT: Record<string, number> = {
  C: 60,
  Db: 61,
  D: 62,
  Eb: 63,
  E: 64,
  F: 65,
  'F#': 66,
  G: 67,
  Ab: 68,
  A: 69,
  Bb: 70,
  B: 71,
};

interface Sounding {
  midi: number;
  hand?: 'lh' | 'rh';
}

/** One chord change: its symbol, the voicing judged, and the left hand under it. */
interface Change {
  symbol: string;
  voicing: number[];
  /** Every note of the chord, both hands: what tells a dominant voicing. */
  all: number[];
  leftHandTop: number;
}

/** Voice by voice when the counts match, else each note to its nearest. */
function movement(from: readonly number[], to: readonly number[]): number {
  if (from.length === to.length)
    return from.reduce((sum, m, i) => sum + Math.abs(m - to[i]), 0);
  return from.reduce(
    (sum, m) => sum + Math.min(...to.map((n) => Math.abs(m - n))),
    0,
  );
}

/** Every close-position arrangement of a voicing's notes in the chord register. */
function arrangements(voicing: readonly number[], lowest: number): number[][] {
  const pcs = [...new Set(voicing.map((m) => m % 12))].sort((a, b) => a - b);
  if (pcs.length !== voicing.length) return [[...voicing]];
  const out: number[][] = [];
  for (let r = 0; r < pcs.length; r++) {
    for (let base = 36; base < 84; base++) {
      if (base % 12 !== pcs[r]) continue;
      const v = [base];
      for (let k = 1; k < pcs.length; k++) {
        let next = v[k - 1] + 1;
        while (next % 12 !== pcs[(r + k) % pcs.length]) next++;
        v.push(next);
      }
      if (v[0] >= lowest && v[0] <= 72 && v[v.length - 1] <= 84) out.push(v);
    }
  }
  return out;
}

/** A dominant, voiced as one (its 3rd and ♭7, no root underneath), resolving down a 5th. */
function resolvingDominant(x: Change, y: Change): boolean {
  const a = chordSymbolTones(x.symbol);
  const b = chordSymbolTones(y.symbol);
  if (!a || !b || !a.intervals.includes(4) || !a.intervals.includes(10))
    return false;
  if ((b.rootPc - a.rootPc + 12) % 12 !== 5) return false;
  if (x.voicing.length === 0 || y.voicing.length === 0) return false;
  if (x.voicing[0] % 12 === a.rootPc) return false;
  const degrees = new Set(x.all.map((m) => (m - a.rootPc + 120) % 12));
  return degrees.has(4) && degrees.has(10);
}

function offenders(where: string, changes: readonly Change[]): string[] {
  const out: string[] = [];
  for (let i = 0; i + 1 < changes.length; i++) {
    const [x, y] = [changes[i], changes[i + 1]];
    if (!resolvingDominant(x, y)) continue;
    const lowest = Math.max(48, x.leftHandTop + 1);
    const best = Math.min(
      ...arrangements(x.voicing, lowest).map((v) => movement(v, y.voicing)),
    );
    const written = movement(x.voicing, y.voicing);
    if (written > best + 1) {
      out.push(
        `${where}: ${x.symbol} [${x.voicing}] → ${y.symbol} [${y.voicing}] moves ${written}, could move ${best}`,
      );
    }
  }
  return out;
}

/** The chord as judged: the right hand over a left-hand bass or shell, else all of it. */
function change(
  symbol: string,
  notes: readonly Sounding[],
  hands: 'rh' | 'lh' | null,
): Change {
  const sorted = (ns: readonly Sounding[]) =>
    ns.map((n) => n.midi).sort((a, b) => a - b);
  const left = sorted(notes.filter((n) => n.hand === 'lh'));
  return {
    symbol,
    voicing: sorted(hands ? notes.filter((n) => n.hand === hands) : notes),
    all: sorted(notes),
    leftHandTop: hands === 'rh' && left.length ? left[left.length - 1] : 0,
  };
}

async function stepCases(): Promise<{ where: string; changes: Change[] }[]> {
  const flows = [...(await loadAllFlows()).values()].flat() as ActivityFlowV2[];
  const out: { where: string; changes: Change[] }[] = [];
  for (const flow of flows) {
    if (!GENRES.has(flow.genre)) continue;
    for (const step of flow.sections.flatMap(
      (s) => s.steps,
    ) as ActivityStepV2[]) {
      if (!step.chordSymbols?.length) continue;
      if (AS_WRITTEN.has(step.tag.split(' |')[0])) continue;
      const notes =
        resolveStepContent(step, {
          section: step.section,
          keyRoot:
            KEY_ROOT[(step.key ?? flow.params.defaultKey).split(' ')[0]] ?? 60,
          tempo: 90,
          timeSignature: step.timeSignature ?? [4, 4],
          tpb: 480,
          defaultScale: flow.params.defaultScale,
          genre: flow.genre,
          instrument: flow.params.instrument,
        }) ?? [];
      const struck = notes.length
        ? chordStrikes(step.chordSymbols, notes)
        : null;
      if (!struck) continue;
      const config = step.instrument_config?.hand_config;
      const hands =
        config === 'two_hand_comping' || config === 'lh_bass_rh_chords'
          ? 'rh'
          : config === 'lh_chords_rh_melody'
            ? 'lh'
            : null;
      out.push({
        where: `${flow.genre} L${flow.level} ${step.activity}`,
        changes: struck.map((chord) =>
          change(
            chord.symbol,
            notes.filter((n) => n.onset === chord.tick) as Sounding[],
            hands,
          ),
        ),
      });
    }
  }
  return out;
}

function partCases(): { where: string; changes: Change[] }[] {
  const out: { where: string; changes: Change[] }[] = [];
  for (const part of listParts()) {
    if (!GENRES.has(part.genre ?? '') || part.instrument !== 'piano') continue;
    if (part.role === 'melody' || !part.chordSymbols?.length) continue;
    if (AS_WRITTEN.has(part.id)) continue;
    const bar = barTicks(part.timeSignature ?? [4, 4]);
    const byTick = new Map<number, Sounding[]>();
    for (const n of part.notes)
      byTick.set(n.tick, [...(byTick.get(n.tick) ?? []), n as Sounding]);
    const changes: Change[] = [];
    for (const [tick, ns] of [...byTick.entries()].sort(
      (a, b) => a[0] - b[0],
    )) {
      const symbols =
        part.chordSymbols[
          Math.floor(tick / bar) % part.chordSymbols.length
        ].split(' ');
      // A two-chord bar's second chord may be pushed onto the "and" of 2.
      const symbol =
        symbols.length === 2 && tick % bar >= bar / 2 - 240
          ? symbols[1]
          : symbols[0];
      if (changes.at(-1)?.symbol === symbol) continue;
      changes.push(change(symbol, ns, ns.some((n) => n.hand) ? 'rh' : null));
    }
    out.push({ where: part.id, changes });
  }
  return out;
}

describe('dominant resolutions voice-lead', () => {
  it('has Jazz and Blues voicings to check', async () => {
    expect((await stepCases()).length).toBeGreaterThan(40);
    expect(partCases().length).toBeGreaterThan(20);
  });

  it('voices every resolving dominant in the lessons into the chord after it', async () => {
    const found = (await stepCases()).flatMap((c) =>
      offenders(c.where, c.changes),
    );
    expect(found).toEqual([]);
  });

  it('voices every resolving dominant in the pianists’ parts into the chord after it', () => {
    const found = partCases().flatMap((c) => offenders(c.where, c.changes));
    expect(found).toEqual([]);
  });
});
