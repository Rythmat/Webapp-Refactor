// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  GuitarInputHandle,
  GuitarInputPrefs,
  GuitarInputStatus,
} from '@/learn/audio/guitar/types';
import { GuitarInputChip } from '../GuitarInputChip';

function makeHandle(
  status: GuitarInputStatus,
  over: Partial<GuitarInputHandle> = {},
  prefs: Partial<GuitarInputPrefs> = {},
): GuitarInputHandle {
  return {
    status,
    prefs: {
      source: 'audio',
      deviceId: null,
      channel: 0,
      trimDb: 0,
      gateRms: 0.01,
      inputLatencyMs: 0,
      bleedDetected: false,
      monitorThroughAmp: false,
      ...prefs,
    },
    level: 0,
    error: null,
    enable: vi.fn(async () => {}),
    restart: vi.fn(async () => {}),
    setEvaluationMode: vi.fn(),
    setSuppressed: vi.fn(),
    setExpectedNotes: vi.fn(),
    setKeyContext: vi.fn(),
    calibrateGate: vi.fn(async () => 0.01),
    getTunerAnalyser: vi.fn(() => null),
    getLastChroma: vi.fn(() => null),
    getRig: vi.fn(() => null),
    ...over,
  };
}

function renderChip(handle: GuitarInputHandle | null) {
  const onOpenSetup = vi.fn();
  const view = render(
    <GuitarInputChip handle={handle} onOpenSetup={onOpenSetup} />,
  );
  return { ...view, onOpenSetup };
}

const statusText = () => screen.getByRole('status').textContent;
const button = (name: string) => screen.queryByRole('button', { name });

afterEach(cleanup);

describe('GuitarInputChip', () => {
  it('renders nothing without a guitar handle', () => {
    const { container } = renderChip(null);
    expect(container).toBeEmptyDOMElement();
  });

  it.each<[GuitarInputStatus, string]>([
    ['idle', 'Mic off'],
    ['needs-setup', 'Set up guitar'],
    ['requesting-permission', 'Asking for the mic'],
    ['listening', 'Listening'],
    ['denied', 'Microphone blocked'],
    ['no-device', 'No microphone found'],
    ['error', 'Mic problem'],
  ])('says %s in words', (status, text) => {
    renderChip(makeHandle(status));
    expect(
      screen.getByRole('group', { name: 'Guitar input' }),
    ).toBeInTheDocument();
    expect(statusText()).toBe(text);
  });

  it('meters the level only while listening', () => {
    const { rerender, onOpenSetup } = renderChip(
      makeHandle('listening', { level: 0.1 }),
    );
    // -20 dBFS on the meter's -60..0 dB scale.
    expect(screen.getByRole('meter', { name: 'Input level' })).toHaveAttribute(
      'aria-valuenow',
      '67',
    );
    expect(button('Retry')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Set up' }));
    expect(onOpenSetup).toHaveBeenCalledWith();

    rerender(
      <GuitarInputChip handle={makeHandle('idle')} onOpenSetup={onOpenSetup} />,
    );
    expect(screen.queryByRole('meter')).toBeNull();
  });

  it('follows a live level on an unchanged handle, in decibels', () => {
    vi.useFakeTimers();
    let live = 0.001;
    const handle = makeHandle('listening');
    Object.defineProperty(handle, 'level', { get: () => live });
    renderChip(handle);
    const meter = screen.getByRole('meter', { name: 'Input level' });
    expect(meter).toHaveAttribute('aria-valuenow', '0'); // -60 dB: the floor

    // A plain strum's RMS fills half the bar, not 3% of it.
    const reads: [number, string][] = [
      [10 ** (-30 / 20), '50'],
      [0.01, '33'],
      [1, '100'],
      [0, '0'],
    ];
    for (const [rms, shown] of reads) {
      live = rms;
      act(() => vi.advanceTimersByTime(100));
      expect(meter).toHaveAttribute('aria-valuenow', shown);
    }
    vi.useRealTimers();
  });

  it('offers retry, MIDI and the how-to when the mic is blocked', () => {
    const handle = makeHandle('denied');
    const { onOpenSetup } = renderChip(handle);

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(handle.enable).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', { name: 'Use MIDI' }));
    expect(handle.restart).toHaveBeenCalledWith({ source: 'midi' });
    fireEvent.click(screen.getByRole('button', { name: 'Set up' }));
    expect(onOpenSetup).toHaveBeenCalledWith('mic');
  });

  it('keeps the error detail and survives a rejected retry', async () => {
    const handle = makeHandle('error', {
      error: 'Device in use',
      enable: vi.fn(() => Promise.reject(new Error('still in use'))),
    });
    const { onOpenSetup } = renderChip(handle);

    expect(screen.getByRole('status')).toHaveAttribute(
      'title',
      'Device in use',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await Promise.resolve();
    expect(handle.enable).toHaveBeenCalled();
    // The mic page shows the problem and its own Try again.
    fireEvent.click(screen.getByRole('button', { name: 'Set up' }));
    expect(onOpenSetup).toHaveBeenCalledWith('mic');
  });

  it('shows a MIDI guitar as MIDI, with no meter or mic actions', () => {
    renderChip(makeHandle('listening', { level: 0.8 }, { source: 'midi' }));
    expect(statusText()).toBe('MIDI guitar');
    expect(screen.queryByRole('meter')).toBeNull();
    expect(button('Retry')).toBeNull();
    expect(button('Use MIDI')).toBeNull();
    expect(button('Set up')).toBeInTheDocument();
  });

  it('asks a MIDI guitar that has no setup yet to set up', () => {
    renderChip(makeHandle('needs-setup', {}, { source: 'midi' }));
    expect(statusText()).toBe('Set up guitar');
  });
});
