import { describe, expect, it } from 'vitest';
import type { MidiNoteEvent } from '@prism/engine';
import type { NotationScore, StaffId } from '@/lib/notation';
import type { Track } from '@/daw/store/tracksSlice';
import { buildScoreXml } from '@/daw/midi/ScoreMusicXmlExport';
import { melodyScoreParts } from '../LeadSheet/leadSheetMelody';
import {
  buildScoreParts,
  ScorePartsCache,
  type ScoreBuildOptions,
  type ScoreTrackPart,
} from './scoreParts';

// ── A part's staff never follows its notes ─────────────────────────────────
// The staff comes from the instrument, or the part's own setting
// (partStaff.ts). Notes written far off it take ledger lines; a grand
// staff shares them out by the usual split; a kit keeps its drum staff.

const ev = (note: number, startTick: number, durationTicks = 480) =>
  ({
    note,
    startTick,
    durationTicks,
    velocity: 100,
    channel: 0,
  }) as MidiNoteEvent;

const track = (
  id: string,
  instrument: string,
  events: MidiNoteEvent[],
  extra: Partial<Track> = {},
): Track =>
  ({
    id,
    name: id,
    type: 'midi',
    instrument,
    color: '#fff',
    trackRole: 'auto',
    volume: 0.8,
    midiClips: [{ id: `${id}-c`, startTick: 0, events }],
    audioClips: [],
    ...extra,
  }) as unknown as Track;

const base: Omit<ScoreBuildOptions, 'tracks'> = {
  rootNote: 0,
  mode: 'ionian',
  timeSignature: [4, 4],
  includeEmpty: true,
};

const build = (tracks: Track[]) => buildScoreParts({ ...base, tracks });

/** The MIDI pitches written on each staff of a part. */
function pitchesOn(score: NotationScore): Partial<Record<StaffId, number[]>> {
  const out: Partial<Record<StaffId, number[]>> = {};
  for (const staff of score.staves) {
    out[staff] = score.measures.flatMap((measure) =>
      (measure.staves[staff] ?? []).flatMap((voice) =>
        voice.items.flatMap((item) =>
          item.kind === 'note' && !item.tieFromPrev
            ? item.keys.map((key) => key.midi)
            : [],
        ),
      ),
    );
  }
  return out;
}

/** Writes `notes` one at a time, as note input does, and the staves each time. */
function stavesWhileWriting(
  instrument: string,
  notes: number[],
  extra: Partial<Track> = {},
): StaffId[][] {
  const cache = new ScorePartsCache();
  const seen: StaffId[][] = [];
  const events: MidiNoteEvent[] = [];
  const write = () => {
    const [part] = cache.build({
      ...base,
      tracks: [track('part', instrument, [...events], extra)],
    });
    seen.push(part.score.staves);
  };
  write();
  notes.forEach((note, i) => {
    events.push(ev(note, i * 480));
    write();
  });
  return seen;
}

describe('writing notes one by one', () => {
  it('keeps an empty bass part in bass clef, high notes and all', () => {
    // C2, then up past the treble staff: ledger lines, not a new clef.
    const seen = stavesWhileWriting('bass-electric', [36, 60, 72, 84, 96]);
    expect(seen).toEqual(seen.map(() => ['bass']));
  });

  it('keeps a treble part in treble clef, however low it goes', () => {
    const seen = stavesWhileWriting(
      'soundfont',
      [76, 55, 40, 28],
      { gmProgram: 56 }, // a trumpet
    );
    expect(seen).toEqual(seen.map(() => ['treble']));
  });

  it('keeps a lead synth in treble clef', () => {
    const seen = stavesWhileWriting('oracle-synth', [36, 30, 33], {
      name: 'Lead',
    });
    expect(seen).toEqual(seen.map(() => ['treble']));
  });

  it('keeps a keyboard on its grand staff from the first note', () => {
    const seen = stavesWhileWriting('electric-piano', [72, 74, 76]);
    expect(seen).toEqual(seen.map(() => ['treble', 'bass']));
  });

  it('keeps a kit on its drum staff', () => {
    const cache = new ScorePartsCache();
    const kit = (events: MidiNoteEvent[]) =>
      cache.build({ ...base, tracks: [track('kit', 'drum-machine', events)] });
    // A kit with nothing written stays out, as it always has.
    expect(kit([])).toEqual([]);
    expect(kit([ev(36, 0)])[0].score.staves).toEqual(['percussion']);
    expect(kit([ev(36, 0), ev(38, 480), ev(42, 960)])[0].score.staves).toEqual([
      'percussion',
    ]);
  });
});

