import { beforeEach, describe, expect, it } from 'vitest';
import { useStore } from '@/daw/store';

// ── A track made for a sound starts on it (addTrack's init) ────────────────
// The reconciler builds a track's engine in the write that adds it, from the
// instrument, kit and program the track holds then. A sound set in a second
// write built a second engine (a program) or loaded the natural kit before
// the one asked for. addTrack takes them up front.

const s = () => useStore.getState();

beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true);
});

describe('addTrack with init', () => {
  it('puts the sound and the role on the track in the write that adds it', () => {
    const seen: unknown[] = [];
    const stop = useStore.subscribe(
      (st) => st.tracks,
      (tracks) => seen.push(tracks.at(-1)),
    );
    // Synth Bass 1, the 808 bass voice's program.
    const id = s().addTrack('midi', 'soundfont', 'Funk bass', {
      gmProgram: 38,
      trackRole: 'bass',
    });
    stop();
    const track = s().tracks.find((t) => t.id === id)!;
    expect(track.gmProgram).toBe(38);
    expect(track.trackRole).toBe('bass');
    // One write of the tracks, already holding the program.
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({ gmProgram: 38 });
  });

  it('keeps its id and type its own', () => {
    const id = s().addTrack('midi', 'drum-machine', 'Drums', {
      drumKit: '808',
    });
    const track = s().tracks.find((t) => t.id === id)!;
    expect(track.drumKit).toBe('808');
    expect(track.type).toBe('midi');
    expect(track.id).toBe(id);
  });

  it('without init, guesses the role from the name as before', () => {
    const id = s().addTrack('midi', 'soundfont', 'Bass keys');
    expect(s().tracks.find((t) => t.id === id)!.trackRole).toBe('bass');
  });

  it('lets an undefined in init leave the default standing (the guessed role)', () => {
    const id = s().addTrack('midi', 'soundfont', 'Bass keys', {
      trackRole: undefined,
    });
    expect(s().tracks.find((t) => t.id === id)!.trackRole).toBe('bass');
  });
});
