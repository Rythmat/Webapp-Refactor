import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { spellingMap } from '@/daw/components/Score/noteEditor';
import { breaksFromRowSizes } from '@/daw/components/Score/roadmap';
import {
  buildScoreParts,
  ScorePartsCache,
} from '@/daw/components/Score/scoreParts';
import { noteKey } from '@/daw/model/noteKeys';
import { leadSheetSectionsOf, useStore, type AllSlices } from '@/daw/store';
import type { ChordRegion } from '@/daw/store/prismSlice';
import type { Track } from '@/daw/store/tracksSlice';
import { chartExtraBars } from '@/daw/time/measureEdits';
import { timeSignatureOf } from '@/daw/time/timeModel';
import { buildLeadSheetXml } from '../MusicXmlExport';
import { buildScoreXml } from '../ScoreMusicXmlExport';
import {
  buildFullScoreXml,
  buildLeadSheetExport,
  buildLeadSheetMelodyExport,
} from '../scoreExport';

// ── Notation exports (milestone 2.15) ──────────────────────────────────────
// The full score is the file the Score page's button wrote before the move
// (built here the old way, as ScoreView did, and compared whole), a chosen
// track gives its part alone, and the lead sheet is the toolbar's file
// (chartExtraBars, the project's metre) plus the song's sections as
// rehearsal marks, which the toolbar's file left out. Run:
// npx vitest run src/daw/midi/__tests__/scoreExport.test.ts

const BAR = 1920;

const midiTrack = (
  id: string,
  name: string,
  instrument: string,
  events: [note: number, start: number, length: number][],
): Track =>
  ({
    id,
    name,
    type: 'midi',
    instrument,
    trackRole: 'auto',
    color: '#fff',
    audioClips: [],
    midiClips: [
      {
        id: `${id}-c`,
        startTick: 0,
        events: events.map(([note, startTick, durationTicks]) => ({
          note,
          startTick,
          durationTicks,
          velocity: 100,
          channel: 0,
        })),
      },
    ],
  }) as unknown as Track;

const audioTrack = {
  id: 'vox',
  name: 'Vox',
  type: 'audio',
  instrument: 'none',
  color: '#fff',
  midiClips: [],
  audioClips: [{ id: 'a1', startTick: 0, duration: BAR }],
} as unknown as Track;

const lead = midiTrack('lead', 'Lead', 'piano-sampler', [
  [72, 0, 480],
  [76, 480, 480],
  [79, 960, 480],
  [81, 1440, 480],
  [82, BAR, BAR * 1.5],
]);
const bass = midiTrack('bass', 'Bass Line', 'piano-sampler', [
  [36, 0, BAR],
  [43, BAR, BAR],
  [38, BAR * 2, BAR],
]);
const drums = midiTrack('drums', 'Drums', 'drum-machine', [
  [36, 0, 0],
  [38, 480, 0],
  [42, 960, 0],
]);
const empty = midiTrack('empty', 'Empty', 'piano-sampler', []);

const chords = [
  {
    id: 'r1',
    startTick: 0,
    endTick: BAR,
    name: '1 maj',
    noteName: 'C maj',
    color: [0, 0, 0],
  },
  {
    id: 'r2',
    startTick: BAR,
    endTick: BAR * 2,
    name: '5 dom7',
    noteName: 'G dom7',
    color: [0, 0, 0],
  },
] as ChordRegion[];

const k = (track: Track, tick: number, midi: number) =>
  noteKey(track.id, `${track.id}-c`, tick, midi);

