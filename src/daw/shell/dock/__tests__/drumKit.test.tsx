// @vitest-environment jsdom
/**
 * The drums' Instrument tab (milestone 2.9, after the owner's Soundtrap
 * reference): a top-down kit of round pads, each with the computer key that
 * plays it at the kit's own octave (A the kick), three of them badges on a
 * drum's rim. A click plays a pad. The kit takes the whole tab (no volume
 * or pan knobs, owner 2026-10-21) and keeps every pad inside its box.
 */
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({ audition: vi.fn() }));
vi.mock('@/daw/audio/auditionNote', () => ({ auditionNote: h.audition }));

import {
  DRUM_TYPING_OCTAVE,
  typingKeyFor,
} from '@/daw/commands/musicalTypingMap';
import { DRUM_PADS } from '@/daw/instruments/drumKits';
import { liveTargetsAreDrums } from '@/daw/midi/liveTarget';
import { useStore } from '@/daw/store';
import { DrumPadsView } from '../DrumPadsView';
import {
  badgePoint,
  KIT_BADGES,
  KIT_DRUMS,
  KIT_HEIGHT,
  KIT_WIDTH,
} from '../drumKitLayout';

const s = () => useStore.getState();
let drums = '';

beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true);
  drums = s().addTrack('midi', 'drum-machine', 'Drums');
  s().setSelectedTrackId(drums);
  // Heard: armed and monitoring (the keys play only such a track).
  s().updateTrack(drums, { recordArmed: true, monitoring: true });
  h.audition.mockClear();
  // jsdom lays nothing out: give the kit a size to draw in.
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(1000);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(420);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('the kit’s keys', () => {
  it('are the letters at the kit’s octave: A the kick, S the snare, the hats on T, Y and U', () => {
    const at = (note: number) => typingKeyFor(note, DRUM_TYPING_OCTAVE);
    expect(at(36)).toBe('A');
    expect(at(38)).toBe('S');
    expect(at(40)).toBe('D');
    expect(at(42)).toBe('T');
    expect(at(44)).toBe('Y');
    expect(at(46)).toBe('U');
    expect(at(49)).toBe('O');
    expect(at(51)).toBe('P');
    // Every pad has one.
    for (const pad of DRUM_PADS) expect(at(pad.note)).not.toBeNull();
  });

  it('play the kit only while every live target is a drum kit', () => {
    expect(liveTargetsAreDrums()).toBe(true);
    const keys = s().addTrack('midi', 'soundfont', 'Keys');
    s().updateTrack(keys, { recordArmed: true, monitoring: true });
    expect(liveTargetsAreDrums()).toBe(false);
  });
});

describe('the kit’s layout', () => {
  it('draws every pad once, inside its box', () => {
    const notes = [
      ...KIT_DRUMS.map((d) => d.note),
      ...KIT_BADGES.map((b) => b.note),
    ].sort((a, b) => a - b);
    expect(notes).toEqual(DRUM_PADS.map((p) => p.note).sort((a, b) => a - b));
    for (const d of KIT_DRUMS) {
      expect(d.cx - d.r).toBeGreaterThanOrEqual(0);
      expect(d.cy - d.r).toBeGreaterThanOrEqual(0);
      expect(d.cx + d.r).toBeLessThanOrEqual(KIT_WIDTH);
      expect(d.cy + d.r).toBeLessThanOrEqual(KIT_HEIGHT);
    }
    for (const b of KIT_BADGES) {
      const { x, y } = badgePoint(b);
      expect(x).toBeGreaterThan(0);
      expect(y).toBeLessThan(KIT_HEIGHT);
    }
  });
});

describe('the drums’ Instrument tab', () => {
  it('shows each pad with its key, and a click plays it', () => {
    render(<DrumPadsView trackId={drums} />);
    expect(screen.getByRole('button', { name: 'Kick (A)' })).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Hi-Hat Open (U)' }),
    ).toBeTruthy();
    const snare = screen.getByRole('button', { name: 'Snare (S)' });
    fireEvent.pointerDown(snare, { button: 0 });
    expect(h.audition).toHaveBeenCalledWith(drums, 38, 100);
    expect(snare.dataset.lit).toBe('true');
    // No volume or pan knobs: the kit is the whole tab.
    expect(screen.queryByRole('slider')).toBeNull();
    expect(screen.queryByTestId('drum-kit-controls')).toBeNull();
  });

  it('lights a pad the keys play', () => {
    render(<DrumPadsView trackId={drums} />);
    act(() => s().hwNoteOn(42));
    expect(
      screen.getByRole('button', { name: 'Hi-Hat Closed (T)' }).dataset.lit,
    ).toBe('true');
  });

  it('keeps the kit menu’s lesson anchor', () => {
    render(<DrumPadsView trackId={drums} />);
    expect(
      document.querySelector('[data-tutorial-id="drum-kit-selector"]'),
    ).not.toBeNull();
  });
});
