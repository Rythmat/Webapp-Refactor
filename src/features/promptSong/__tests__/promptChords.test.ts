// @vitest-environment jsdom
/**
 * Prism's chords (owner, 2026-11-10: "only triads, in a low octave, only
 * root position"): every chord a prompt writes sounds the chord the lane
 * names — its 3rd and its 7th, nothing outside it — in the middle of the
 * keyboard above the bass, voice-led from one chord to the next.
 */
import { beforeAll, describe, expect, it } from 'vitest';
import type { MidiNoteEvent } from '@prism/engine';
import { chordPcs } from '@/curriculum/engine/chordComping/chordComping';
import { chordSymbolTones } from '@/curriculum/engine/genreGeneration/chordSymbolTones';
import { pairingsReady } from '@/curriculum/engine/lessonPairings/registry';
import { buildPromptPart, type PartContext } from '../buildPromptPart';
import { voiceChordHits } from '../voicePromptChords';

beforeAll(() => pairingsReady);

const BAR = 1920;
const context = (over: Partial<PartContext> = {}): PartContext => ({
  startTick: 0,
  lengthTicks: 4 * BAR,
  trackPart: null,
  tonicPc: 0,
  mode: 'ionian',
  bpm: 100,
  timeSignature: [4, 4],
  chords: [],
  projectGenre: 'Pop',
  ...over,
});

const mod12 = (n: number) => ((n % 12) + 12) % 12;

/**
 * The symbol the part's chord lane names at a tick (it changes off the bar),
 * the spot looping: a hit pushed over its last bar line is its first chord.
 */
function laneAt(
  result: Awaited<ReturnType<typeof buildPromptPart>>,
): (tick: number) => string {
  const regions = result.chordRegions!;
  const length = result.reading.bars * BAR;
  return (at) => {
    const tick = at % length;
    return (
      [...regions].reverse().find((r) => r.startTick <= tick) ?? regions[0]
    ).noteName
      .replace(/♭/g, 'b')
      .replace(/♯/g, '#');
  };
}

/** A clip's notes struck together, in time order. */
function hitsOf(events: readonly MidiNoteEvent[]): MidiNoteEvent[][] {
  const hits: MidiNoteEvent[][] = [];
  for (const e of [...events].sort((a, b) => a.startTick - b.startTick)) {
    const last = hits[hits.length - 1];
    if (last && e.startTick - last[0].startTick <= 30) last.push(e);
    else hits.push([e]);
  }
  return hits.filter((h) => h.length >= 2);
}

const PROMPTS = [
  'pop chords',
  'rock chords',
  'jazz chords',
  'R&B chords',
  'neo-soul chords',
  'gospel chords',
  'funk chords',
  'hip hop chords',
  'blues chords',
];

