import { create } from 'zustand';
import {
  startSetListSandbox,
  stopSetListSandbox,
} from '@/features/setlists/storage/setListSandbox';
import { setTourPremiumPreview } from '@/hooks/tourPremiumPreview';
import {
  readPosition,
  resumeIndex,
  sameStop,
  writePosition,
  type TourPosition,
} from './tourPosition';
import { lessonTour } from './tours/lessonTour';
import {
  genreTour,
  navigateTour,
  songsTour,
  startHereTour,
  theoryTour,
} from './tours/navigateTour';
import type { TourContext, TourDefinition, TourId, TourStep } from './types';

// ── The running Learn tour ─────────────────────────────────────────────────
// Module-level, so a tour carries on across pages: Learn, Songs, Set Lists,
// the curriculum and the Studio each mount their own dashboard layout, and
// the layer drawing the tour remounts with it.
//
// Its place is kept in this browser (tourPosition.ts), so a player never
// loses a tour: a reload on the same page carries on; anywhere else, or on a
// later visit, the tour offers to pick up where they left off. Starting a
// tour they quit midway offers the same, or a fresh start.
//
// Each step can turn on the Set Lists practice copy and the Premium preview
// for itself; moving between steps turns them on and off, and ending the
// tour, however it ends, turns both off.

export const TOURS: Readonly<Record<TourId, TourDefinition>> = {
  lesson: lessonTour,
  navigate: navigateTour,
  startHere: startHereTour,
  songs: songsTour,
  genre: genreTour,
  theory: theoryTour,
};

export type TourPrompt = 'lesson' | 'compass';

/**
 * A tour left midway, offered back: as the app opens ('load'), or when the
 * player starts that tour again ('start', with what the start asked for).
 */
export interface TourOffer extends TourPosition {
  ask: 'load' | 'start';
  startCtx?: Partial<TourContext>;
}

interface LearnTourState {
  tour: TourId | null;
  index: number;
  ctx: TourContext;
  /** The tour whose last card ("Have Fun Learning!") is up. */
  finale: TourId | null;
  /** Where the tour last showed a card: the way back from elsewhere. */
  lastHref: string | null;
  offer: TourOffer | null;
  /** A tour from its start, unless it was left midway (`fresh` skips asking). */
  start: (
    tour: TourId,
    ctx?: Partial<TourContext>,
    opts?: { fresh?: boolean },
  ) => void;
  goTo: (index: number) => void;
  /** Past the last step: the finale. */
  finish: () => void;
  quit: () => void;
  endFinale: () => void;
  setLastHref: (href: string) => void;
  /** The offer taken: back where the player left off. */
  resume: () => void;
  /** The offer declined for a fresh start. */
  startOver: () => void;
  /** The offer put away; one made as the app opened counts as a quit. */
  closeOffer: () => void;
}

const here = () =>
  typeof window === 'undefined'
    ? '/learn'
    : `${window.location.pathname}${window.location.search}`;

/** The practice copy and the preview, as a step (or no step) wants them. */
function applyStep(def: TourDefinition | null, step: TourStep | null) {
  if (step?.sandbox) startSetListSandbox(def?.prepareSandbox ?? null);
  else stopSetListSandbox();
  setTourPremiumPreview(!!step?.preview);
}

/**
 * Development only: an edit to a tour's script reloads this module, which
 * would make a new store and drop the tour someone is walking through. The
 * running tour is kept on the window between versions instead.
 */
type KeptTour = Pick<
  LearnTourState,
  'tour' | 'index' | 'ctx' | 'finale' | 'lastHref' | 'offer'
>;
const KEPT = '__musicAtlasLearnTour';
function keptTour(): Partial<KeptTour> | null {
  if (!import.meta.hot) return null;
  const kept = (globalThis as Record<string, unknown>)[KEPT] as
    | KeptTour
    | undefined;
  if (!kept?.tour && !kept?.offer && !kept?.finale) return null;
  if (!kept.tour) return { finale: kept.finale, offer: kept.offer };
  const steps = TOURS[kept.tour].steps.length;
  return { ...kept, index: Math.min(kept.index, steps - 1) };
}

/** As the app opens: the tour a player was in, carried on or offered. */
function restoredTour(): Partial<KeptTour> {
  const kept = keptTour();
  if (kept) return kept;
  if (typeof window === 'undefined') return {};
  const saved = readPosition(TOURS);
  if (!saved || saved.quit) return {};
  const def = TOURS[saved.tour];
  const index = resumeIndex(def, saved.index);
  const place = {
    pathname: window.location.pathname,
    search: window.location.search,
  };
  // A reload where the tour was: it carries on, as if nothing happened.
  if (
    saved.lastHref &&
    sameStop(here(), saved.lastHref) &&
    def.steps[index].at(place, saved.ctx)
  )
    return {
      tour: saved.tour,
      index,
      ctx: saved.ctx,
      lastHref: saved.lastHref,
    };
  return { offer: { ...saved, ask: 'load' } };
}