function fixture(over: Partial<AllSlices> = {}): AllSlices {
  return {
    ...useStore.getInitialState(),
    projectName: 'Night Drive',
    composerName: 'Ann Lee',
    bpm: 104,
    rootNote: 0,
    mode: 'ionian',
    timeSignatureNumerator: 4,
    timeSignatureDenominator: 4,
    tracks: [lead, audioTrack, bass, empty, drums],
    chordRegions: chords,
    scoreChordTracks: [],
    scoreArticulations: [
      `${k(lead, 0, 72)}|staccato`,
      `${k(lead, 0, 72)}|accent`,
      `${k(bass, 0, 36)}|tenuto`,
    ],
    scoreSlurs: [`${k(lead, 480, 76)}|${k(lead, 1440, 81)}`],
    scoreSlashNotes: [k(lead, 960, 79)],
    scoreSpellings: [`${k(lead, 1440, 81)}|Bbb5`],
    sections: [
      {
        id: 's1',
        type: 'verse',
        label: 'Verse',
        startTick: 0,
        endTick: BAR * 2,
      },
      {
        id: 's2',
        type: 'chorus',
        label: 'Chorus',
        startTick: BAR * 2,
        endTick: BAR * 6,
      },
    ] as AllSlices['sections'],
    leadSheetRepeats: [{ startMeasure: 0, endMeasure: 1 }],
    measureRowSizes: [2, 3],
    measuresPerLine: 4,
    leadSheetBars: null,
    ...over,
  };
}

/** ScoreView's exportMusicXml before 2.15, with the XML kept, not saved. */
function oldScoreViewXml(s: AllSlices): string {
  const scoreParts = buildScoreParts({
    tracks: s.tracks,
    rootNote: s.rootNote,
    mode: s.mode,
    timeSignature: [s.timeSignatureNumerator, s.timeSignatureDenominator],
    slashNotes: new Set(s.scoreSlashNotes),
    spellings: spellingMap(s.scoreSpellings),
    cache: new ScorePartsCache(),
  });
  const articulations = new Map<string, string[]>();
  for (const entry of s.scoreArticulations) {
    const cut = entry.lastIndexOf('|');
    const id = entry.slice(0, cut);
    articulations.set(id, [
      ...(articulations.get(id) ?? []),
      entry.slice(cut + 1),
    ]);
  }
  const measureCount = Math.max(
    0,
    ...scoreParts.map((p) => p.score.measures.length),
  );
  return buildScoreXml(
    scoreParts.map(({ id, name, score }) => ({
      id,
      name,
      score,
      drums: score.staves.includes('percussion'),
    })),
    {
      title: s.projectName,
      composer: s.composerName || undefined,
      bpm: s.bpm,
      chordRegions: s.chordRegions,
      chordPartIds: new Set(s.scoreChordTracks),
      articulations,
      slurs: s.scoreSlurs.map((pair) => {
        const cut = pair.indexOf('|');
        return [pair.slice(0, cut), pair.slice(cut + 1)] as const;
      }),
      sections: leadSheetSectionsOf(s),
      repeats: s.leadSheetRepeats,
      systemStarts: breaksFromRowSizes(
        s.measureRowSizes,
        s.measuresPerLine || 4,
        measureCount,
      ),
    },
  );
}

const count = (xml: string, tag: string) => xml.split(tag).length - 1;

beforeAll(() => {
  // The XML carries the day it was written; both builds see the same one.
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-17T12:00:00Z'));
});
afterAll(() => {
  vi.useRealTimers();
});

