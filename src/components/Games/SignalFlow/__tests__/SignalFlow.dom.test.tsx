// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import SignalFlow from '../SignalFlow';
import { readProgress } from '../useSignalFlowProgress';

// The game itself, with the sound and the account stubbed out.

const save = vi.fn();
let savedOptions: unknown = undefined;

vi.mock('../useRigAudio', () => ({
  useRigAudio: () => ({
    audio: null,
    loading: false,
    failed: [],
    playing: true,
    setPlaying: vi.fn(),
    noteTick: { current: 0 },
    playKey: vi.fn(),
  }),
}));
vi.mock('@/hooks/data/gameOptions/useGameOptions', () => ({
  useGameOptions: () => ({ data: savedOptions }),
}));
vi.mock('@/hooks/data/gameOptions/useSaveGameOptions', () => ({
  useSaveGameOptions: () => ({ mutate: save }),
}));
vi.mock('@/hooks/useMediaQuery', () => ({ useMediaQuery: () => false }));
vi.mock('framer-motion', async (original) => ({
  ...(await original<typeof import('framer-motion')>()),
  useReducedMotion: () => true,
}));
vi.mock('../../ArcadeGameHeader', () => ({
  ArcadeGameHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

const open = (props: Parameters<typeof SignalFlow>[0] = {}) =>
  render(
    <MemoryRouter>
      <SignalFlow {...props} />
    </MemoryRouter>,
  );

const press = (id: string) => fireEvent.click(screen.getByTestId(id));
const jack = (id: string) =>
  fireEvent.pointerDown(screen.getByTestId(`jack-${id}`));

const patchFirstMission = () => {
  press('mission-voice-build');
  press('shelf-mic');
  press('shelf-speaker');
  press('rack-xlr');
  jack('mic/out');
  jack('speaker/in');
};

describe('Signal Flow', () => {
  beforeEach(() => {
    save.mockClear();
    savedOptions = undefined;
    localStorage.clear();
    vi.stubGlobal('requestAnimationFrame', () => 1);
    vi.stubGlobal('cancelAnimationFrame', () => {});
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it('opens on the five chapters, with only each first mission open', () => {
    open();
    for (const title of [
      'Voice to Speaker',
      'Guitar to Amp',
      'Home Studio',
      'Live Stage',
      'Full Band',
    ]) {
      expect(screen.getByRole('heading', { name: title })).toBeTruthy();
    }
    expect(screen.getByTestId('mission-voice-build')).toBeEnabled();
    expect(screen.getByTestId('mission-voice-dial')).toBeDisabled();
    expect(screen.getByTestId('mission-guitar-build')).toBeEnabled();
  });

  it('clears the first mission by tapping jack to jack', () => {
    const onCorrect = vi.fn();
    open({ onCorrect });
    patchFirstMission();
    expect(screen.getByTestId('won')).toBeTruthy();
    expect(onCorrect).toHaveBeenCalledTimes(1);
  });

  it('patches by dragging from one jack to another', () => {
    open();
    press('mission-voice-build');
    press('shelf-mic');
    press('shelf-speaker');
    press('rack-xlr');
    const to = screen.getByTestId('jack-speaker/in');
    jack('mic/out');
    const elementFromPoint = vi.fn(() => to);
    Object.defineProperty(document, 'elementFromPoint', {
      value: elementFromPoint,
      configurable: true,
    });
    fireEvent.pointerUp(window, { clientX: 400, clientY: 200 });
    expect(screen.getByTestId('won')).toBeTruthy();
    Reflect.deleteProperty(document, 'elementFromPoint');
  });

  it('patches from the keyboard', () => {
    open();
    press('mission-voice-build');
    press('shelf-mic');
    press('shelf-speaker');
    press('rack-xlr');
    fireEvent.keyDown(screen.getByTestId('jack-mic/out'), { key: 'Enter' });
    fireEvent.keyDown(screen.getByTestId('jack-speaker/in'), { key: ' ' });
    expect(screen.getByTestId('won')).toBeTruthy();
  });

  it('counts a clear once, however long it stays on screen', () => {
    const onCorrect = vi.fn();
    open({ onCorrect });
    patchFirstMission();
    // The old game resent its reward on every press of its last button.
    press('back');
    expect(onCorrect).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('counts a hint as a clear that doesn’t add to the streak', () => {
    const onCorrect = vi.fn();
    const onWrong = vi.fn();
    open({ onCorrect, onWrong });
    press('mission-voice-build');
    press('hint');
    press('shelf-mic');
    press('shelf-speaker');
    press('rack-xlr');
    jack('mic/out');
    jack('speaker/in');
    expect(onCorrect).not.toHaveBeenCalled();
    expect(onWrong).toHaveBeenCalledTimes(1);
  });

  it('says why a plug won’t fit, and pulls a plug when nothing is in hand', () => {
    open();
    press('mission-voice-build');
    press('shelf-mic');
    press('shelf-speaker');
    press('rack-ts');
    jack('mic/out');
    expect(screen.getByTestId('refusal').textContent).toContain('XLR');

    press('rack-ts'); // Put it down.
    press('rack-xlr');
    jack('mic/out');
    expect(
      screen.getByTestId('jack-mic/out').getAttribute('data-pending'),
    ).toBe('true');
  });

  it('saves a clear, unlocks the next mission and restores on return', () => {
    open();
    patchFirstMission();
    expect(save).toHaveBeenCalledWith({
      progress: { cleared: ['voice-build'] },
    });
    press('back');
    expect(screen.getByTestId('mission-voice-dial')).toBeEnabled();
    cleanup();
    open();
    expect(screen.getByTestId('mission-voice-dial')).toBeEnabled();
  });

  it('restores progress saved on the account', () => {
    savedOptions = { progress: { cleared: ['voice-build', 'voice-dial'] } };
    open();
    expect(screen.getByTestId('mission-voice-probe')).toBeEnabled();
    expect(screen.getByTestId('mission-voice-fix')).toBeDisabled();
  });

  it('goes on to the next mission', () => {
    open();
    patchFirstMission();
    press('next');
    expect(screen.getByRole('heading', { name: 'Mic or Line?' })).toBeTruthy();
    expect(screen.queryByTestId('won')).toBeNull();
  });

  it('turns a knob from the keyboard, as a real slider', () => {
    savedOptions = { progress: { cleared: ['voice-build', 'voice-dial'] } };
    open();
    press('mission-voice-dial');
    press('switch-speaker-inputMode-mic');
    const knob = screen.getByTestId('knob-speaker-gain');
    expect(knob.getAttribute('role')).toBe('slider');
    expect(knob.getAttribute('aria-valuenow')).toBe('-14');
    fireEvent.keyDown(knob, { key: 'ArrowUp' });
    expect(knob.getAttribute('aria-valuenow')).toBe('-13');
    fireEvent.keyDown(knob, { key: 'Home' });
    expect(knob.getAttribute('aria-valuenow')).toBe('-20');
  });

  it('opens a scope on a cable, and explains a silent one', () => {
    savedOptions = {
      progress: {
        cleared: ['guitar-build', 'guitar-probe', 'guitar-order'],
      },
    };
    open();
    press('mission-guitar-fix');
    press('cable-bad-one');
    expect(screen.getByTestId('scope').textContent).toContain('two outputs');
  });
});

describe('saved progress', () => {
  it('reads defensively', () => {
    expect(readProgress(undefined)).toEqual([]);
    expect(readProgress({ cleared: 'nope' })).toEqual([]);
    expect(readProgress({ cleared: ['a', 3, null, 'b'] })).toEqual(['a', 'b']);
  });
});
