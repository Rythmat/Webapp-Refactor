// @vitest-environment jsdom
import { cleanup } from '@testing-library/react';
import { Formatter } from 'vexflow/bravura';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { MidiNoteEvent } from '@prism/engine';
import type { StaffViewProps } from '@/components/notation/StaffView';
import {
  drawn,
  installStaffStubs,
  kept,
  markup,
  plain,
  primitives,
} from '@/components/notation/__tests__/staffHarness';
import { LETTER_PORTRAIT } from '@/lib/notation/pageLayout';
import type { Track } from '@/daw/store/tracksSlice';
import { buildScoreParts, ScorePartsCache } from '../../Score/scoreParts';

// ── The lead sheet engraves incrementally (score-06) ───────────────────────
// The lead sheet's staff is the Score's, with one part: the melody track, as
// buildScoreParts writes it, laid onto a page with the roadmap's breaks,
// repeats, a multi-bar rest and slash notes. These check the incremental
// path draws it exactly as the original one does, and that a melody edit
// redraws only the system it was made in.

installStaffStubs();
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const Q = 480;
const BAR = 4 * Q;

const ev = (note: number, startTick: number, durationTicks = Q) =>
  ({
    note,
    startTick,
    durationTicks,
    velocity: 100,
    channel: 0,
  }) as MidiNoteEvent;

/** A 24-bar melody: rests in bars 8–11, a note tied over bar 4's barline. */
function melody(edit?: { bar: number; note: number }): MidiNoteEvent[] {
  const out: MidiNoteEvent[] = [];
  for (let bar = 0; bar < 24; bar++) {
    if (bar >= 8 && bar < 12) continue;
    const t = bar * BAR;
    const first = edit?.bar === bar ? edit.note : 72 + (bar % 5);
    if (bar !== 4) out.push(ev(first, t));
    out.push(ev(74 + (bar % 3), t + Q, Q / 2));
    out.push(ev(76, t + 1.5 * Q, Q / 2));
    out.push(ev(79 - (bar % 4), t + 3 * Q, bar === 3 ? 2 * Q : Q));
  }
  return out;
}

const track = (events: MidiNoteEvent[]): Track =>
  ({
    id: 'melody',
    name: 'Melody',
    type: 'midi',
    instrument: 'piano-sampler',
    color: '#fff',
    trackRole: 'auto',
    midiClips: [{ id: 'clip', startTick: 0, events }],
    audioClips: [],
  }) as unknown as Track;

// Bars 5 and 6 written as slashes, as the lead sheet's slash tool leaves them.
const slashNotes = new Set(
  [5, 6].flatMap((bar) => [
    `melody:clip:${bar * BAR + Q}:${74 + (bar % 3)}`,
    `melody:clip:${bar * BAR + 1.5 * Q}:76`,
  ]),
);

/** The melody's part, as LeadSheetScoreView builds it. */
function build(t: Track, cache?: ScorePartsCache) {
  return buildScoreParts({
    tracks: [t],
    rootNote: 2,
    mode: 'ionian',
    timeSignature: [4, 4],
    slashNotes,
    // The chart runs past the melody.
    minMeasures: 26,
    ...(cache ? { cache } : {}),
  });
}

/** The parts the staff is handed. */
const staffParts = (built: ReturnType<typeof build>) =>
  built.map(({ id, name, score }) => ({ id, name, score }));

/** The staff props useScoreEditing hands the lead sheet, with a roadmap. */
const sheetProps = {
  page: LETTER_PORTRAIT,
  measuresPerSystem: 4,
  systemMarks: {
    breaks: new Set([6]),
    runs: new Map([[16, 3]]),
    pageBreaks: new Set([12]),
  },
  repeatStarts: new Set([4]),
  repeatEnds: new Set([7]),
  headroom: 22 + 22 + 16,
  multiRests: new Map([[8, 4]]),
} satisfies Partial<StaffViewProps>;

describe('the lead sheet staff', () => {
  it('draws the same music and layout through the incremental path', async () => {
    const parts = staffParts(build(track(melody())));
    expect(parts).toHaveLength(1);
    // Slashes are written, and bars 9–11 go under the multi-bar rest.
    expect(JSON.stringify(parts[0].score)).toContain('"slash":true');
    const original = await drawn({ parts, ...sheetProps });
    const before = {
      svg: primitives(original.svg()),
      layout: plain(original.layout()),
    };
    expect(original.layout().measures.length).toBe(26 - 3);
    cleanup();

    const incremental = await drawn({
      parts,
      ...sheetProps,
      incremental: true,
    });
    expect(incremental.systems().length).toBeGreaterThan(4);
    expect(primitives(incremental.svg())).toEqual(before.svg);
    expect(plain(incremental.layout())).toEqual(before.layout);
  });

  it('keeps the part through a change that leaves the melody alone', () => {
    const cache = new ScorePartsCache();
    const melodyTrack = track(melody());
    const built = build(melodyTrack, cache);
    // A fader move: a new track object, the same clips.
    expect(build({ ...melodyTrack, volume: 0.2 } as Track, cache)).toBe(built);
    // A note edit replaces the clip array, and with it the part's score.
    const edited = build(track(melody({ bar: 18, note: 60 })), cache);
    expect(edited[0].score).not.toBe(built[0].score);
  });

  it('redraws only the system a melody edit was made in', async () => {
    const cache = new ScorePartsCache();
    const parts = staffParts(build(track(melody()), cache));
    const view = await drawn({ parts, ...sheetProps, incremental: true });
    const systems = view.systems();

    const measured = vi.spyOn(Formatter.prototype, 'preCalculateMinTotalWidth');
    const formatted = vi.spyOn(Formatter.prototype, 'format');
    const edited = staffParts(
      build(track(melody({ bar: 18, note: 60 })), cache),
    );
    await view.redraw({ parts: edited, ...sheetProps, incremental: true });

    // Bar 19 sits in the run of three that starts at bar 17: that system
    // alone is drawn again, and only the edited bar is measured.
    const after = kept(systems, view.systems());
    expect(after.filter((same) => !same)).toHaveLength(1);
    expect(measured).toHaveBeenCalledTimes(1);
    expect(formatted).toHaveBeenCalledTimes(3);

    // What it left is exactly what a fresh engraving of the edit draws.
    const page = markup(view.svg());
    cleanup();
    const fresh = await drawn({
      parts: edited,
      ...sheetProps,
      incremental: true,
    });
    expect(page).toBe(markup(fresh.svg()));
  });
});
