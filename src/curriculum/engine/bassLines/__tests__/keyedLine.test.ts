import { describe, expect, it } from 'vitest';
import { bandVariation } from '../../band/band';
import { realizeLayer } from '../../band/realize';
import { getBand, LIVE_ITEMS } from '../../band/registry';
import { chordSymbolTones } from '../../genreGeneration/chordSymbolTones';
import {
  chordFromTones,
  pairedBassNotes,
} from '../../lessonPairings/pairedBacking';
import { keyedInterval, realizeLine, type BassLine } from '../bassLine';
import { parseChord, type Chord } from '../harmony';
import { getBassLine, listBassLines } from '../registry';

/**
 * A bass line in a known key: a band following a student's chart plays its
 * line in the chart's key, as the parts beside it do (parts/followChords.ts).
 * A degree the chord doesn't name takes the key's note under it; walks and
 * approaches step through the key's scale; chromatic approaches stay
 * chromatic. Without a key, every line plays exactly as it always has.
 */

const C_MAJOR = [0, 2, 4, 5, 7, 9, 11];
const D_MINOR = [2, 4, 5, 7, 9, 10, 0];
const chord = (symbol: string): Chord => parseChord(symbol)!;
const mod12 = (n: number) => ((n % 12) + 12) % 12;

describe('a degree in a known key', () => {
  it('takes the key’s note where the chord doesn’t name one', () => {
    expect(keyedInterval('7', chord('C'), C_MAJOR)).toBe(11); // B
    expect(keyedInterval('7', chord('G'), C_MAJOR)).toBe(10); // F
    expect(keyedInterval('7', chord('Am'), C_MAJOR)).toBe(10); // G
    expect(keyedInterval('7-', chord('C'), C_MAJOR)).toBe(-1); // B below
    expect(keyedInterval('4', chord('Bb'), D_MINOR)).toBe(6); // E
    expect(keyedInterval('6', chord('Dm'), C_MAJOR)).toBe(9); // B
  });

  it('keeps a tone the chord names', () => {
    expect(keyedInterval('7', chord('C7'), C_MAJOR)).toBe(10); // B♭
    expect(keyedInterval('7', chord('Cmaj7'), D_MINOR)).toBe(11); // B
    expect(keyedInterval('2', chord('E7b9'), C_MAJOR)).toBe(1); // F
    expect(keyedInterval('5', chord('Bdim'), C_MAJOR)).toBe(6); // F
    expect(keyedInterval('3', chord('Am'), C_MAJOR)).toBe(3);
  });

  it('never makes an avoid note of it', () => {
    // A ♭9 is the root: Em's 2 in C major would be F.
    expect(keyedInterval('2', chord('Em'), C_MAJOR)).toBe(0);
    expect(keyedInterval('2', chord('Am'), D_MINOR)).toBe(0);
    // A ♮11 over a major chord, a ♭13 over a minor one: the 5th…
    expect(keyedInterval('4', chord('C'), C_MAJOR)).toBe(7);
    expect(keyedInterval('6', chord('Am'), C_MAJOR)).toBe(7);
    // …unless the line steps through it, as a passing note.
    expect(keyedInterval('4', chord('C'), C_MAJOR, true)).toBe(5);
    expect(keyedInterval('6', chord('Am'), C_MAJOR, true)).toBe(8);
  });
});

const CHARTS = [
  { name: 'C Am F G in C major', chords: ['C', 'Am', 'F', 'G'], key: C_MAJOR },
  {
    name: 'Dm Gm Am Bb in D minor',
    chords: ['Dm', 'Gm', 'Am', 'Bb'],
    key: D_MINOR,
  },
];
const LIVE = listBassLines().filter((l) => l.status === 'live');