describe('notes far from the staff', () => {
  it('are written on the part’s one staff', () => {
    const [bass] = build([
      track('bass', 'bass-electric', [ev(28, 0), ev(84, 480), ev(96, 960)]),
    ]);
    expect(pitchesOn(bass.score)).toEqual({ bass: [28, 84, 96] });
  });

  it('are shared out on a grand staff by the usual split', () => {
    const [piano] = build([
      track('piano', 'piano-sampler', [
        ev(36, 0),
        ev(84, 480),
        // A chord of four within a hand's reach stays in one clef.
        ev(55, 960),
        ev(59, 960),
        ev(62, 960),
        ev(65, 960),
      ]),
    ]);
    expect(piano.score.staves).toEqual(['treble', 'bass']);
    expect(pitchesOn(piano.score)).toEqual({
      treble: [84, 55, 59, 62, 65],
      bass: [36],
    });
  });
});

describe("a part's setting", () => {
  const keys = track('keys', 'electric-piano', [ev(72, 0), ev(48, 480)]);

  it('writes the part on the staff it names', () => {
    const on = (notationStaff: Track['notationStaff']) =>
      build([{ ...keys, notationStaff }])[0].score.staves;
    expect(on(undefined)).toEqual(['treble', 'bass']);
    expect(on('auto')).toEqual(['treble', 'bass']);
    expect(on('treble')).toEqual(['treble']);
    expect(on('bass')).toEqual(['bass']);
    expect(on('grand')).toEqual(['treble', 'bass']);
  });

  it('rebuilds the part it changes, and only that one, from the cache', () => {
    const cache = new ScorePartsCache();
    const bass = track('bass', 'bass-electric', [ev(40, 0)]);
    const before = cache.build({ ...base, tracks: [keys, bass] });
    const after = cache.build({
      ...base,
      tracks: [{ ...keys, notationStaff: 'treble' }, bass],
    });
    expect(after[0].score.staves).toEqual(['treble']);
    expect(after[0]).not.toBe(before[0]);
    expect(after[1]).toBe(before[1]);
    // And back to Auto: the grand staff again.
    const back = cache.build({
      ...base,
      tracks: [{ ...keys, notationStaff: undefined }, bass],
    });
    expect(back[0].score.staves).toEqual(['treble', 'bass']);
  });

  it('cannot move a kit off its drum staff', () => {
    const [kit] = build([
      track('kit', 'drum-machine', [ev(36, 0)], { notationStaff: 'treble' }),
    ]);
    expect(kit.score.staves).toEqual(['percussion']);
  });
});

describe('the Lead Sheet’s melody staves', () => {
  it('follow the same instrument rule and setting', () => {
    const tracks = [
      track('lead', 'oracle-synth', [ev(72, 0)], { name: 'Lead' }),
      track('bass', 'bass-electric', [ev(40, 0)]),
      track('keys', 'piano-sampler', []),
    ];
    const staves = (list: Track[]) =>
      melodyScoreParts(list, base).map((part) => part.score.staves);
    expect(staves(tracks)).toEqual([['treble'], ['bass'], ['treble', 'bass']]);
    expect(
      staves([tracks[0], tracks[1], { ...tracks[2], notationStaff: 'treble' }]),
    ).toEqual([['treble'], ['bass'], ['treble']]);
  });
});

describe('the MusicXML export', () => {
  const xmlOf = (parts: ScoreTrackPart[]) =>
    buildScoreXml(
      parts.map(({ id, name, score }) => ({
        id,
        name,
        score,
        drums: score.staves.includes('percussion'),
      })),
      { title: 'Clefs', bpm: 100 },
    );
  /** Each part's <attributes> block: its staves and clefs. */
  const attributesOf = (xml: string) =>
    [...xml.matchAll(/<part id="[^"]+">[\s\S]*?<\/attributes>/g)].map(
      ([block]) => ({
        staves: /<staves>(\d)<\/staves>/.exec(block)?.[1] ?? '1',
        clefs: [...block.matchAll(/<sign>(\w+)<\/sign>/g)].map((m) => m[1]),
      }),
    );

  it('writes each part on its instrument’s clef', () => {
    const xml = xmlOf(
      build([
        track('Keys', 'electric-piano', [ev(60, 0)]),
        track('Bass', 'soundfont', [ev(84, 0)], { gmProgram: 33 }),
        track('Lead', 'oracle-synth', [ev(40, 0)], { name: 'Lead' }),
        track('Cello', 'soundfont', [ev(48, 0)], { gmProgram: 42 }),
        track('Strings', 'soundfont', [ev(60, 0)], { gmProgram: 48 }),
        track('Drums', 'drum-machine', [ev(36, 0)]),
      ]),
    );
    expect(attributesOf(xml)).toEqual([
      { staves: '2', clefs: ['G', 'F'] },
      { staves: '1', clefs: ['F'] },
      { staves: '1', clefs: ['G'] },
      { staves: '1', clefs: ['F'] },
      { staves: '2', clefs: ['G', 'F'] },
      { staves: '1', clefs: ['percussion'] },
    ]);
  });

  it('writes a part on the staff it was set to', () => {
    const xml = xmlOf(
      build([
        track('Keys', 'electric-piano', [ev(60, 0)], { notationStaff: 'bass' }),
      ]),
    );
    expect(attributesOf(xml)).toEqual([{ staves: '1', clefs: ['F'] }]);
  });
});
