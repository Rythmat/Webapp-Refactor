import {
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react';
import { cn } from '@/components/utilities';
import type { SynthEngine } from '@/daw/oracle-synth/audio/SynthEngine';
import type { ModTarget } from '@/daw/oracle-synth/audio/types';
import { useSynthStore } from '@/daw/oracle-synth/store';
import { TRANSITION } from '@/daw/ui/styles';

// ── The synth dock's kit ────────────────────────────────────────────────────
//
// What the dock's synth cards share (OracleSynthCard, SynthDockCards): how
// a card fits the dock's height, the 64 px knob tile with its modulation
// dot, the card's select, and the engine's live modulation, which each
// control reads its own key from.

export const SYNTH_CARD_MAX_PX = 208;
export const HEADER_PX = 32;
export const PAD_PX = 8;
/** A knob tile. */
export const TILE_PX = 64;
export const SELECT_H = 30;
/**
 * Under this body height the card is 'compact', under the next 'tight'.
 * 'full' is the frame's 160 at its height; down to 150 its tiles give way.
 */
const FULL_BODY_PX = 150;
const COMPACT_BODY_PX = 128;

export type SynthCardMode = 'full' | 'compact' | 'tight';

export interface SynthCardLayout {
  mode: SynthCardMode;
  cardH: number;
  /** Under the header, less the padding: the panels' height. */
  bodyH: number;
  /** The plot's height (154 wide); 0 in 'tight'. */
  plotH: number;
  /** Position's and Res's diameter (Cutoff's is `cutoff`). */
  knob: number;
  cutoff: number;
  /** A knob tile's height: 64 at the frame's height. */
  tileH: number;
}

/** How the card fits a row `rowH` high (its 8 px padding included). */
export function synthCardLayout(rowH: number): SynthCardLayout {
  const cardH = Math.max(0, Math.min(SYNTH_CARD_MAX_PX, rowH - 2 * PAD_PX));
  const bodyH = Math.max(0, cardH - HEADER_PX - 2 * PAD_PX);
  if (bodyH >= FULL_BODY_PX) {
    return {
      mode: 'full',
      cardH,
      bodyH,
      plotH: bodyH - 38,
      knob: 37,
      cutoff: 50,
      tileH: Math.min(TILE_PX, Math.floor((bodyH - SELECT_H - 2) / 2)),
    };
  }
  if (bodyH >= COMPACT_BODY_PX) {
    return {
      mode: 'compact',
      cardH,
      bodyH,
      plotH: bodyH - 38,
      knob: 37,
      cutoff: Math.min(50, bodyH - 52),
      tileH: TILE_PX,
    };
  }
  // A line of 32 (the name) over the table and Position.
  const knob = Math.max(20, Math.min(37, bodyH - 32 - 26));
  return {
    mode: 'tight',
    cardH,
    bodyH,
    plotH: 0,
    knob,
    cutoff: Math.max(20, Math.min(37, bodyH - 26)),
    tileH: TILE_PX,
  };
}

/** 'SUPER SAW' → 'Super saw', as a select shows it. */
export const sentenceCase = (s: string) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : s;

export const formatHz = (hz: number) =>
  hz >= 1000
    ? `${(hz / 1000).toFixed(hz >= 10000 ? 0 : 1)}kHz`
    : `${Math.round(hz)}Hz`;

/**
 * What the routes add to each destination now ('flt1:cutoff'), as a store
 * a control reads its own key from (useLiveValue): a tick re-renders only
 * the panel whose value moved, not the whole card.
 */
export interface LiveModulation {
  subscribe(onChange: () => void): () => void;
  get(key: string): number | undefined;
}

/**
 * The engine's live modulation (SynthEngine.getLiveModulation), read about
 * 30 times a second while the card shows. Nothing while no note sounds, so
 * the controls show their own values.
 */
export function useLiveModulation(engine: SynthEngine): LiveModulation {
  const store = useMemo(() => {
    let values = new Map<string, number>();
    const listeners = new Set<() => void>();
    return {
      subscribe(onChange: () => void) {
        listeners.add(onChange);
        return () => listeners.delete(onChange);
      },
      get: (key: string) => values.get(key),
      set(next: Map<string, number>) {
        values = next;
        for (const l of listeners) l();
      },
    };
  }, []);
  useEffect(() => {
    let raf = 0;
    let last = 0;
    let seen = '';
    const tick = (t: number) => {
      raf = requestAnimationFrame(tick);
      if (t - last < 33) return;
      last = t;
      const live = engine.getLiveModulation();
      const next = new Map<string, number>();
      // Three decimals: finer moves draw nothing different.
      for (const [k, v] of live ?? []) next.set(k, Math.round(v * 1000) / 1000);
      const now = [...next].join('|');
      if (now === seen) return;
      seen = now;
      store.set(next);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [engine, store]);
  return store;
}

/** One destination's live offset, or undefined while it isn't moving. */
export function useLiveValue(
  live: LiveModulation,
  key: string,
): number | undefined {
  return useSyncExternalStore(live.subscribe, () => live.get(key));
}

export const clamp = (v: number, lo: number, hi: number) =>
  v < lo ? lo : v > hi ? hi : v;

// ── The knob tile ───────────────────────────────────────────────────────────

/**
 * A knob in its tile: 64 px wide, a soft square under the pointer, and the
 * violet dot at its corner while the modulation matrix moves it.
 */
export function KnobTile({
  height = TILE_PX,
  top = 10,
  modulated,
  children,
}: {
  height?: number;
  /** Where the knob sits in the tile. */
  top?: number;
  modulated: boolean;
  children: ReactNode;
}) {
  return (
    <div className="group relative shrink-0" style={{ width: TILE_PX, height }}>
      <span
        aria-hidden
        className={cn(
          'absolute inset-[3px] rounded-xl group-hover:bg-daw-device',
          TRANSITION,
        )}
      />
      {modulated ? (
        <span
          role="img"
          aria-label="Modulated"
          title="A modulation source moves this"
          className="absolute left-2 top-2 size-[7px] rounded-full bg-daw-modulation"
        />
      ) : null}
      <div className="absolute inset-x-0 flex justify-center" style={{ top }}>
        {children}
      </div>
    </div>
  );
}

/**
 * Whether an enabled route aims at a control: the dot's only question, so
 * it reads the routes rather than poll the live ring (useModIndicator ran
 * a 30 fps analyser read per dot).
 */
export const useModulated = (
  source: ModTarget['source'],
  param: ModTarget['param'],
) =>
  useSynthStore((s) =>
    s.modRoutes.some(
      (r) =>
        r.enabled && r.target.source === source && r.target.param === param,
    ),
  );

/**
 * A select on the card: 30 px, white/4, radius 8, 12 px, and a small
 * triangle in place of the kit's chevrons.
 */
export const CARD_SELECT =
  "h-[30px] w-full min-w-0 rounded-lg border-0 bg-daw-device px-2 [&>svg]:hidden after:ml-1 after:shrink-0 after:text-[length:var(--daw-font-micro)] after:leading-none after:text-daw-text after:content-['▾']";
