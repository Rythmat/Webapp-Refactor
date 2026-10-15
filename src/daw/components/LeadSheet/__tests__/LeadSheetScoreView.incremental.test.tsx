// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MidiNoteEvent } from '@prism/engine';
import type { StaffViewProps } from '@/components/notation/StaffView';

// ── The lead sheet opts into incremental engraving (score-06) ──────────────
// LeadSheetScoreView hands StaffView `incremental` and keeps its part between
// builds, as ScoreView does: a change that leaves the melody alone hands the
// staff the very same parts. leadSheetIncremental.test.tsx checks the staff
// draws the lead sheet the same either way.

const h = vi.hoisted(() => ({ staff: null as StaffViewProps | null }));
vi.mock('@/components/notation/StaffView', () => ({
  // The palettes draw their cells in the music font; it never arrives here.
  loadVexFlow: () => new Promise(() => {}),
  StaffView: (props: StaffViewProps) => {
    h.staff = props;
    return null;
  },
}));
vi.mock('@/hooks/data/auth/useMe', () => ({
  useMe: () => ({ data: undefined }),
}));

import { useStore } from '@/daw/store';
import { LeadSheetScoreView } from '../LeadSheetScoreView';

const s = () => useStore.getState();
const ev = (note: number, startTick: number): MidiNoteEvent => ({
  note,
  startTick,
  durationTicks: 480,
  velocity: 100,
  channel: 0,
});

let lead = '';
const melody = () => s().tracks.find((t) => t.id === lead)!;

beforeEach(() => {
  h.staff = null;
  useStore.setState({ tracks: [], remoteUsers: new Map() });
  lead = s().addTrack('midi', 'piano-sampler', 'Lead');
  s().addMidiClip(lead, {
    id: 'lead-clip',
    startTick: 0,
    events: [ev(72, 0), ev(74, 480)],
  });
});
afterEach(cleanup);

describe('LeadSheetScoreView', () => {
  it('engraves incrementally', () => {
    render(<LeadSheetScoreView track={melody()} />);
    expect(h.staff!.incremental).toBe(true);
    expect(h.staff!.parts.map((p) => p.id)).toEqual([lead]);
  });

  it('hands the staff the same parts after a fader move', () => {
    const view = render(<LeadSheetScoreView track={melody()} />);
    const parts = h.staff!.parts;
    act(() => s().updateTrack(lead, { volume: 0.2 }));
    view.rerender(<LeadSheetScoreView track={melody()} />);
    expect(melody().volume).toBe(0.2);
    expect(h.staff!.parts).toBe(parts);
  });

  it('rebuilds the part after a note edit', () => {
    const view = render(<LeadSheetScoreView track={melody()} />);
    const parts = h.staff!.parts;
    act(() =>
      s().updateMidiClipEvents(lead, 'lead-clip', [ev(72, 0), ev(76, 480)]),
    );
    view.rerender(<LeadSheetScoreView track={melody()} />);
    expect(h.staff!.parts[0].score).not.toBe(parts[0].score);
  });
});