describe('buildFullScoreXml', () => {
  it('writes exactly what the Score page wrote before', () => {
    const state = fixture();
    const file = buildFullScoreXml(state)!;
    expect(file.xml).toBe(oldScoreViewXml(state));
    expect(file.filename).toBe('night-drive-score.musicxml');
    // The fixture exercises what the move had to carry over.
    for (const tag of [
      '<harmony',
      '<staccato/>',
      '<tenuto/>',
      '<slur type="start"',
      '<rehearsal>Verse</rehearsal>',
      '<repeat direction="forward"/>',
      '<print new-system="yes"/>',
      '<creator type="composer">Ann Lee</creator>',
    ]) {
      expect(file.xml).toContain(tag);
    }
    expect(count(file.xml, '<score-part ')).toBe(3);
  });

  it('matches the old path with chosen chord tracks and no key too', () => {
    for (const over of [
      { scoreChordTracks: ['bass'] },
      { rootNote: null, composerName: '', measureRowSizes: null },
    ] as Partial<AllSlices>[]) {
      const state = fixture(over);
      expect(buildFullScoreXml(state)!.xml).toBe(oldScoreViewXml(state));
    }
  });

  it("gives one track's part alone, over the whole song's bars", () => {
    const state = fixture();
    const full = buildFullScoreXml(state)!.xml;
    const file = buildFullScoreXml(state, { trackIds: ['bass'] })!;

    expect(file.filename).toBe('night-drive-bass-line.musicxml');
    expect(count(file.xml, '<score-part ')).toBe(1);
    expect(file.xml).toContain('<part-name>Bass Line</part-name>');
    // The same bar count as each part of the full score.
    expect(count(file.xml, '<measure ')).toBe(count(full, '<measure ') / 3);
    // Its own marks come along; the tempo goes on it as the top part.
    expect(file.xml).toContain('<tenuto/>');
    expect(file.xml).not.toContain('<staccato/>');
    expect(file.xml).toContain('<per-minute>104</per-minute>');
  });

  it('keeps chord symbols only on the parts that carry them in the full score', () => {
    // No chord tracks chosen: the full score's top part (Lead) carries them.
    const state = fixture();
    expect(buildFullScoreXml(state, { trackIds: ['bass'] })!.xml).not.toContain(
      '<harmony',
    );
    expect(buildFullScoreXml(state, { trackIds: ['lead'] })!.xml).toContain(
      '<harmony',
    );
    // Bass chosen as the chord track: its part carries them, Lead's doesn't.
    const chosen = fixture({ scoreChordTracks: ['bass'] });
    expect(buildFullScoreXml(chosen, { trackIds: ['bass'] })!.xml).toContain(
      '<harmony',
    );
    expect(
      buildFullScoreXml(chosen, { trackIds: ['lead'] })!.xml,
    ).not.toContain('<harmony');
    // Two parts: the symbols stay over Bass only, written once.
    const two = buildFullScoreXml(chosen, { trackIds: ['lead', 'bass'] })!;
    expect(count(two.xml, '<harmony')).toBe(chords.length);
    expect(two.filename).toBe('night-drive-score.musicxml');
  });

  it('is null when no chosen part has notes', () => {
    expect(
      buildFullScoreXml(fixture({ tracks: [audioTrack, empty] })),
    ).toBeNull();
    expect(buildFullScoreXml(fixture(), { trackIds: ['vox'] })).toBeNull();
    expect(buildFullScoreXml(fixture(), { trackIds: ['empty'] })).toBeNull();
    expect(buildFullScoreXml(fixture(), { trackIds: [] })).toBeNull();
  });
});

describe('buildLeadSheetExport', () => {
  /** LeadSheetToolbar's handleExportMusicXml before 2.15. */
  const toolbarXml = (s: AllSlices) =>
    buildLeadSheetXml(s.chordRegions, {
      title: s.projectName,
      bpm: s.bpm,
      rootNote: s.rootNote,
      mode: s.mode,
      timeSignature: timeSignatureOf(s),
      extraBars: chartExtraBars(
        s.leadSheetBars,
        s.sections,
        timeSignatureOf(s),
      ),
    });

  /** The rehearsal marks the toolbar's file didn't have, taken out. */
  const withoutMarks = (xml: string) =>
    xml.replace(
      /\n {6}<direction placement="above">\n {8}<direction-type>\n {10}<rehearsal>[^<]*<\/rehearsal>\n {8}<\/direction-type>\n {6}<\/direction>/g,
      '',
    );

  it("writes the toolbar's chart, as long as the song's sections run", () => {
    const state = fixture();
    const file = buildLeadSheetExport(state)!;
    // The toolbar's file, deliberately no longer byte-equal: the sections
    // are written as rehearsal marks, and nothing else differs.
    expect(file.xml).not.toBe(toolbarXml(state));
    expect(withoutMarks(file.xml)).toBe(toolbarXml(state));
    expect(file.filename).toBe('night-drive-lead-sheet.musicxml');
    // Six bars: the Chorus runs to bar 6, past the last chord (bar 2).
    expect(count(file.xml, '<measure ')).toBe(6);
    // Project ▾'s old export (extraBars = leadSheetBars) stopped at bar 2.
    const old = buildLeadSheetXml(state.chordRegions, {
      title: state.projectName,
      bpm: state.bpm,
      rootNote: state.rootNote,
      mode: state.mode,
      timeSignature: timeSignatureOf(state),
      extraBars: state.leadSheetBars,
    });
    expect(count(old, '<measure ')).toBeLessThan(6);
  });

  it("marks each section at the bar it starts, as the Score's export does", () => {
    const xml = buildLeadSheetExport(
      fixture({
        sections: [
          ...fixture().sections,
          {
            id: 's3',
            type: 'bridge',
            label: 'Bridge & Out',
            startTick: BAR * 6,
            endTick: BAR * 7,
          },
        ] as AllSlices['sections'],
      }),
    )!.xml;
    const measures = xml.split('<measure ').slice(1);
    const marks = measures.map(
      (m) => /<rehearsal>([^<]*)<\/rehearsal>/.exec(m)?.[1] ?? null,
    );
    expect(marks).toEqual([
      'Verse',
      null,
      'Chorus',
      null,
      null,
      null,
      'Bridge &amp; Out',
    ]);
    // The same marks the full score carries.
    const score = buildFullScoreXml(fixture())!.xml;
    expect(count(score, '<rehearsal>')).toBe(2);
  });

  it('keeps added bars and the metre', () => {
    const state = fixture({
      leadSheetBars: 8,
      sections: [],
      timeSignatureNumerator: 3,
      timeSignatureDenominator: 4,
    });
    const file = buildLeadSheetExport(state)!;
    expect(file.xml).toBe(toolbarXml(state));
    expect(file.xml).toContain('<beats>3</beats>');
  });

  it('is null without chords, and names an unnamed song "mixdown"', () => {
    expect(buildLeadSheetExport(fixture({ chordRegions: [] }))).toBeNull();
    expect(buildLeadSheetExport(fixture({ projectName: '' }))!.filename).toBe(
      'mixdown-lead-sheet.musicxml',
    );
  });
});

