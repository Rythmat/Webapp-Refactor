import { describe, expect, it } from 'vitest';
import { buildScoreParts } from '@/daw/components/Score/scoreParts';
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
