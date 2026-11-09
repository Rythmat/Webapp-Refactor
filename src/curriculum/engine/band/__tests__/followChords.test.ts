import { describe, expect, it } from 'vitest';
import { chordSymbolTones } from '../../genreGeneration/chordSymbolTones';
import { barTicks } from '../../meter';
import { partChordAt } from '../../parts/followChords';
import { blankPart, partTicks, type InstrumentPart } from '../../parts/part';
import { getPart } from '../../parts/registry';
import type { BandLayer, RealizeContext } from '../band';
import { realizeBand, realizeLayer, type BandItems } from '../realize';

/**
 * A part layer with `followChords` set plays its part over the chart's chords
 * (parts/followChords.ts); without it, as written in the key, as before. A
 * pitched part that names no chords drops out, so the lesson's own backing
 * plays that part (backingPatterns.ts, buildBackingNotes' withPairing).
 */

const part = (id: string): InstrumentPart => {
  const found = getPart(id);
  if (!found) throw new Error(`no part ${id}`);
  return found;
};

const DRUMS: InstrumentPart = {
  ...blankPart('test-drums', 'Test drums', 'drums'),
  role: 'groove',
  chordSymbols: ['Am'],
  notes: [
    { tick: 0, duration: 120, midi: 36, velocity: 100 },
    { tick: 960, duration: 120, midi: 38, velocity: 100 },
  ],
};

const items = (...parts: InstrumentPart[]): BandItems => ({
  groove: () => undefined,
  bassLine: () => undefined,
  comping: () => undefined,
  part: (id) => parts.find((p) => p.id === id),
});

const layerOf = (p: InstrumentPart): BandLayer => ({
  id: 'keys',
  name: 'Keys',
  instrument: p.instrument === 'bass' ? 'bass' : 'keys',
  source: { kind: 'part', id: p.id },
});

const D_MINOR = ['Dm', 'Gm', 'Am', 'Bb'].map((s) => chordSymbolTones(s)!);
const dMinor = (bars: number): RealizeContext => ({
  chordAt: (tick) => D_MINOR[Math.floor(tick / 1920) % 4],
  bars,
  timeSignature: [4, 4],
});
const following: RealizeContext['followChords'] = { tonic: 2, mode: 'aeolian' };

/** Notes in onset and pitch order: the same chord in any order is the same. */
const sorted = <N extends { onset: number; note: number }>(notes: N[] | null) =>
  notes && [...notes].sort((a, b) => a.onset - b.onset || a.note - b.note);

const rhythm = (
  notes: { onset: number; duration: number; velocity: number }[],
) => notes.map((n) => [n.onset, n.duration, n.velocity].join()).sort();

