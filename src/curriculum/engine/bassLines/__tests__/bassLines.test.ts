import { describe, expect, it } from 'vitest';
import { listDesignedGrooves } from '../../drumGrooves/registry';
import {
  BASS_LINE_ID_PATTERN,
  DEGREES,
  quartersToTime,
  realizeLine,
  stackedNotes,
  swingQuarters,
  timeToQuarters,
  type BassLine,
} from '../bassLine';
import {
  chordSpans,
  chordSymbol,
  parseChart,
  parseChord,
  progressionById,
  realizePreset,
} from '../harmony';
import { listBassLines } from '../registry';

const line = (
  notes: BassLine['notes'],
  extra: Partial<BassLine> = {},
): BassLine => ({
  id: 't',
  name: 't',
  status: 'draft',
  timeSignature: [4, 4],
  length: '1m',
  gridResolution: '8n',
  instrument: 'upright',
  grooves: [],
  anchorOnChange: true,
  notes,
  ...extra,
});
const n = (
  time: string,
  degree: BassLine['notes'][number]['degree'],
  dur = 0.9,
) => ({
  time,
  degree,
  dur,
  velocity: 0.8,
});
const pc = (midi: number) => midi % 12;

describe('chords and charts', () => {
  it('reads the qualities a chart writes', () => {
    expect(parseChord('Bbmaj7')).toMatchObject({
      root: 10,
      quality: 'maj7',
      flats: true,
    });
    expect(parseChord('F#m7b5')).toMatchObject({
      root: 6,
      quality: 'm7b5',
      flats: false,
    });
    expect(parseChord('Eb-7')).toMatchObject({ root: 3, quality: 'm7' });
    expect(parseChord('C7/E')).toMatchObject({
      root: 0,
      quality: '7',
      bass: 4,
    });
    expect(parseChord('G13')).toMatchObject({ quality: '7' });
    expect(parseChord('N.C.')?.nc).toBe(true);
    expect(parseChord('H7')).toBeNull();
  });

  it('splits bars, holds with dots, repeats with %, and reports typos', () => {
    const { bars, bad } = parseChart('| Dm7 G7 | C . . G7 | % | Xyz |');
    expect(bars.map((b) => b.map((c) => chordSymbol(c)))).toEqual([
      ['Dm7', 'G7'],
      ['C', 'C', 'C', 'G7'],
      ['C', 'C', 'C', 'G7'],
    ]);
    expect(bad).toEqual(['Xyz']);
  });

  it('puts presets in a key, sharp numerals spelled sharp', () => {
    const blues = realizePreset(progressionById('jazz-blues'), 0);
    expect(chordSymbol(blues[5][0], false)).toBe('F#dim7');
    expect(
      realizePreset(progressionById('two-five-one'), 10).map((b) =>
        chordSymbol(b[0]),
      ),
    ).toEqual(['Cm7', 'F7', 'Bbmaj7', 'Bbmaj7']);
  });

  it('merges a held chord into one span and stretches 2/4 bars', () => {
    const { bars } = parseChart('| C | C | G7 |');
    expect(chordSpans(bars, [4, 4]).spans.map((s) => [s.start, s.end])).toEqual(
      [
        [0, 8],
        [8, 12],
      ],
    );
    // A samba chart bar lasts two bars of 2/4.
    expect(chordSpans(bars, [2, 4]).totalQuarters).toBe(12);
  });
});

describe('time', () => {
  it('round-trips bar:beat:sixteenth, the beat always a quarter', () => {
    expect(timeToQuarters('1:2:2')).toBe(6.5);
    expect(quartersToTime(6.5)).toBe('1:2:2');
    // 12/8 has six quarters to the bar.
    expect(timeToQuarters('1:0:0', [12, 8])).toBe(6);
  });
});

