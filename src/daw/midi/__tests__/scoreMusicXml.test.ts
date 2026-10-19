import { describe, expect, it } from 'vitest';
import { buildScoreParts } from '@/daw/components/Score/scoreParts';
import { noteKey } from '@/daw/model/noteKeys';
import type { ChordRegion } from '@/daw/store/prismSlice';
import type { Track } from '@/daw/store/tracksSlice';
import { buildScoreXml } from '../ScoreMusicXmlExport';

const BAR = 1920;
const track = (
  id: string,
  instrument: string,
  events: [note: number, start: number, length: number][],
): Track =>
  ({
    id,
    name: id,
    type: 'midi',
    instrument,
    color: '#fff',
    midiClips: [
      {
        id: `${id}-c`,
        startTick: 0,
        events: events.map(([note, startTick, durationTicks]) => ({
          note,
          startTick,
          durationTicks,
          velocity: 100,
        })),
      },
    ],
  }) as unknown as Track;

const parts = buildScoreParts({
  tracks: [
    // Two bars: C E G A (quarters), then a held B♭ tied across the barline.
    track('Lead', 'piano-sampler', [
      [72, 0, 480],
      [76, 480, 480],
      [79, 960, 480],
      [81, 1440, 480],
      [82, BAR, BAR * 1.5],
    ]),
    // Grand staff: a low bass note under a treble chord.
    track('Piano', 'piano-sampler', [
      [36, 0, BAR],
      [64, 0, BAR],
      [67, 0, BAR],
      [72, 0, BAR],
    ]),
    track('Drums', 'drum-machine', [
      [36, 0, 0],
      [38, 480, 0],
      [42, 960, 0],
    ]),
  ],
  rootNote: 0,
  mode: 'ionian',
  timeSignature: [4, 4],
});

const xml = buildScoreXml(
  parts.map(({ id, name, score }) => ({
    id,
    name,
    score,
    drums: score.staves.includes('percussion'),
  })),
  {
    title: 'Test & Song',
    composer: 'Aaron',
    bpm: 96,
    chordRegions: [
      {
        id: 'r1',
        startTick: 0,
        endTick: BAR,
        name: '1 maj',
        noteName: 'C maj',
      },
      {
        id: 'r2',
        startTick: BAR,
        endTick: BAR * 2,
        name: '5 dom13',
        noteName: 'G dom13',
      },
    ] as ChordRegion[],
    articulations: new Map([
      [
        parts[0].score.measures[0].staves.treble[0].items[0].keys[0].noteId,
        ['staccato'],
      ],
    ]),
    sections: [{ measureIdx: 0, label: 'Verse' }],
    repeats: [{ startMeasure: 0, endMeasure: 1 }],
  },
);

const count = (pattern: RegExp) => (xml.match(pattern) ?? []).length;

describe('buildScoreXml', () => {
  it('writes every part', () => {
    expect(count(/<score-part id=/g)).toBe(3);
    expect(count(/<part id=/g)).toBe(3);
    expect(xml).toContain('<part-name>Drums</part-name>');
    expect(xml).toContain('<work-title>Test &amp; Song</work-title>');
    expect(xml).toContain('<creator type="composer">Aaron</creator>');
  });

  it('writes pitches, a tie across the barline, and the key', () => {
    expect(xml).toContain('<pitch><step>C</step><octave>5</octave></pitch>');
    expect(xml).toContain(
      '<pitch><step>B</step><alter>-1</alter><octave>5</octave></pitch>',
    );
    expect(count(/<tie type="start"\/>/g)).toBeGreaterThan(0);
    expect(count(/<tie type="start"\/>/g)).toBe(count(/<tie type="stop"\/>/g));
    expect(xml).toContain('<fifths>0</fifths>');
  });

  it('writes the piano on a two-staff grand staff', () => {
    expect(xml).toContain('<staves>2</staves>');
    expect(xml).toContain(
      '<clef number="2"><sign>F</sign><line>4</line></clef>',
    );
    expect(xml).toContain('<staff>2</staff>');
    expect(count(/<backup>/g)).toBeGreaterThan(0);
  });

  it('writes drums as unpitched notes on a percussion clef', () => {
    expect(xml).toContain('<sign>percussion</sign>');
    expect(count(/<unpitched>/g)).toBeGreaterThanOrEqual(3);
    expect(xml).toContain('<notehead>x</notehead>');
  });

  it('writes chart chord symbols, not internal quality words', () => {
    expect(xml).toContain('<kind>major</kind>');
    expect(xml).toContain('<kind text="13">dominant-13th</kind>');
    expect(xml).not.toMatch(/text="maj"|text="dom13"/);
  });

  it('carries the Score markings: staccato, rehearsal mark, repeat', () => {
    expect(xml).toContain('<articulations><staccato/></articulations>');
    expect(xml).toContain('<rehearsal>Verse</rehearsal>');
    expect(xml).toContain('<repeat direction="forward"/>');
    expect(xml).toContain('<repeat direction="backward"/>');
  });

  it('keeps every measure the same length in every voice', () => {
    for (const part of xml.split('<part id=').slice(1)) {
      for (const measure of part.split('<measure ').slice(1)) {
        const voices = measure.split(/<backup>.*?<\/backup>/);
        for (const voice of voices) {
          const notes =
            voice.match(
              /<note>(?:(?!<\/note>).)*<\/note>|<forward>.*?<\/forward>/g,
            ) ?? [];
          const total = notes
            .filter((n) => !n.includes('<chord/>'))
            .reduce(
              (sum, n) => sum + Number(/<duration>(\d+)</.exec(n)?.[1] ?? 0),
              0,
            );
          expect(total).toBe(BAR);
        }
      }
    }
  });
});