describe('a part layer over a chart', () => {
  const funk = part('funk-pianist-1-l2-syncopation-sauce-take-24');

  it('plays as written, moved to the key, without followChords', () => {
    const notes = realizeLayer(layerOf(funk), items(funk), dMinor(4), {
      tonic: 2,
    })!;
    // A dorian to D: up a fourth, the shape unchanged.
    expect(notes.slice(0, 3).map((n) => n.note)).toEqual(
      funk.notes.slice(0, 3).map((n) => n.midi + 5),
    );
  });

  it('follows the chart’s chords with followChords, in the player’s rhythm', () => {
    const ctx = { ...dMinor(4), followChords: following };
    const followed = realizeLayer(layerOf(funk), items(funk), ctx, {
      tonic: 2,
    })!;
    const written = realizeLayer(layerOf(funk), items(funk), dMinor(4), {
      tonic: 2,
    })!;
    expect(rhythm(followed)).toEqual(rhythm(written));
    const at = (tick: number) =>
      followed
        .filter((n) => n.onset === tick)
        .map((n) => n.note)
        .sort((a, b) => a - b);
    // The take starts an octave lower since 20 Oct 2026; the next chord
    // leads up from it.
    expect(at(0)).toEqual([60, 64, 69]); // C4 E4 A4 over Dm
    expect(at(1920)).toEqual([65, 69, 74]); // F4 A4 D5 over Gm
    expect(followed.every((n) => n.part === 'chords')).toBe(true);
  });

  it('plays exactly as written over its own chords in its own key', () => {
    for (const id of [
      'funk-pianist-1-l2-syncopation-sauce-take-24',
      'hip-hop-l1-d2-2-jam-cm-g-1st-inversion',
      'pop-l1-d2-2-8-bar-power-chord-jam-3-3-2-chunking-moving-bass',
      'latin-bassist-1-l2-merengue-bachata-take-1',
    ]) {
      const p = part(id);
      const ctx: RealizeContext = {
        chordAt: partChordAt(p)!,
        // Three loops of it: the voice leading carries over each repeat.
        bars: 3 * p.bars,
        timeSignature: p.timeSignature,
      };
      const options = { tonic: p.key.tonic };
      expect(
        sorted(
          realizeLayer(
            layerOf(p),
            items(p),
            { ...ctx, followChords: p.key },
            options,
          ),
        ),
      ).toEqual(sorted(realizeLayer(layerOf(p), items(p), ctx, options)));
    }
  });

  it('follows each repeat’s own chords as it loops across a longer chart', () => {
    // A 2-bar boom bap line over the 4-bar chart: Dm, Gm, then Am, B♭.
    const boomBap = part('hip-hop-l2-c4-c1-boom-bap-bass');
    const notes = realizeLayer(
      layerOf(boomBap),
      items(boomBap),
      { ...dMinor(4), followChords: following },
      { tonic: 2 },
    )!;
    const roots = [0, 1, 2, 3].map(
      (bar) => notes.find((n) => n.onset === bar * 1920)!.note % 12,
    );
    expect(roots).toEqual([2, 7, 9, 10]);
    expect(notes.length).toBe(2 * boomBap.notes.length);
  });

  it('drops a pitched part without chords, so the lesson plays that part', () => {
    const bare = part('funk-l2-d93-d1-lh-bass-rh-chords-headhunters-copy');
    const ctx = { ...dMinor(4), followChords: following };
    expect(realizeLayer(layerOf(bare), items(bare), ctx)).toBeNull();
    expect(realizeBand({ layers: [layerOf(bare)] }, items(bare), ctx)).toEqual(
      [],
    );
    // Without followChords it plays as before.
    expect(
      realizeLayer(layerOf(bare), items(bare), dMinor(4))?.length,
    ).toBeGreaterThan(0);
  });

  it('keeps a part without chords playing in the console, as written in the key', () => {
    // The editors' preview: a silent layer would hide the part.
    const bare = part('funk-l2-d93-d1-lh-bass-rh-chords-headhunters-copy');
    const ctx = { ...dMinor(4), followChords: following };
    const notes = realizeLayer(layerOf(bare), items(bare), ctx, {
      keepUnfollowable: true,
    })!;
    // A dorian to the chart's D: up a fourth, the shape unchanged.
    expect(notes.slice(0, 3).map((n) => n.note)).toEqual(
      realizeLayer(layerOf(bare), items(bare), dMinor(4), { tonic: 2 })!
        .slice(0, 3)
        .map((n) => n.note),
    );
    expect(notes[0].note - bare.notes[0].midi).toBe(5);
  });

  it('leaves a melody and a drum part as they were', () => {
    const melody = part('funk-l1-a1-scale-d-minor-pentatonic');
    for (const p of [melody, DRUMS]) {
      const ctx = { ...dMinor(2), timeSignature: p.timeSignature };
      expect(
        realizeLayer(
          layerOf(p),
          items(p),
          { ...ctx, followChords: following },
          { tonic: 2 },
        ),
      ).toEqual(realizeLayer(layerOf(p), items(p), ctx, { tonic: 2 }));
    }
  });

  it('cuts the last notes at the chart’s end, as a looped part does', () => {
    const vals = part('latin-l1-d3-2-mariachi-lh-vals-through-the-progression');
    const ctx: RealizeContext = {
      chordAt: partChordAt(vals)!,
      bars: 3,
      timeSignature: vals.timeSignature,
    };
    const notes = realizeLayer(
      layerOf(vals),
      items(vals),
      { ...ctx, followChords: vals.key },
      { tonic: vals.key.tonic },
    )!;
    const total = 3 * barTicks(vals.timeSignature);
    expect(total).toBeLessThan(partTicks(vals));
    expect(notes.every((n) => n.onset + n.duration <= total)).toBe(true);
    expect(sorted(notes)).toEqual(
      sorted(
        realizeLayer(layerOf(vals), items(vals), ctx, {
          tonic: vals.key.tonic,
        }),
      ),
    );
  });
});
