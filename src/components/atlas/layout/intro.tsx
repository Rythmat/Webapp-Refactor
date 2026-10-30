import {
  createContext,
  useContext,
  useEffect,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { useStageSignals } from '@/components/atlas/state/stageSignals';

/**
 * The Globe's intro (after the map-dashboard reference's opening): the globe
 * fades up and its rainbow rim draws round it, the era rail's rim draws
 * left to right, then the cards land one after another, their charts
 * drawing and numbers counting as each arrives, the Legend last.
 *
 * Only on a bare /globe, once a visit, never from a link to somewhere in
 * it and never under reduced motion. It waits for the map to be ready, but
 * not for ever: after INTRO.fallbackMs it plays anyway.
 *
 *   wait: the map and the cards held back until the map is ready
 *   play: the sequence, keyed off `data-atlas-intro` (index.css)
 *   none: no intro, or it is over
 */
export type IntroStage = 'none' | 'wait' | 'play';

export const INTRO = {
  globeMs: 600,
  rimMs: 800,
  railDelayMs: 500,
  railMs: 800,
  /** When the first card lands; the rest follow 60 ms apart. */
  cardsDelayMs: 900,
  /** From play to the intro's end, the last card landed. */
  totalMs: 2200,
  fallbackMs: 1500,
  sessionKey: 'atlas-intro-seen',
} as const;

/** Whether this visit opens with the intro. */
export function shouldPlayIntro({
  search,
  reducedMotion,
  seen,
}: {
  search: string;
  reducedMotion: boolean;
  seen: boolean;
}): boolean {
  return !reducedMotion && !seen && (search === '' || search === '?');
}

const readSeen = (): boolean => {
  try {
    return window.sessionStorage.getItem(INTRO.sessionKey) === '1';
  } catch {
    return false;
  }
};

const markSeen = () => {
  try {
    window.sessionStorage.setItem(INTRO.sessionKey, '1');
  } catch {
    // Private windows may refuse; the intro then plays once a page load.
  }
};

const prefersReduced = (): boolean =>
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

interface IntroState {
  stage: IntroStage;
  /** When the play began (performance.now()), or null. */
  playAt: number | null;
}

const IntroContext = createContext<IntroState>({ stage: 'none', playAt: null });

/**
 * Decides once, when the page opens, and runs the stages; its wrapper
 * carries the stage for the CSS. Each card takes its own delay when it
 * lands (useIntroDelay), counted from the play's start, so a card whose
 * code arrives late is not held back longer.
 */
export function IntroProvider({ children }: { children: ReactNode }) {
  const signals = useStageSignals();
  const [stage, setStage] = useState<IntroStage>(() =>
    shouldPlayIntro({
      search: window.location.search,
      reducedMotion: prefersReduced(),
      seen: readSeen(),
    })
      ? 'wait'
      : 'none',
  );

  useEffect(() => {
    if (stage !== 'wait') return;
    markSeen();
    const play = () => setStage('play');
    if (signals.mapPhase.get() !== 'loading') {
      play();
      return;
    }
    const off = signals.mapPhase.subscribe(() => {
      if (signals.mapPhase.get() !== 'loading') play();
    });
    const timer = window.setTimeout(play, INTRO.fallbackMs);
    return () => {
      off();
      window.clearTimeout(timer);
    };
  }, [stage, signals]);

  const [playAt, setPlayAt] = useState<number | null>(null);
  useEffect(() => {
    if (stage === 'play') setPlayAt(performance.now());
  }, [stage]);

  useEffect(() => {
    if (stage !== 'play') return;
    const timer = window.setTimeout(() => setStage('none'), INTRO.totalMs);
    return () => window.clearTimeout(timer);
  }, [stage]);

  return (
    <IntroContext.Provider value={{ stage, playAt }}>
      <div className="contents" data-atlas-intro={stage}>
        {children}
      </div>
    </IntroContext.Provider>
  );
}

export const useIntro = (): IntroStage => useContext(IntroContext).stage;

/** What is left of the cards' wait, `elapsed` ms into the play. */
export const introDelayLeft = (stage: IntroStage, elapsed: number): number =>
  stage === 'play' ? Math.max(0, Math.round(INTRO.cardsDelayMs - elapsed)) : 0;

/**
 * How long a card (or a count in it) waits before it plays, fixed when it
 * mounts: what is left of the intro's wait, else nothing.
 */
export function useIntroDelay(): number {
  const { stage, playAt } = useContext(IntroContext);
  const [delay] = useState(() =>
    introDelayLeft(stage, playAt === null ? 0 : performance.now() - playAt),
  );
  return delay;
}

/** The delay as the cards' animations read it (`--atlas-delay`). */
export const introDelayStyle = (delay: number): CSSProperties =>
  ({ '--atlas-delay': `${delay}ms` }) as CSSProperties;