describe('the chords a prompt writes', () => {
  it.each(PROMPTS.flatMap((p) => [1, 2, 3].map((seed) => [p, seed] as const)))(
    '%s (seed %i) sound their chords, above the bass',
    async (text, seed) => {
      const result = await buildPromptPart(text, context(), { seed });
      const symbolAt = laneAt(result);
      const chordAt = (tick: number) => chordSymbolTones(symbolAt(tick));
      const chords = result.parts.filter((p) => p.part === 'chords');
      expect(chords.length, text).toBeGreaterThan(0);
      for (const part of chords) {
        const hits = hitsOf(part.clip.events);
        expect(hits.length, part.name).toBeGreaterThan(0);
        for (const hit of hits) {
          const pcs = new Set(hit.map((e) => mod12(e.note)));
          const at = `${part.name} @${hit[0].startTick} over ${symbolAt(hit[0].startTick)}`;
          // Its chord's 3rd and 7th, whatever else a pianist adds: the
          // chord sounding, or the next one when the hit anticipates it.
          const sounds = [hit[0].startTick, hit[0].startTick + 480]
            .map((tick) => chordAt(tick)!)
            .some((chord) =>
              [chord.third, chord.seventh].every(
                (i) => i === undefined || pcs.has(mod12(chord.rootPc + i)),
              ),
            );
          expect(sounds, at).toBe(true);
          // In the middle of the keyboard, not under the bass.
          for (const e of hit) {
            expect(e.note, at).toBeGreaterThanOrEqual(48);
            expect(e.note, at).toBeLessThanOrEqual(84);
          }
        }
      }
    },
  );

  it('voices the engine’s own chords with every tone, voice-led, not all in root position', async () => {
    const result = await buildPromptPart('R&B chords', context(), { seed: 1 });
    const symbolAt = laneAt(result);
    const part = result.parts.find((p) => p.part === 'chords')!;
    const hits = hitsOf(part.clip.events);
    const sorted = (xs: number[]) => [...xs].sort((a, b) => a - b);
    const chordsNear = (hit: MidiNoteEvent[]) =>
      [hit[0].startTick, hit[0].startTick + 480].map(
        (tick) => chordSymbolTones(symbolAt(tick))!,
      );
    // Exactly the tones of its chord (or of the chord it anticipates).
    const chordOf = (hit: MidiNoteEvent[]) => {
      const pcs = sorted(hit.map((e) => mod12(e.note)));
      return chordsNear(hit).find(
        (c) => sorted(chordPcs(c)).join() === pcs.join(),
      );
    };
    for (const hit of hits) expect(chordOf(hit)).toBeDefined();
    const tops = hits.map((h) => Math.max(...h.map((e) => e.note)));
    const moves = tops.slice(1).map((t, i) => Math.abs(t - tops[i]));
    expect(moves.reduce((a, b) => a + b, 0) / moves.length).toBeLessThanOrEqual(
      5,
    );
    const rootPosition = hits.filter((hit) => {
      const low = Math.min(...hit.map((e) => e.note));
      return mod12(low) === chordOf(hit)!.rootPc;
    });
    expect(rootPosition.length).toBeLessThan(hits.length);
  });

  it('sits the chords above the bass a prompt writes with them', async () => {
    const result = await buildPromptPart(
      'R&B drums, bass and chords',
      context(),
      { seed: 2 },
    );
    const notes = (part: string) =>
      result.parts
        .filter((p) => p.part === part)
        .flatMap((p) => p.clip.events.map((e) => e.note));
    const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
    expect(mean(notes('chords'))).toBeGreaterThan(mean(notes('bass')) + 12);
  });

  it('plays jazz on the jazz band’s pianist, not a combo', async () => {
    const result = await buildPromptPart('jazz chords', context(), { seed: 1 });
    // The band's keys layer (a combo has none, and its chords are the
    // engine's own "Chords").
    const names = result.parts.map((p) => p.name);
    expect(names.some((n) => n.endsWith('Keys comping'))).toBe(true);
    expect(names.some((n) => n.endsWith(' Chords'))).toBe(false);
  });
});

describe('voiceChordHits', () => {
  it('voices a hit struck just before the bar as the chord it anticipates', () => {
    const chords = ['Ebm7', 'Bmaj7'].map((s) => chordSymbolTones(s)!);
    // The engine strikes bar 2's Bmaj7 three ticks early, as a B triad.
    const out = voiceChordHits(
      [...hit(0, [39, 42, 46]), ...hit(BAR - 3, [35, 39, 42])],
      (tick) => chords[Math.floor(tick / BAR)] ?? chords[1],
    );
    const early = out.filter((e) => e.startTick === BAR - 3);
    expect(early.map((e) => mod12(e.note)).sort((a, b) => a - b)).toEqual([
      3, 6, 10, 11,
    ]);
  });

  it('voices it as the next chord even when its notes fit both', () => {
    // After A♭m7 a B triad (B, D♯, F♯) is three tones of either chord: a
    // strike a hair before the bar is still the bar's Bmaj7.
    const chords = ['Abm7', 'Bmaj7'].map((s) => chordSymbolTones(s)!);
    const out = voiceChordHits(
      [...hit(0, [44, 47, 51]), ...hit(BAR - 3, [35, 39, 42])],
      (tick) => chords[Math.floor(tick / BAR)] ?? chords[1],
    );
    const early = out.filter((e) => e.startTick === BAR - 3);
    expect(early.map((e) => mod12(e.note)).sort((a, b) => a - b)).toEqual([
      3, 6, 10, 11,
    ]);
  });

  const hit = (tick: number, notes: number[]): MidiNoteEvent[] =>
    notes.map((note) => ({
      note,
      startTick: tick,
      durationTicks: 480,
      velocity: 90,
      channel: 0,
    }));

  it('turns a low root-position triad into the whole chord, voice-led', () => {
    // Bmaj7 then E♭m7 as the engine wrote them: low triads.
    const chords = ['Bmaj7', 'Ebm7'].map((s) => chordSymbolTones(s)!);
    const out = voiceChordHits(
      [...hit(0, [35, 39, 42]), ...hit(BAR, [39, 42, 46])],
      (tick) => chords[Math.floor(tick / BAR)],
    );
    const first = out.filter((e) => e.startTick === 0).map((e) => e.note);
    const second = out.filter((e) => e.startTick === BAR).map((e) => e.note);
    expect(first.map(mod12).sort((a, b) => a - b)).toEqual([3, 6, 10, 11]);
    expect(second.map(mod12).sort((a, b) => a - b)).toEqual([1, 3, 6, 10]);
    for (const n of [...first, ...second]) {
      expect(n).toBeGreaterThan(48);
      expect(n).toBeLessThanOrEqual(72);
    }
  });
});
