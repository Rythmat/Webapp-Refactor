import { describe, expect, it } from 'vitest';
import { creep } from '@/curriculum/data/songs/creep';
import { stand_by_me } from '@/curriculum/data/songs/stand_by_me';
import { sweet_home_alabama } from '@/curriculum/data/songs/sweet_home_alabama';
import {
  diatonicTriads,
  keyCenterColor,
  parallelModes,
  songDemoChart,
  KEY_CENTERS,
  songKeyColor,
} from '../music';
import { KEY_RAINBOW_COLORS } from '../rainbow';

const hits = (song: Parameters<typeof songDemoChart>[0]) =>
  songDemoChart(song).flatMap((s) => s.bars.flat());

const byName = (song: Parameters<typeof songDemoChart>[0]) =>
  new Map(hits(song).map((h) => [h.name, h]));

describe('songDemoChart', () => {
  it('colors Creep: G and C in the key, B7 and Cmin7 borrowed', () => {
    const chords = byName(creep);
    expect([...chords.keys()]).toEqual(['G', 'B7', 'C', 'Cmin7']);
    expect(chords.get('G')?.inKey).toBe(true);
    expect(chords.get('C')?.inKey).toBe(true);
    expect(chords.get('B7')?.inKey).toBe(false);
    expect(chords.get('Cmin7')?.inKey).toBe(false);
    expect(chords.get('G')?.color).toBe(songKeyColor(creep));
    expect(chords.get('B7')?.color).not.toBe(chords.get('Cmin7')?.color);
  });

  it('keeps every Stand By Me chord in the key', () => {
    expect(hits(stand_by_me).every((h) => h.inKey)).toBe(true);
  });

  it("gives Sweet Home Alabama's ♭VII (C) G's color", () => {
    const c = byName(sweet_home_alabama).get('C');
    expect(c?.inKey).toBe(false);
    expect(c?.color).toBe(keyCenterColor(7));
  });

  it('keeps sections, rows and rests from the song', () => {
    const chart = songDemoChart(sweet_home_alabama);
    expect(chart).toHaveLength(1);
    expect(chart[0].perRow).toBe(4);
    expect(chart[0].bars[3]).toEqual([]);
    // Creep is one section now — its verse and chorus were written as two
    // with a five-bar row, and the chart folded them into a single nine-bar
    // verse. A section that sets no width reads four to a row.
    const creepChart = songDemoChart(creep);
    expect(creepChart).toHaveLength(1);
    expect(creepChart[0].label).toBe('Verse');
    expect(creepChart[0].perRow).toBe(4);
    expect(creepChart[0].bars).toHaveLength(9);
  });

  it('voices chords inside the demo keys, root in the bass', () => {
    for (const song of [creep, stand_by_me, sweet_home_alabama])
      for (const h of hits(song)) {
        expect(Math.min(...h.midis)).toBeGreaterThanOrEqual(48);
        expect(Math.max(...h.midis)).toBeLessThanOrEqual(84);
      }
    expect(byName(creep).get('B7')?.midis[0]).toBe(59);
  });
});

describe('theory helpers', () => {
  it('builds diatonic triads in the key color, with vii°', () => {
    for (const pc of [0, 6, 11]) {
      const triads = diatonicTriads(pc);
      expect(triads.map((t) => t.roman)).toEqual([
        'I',
        'ii',
        'iii',
        'IV',
        'V',
        'vi',
        'vii°',
      ]);
      expect(triads.map((t) => t.hybrid)).toEqual([
        '1 maj',
        '2 min',
        '3 min',
        '4 maj',
        '5 maj',
        '6 min',
        '7 dim',
      ]);
      expect(new Set(triads.map((t) => t.color))).toEqual(
        new Set([keyCenterColor(pc)]),
      );
      for (const t of triads) {
        expect(Math.min(...t.midis)).toBeGreaterThanOrEqual(48);
        expect(Math.max(...t.midis)).toBeLessThanOrEqual(84);
      }
    }
    expect(diatonicTriads(0).map((t) => t.name)).toEqual([
      'C',
      'Dm',
      'Em',
      'F',
      'G',
      'Am',
      'B°',
    ]);
  });

  it('names each key center by color and key signature', () => {
    expect(
      KEY_CENTERS.map((k) => `${k.name}: ${k.colorName} (${k.signature})`),
    ).toEqual([
      'C: Red (♮)',
      'G: Vermillion (♯)',
      'D: Orange (♯♯)',
      'A: Yellow (♯♯♯)',
      'E: Green (♯♯♯♯)',
      'B: Sage (♯♯♯♯♯)',
      'F#: Teal (♯♯♯♯♯♯)',
      'Db: Blue (♭♭♭♭♭)',
      'Ab: Indigo (♭♭♭♭)',
      'Eb: Purple (♭♭♭)',
      'Bb: Magenta (♭♭)',
      'F: Pink (♭)',
    ]);
  });

  it('walks the parallel modes of C around the circle by parent key', () => {
    const modes = parallelModes(0);
    expect(modes.map((m) => m.name)).toEqual([
      'Lydian',
      'Ionian',
      'Mixolydian',
      'Dorian',
      'Aeolian',
      'Phrygian',
      'Locrian',
    ]);
    expect(modes.map((m) => m.parent.pitchClass)).toEqual([
      7, 0, 5, 10, 3, 8, 1,
    ]);
    for (const m of modes) {
      expect(m.parent.color).toBe(keyCenterColor(m.parent.pitchClass));
      expect(m.midis).toHaveLength(8);
      expect(m.midis[7] - m.midis[0]).toBe(12);
    }
  });
});

describe('KEY_RAINBOW_COLORS', () => {
  it('matches the key-center colors without loading the theory engine', () => {
    expect(KEY_RAINBOW_COLORS).toEqual(KEY_CENTERS.map((k) => k.color));
  });
});
