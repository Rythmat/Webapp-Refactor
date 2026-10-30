// @vitest-environment jsdom
/**
 * The Globe's intro: only a bare /globe's first open of a visit, never
 * under reduced motion; held for the map, played, then over.
 */
import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  StageSignalsProvider,
  useStageSignals,
  type StageSignals,
} from '@/components/atlas/state/stageSignals';
import {
  INTRO,
  IntroProvider,
  introDelayLeft,
  shouldPlayIntro,
  useIntro,
} from './intro';

beforeEach(() => {
  window.sessionStorage.clear();
  window.history.replaceState({}, '', '/globe');
  vi.useFakeTimers();
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe('whether the intro plays', () => {
  it('plays on a bare /globe, once a visit, never under reduced motion', () => {
    const bare = { search: '', reducedMotion: false, seen: false };
    expect(shouldPlayIntro(bare)).toBe(true);
    expect(shouldPlayIntro({ ...bare, search: '?place=city:london' })).toBe(
      false,
    );
    expect(shouldPlayIntro({ ...bare, seen: true })).toBe(false);
    expect(shouldPlayIntro({ ...bare, reducedMotion: true })).toBe(false);
  });

  it('holds a card only for what is left of the wait when it lands', () => {
    expect(introDelayLeft('play', 0)).toBe(INTRO.cardsDelayMs);
    expect(introDelayLeft('play', 600)).toBe(INTRO.cardsDelayMs - 600);
    // Its code came late: it lands at once.
    expect(introDelayLeft('play', 5000)).toBe(0);
    expect(introDelayLeft('none', 0)).toBe(0);
  });
});

function setup() {
  let signals!: StageSignals;
  let stage = '';
  const Probe = () => {
    signals = useStageSignals();
    stage = useIntro();
    return null;
  };
  const { container } = render(
    <StageSignalsProvider>
      <IntroProvider>
        <Probe />
      </IntroProvider>
    </StageSignalsProvider>,
  );
  const attr = () =>
    container
      .querySelector('[data-atlas-intro]')
      ?.getAttribute('data-atlas-intro');
  return { signals: () => signals, stage: () => stage, attr };
}

describe('the intro', () => {
  it('holds for the map, plays when it is ready, then ends', () => {
    const intro = setup();
    expect(intro.stage()).toBe('wait');
    expect(intro.attr()).toBe('wait');
    act(() => intro.signals().mapPhase.set('ready'));
    expect(intro.stage()).toBe('play');
    act(() => vi.advanceTimersByTime(INTRO.totalMs));
    expect(intro.stage()).toBe('none');
  });

  it('plays anyway if the map is slow', () => {
    const intro = setup();
    act(() => vi.advanceTimersByTime(INTRO.fallbackMs));
    expect(intro.stage()).toBe('play');
  });

  it('plays once a visit', () => {
    setup();
    cleanup();
    expect(setup().stage()).toBe('none');
  });

  it('never plays from a link into the Globe', () => {
    window.history.replaceState({}, '', '/globe?view=ring');
    expect(setup().stage()).toBe('none');
  });
});
