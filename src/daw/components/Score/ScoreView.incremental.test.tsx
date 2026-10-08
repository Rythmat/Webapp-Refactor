// @vitest-environment jsdom
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MidiNoteEvent } from '@prism/engine';
import type { StaffViewProps } from '@/components/notation/StaffView';

// ── The Score opts into incremental engraving (score-06) ────────────────────
// ScoreView hands StaffView `incremental`, and keeps its parts between
// builds: a change that leaves the music alone hands the staff the very same
// parts, and a note edit rebuilds only the part it was made in.

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
import { ScoreView } from './ScoreView';

const s = () => useStore.getState();
const ev = (note: number, startTick: number): MidiNoteEvent => ({
  note,
  startTick,
  durationTicks: 480,
  velocity: 100,
  channel: 0,
});

let lead = '';
let bass = '';

beforeEach(() => {
  h.staff = null;
  useStore.setState({ tracks: [], remoteUsers: new Map() });
  lead = s().addTrack('midi', 'piano-sampler', 'Lead');
  bass = s().addTrack('midi', 'bass-electric', 'Bass');
  s().addMidiClip(lead, {
    id: 'lead-clip',
    startTick: 0,
    events: [ev(72, 0), ev(74, 480)],
  });
  s().addMidiClip(bass, { id: 'bass-clip', startTick: 0, events: [ev(40, 0)] });
});
afterEach(cleanup);

describe('ScoreView', () => {
  it('engraves incrementally', () => {
    render(<ScoreView />);
    expect(h.staff!.incremental).toBe(true);
    expect(h.staff!.parts.map((p) => p.id)).toEqual([lead, bass]);
  });

  it('hands the staff the same parts after a fader move', () => {
    render(<ScoreView />);
    const parts = h.staff!.parts;
    act(() => s().updateTrack(bass, { volume: 0.2 }));
    expect(s().tracks.find((t) => t.id === bass)!.volume).toBe(0.2);
    expect(h.staff!.parts).toBe(parts);
  });

  it('rebuilds only the part a note edit was made in', () => {
    render(<ScoreView />);
    const parts = h.staff!.parts;
    act(() =>
      s().updateMidiClipEvents(lead, 'lead-clip', [ev(72, 0), ev(76, 480)]),
    );
    const next = h.staff!.parts;
    expect(next).not.toBe(parts);
    expect(next[0].score).not.toBe(parts[0].score);
    expect(next[1].score).toBe(parts[1].score);
  });
});
