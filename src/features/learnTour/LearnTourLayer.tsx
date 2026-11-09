import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router-dom';
import { usePrefersReducedMotion } from '@/daw/components/Tutorial/usePrefersReducedMotion';
import {
  getBillingUiState,
  isActivePaidState,
} from '@/features/settings/subscription/subscriptionUtils';
import { useMySubscription } from '@/hooks/data/subscription/useMySubscription';
import { TourCard, TourStepActions } from './TourCard';
import { TourFinale } from './TourFinale';
import { TourSpotlight } from './TourSpotlight';
import {
  setTourPremium,
  startLearnTour,
  TOURS,
  useLearnTourStore,
  type TourPrompt,
} from './learnTourStore';
import { atLearnHome, atReturnLesson, isLessonPath } from './places';
import {
  clickElement,
  findScroller,
  findTargets,
  reveal,
  sameRect,
  scrollDownAndUp,
  unionRect,
  type Rect,
  type Targets,
} from './targets';
import { resumeIndex, sameStop } from './tourPosition';
import {
  primaryButton,
  secondaryButton,
  TOUR_KEYFRAMES,
  TOUR_Z,
} from './tourStyle';
import type { TourApi, TourContext, TourDefinition, TourPlace } from './types';
import {
  resetDevLearnTourFlags,
  useLearnTourAccount,
} from './useLearnTourAccount';

// ── The Learn tours' layer ─────────────────────────────────────────────────
// Mounted in the dashboard layout, which every Learn page, Songs, Set Lists,
// the Globe, the curriculum and the Studio share; the tour itself lives in
// learnTourStore, so it carries on as the layout remounts between them.
// Portaled to <body> above everything, and pointer-events:none but for its
// cards, so the player uses the real page under the spotlight.
//
// A step goes where it happens, waits for its control to appear, lights it,
// and moves on when Next is pressed (doing the click, the typing or the drag
// for the player) or when the player does it themselves. A control the page
// doesn't have is passed by. If the player wanders off, the card says where
// the tour is waiting, with the way back.
//
// The first-time prompts live here too: "Is this your first time in Music
// Atlas Learn?" on a player's first genre or Theory lesson, and the compass
// on their first visit to the Learn dashboard.

const DEFAULT_WAIT = 6000;
/** How long a step waits for the page it needs before going there itself. */
const ARRIVAL_GRACE = 1200;
const SEEKING_NOTE_MS = 700;

const sleep = (ms: number) =>
  new Promise<void>((resolve) => window.setTimeout(resolve, ms));

const currentPlace = (): TourPlace => ({
  pathname: window.location.pathname,
  search: window.location.search,
});

/** The player's own Premium, not the tour's preview of it. */
function useOwnPremium(): boolean {
  const { data: subscription, isLoading } = useMySubscription();
  return !isLoading && isActivePaidState(getBillingUiState(subscription));
}

type Phase = 'seeking' | 'shown' | 'away';

