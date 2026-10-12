import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useStore } from '@/daw/store';
import type { LiveAnalysisResult } from '@/unison/engine/liveAnalyzer';

// ── The live analysis bus writes the store only for a change ─────────────
// The detector runs at ~20 Hz; a chord or tuning that hasn't changed is not
// a store write (every write wakes autosave, collab and every selector).

beforeEach(() => {
  useStore.setState({
    liveChordStream: [],
    globalTuningCents: 0,
    liveAnalysis: null,
  });
});

function countWrites(run: () => void): number {
  const listener = vi.fn();
  const off = useStore.subscribe(listener);
  run();
  off();
  return listener.mock.calls.length;
}

describe('musicIntelligenceSlice writes', () => {
  it('adds a chord once, not once per frame', () => {
    const { pushLiveChord } = useStore.getState();
    const writes = countWrites(() => {
      pushLiveChord({ rootPc: 0, quality: 'major', confidence: 0.8 });
      pushLiveChord({ rootPc: 0, quality: 'major', confidence: 0.9 });
      pushLiveChord({ rootPc: 0, quality: 'major', confidence: 0.7 });
    });
    expect(writes).toBe(1);
    expect(useStore.getState().liveChordStream).toHaveLength(1);
  });

  it('adds each chord change, including a return to an earlier chord', () => {
    const { pushLiveChord } = useStore.getState();
    pushLiveChord({ rootPc: 0, quality: 'major', confidence: 0.8 });
    pushLiveChord({ rootPc: 7, quality: 'major', confidence: 0.8 });
    pushLiveChord({ rootPc: 0, quality: 'major', confidence: 0.8 });
    pushLiveChord({ rootPc: 0, quality: 'minor', confidence: 0.8 });
    expect(
      useStore.getState().liveChordStream.map((c) => [c.rootPc, c.quality]),
    ).toEqual([
      [0, 'major'],
      [7, 'major'],
      [0, 'major'],
      [0, 'minor'],
    ]);
  });

  it('keeps the stream array when the chord repeats', () => {
    const { pushLiveChord } = useStore.getState();
    pushLiveChord({ rootPc: 2, quality: 'minor', confidence: 0.8 });
    const stream = useStore.getState().liveChordStream;
    pushLiveChord({ rootPc: 2, quality: 'minor', confidence: 0.8 });
    expect(useStore.getState().liveChordStream).toBe(stream);
  });

  it('writes the tuning only when it changes', () => {
    const { setGlobalTuningCents } = useStore.getState();
    const writes = countWrites(() => {
      setGlobalTuningCents(0);
      setGlobalTuningCents(3);
      setGlobalTuningCents(3);
    });
    expect(writes).toBe(1);
    expect(useStore.getState().globalTuningCents).toBe(3);
  });

  it('keeps the live analysis when a new object says the same thing', () => {
    const key = { rootPc: 0 } as unknown as LiveAnalysisResult['key'];
    const enrichedChords: LiveAnalysisResult['enrichedChords'] = [];
    const first: LiveAnalysisResult = {
      key,
      enrichedChords,
      progressionMatch: null,
      windowSize: 3,
    };
    useStore.getState().setLiveAnalysis(first);
    const writes = countWrites(() =>
      useStore.getState().setLiveAnalysis({ ...first }),
    );
    expect(writes).toBe(0);
    expect(useStore.getState().liveAnalysis).toBe(first);

    useStore.getState().setLiveAnalysis({ ...first, windowSize: 4 });
    expect(useStore.getState().liveAnalysis?.windowSize).toBe(4);
    useStore.getState().setLiveAnalysis(null);
    expect(useStore.getState().liveAnalysis).toBeNull();
  });
});
