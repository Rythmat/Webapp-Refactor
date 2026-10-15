// @vitest-environment jsdom
import { cleanup } from '@testing-library/react';
import { Formatter } from 'vexflow/bravura';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  drawn,
  installStaffStubs,
  markup,
  plain,
  primitives,
} from '@/components/notation/__tests__/staffHarness';
import type { StaffViewProps } from '@/components/notation/StaffView';
import { buildScore, type NotationNoteInput } from '@/lib/notation';

// ── The piano roll's notation engraves incrementally (score-06) ────────────
// StudioNotationView draws the clip being edited as one part on one system,
// filling the panel: no page, no bars per line. These check the incremental
// path draws it exactly as the original one does, for a pitched clip and a
// drum clip, and that a note edit measures only the bar it was made in.

installStaffStubs();
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const Q = 480;
const BAR = 4 * Q;
/** The clip starts on the song's bar 3, as the view numbers it. */
const ORIGIN = 2 * BAR;

const note = (
  i: number,
  midi: number,
  startTick: number,
  durationTicks: number,
): NotationNoteInput => ({
  id: String(i),
  midi,
  startTick: ORIGIN + startTick,
  durationTicks,
});

/** Six bars: a chord, a note held over a barline, an empty bar, a run. */
function clip(edit?: { index: number; midi: number }): NotationNoteInput[] {
  const notes: NotationNoteInput[] = [];
  for (let bar = 0; bar < 6; bar++) {
    if (bar === 3) continue;
    const t = bar * BAR;
    notes.push(note(notes.length, 60 + bar, t, Q));
    notes.push(note(notes.length, 64 + bar, t, Q));
    notes.push(note(notes.length, 67, t + Q, Q / 2));
    notes.push(note(notes.length, 69, t + 1.5 * Q, Q / 2));
    notes.push(note(notes.length, 72 - bar, t + 3 * Q, bar === 1 ? 2 * Q : Q));
  }
  notes.push(note(notes.length, 40, 0, 2 * BAR));
  return edit
    ? notes.map((n, i) => (i === edit.index ? { ...n, midi: edit.midi } : n))
    : notes;
}

function drums(): NotationNoteInput[] {
  const notes: NotationNoteInput[] = [];
  for (let beat = 0; beat < 16; beat++) {
    notes.push(note(notes.length, beat % 2 ? 38 : 36, beat * Q, Q));
    notes.push(note(notes.length, 42, beat * Q + Q / 2, Q / 2));
  }
  return notes;
}

/** The score as StudioNotationView builds it, in D major. */
const scoreOf = (notes: NotationNoteInput[], percussion = false) =>
  buildScore(notes, {
    ticksPerQuarter: Q,
    timeSignature: [4, 4],
    originTick: ORIGIN,
    firstMeasureNumber: 3,
    minMeasures: 4,
    ...(percussion ? { staves: 'percussion' as const } : { keyFifths: 2 }),
  });

/** As GrandStaff hands it to the staff. */
const props = (score: ReturnType<typeof scoreOf>): StaffViewProps => ({
  parts: [{ id: 'part', score }],
});

describe('the piano roll notation', () => {
  it('draws the same music and layout through the incremental path', async () => {
    for (const score of [scoreOf(clip()), scoreOf(drums(), true)]) {
      const original = await drawn(props(score));
      const before = {
        svg: primitives(original.svg()),
        layout: plain(original.layout()),
      };
      cleanup();
      const incremental = await drawn({ ...props(score), incremental: true });
      expect(incremental.systems()).toHaveLength(1);
      expect(primitives(incremental.svg())).toEqual(before.svg);
      expect(plain(incremental.layout())).toEqual(before.layout);
      cleanup();
    }
  });

  it('measures only the bar a note edit was made in', async () => {
    const bars = scoreOf(clip()).measures.length;
    const view = await drawn({ ...props(scoreOf(clip())), incremental: true });

    const measured = vi.spyOn(Formatter.prototype, 'preCalculateMinTotalWidth');
    const formatted = vi.spyOn(Formatter.prototype, 'format');
    // The run in the clip's fifth bar (its 21st note) moves.
    const edited = scoreOf(clip({ index: 20, midi: 62 }));
    await view.redraw({ ...props(edited), incremental: true });

    // The one system is drawn again, but only the edited bar is measured:
    // the original path measures and formats every bar twice.
    expect(measured).toHaveBeenCalledTimes(1);
    expect(formatted).toHaveBeenCalledTimes(bars);

    const page = markup(view.svg());
    cleanup();
    const fresh = await drawn({ ...props(edited), incremental: true });
    expect(page).toBe(markup(fresh.svg()));
    const drawnFresh = primitives(fresh.svg());
    cleanup();
    const original = await drawn(props(edited));
    expect(drawnFresh).toEqual(primitives(original.svg()));
  });
});
