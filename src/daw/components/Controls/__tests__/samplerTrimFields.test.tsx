// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';

// ── The sampler's Start and Length can be typed ────────────────────────────
// They were read-only text beside the waveform (live-input-22). A typed
// value saves once, on Enter or on leaving the box, like a marker drag:
// a new trim re-slices the sample, so it isn't saved on every keystroke.

vi.mock('@/daw/hooks/usePlaybackEngine', () => ({
  trackEngineRegistry: new Map(),
}));
vi.mock('@/daw/engine/trackReconciler', () => ({ previewTrack: vi.fn() }));
vi.mock('../SamplerWaveform', () => ({ SamplerWaveform: () => null }));

import { useStore, type Track } from '@/daw/store';
import { SamplerChopsView } from '../SamplerChopsView';

let TRACK = '';

function sampleOf(): NonNullable<Track['samplerSample']> {
  const track = useStore.getState().tracks.find((t) => t.id === TRACK);
  return track!.samplerSample!;
}

beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true);
  TRACK = useStore.getState().addTrack('midi', 'sampler', 'Chops');
  useStore.getState().setSamplerSample(TRACK, {
    sampleId: 'smp-1',
    sourceUrl: '/demo.wav',
    rootNote: 'C4',
    durationSeconds: 4,
    startPct: 10,
    lengthPct: 50,
  } as never);
  render(<SamplerChopsView trackId={TRACK} />);
});

afterEach(cleanup);

const field = (name: string) =>
  screen.getByRole('spinbutton', { name: new RegExp(name) });

describe('Sampler trim fields', () => {
  it('show the trim and save a typed Length on Enter', () => {
    expect(field('Start')).toHaveValue(10);
    expect(field('Length')).toHaveValue(50);

    fireEvent.change(field('Length'), { target: { value: '25' } });
    expect(sampleOf().lengthPct).toBe(50); // not on a keystroke
    fireEvent.keyDown(field('Length'), { key: 'Enter' });
    fireEvent.blur(field('Length'));

    expect(sampleOf()).toMatchObject({ startPct: 10, lengthPct: 25 });
  });

  it('move the start and keep the end, as the start marker does', () => {
    fireEvent.change(field('Start'), { target: { value: '30' } });
    fireEvent.blur(field('Start'));

    // The end stays at 60 %.
    expect(sampleOf()).toMatchObject({ startPct: 30, lengthPct: 30 });
  });

  it('bring a value into range', () => {
    fireEvent.change(field('Length'), { target: { value: '500' } });
    fireEvent.blur(field('Length'));
    expect(sampleOf().lengthPct).toBe(90); // to the sample's end

    fireEvent.change(field('Start'), { target: { value: '99' } });
    fireEvent.blur(field('Start'));
    // Up to 1 % before the end.
    expect(sampleOf()).toMatchObject({ startPct: 99, lengthPct: 1 });
  });

  it('put the value back on Escape, and ignore text that is no number', () => {
    fireEvent.change(field('Length'), { target: { value: '20' } });
    fireEvent.keyDown(field('Length'), { key: 'Escape' });
    fireEvent.blur(field('Length'));
    expect(sampleOf().lengthPct).toBe(50);
    expect(field('Length')).toHaveValue(50);

    fireEvent.change(field('Start'), { target: { value: '' } });
    fireEvent.blur(field('Start'));
    expect(sampleOf().startPct).toBe(10);
  });
});
