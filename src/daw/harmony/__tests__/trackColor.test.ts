import { beforeEach, describe, expect, it } from 'vitest';
import { useStore } from '@/daw/store';
import { harmonyColorOn, trackColorOf } from '../trackColor';

// ── Harmony Color (owner, 2026-10-22) ──────────────────────────────────────
// On, tracks and clips show the key centre's colour; off, each track's own,
// even with a key set. A key never overwrites a track's own colour. Run:
// npx vitest run src/daw/harmony/__tests__/trackColor.test.ts

const s = () => useStore.getState();

beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true);
});

describe('Harmony Color', () => {
  it('shows the key centre’s colour on, each track’s own off', () => {
    const own = '#336699';
    expect(
      trackColorOf(own, { clipColorMode: 'prism', rootTrackColor: '#ff8800' }),
    ).toBe('#ff8800');
    expect(
      trackColorOf(own, { clipColorMode: 'track', rootTrackColor: '#ff8800' }),
    ).toBe(own);
    // On, with no key: the track's own.
    expect(
      trackColorOf(own, { clipColorMode: 'prism', rootTrackColor: null }),
    ).toBe(own);
    expect(harmonyColorOn({ clipColorMode: 'prism' })).toBe(true);
  });

  it('never writes the key’s colour over a track’s own', () => {
    const a = s().addTrack('midi', 'soundfont', 'Keys');
    const own = s().tracks.find((t) => t.id === a)!.color;
    s().setRootNote(7);
    s().setMode('dorian');
    expect(s().tracks.find((t) => t.id === a)!.color).toBe(own);
    expect(s().rootTrackColor).not.toBeNull();
    // A track added under a key keeps its own colour too.
    const b = s().addTrack('midi', 'soundfont', 'Pad');
    expect(s().tracks.find((t) => t.id === b)!.color).not.toBe(
      s().rootTrackColor,
    );
  });

  it('isn’t switched on by chords written on the ruler', () => {
    useStore.setState({ clipColorMode: 'track', rootNote: 0 });
    s().setChordRegions([
      {
        id: 'c1',
        startTick: 0,
        endTick: 1920,
        name: '1 major',
        noteName: 'C',
        color: [255, 0, 0],
      },
    ]);
    expect(s().clipColorMode).toBe('track');
  });
});
