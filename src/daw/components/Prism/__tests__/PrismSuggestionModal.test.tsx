// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ── Opening Suggest Chords before the first audio gesture ──────────────────
// A student whose first left click is 'Prism — Suggest Chords' opens the
// modal before audio has started. Its preview player asked the engine for its
// context at once, which threw 'AudioEngine not initialized' and the route
// error page replaced the editor. It now waits for audio to start.

const engine = vi.hoisted(() => ({
  initialized: false,
  context: { id: 'context' },
  master: { id: 'master' },
}));

vi.mock('@/daw/audio/AudioEngine', () => ({
  audioEngine: {
    getIsInitialized: () => engine.initialized,
    // As the real engine: both throw until init() has run.
    getContext: () => {
      if (!engine.initialized)
        throw new Error('AudioEngine not initialized. Call init() first.');
      return engine.context;
    },
    getMasterGain: () => {
      if (!engine.initialized)
        throw new Error('AudioEngine not initialized. Call init() first.');
      return engine.master;
    },
  },
}));

const adapterInit = vi.hoisted(() => vi.fn(() => Promise.resolve()));
vi.mock('@/daw/instruments/SoundFontAdapter', () => ({
  SoundFontAdapter: class {
    init = adapterInit;
    noteOn() {}
    noteOff() {}
    allNotesOff() {}
    setProgram() {}
    dispose() {}
  },
}));

import { useStore } from '@/daw/store';
import { PrismSuggestionModal } from '../PrismSuggestionModal';

function openSuggestions() {
  useStore.setState({
    prismSuggestOpen: true,
    prismSuggestTrackId: null,
    prismSuggestActiveIdx: 0,
    prismSuggestMeasures: 4,
    prismSuggestSets: [
      {
        id: 'set-1',
        label: 'Set 1',
        chords: [
          {
            degree: '1 major',
            quality: 'major',
            noteName: 'C maj',
            midi: [60, 64, 67],
            color: [255, 0, 0],
          },
        ],
      },
    ],
  } as never);
}

beforeEach(() => {
  engine.initialized = false;
  adapterInit.mockClear();
  openSuggestions();
});

afterEach(() => {
  cleanup();
  useStore.setState({ prismSuggestOpen: false, prismSuggestSets: [] });
});

describe('PrismSuggestionModal before audio starts', () => {
  it('opens without asking the engine, then starts its preview once audio is ready', () => {
    const { rerender } = render(<PrismSuggestionModal audioReady={false} />);

    expect(screen.getByText('Prism Suggestions')).toBeTruthy();
    expect(adapterInit).not.toHaveBeenCalled();

    // The same click that opened it starts audio (DawApp's listeners).
    engine.initialized = true;
    rerender(<PrismSuggestionModal audioReady />);

    expect(adapterInit).toHaveBeenCalledTimes(1);
    expect(adapterInit).toHaveBeenCalledWith(engine.context, engine.master);
  });

  it('never asks an engine that is not initialized, whatever it is told', () => {
    render(<PrismSuggestionModal />);

    expect(screen.getByText('Prism Suggestions')).toBeTruthy();
    expect(adapterInit).not.toHaveBeenCalled();
  });
});
