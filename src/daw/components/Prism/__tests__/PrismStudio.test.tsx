// @vitest-environment jsdom
import { Profiler } from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useStore } from '@/daw/store';
import { PrismStudio } from '../PrismStudio';

// ── PrismStudio ────────────────────────────────────────────────────────────
// prism-ui-20: it subscribed to the whole tracks array to learn one thing,
// whether the selected track is MIDI, so every fader-drag move re-rendered
// the circle, the spectrum and the rhythm controls. Owner decision 3: its
// Create button is the primary action, so it is the white pill.

const s = () => useStore.getState();
let commits = 0;

function renderStudio() {
  return render(
    <Profiler id="prism" onRender={() => (commits += 1)}>
      <PrismStudio />
    </Profiler>,
  );
}

let keys = '';
let vocals = '';

beforeEach(() => {
  commits = 0;
  useStore.setState({
    tracks: [],
    chordSeq: [],
    stringSeq: [],
    remoteUsers: new Map(),
  });
  keys = s().addTrack('midi', 'piano-sampler', 'Keys');
  vocals = s().addTrack('audio', 'vocal-fx', 'Vocals');
  s().setSelectedTrackId(keys);
});

afterEach(cleanup);

describe('what re-renders Prism', () => {
  it('not a fader drag on the selected track', () => {
    renderStudio();
    const before = commits;
    for (let i = 1; i <= 20; i++) {
      act(() => s().updateTrack(keys, { volume: i / 20 }));
    }
    expect(commits).toBe(before);
  });

  it('selecting a track that is not MIDI', () => {
    renderStudio();
    expect(screen.getByRole('button', { name: 'Create' })).toBeTruthy();
    act(() => s().setSelectedTrackId(vocals));
    expect(
      screen.getByRole('button', { name: 'Select a MIDI track' }),
    ).toBeDisabled();
  });
});

describe('Create', () => {
  it('is the white pill once there are chords to write', () => {
    useStore.setState({ chordSeq: [[60, 64, 67]], stringSeq: ['1'] });
    renderStudio();
    const create = screen.getByRole('button', { name: 'Create' });
    expect(create).toBeEnabled();
    expect(create.className).toMatch(/\bbg-white\b/);
    expect(create.className).toContain('text-[#101012]');
    expect(create.className).toMatch(/\brounded-full\b/);
    expect(create.getAttribute('data-tutorial-id')).toBe('prism-create');
  });

  it('is not a pill to press before there are chords', () => {
    renderStudio();
    const create = screen.getByRole('button', { name: 'Create' });
    expect(create).toBeDisabled();
    expect(create.className).not.toMatch(/\bbg-white\b/);
  });
});