// ── Slur numbers and layout marks (1.11 e2) ────────────────────────────────
// MusicXML numbers slurs 1–16. They used to be numbered by their place in the
// list, so a song with seventeen slurs wrote number="17", and two slurs on
// one note shared a Map entry (leadsheet-33). Run:
// npx vitest run src/daw/midi/__tests__/scoreMusicXml.test.ts

describe('buildScoreXml slurs and marks', () => {
  // Eight bars of eighth notes in 3/4: 48 notes, C to B and round again.
  const PITCHES = [60, 62, 64, 65, 67, 69, 71];
  const NOTE_COUNT = 48;
  const EIGHTH = 240;
  const melody = track(
    'Mel',
    'piano-sampler',
    Array.from({ length: NOTE_COUNT }, (_, i) => [
      PITCHES[i % PITCHES.length],
      i * EIGHTH,
      EIGHTH,
    ]),
  );
  const [part] = buildScoreParts({
    tracks: [melody],
    rootNote: 0,
    mode: 'ionian',
    timeSignature: [3, 4],
  });
  const id = (i: number) =>
    noteKey('Mel', 'Mel-c', i * EIGHTH, PITCHES[i % PITCHES.length]);
  const write = (
    slurs: (readonly [string, string])[],
    more: Partial<Parameters<typeof buildScoreXml>[1]> = {},
  ) =>
    buildScoreXml(
      [{ id: part.id, name: part.name, score: part.score, drums: false }],
      { title: 'Slurs', bpm: 90, slurs, ...more },
    );
  const slurTags = (out: string) =>
    [...out.matchAll(/<slur type="(start|stop)" number="(\d+)"\/>/g)].map(
      ([, type, n]) => ({ type, number: Number(n) }),
    );

  it('reuses numbers 1–16 for twenty slurs one after another', () => {
    const slurs = Array.from(
      { length: 20 },
      (_, i) => [id(i * 2), id(i * 2 + 1)] as const,
    );
    const tags = slurTags(write(slurs));

    expect(tags).toHaveLength(40);
    expect(Math.max(...tags.map((t) => t.number))).toBeLessThanOrEqual(16);
    // Each slur opens and closes before the next: all of them are number 1.
    expect(new Set(tags.map((t) => t.number))).toEqual(new Set([1]));
  });

  it('gives overlapping slurs, and two on one note, numbers of their own', () => {
    const tags = slurTags(
      write([
        [id(0), id(5)],
        [id(0), id(3)],
        [id(2), id(8)],
      ]),
    );
    // Written in note order: two starts at 0, one at 2, then the stops.
    expect(tags).toEqual([
      { type: 'start', number: 1 },
      { type: 'start', number: 2 },
      { type: 'start', number: 3 },
      { type: 'stop', number: 2 },
      { type: 'stop', number: 1 },
      { type: 'stop', number: 3 },
    ]);
  });

  it('never writes more than sixteen open at once', () => {
    // Twenty slurs all open over the same stretch.
    const slurs = Array.from(
      { length: 20 },
      (_, i) => [id(i), id(NOTE_COUNT - 1)] as const,
    );
    const tags = slurTags(write(slurs));
    expect(tags.every((t) => t.number >= 1 && t.number <= 16)).toBe(true);
    const starts = tags.filter((t) => t.type === 'start');
    const stops = tags.filter((t) => t.type === 'stop');
    expect(starts).toHaveLength(16);
    expect(stops).toHaveLength(16);
    expect(new Set(stops.map((t) => t.number)).size).toBe(16);
  });

  it('skips both ends of a slur left without a number, and leaks none', () => {
    // Sixteen slurs open over notes 0–20; a seventeenth (16→30) gets no
    // number. Its stop must not be written, nor take a number of its own.
    const slurs: (readonly [string, string])[] = [
      ...Array.from({ length: 16 }, (_, i) => [id(i), id(20)] as const),
      [id(16), id(30)] as const,
      // Opened after all sixteen close: it gets number 1 again.
      [id(32), id(34)] as const,
    ];
    const tags = slurTags(write(slurs));
    const starts = tags.filter((t) => t.type === 'start');
    const stops = tags.filter((t) => t.type === 'stop');
    expect(starts).toHaveLength(17);
    expect(stops).toHaveLength(17);
    expect(tags.slice(-2)).toEqual([
      { type: 'start', number: 1 },
      { type: 'stop', number: 1 },
    ]);
  });

  it('writes the metre, and system and page breaks on the bars marked', () => {
    const out = write([], {
      systemStarts: new Set([2, 4]),
      pageStarts: new Set([4, 6]),
    });
    expect(out).toContain('<time><beats>3</beats><beat-type>4</beat-type>');
    const measures = out.split('<measure ').slice(1);
    expect(measures).toHaveLength(8);
    const printOf = (m: number) =>
      /<print new-(system|page)="yes"\/>/.exec(measures[m])?.[1] ?? null;
    expect(measures.map((_, m) => printOf(m))).toEqual([
      null,
      null,
      'system',
      null,
      // A page break starts a system too: one print element, not two.
      'page',
      null,
      'page',
      null,
    ]);
  });
});