describe.each(CHARTS)('over $name, in its key', ({ chords, key }) => {
  const bars = chords.map((s) => [chord(s)]);
  // The genres with Walk and Approach rules, and one without (the free rules).
  it.each(['funk', 'pop', 'latin', 'hip-hop', 'jazz'])(
    'every live line by %s rules plays the key’s notes, but for approaches',
    (genre) => {
      for (const line of LIVE) {
        const realized = realizeLine(line, bars, {
          genre,
          keyScale: key,
          passes: 2,
          seed: 3,
        });
        const outside = realized.notes.filter(
          (n) => n.degree !== 'A' && !key.includes(mod12(n.midi)),
        );
        expect(
          outside.map((n) => `${n.degree}:${n.midi}@${n.q}`),
          line.id,
        ).toEqual([]);
      }
    },
  );

  it('plays Funk Band 1’s lines in the key through the band', () => {
    const tones = chords.map((s) => chordSymbolTones(s)!);
    for (const variation of ['l1-pocket', 'l2-syncopation']) {
      const band = bandVariation(getBand('funk-band-1')!, variation);
      const bass = band.layers.find((l) => l.source.kind === 'bassLine')!;
      const ctx = {
        chordAt: (tick: number) => tones[Math.floor(tick / 1920) % 4],
        bars: 8,
        timeSignature: [4, 4] as [number, number],
        genre: 'funk',
      };
      const keyed = realizeLayer(bass, LIVE_ITEMS, {
        ...ctx,
        followChords:
          key === C_MAJOR
            ? { tonic: 0, mode: 'ionian' }
            : { tonic: 2, mode: 'aeolian' },
      })!;
      const line = getBassLine((bass.source as { id: string }).id)!;
      const asWritten = realizeLayer(bass, LIVE_ITEMS, ctx)!;
      // Without the key it plays as lessons hear it.
      expect(asWritten).toEqual(
        pairedBassNotes(line, ctx.chordAt, 8, [4, 4], 'funk'),
      );
      // With it, the same rhythm in the key (approaches aside).
      expect(keyed.map((n) => n.onset)).toEqual(asWritten.map((n) => n.onset));
      // Each note's degree, from the chart pairedBassNotes builds.
      const chart = Array.from({ length: 8 }, (_, b) =>
        Array.from({ length: 16 }, (_, i) =>
          chordFromTones(ctx.chordAt(b * 1920 + i * 120)),
        ),
      );
      const degrees = realizeLine(line, chart, {
        genre: 'funk',
        keyScale: key,
      }).notes.map((n) => n.degree);
      expect(degrees.length).toBe(keyed.length);
      const outside = keyed.filter(
        (n, i) => degrees[i] !== 'A' && !key.includes(mod12(n.note)),
      );
      expect(outside, variation).toEqual([]);
    }
  });
});

/**
 * Every line's notes, by FNV-1a over its notes over four charts by each set
 * of rules, recorded before the key existed: a line without a key plays
 * exactly as it did.
 */
const BEFORE: Record<string, string> = {
  'walking-1-chord-per-bar': '1o57z56',
  'walking-2-chords-per-bar': '40rr71',
  'walking-fast-swing': 'mkoazu',
  'two-feel': 'ad3m40',
  'waltz-walk': 'uysor7',
  'poinciana-ostinato': 'rxnenv',
  bossa: '10slawr',
  samba: 'hs4ul3',
  'partido-alto': 'gm87zo',
  'driving-eighths': '9yow1l',
  'second-line': 'xpilp7',
  funk: '2rs5dr',
  'heavy-funk': '1lznish',
  'octave-disco': 'xhqfk3',
  boogie: '5i0utr',
  'half-time-shuffle': '1n2uzej',
  'just-roots': '5fwcmj',
  'heavy-funk-copy': '1lznish',
  'four-on-the-flour-funk': '1dqfhjr',
  'cumbia-1': '1svtsub',
  'cumbia-1-copy': '1h3incr',
  mariachi: '1s29pmj',
  'mariachi-copy': '1gl3ib7',
  'cumbia-1-copy-2': 'ems3gj',
};

const fnv = (s: string) => {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
};

describe('a line without a key', () => {
  it.each(listBassLines().map((l) => [l.id, l] as const))(
    '%s plays exactly as before',
    (id, line: BassLine) => {
      const charts = [
        ['C', 'Am', 'F', 'G'],
        ['Dm', 'Gm', 'Am', 'Bb'],
        ['Dm7', 'G7', 'Cmaj7', 'A7'],
        ['Em', 'C', 'D', 'Em'],
      ];
      const ts = line.timeSignature ?? [4, 4];
      const bar = Math.round((ts[0] * 480 * 4) / ts[1]);
      const played: string[] = [];
      for (const symbols of charts) {
        const tones = symbols.map((s) => chordSymbolTones(s)!);
        for (const genre of [
          undefined,
          'funk',
          'pop',
          'latin',
          'hip-hop',
          'jazz',
        ])
          played.push(
            pairedBassNotes(
              line,
              (t) => tones[Math.floor(t / bar) % 4],
              8,
              ts,
              genre,
            )
              .map((n) => `${n.note},${n.onset},${n.duration},${n.velocity}`)
              .join(';'),
          );
      }
      expect(BEFORE[id], 'a line added since: record it').toBeDefined();
      expect(fnv(played.join('|'))).toBe(BEFORE[id]);
    },
  );
});