// ── The lead sheet with its melody, and the Score's breaks (1.11 e2) ───────
// In melody mode the toolbar used to write the chord chart (chords over
// slash rests) and leave the melody out (leadsheet-10). The Score's own
// system and page breaks weren't written (score-13).

describe('buildLeadSheetMelodyExport', () => {
  it('writes the melody as one part under the chords, as long as the chart', () => {
    const file = buildLeadSheetMelodyExport(fixture(), 'lead')!;
    expect(file.filename).toBe('night-drive-lead-sheet.musicxml');
    expect(count(file.xml, '<score-part ')).toBe(1);
    expect(file.xml).toContain('<part-name>Lead</part-name>');
    // The melody's notes, not slash rests: C5 on the downbeat.
    expect(file.xml).toContain(
      '<pitch><step>C</step><octave>5</octave></pitch>',
    );
    // The chords stand over it even though no Score part was chosen for them.
    expect(count(file.xml, '<harmony')).toBe(2);
    // Six bars, as the chart runs (the Chorus ends at bar 6).
    expect(count(file.xml, '<measure ')).toBe(6);
    expect(file.xml).toContain('<rehearsal>Verse</rehearsal>');
    expect(file.xml).toContain('<beats>4</beats>');
  });

  it("is in the project's metre and key", () => {
    const xml = buildLeadSheetMelodyExport(
      fixture({
        timeSignatureNumerator: 3,
        timeSignatureDenominator: 4,
        rootNote: 7,
      }),
      'lead',
    )!.xml;
    expect(xml).toContain('<time><beats>3</beats><beat-type>4</beat-type>');
    expect(xml).toContain('<key><fifths>1</fifths></key>');
  });

  it('is null for a track without notes', () => {
    expect(buildLeadSheetMelodyExport(fixture(), 'empty')).toBeNull();
    expect(buildLeadSheetMelodyExport(fixture(), 'nope')).toBeNull();
  });
});

describe("buildFullScoreXml's breaks", () => {
  it("writes the Score's system breaks, made systems and page breaks", () => {
    const xml = buildFullScoreXml(
      fixture({
        measureRowSizes: null,
        measuresPerLine: 99,
        scoreSystemBreaks: [1],
        scoreSystemRuns: [[2, 1]],
        scorePageBreaks: [3],
      }),
    )!.xml;
    const top = xml.split('<part id=')[1];
    const printOf = (m: string) =>
      /<print new-(system|page)="yes"\/>/.exec(m)?.[1] ?? null;
    const marks = top.split('<measure ').slice(1).map(printOf);
    expect(marks.slice(0, 4)).toEqual([null, 'system', 'system', 'page']);
  });
});