/** One step of a running tour. Keyed by step: each starts fresh. */
function TourStepRunner({
  def,
  index,
  ctx,
  onQuit,
}: {
  def: TourDefinition;
  index: number;
  ctx: TourContext;
  onQuit: () => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const reducedMotion = usePrefersReducedMotion();
  const step = def.steps[index];
  const [phase, setPhase] = useState<Phase>('seeking');
  const [targets, setTargets] = useState<Targets | null>(null);
  const [rect, setRect] = useState<Rect | null>(null);
  const [seek, setSeek] = useState(0);
  const [busy, setBusy] = useState(false);
  const [slow, setSlow] = useState(false);
  const busyRef = useRef(false);
  /** The step is moving on: the page changing under it is expected. */
  const leavingRef = useRef(false);

  const api = useMemo<TourApi>(
    () => ({
      ctx,
      get place() {
        return currentPlace();
      },
      reducedMotion,
      navigate: (to) => navigate(to),
      find: (t) => findTargets(t),
      click: (t) => clickElement(findTargets(t)[0]),
      wait: sleep,
    }),
    [ctx, reducedMotion, navigate],
  );

  const advance = useCallback(() => {
    const store = useLearnTourStore.getState();
    if (store.tour !== def.id || store.index !== index) return;
    leavingRef.current = true;
    store.goTo(index + 1);
  }, [def.id, index]);

  // Go where the step happens, and find what it points at.
  useEffect(() => {
    let cancelled = false;
    setPhase('seeking');
    setTargets(null);
    const started = Date.now();
    const note = window.setTimeout(() => setSlow(true), SEEKING_NOTE_MS);
    (async () => {
      let sent = false;
      while (!cancelled) {
        const place = currentPlace();
        const here = step.at(place, ctx);
        // The player did what the step asked and the page moved on: a click
        // into another part of the app (the Globe, a song, Set Lists)
        // remounts this layer before the step can see it happen.
        if (!here && typeof step.doneWhen === 'function' && step.doneWhen(api))
          return advance();
        if (here) {
          if (step.when && !step.when(api)) return advance();
          step.enter?.(api);
          const wanted =
            typeof step.target === 'function' ? step.target(api) : step.target;
          const ready = wanted
            ? findTargets(wanted)
            : step.scroll
              ? findTargets(step.scroll)
              : [document.body];
          if (ready.length > 0) {
            if (wanted) reveal(ready[0], reducedMotion);
            setTargets(wanted ?? null);
            setPhase('shown');
            useLearnTourStore
              .getState()
              .setLastHref(`${place.pathname}${place.search}`);
            return;
          }
        } else if (Date.now() - started > ARRIVAL_GRACE) {
          // The tour takes the player on only from where it left them (or
          // to a tour just picked up). One who clicked their way elsewhere
          // stays there, with the way back on the card.
          const last = useLearnTourStore.getState().lastHref;
          if (last && !sameStop(`${place.pathname}${place.search}`, last)) {
            setPhase('away');
            return;
          }
          if (!sent && step.href) {
            sent = true;
            navigate(step.href(ctx));
          }
        }
        const limit = (step.wait ?? DEFAULT_WAIT) + (sent ? DEFAULT_WAIT : 0);
        if (Date.now() - started > limit) {
          // On its page, a control this page doesn't have is passed by;
          // anywhere else the tour waits for the player to come back.
          if (step.at(currentPlace(), ctx)) return advance();
          setPhase('away');
          return;
        }
        await sleep(150);
      }
    })();
    return () => {
      cancelled = true;
      window.clearTimeout(note);
    };
    // A step's own functions are fixed; `seek` looks again.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [def.id, index, seek]);

  // Follow the target as the page moves, re-finding it now and then (a
  // re-rendered control is a new element).
  useEffect(() => {
    if (phase !== 'shown' || !targets) {
      setRect(null);
      return;
    }
    let raf = 0;
    let frame = 0;
    let els: Element[] = [];
    const tick = () => {
      if (frame++ % 8 === 0 || els.some((el) => !el.isConnected))
        els = findTargets(targets);
      const next = unionRect(els);
      setRect((was) => (sameRect(was, next) ? was : next));
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [phase, targets]);

  // "Scroll down the page and back up."
  useEffect(() => {
    if (phase !== 'shown' || !step.scroll) return;
    let cancelled = false;
    const [anchor] = findTargets(step.scroll);
    const scroller = findScroller(anchor ?? null);
    if (scroller)
      void scrollDownAndUp(scroller, () => cancelled, reducedMotion);
    return () => {
      cancelled = true;
    };
  }, [phase, step.scroll, reducedMotion]);

  // The player did it themselves: a click on the target…
  useEffect(() => {
    if (phase !== 'shown' || step.doneWhen !== 'click' || !targets) return;
    const onClick = (event: MouseEvent) => {
      if (busyRef.current || leavingRef.current) return;
      const hit = findTargets(targets).some((el) =>
        el.contains(event.target as Node),
      );
      if (!hit) return;
      leavingRef.current = true;
      window.setTimeout(advance, 300);
    };
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [phase, targets, step.doneWhen, advance]);

  // …or whatever the step watches for.
  const doneWhen = typeof step.doneWhen === 'function' ? step.doneWhen : null;
  useEffect(() => {
    if (phase !== 'shown' || !doneWhen) return;
    const id = window.setInterval(() => {
      if (busyRef.current || leavingRef.current || !doneWhen(api)) return;
      leavingRef.current = true;
      window.clearInterval(id);
      window.setTimeout(advance, 350);
    }, 200);
    return () => window.clearInterval(id);
  }, [phase, doneWhen, api, advance]);

  // The page changed under the step: done, gone astray, or back again.
  useEffect(() => {
    if (leavingRef.current) return;
    const here = step.at(currentPlace(), ctx);
    if (phase === 'shown' && doneWhen?.(api)) {
      leavingRef.current = true;
      window.setTimeout(advance, 350);
    } else if (phase === 'shown' && !here) setPhase('away');
    else if (phase === 'away' && here) setSeek((n) => n + 1);
    // Only a change of page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search]);

  const onNext = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    try {
      if (phase === 'shown') {
        if (step.next === 'click' && targets)
          clickElement(findTargets(targets)[0]);
        else if (typeof step.next === 'function') await step.next(api);
      }
    } catch {
      // The move didn't take; the tour goes on regardless.
    }
    busyRef.current = false;
    advance();
  };

  const backHref =
    step.href?.(ctx) ?? useLearnTourStore.getState().lastHref ?? null;

  if (phase === 'away') {
    return (
      <TourCard
        title={def.title}
        chapter={step.chapter}
        text={`The tour is waiting for you on **${step.chapter}**.`}
        index={index}
        total={def.steps.length}
        target={null}
        onClose={onQuit}
        actions={
          <TourStepActions
            onQuit={onQuit}
            onNext={backHref ? () => navigate(backHref) : undefined}
            nextLabel="Back to the tour"
          />
        }
      />
    );
  }

  if (phase === 'seeking') {
    if (!slow) return null;
    return (
      <TourCard
        title={def.title}
        chapter={step.chapter}
        text="One moment…"
        index={index}
        total={def.steps.length}
        target={null}
        spot="bottom"
        onClose={onQuit}
        actions={<TourStepActions onQuit={onQuit} />}
      />
    );
  }

  const text = typeof step.text === 'function' ? step.text(api) : step.text;
  const isLast = index === def.steps.length - 1;
  return (
    <>
      <TourSpotlight rect={rect} />
      <TourCard
        title={def.title}
        chapter={step.chapter}
        text={text}
        index={index}
        total={def.steps.length}
        target={rect}
        spot={step.scroll ? 'bottom' : 'center'}
        onClose={onQuit}
        actions={
          <TourStepActions
            onQuit={onQuit}
            onNext={() => void onNext()}
            nextLabel={isLast ? 'Finish' : 'Next'}
            busy={busy}
          />
        }
      />
    </>
  );
}

/** The first-time prompts. */
function TourPrompts() {
  const account = useLearnTourAccount();
  const { mark } = account;
  const tour = useLearnTourStore((s) => s.tour);
  const finale = useLearnTourStore((s) => s.finale);
  const location = useLocation();
  const [open, setOpen] = useState<TourPrompt | null>(null);
  const [compassRect, setCompassRect] = useState<Rect | null>(null);
  const offer = useLearnTourStore((s) => s.offer);
  const busy = !!tour || !!finale || !!offer;
  const onLesson = isLessonPath(location.pathname);
  const onHome = atLearnHome(location);

  // A first genre or Theory lesson, once it's on screen.
  const lessonDue =
    account.ready && !account.flags.lessonPrompted && onLesson && !busy;
  useEffect(() => {
    if (!lessonDue || open) return;
    const id = window.setInterval(() => {
      if (!document.querySelector('[data-guitar-bar]')) return;
      window.clearInterval(id);
      if (useLearnTourStore.getState().tour) return;
      setOpen('lesson');
      mark({ lessonPrompted: true });
    }, 300);
    return () => window.clearInterval(id);
  }, [lessonDue, open, location.pathname, mark]);

  // A first visit to the Learn dashboard, once its compass is there.
  const compassDue =
    account.ready && !account.flags.compassPrompted && onHome && !busy;
  useEffect(() => {
    if (!compassDue || open) return;
    const id = window.setInterval(() => {
      if (findTargets({ css: '[data-learn-compass]' }).length === 0) return;
      window.clearInterval(id);
      if (useLearnTourStore.getState().tour) return;
      setOpen('compass');
      mark({ compassPrompted: true });
    }, 300);
    return () => window.clearInterval(id);
  }, [compassDue, open, mark]);

  // A prompt goes when a tour starts, or the player leaves its page.
  useEffect(() => {
    const left =
      (open === 'lesson' && !onLesson) || (open === 'compass' && !onHome);
    if (busy || left) setOpen(null);
  }, [busy, open, onLesson, onHome]);

  useEffect(() => {
    if (open !== 'compass') return;
    let raf = 0;
    const tick = () => {
      const next = unionRect(findTargets({ css: '[data-learn-compass]' }));
      setCompassRect((was) => (sameRect(was, next) ? was : next));
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [open]);

  if (open === 'lesson') {
    return (
      <>
        <div
          aria-hidden
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(6, 8, 12, 0.45)',
          }}
        />
        <TourCard
          title="Welcome to Learn"
          chapter="First time?"
          text="Is this your first time in **Music Atlas Learn**? We can show you around this lesson in about two minutes."
          target={null}
          onClose={() => setOpen(null)}
          closeLabel="Close"
          actions={
            <>
              <button
                type="button"
                style={secondaryButton}
                onClick={() => setOpen(null)}
              >
                No
              </button>
              <div style={{ flex: 1 }} />
              <button
                type="button"
                style={primaryButton}
                data-testid="learn-tour-yes"
                onClick={() =>
                  startLearnTour('lesson', {
                    returnTo: `${location.pathname}${location.search}`,
                  })
                }
              >
                Yes, show me around
              </button>
            </>
          }
        />
      </>
    );
  }

  if (open === 'compass') {
    return (
      <>
        <TourSpotlight rect={compassRect} />
        <TourCard
          title="How to Navigate"
          chapter="New here?"
          text="Click the **compass** for a tour of Learn. On any Learn page, it shows you around that page."
          target={compassRect}
          onClose={() => setOpen(null)}
          closeLabel="Close"
          actions={
            <>
              <button
                type="button"
                style={secondaryButton}
                onClick={() => setOpen(null)}
              >
                Not now
              </button>
              <div style={{ flex: 1 }} />
              <button
                type="button"
                style={primaryButton}
                onClick={() => startLearnTour('navigate')}
              >
                Show me
              </button>
            </>
          }
        />
      </>
    );
  }

  return null;
}

/**
 * A tour left midway, offered back: as the app opens after it was left (a
 * reload elsewhere, a closed tab), or when the player starts it again.
 */
function TourOfferCard() {
  const offer = useLearnTourStore((s) => s.offer);
  const resume = useLearnTourStore((s) => s.resume);
  const startOver = useLearnTourStore((s) => s.startOver);
  const closeOffer = useLearnTourStore((s) => s.closeOffer);
  if (!offer) return null;
  const def = TOURS[offer.tour];
  const stopped = def.steps[offer.index];
  const from = def.steps[resumeIndex(def, offer.index)];
  return (
    <TourCard
      title={def.title}
      chapter="Pick up where you left off?"
      text={`You stopped at **${stopped.chapter}**, step ${offer.index + 1} of ${def.steps.length}.${
        from.chapter === stopped.chapter
          ? ''
          : ` We’ll pick up with **${from.chapter}**.`
      }`}
      target={null}
      spot="bottom"
      onClose={closeOffer}
      closeLabel="Close"
      actions={
        <>
          <button
            type="button"
            style={secondaryButton}
            onClick={offer.ask === 'load' ? closeOffer : startOver}
          >
            {offer.ask === 'load' ? 'Quit Tutorial' : 'Start over'}
          </button>
          <div style={{ flex: 1 }} />
          <button
            type="button"
            style={primaryButton}
            data-testid="learn-tour-resume"
            onClick={resume}
          >
            Pick up where I left off
          </button>
        </>
      }
    />
  );
}

/** Ends a tour where the player is; the lesson tour takes them back to their lesson. */
function useQuit() {
  const navigate = useNavigate();
  return useCallback(() => {
    const { tour, ctx } = useLearnTourStore.getState();
    if (tour === 'lesson' && !atReturnLesson(currentPlace(), ctx)) {
      // From the Practice Track, its own way back closes it properly.
      const [back] = findTargets({
        css: '[data-testid="practice-header"] button',
        text: /Back to/,
      });
      if (!clickElement(back)) navigate(ctx.returnTo);
    }
    useLearnTourStore.getState().quit();
  }, [navigate]);
}

export function LearnTourLayer() {
  const tour = useLearnTourStore((s) => s.tour);
  const index = useLearnTourStore((s) => s.index);
  const ctx = useLearnTourStore((s) => s.ctx);
  const finale = useLearnTourStore((s) => s.finale);
  const endFinale = useLearnTourStore((s) => s.endFinale);
  const { mark } = useLearnTourAccount();
  const ownPremium = useOwnPremium();
  const quit = useQuit();

  useEffect(() => setTourPremium(ownPremium), [ownPremium]);

  // A finished tour counts as done on the account.
  useEffect(() => {
    if (finale === 'lesson') mark({ lessonDone: true });
    if (finale === 'navigate') mark({ navigateDone: true });
  }, [finale, mark]);

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    (window as unknown as Record<string, unknown>).__learnTour = {
      start: startLearnTour,
      store: useLearnTourStore,
      tours: TOURS,
      resetPrompts: resetDevLearnTourFlags,
    };
  }, []);

  const def = tour ? TOURS[tour] : null;
  return createPortal(
    <div
      data-learn-tour-layer=""
      data-tutorial-layer=""
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: TOUR_Z,
        pointerEvents: 'none',
      }}
    >
      <style>{TOUR_KEYFRAMES}</style>
      {def && (
        <TourStepRunner
          key={`${def.id}:${index}`}
          def={def}
          index={index}
          ctx={ctx}
          onQuit={quit}
        />
      )}
      <TourOfferCard />
      {finale && (
        <TourFinale
          heading={TOURS[finale].finale.heading}
          line={TOURS[finale].finale.line}
          onDone={endFinale}
        />
      )}
      <TourPrompts />
    </div>,
    document.body,
  );
}