describe('the generator', () => {
  const { bars } = parseChart('| Dm7 | G7 | Cmaj7 | Cmaj7 |');

  it('plays the chord tones the roles name, over each chord', () => {
    const r = realizeLine(
      line([n('0:0:0', 'R'), n('0:2:0', '5'), n('0:3:0', '3')]),
      bars,
    );
    const byBar = (b: number) =>
      r.notes
        .filter((x) => x.q >= b * 4 && x.q < b * 4 + 4)
        .map((x) => pc(x.midi));
    expect(byBar(0)).toEqual([2, 9, 5]); // D A F
    expect(byBar(1)).toEqual([7, 2, 11]); // G D B
  });

  it('roots a note that lands on a change, unless told not to', () => {
    const tpl = line([n('0:0:0', '5')]);
    expect(pc(realizeLine(tpl, bars).notes[0].midi)).toBe(2);
    expect(
      pc(realizeLine({ ...tpl, anchorOnChange: false }, bars).notes[0].midi),
    ).toBe(9);
  });

  it('approaches the next root by a half step, a step or its dominant', () => {
    const r = realizeLine(line([n('0:0:0', 'R'), n('0:3:0', 'A')]), bars, {
      seed: 7,
    });
    // The target is the root under the next note (the same chord when it
    // carries on), in any octave.
    r.notes.forEach((a, i) => {
      if (a.degree !== 'A') return;
      const next = r.notes[i + 1] ?? r.notes[0];
      const interval = (((a.midi - r.spans[next.span].anchor) % 12) + 12) % 12;
      expect([1, 11, 2, 10, 7, 5]).toContain(interval);
    });
  });

  it('walks in small steps and stays in the instrument', () => {
    const walk = line([
      n('0:0:0', 'R'),
      n('0:1:0', 'W'),
      n('0:2:0', 'W'),
      n('0:3:0', 'A'),
    ]);
    const r = realizeLine(walk, parseChart('| Dm7 | G7 | Cmaj7 | A7 |').bars, {
      passes: 4,
      seed: 3,
    });
    r.notes.forEach((x) => {
      expect(x.midi).toBeGreaterThanOrEqual(28);
      expect(x.midi).toBeLessThanOrEqual(55);
    });
    for (let i = 1; i < r.notes.length; i++) {
      expect(
        Math.abs(r.notes[i].midi - r.notes[i - 1].midi),
      ).toBeLessThanOrEqual(12);
    }
  });

  it('is the same line for the same seed', () => {
    const walk = line([
      n('0:0:0', 'R'),
      n('0:1:0', 'W'),
      n('0:2:0', 'W'),
      n('0:3:0', 'A'),
    ]);
    const a = realizeLine(walk, bars, { seed: 11, passes: 2 }).notes.map(
      (x) => x.midi,
    );
    const b = realizeLine(walk, bars, { seed: 11, passes: 2 }).notes.map(
      (x) => x.midi,
    );
    expect(a).toEqual(b);
  });

  it('rests through N.C.', () => {
    const r = realizeLine(
      line([n('0:0:0', 'R')]),
      parseChart('| C | N.C. | G |').bars,
    );
    expect(r.notes.map((x) => x.q)).toEqual([0, 8]);
  });

  it('puts a slash chord’s bass note on the root row', () => {
    const r = realizeLine(
      line([n('0:0:0', 'R'), n('0:2:0', '5')], { anchorOnChange: false }),
      parseChart('| C/E |').bars,
    );
    expect(r.notes.map((x) => pc(x.midi))).toEqual([4, 7]); // E, and C/E's 5 is still G
  });
});

describe('swing', () => {
  it('moves only the off-beat of the pair', () => {
    expect(swingQuarters(0.5, 66, 'eighths')).toBeCloseTo(0.66);
    expect(swingQuarters(1, 66, 'eighths')).toBe(1);
    expect(swingQuarters(0.25, 66, 'eighths')).toBe(0.25);
    expect(swingQuarters(0.25, 66, 'sixteenths')).toBeCloseTo(0.33);
    expect(swingQuarters(0.5, 50, 'eighths')).toBe(0.5);
  });
});

describe('the bass line files', () => {
  const lines = listBassLines();
  // Lesson grooves, and the Studio's (a line may pair with either).
  const studioIds = Object.keys(
    import.meta.glob('../../../data/drumGrooves/studio/*.json'),
  ).map((path) => path.replace(/^.*\/(.+)\.json$/, '$1'));
  const grooveIds = new Set([
    ...listDesignedGrooves().map((g) => g.id),
    ...studioIds,
  ]);
  const degrees = new Set(DEGREES.map((d) => d.id));

  it('holds the 17 lines imported from ICP Studio', () => {
    // A copy made in the editor keeps its original's tags, so count originals.
    expect(
      lines.filter(
        (l) => l.tags?.includes('icp-studio') && !l.id.endsWith('-copy'),
      ),
    ).toHaveLength(17);
  });

  it.each(lines.map((l) => [l.id, l] as const))('%s is well formed', (_, l) => {
    expect(l.id).toMatch(BASS_LINE_ID_PATTERN);
    expect(l.length).toMatch(/^\d+m$/);
    l.notes.forEach((nt) => {
      expect(degrees.has(nt.degree)).toBe(true);
      expect(nt.time).toMatch(/^\d+:\d+:\d+(\.\d+)?$/);
      expect(nt.dur).toBeGreaterThan(0);
      expect(nt.velocity).toBeGreaterThan(0);
      expect(nt.velocity).toBeLessThanOrEqual(1);
    });
    l.grooves.forEach((g) => expect(grooveIds.has(g)).toBe(true));
  });

  it('counts notes stacked on the same start and row', () => {
    expect(
      stackedNotes(line([n('0:0:0', 'R'), n('0:0:0', 'R'), n('0:0:0', '5')])),
    ).toBe(1);
  });
});