export const useLearnTourStore = create<LearnTourState>((set, get) => {
  const begin = (tour: TourId, index: number, ctx: TourContext) => {
    const def = TOURS[tour];
    set({ tour, index, ctx, finale: null, offer: null, lastHref: null });
    applyStep(def, def.steps[index] ?? null);
  };
  const ctxFrom = (ctx: Partial<TourContext> = {}): TourContext => ({
    returnTo: ctx.returnTo ?? here(),
    premium: ctx.premium ?? get().ctx.premium,
  });
  return {
    tour: null,
    index: 0,
    ctx: { returnTo: '/learn', premium: false },
    finale: null,
    lastHref: null,
    offer: null,
    start: (tour, ctx = {}, opts = {}) => {
      if (!opts.fresh) {
        const saved = readPosition(TOURS);
        if (saved?.tour === tour && resumeIndex(TOURS[tour], saved.index) > 0) {
          set({ offer: { ...saved, ask: 'start', startCtx: ctx } });
          return;
        }
      }
      begin(tour, 0, ctxFrom(ctx));
    },
    goTo: (index) => {
      const { tour } = get();
      if (!tour) return;
      const def = TOURS[tour];
      if (index >= def.steps.length) return get().finish();
      set({ index: Math.max(0, index) });
      applyStep(def, def.steps[Math.max(0, index)] ?? null);
    },
    finish: () => {
      const { tour } = get();
      applyStep(null, null);
      set({ tour: null, index: 0, finale: tour });
    },
    quit: () => {
      applyStep(null, null);
      set({ tour: null, index: 0, finale: null });
    },
    endFinale: () => set({ finale: null }),
    setLastHref: (href) => {
      if (get().lastHref !== href) set({ lastHref: href });
    },
    resume: () => {
      const { offer } = get();
      if (!offer) return;
      // A lesson tour picked up from another lesson's settings goes on in
      // that lesson: its steps are the same in every one.
      const ctx =
        offer.ask === 'start'
          ? ctxFrom({
              ...offer.ctx,
              ...offer.startCtx,
              premium: get().ctx.premium,
            })
          : { ...offer.ctx, premium: get().ctx.premium };
      begin(offer.tour, resumeIndex(TOURS[offer.tour], offer.index), ctx);
    },
    startOver: () => {
      const { offer } = get();
      if (!offer) return;
      set({ offer: null });
      get().start(offer.tour, offer.startCtx ?? {}, { fresh: true });
    },
    closeOffer: () => {
      const { offer } = get();
      if (!offer) return;
      if (offer.ask === 'load') {
        const { tour, index, ctx, lastHref, savedAt } = offer;
        writePosition({ tour, index, ctx, lastHref, savedAt, quit: true });
      }
      set({ offer: null });
    },
  };
});

// Where the tour is, kept as it moves: cleared when it's finished, marked
// when it's quit.
useLearnTourStore.subscribe((now, was) => {
  if (now.tour) {
    if (
      now.tour !== was.tour ||
      now.index !== was.index ||
      now.lastHref !== was.lastHref
    )
      writePosition({
        tour: now.tour,
        index: now.index,
        ctx: now.ctx,
        lastHref: now.lastHref,
        savedAt: Date.now(),
      });
  } else if (was.tour) {
    if (now.finale === was.tour) writePosition(null);
    else {
      const position = readPosition(TOURS);
      if (position) writePosition({ ...position, quit: true });
    }
  }
});

/**
 * As the app opens: the tour this browser kept, carried on where the player
 * is or offered back (tests call it again for a fresh opening).
 */
export function restoreLearnTour() {
  useLearnTourStore.setState(restoredTour());
  // A tour carried on needs its step's practice copy or preview.
  const { tour, index } = useLearnTourStore.getState();
  if (tour) applyStep(TOURS[tour], TOURS[tour].steps[index] ?? null);
}
restoreLearnTour();

if (import.meta.hot) {
  useLearnTourStore.subscribe(
    ({ tour, index, ctx, finale, lastHref, offer }) => {
      (globalThis as Record<string, unknown>)[KEPT] = {
        tour,
        index,
        ctx,
        finale,
        lastHref,
        offer,
      } satisfies KeptTour;
    },
  );
}

/** Whether the player has Premium of their own, kept current by the layer. */
export function setTourPremium(premium: boolean) {
  const { ctx } = useLearnTourStore.getState();
  if (ctx.premium !== premium)
    useLearnTourStore.setState({ ctx: { ...ctx, premium } });
}

export const startLearnTour = (
  tour: TourId,
  ctx?: Partial<TourContext>,
  opts?: { fresh?: boolean },
) => useLearnTourStore.getState().start(tour, ctx, opts);
