import { describe, expect, it } from 'vitest';
import type { MidiClip } from '@/daw/store/tracksSlice';
import { clipAt, resolveEditorClip, type EditorClipState } from '../editorClip';

// ── Which clip a note editor edits ─────────────────────────────────────────
// The selected clip on the track, then the clip under the (parked)
// playhead, then the first clip (dock-instruments-03, -10).

const BAR = 1920;
const clip = (id: string, bar: number, bars = 4): MidiClip => ({
  id,
  startTick: bar * BAR,
  durationTicks: bars * BAR,
  events: [],
});

const drums = {
  id: 'drums',
  midiClips: [clip('a', 0), clip('b', 4), clip('c', 8)],
};
const keys = { id: 'keys', midiClips: [clip('k', 0)] };

const state = (over: Partial<EditorClipState> = {}): EditorClipState => ({
  tracks: [drums, keys],
  selectedClipId: null,
  selectedClipTrackId: null,
  position: 0,
  ...over,
});

describe('resolveEditorClip', () => {
  it('takes the selected clip on the track', () => {
    const s = state({ selectedClipId: 'c', selectedClipTrackId: 'drums' });
    expect(resolveEditorClip(s, 'drums')?.id).toBe('c');
  });

  it('ignores a clip selected on another track', () => {
    const s = state({
      selectedClipId: 'k',
      selectedClipTrackId: 'keys',
      position: 5 * BAR,
    });
    expect(resolveEditorClip(s, 'drums')?.id).toBe('b');
  });

  it('falls back to the clip under the playhead, then the first one', () => {
    expect(resolveEditorClip(state({ position: 9 * BAR }), 'drums')?.id).toBe(
      'c',
    );
    expect(resolveEditorClip(state({ position: 40 * BAR }), 'drums')?.id).toBe(
      'a',
    );
  });

  it('has nothing for a track without clips, or no track', () => {
    const empty = state({ tracks: [{ id: 'new', midiClips: [] }] });
    expect(resolveEditorClip(empty, 'new')).toBeNull();
    expect(resolveEditorClip(state(), null)).toBeNull();
  });
});

describe('clipAt', () => {
  it('picks the latest-starting clip over a tick, an unsized clip by its notes', () => {
    const unsized: MidiClip = {
      id: 'u',
      startTick: 2 * BAR,
      events: [
        {
          note: 60,
          velocity: 90,
          startTick: 0,
          durationTicks: BAR,
          channel: 0,
        },
      ],
    };
    expect(clipAt([clip('a', 0), unsized], 2 * BAR + 10)?.id).toBe('u');
    expect(clipAt([clip('a', 0), unsized], 3 * BAR + 10)?.id).toBe('a');
  });
});
