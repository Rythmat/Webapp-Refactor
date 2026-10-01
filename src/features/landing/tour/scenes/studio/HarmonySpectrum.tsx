import { motion } from 'framer-motion';
import { useEffect } from 'react';
import { KEYS } from '@prism/engine';
import { cn } from '@/components/utilities';
import {
  SPECTRUM_GRADIENT,
  SPECTRUM_ORDER,
} from '@/daw/components/Prism/ColorSpectrum';
import { displayAccidentals } from '@/daw/utils/displayAccidentals';
import { demoChord } from '../../../music';
import { rovingKeyDown, useRovingStop } from './studioHooks';
import { III_SEGMENT } from './studioScript';
import { PRESS } from './studioTokens';

/** III's color (F♯'s teal in D): the tour's `pick` target by default. */
const PICK_SEGMENT = III_SEGMENT;
/** `ColorSpectrum`'s cover over colors with nothing to offer. */
const UNAVAILABLE = 'rgba(0, 0, 0, 0.7)';

const FAMILIES: Record<number, string> = {
  13: 'melodic minor',
  14: 'harmonic minor',
  15: 'harmonic major',
  16: 'double harmonic',
};

/** "E♭’s color" / "the harmonic minor color" for a `KEY_COLORS` index. */
export const colorPhrase = (segment: number) =>
  FAMILIES[segment]
    ? `the ${FAMILIES[segment]} color`
    : `${displayAccidentals(KEYS[segment] ?? '')}’s color`;

/**
 * The HARMONY card's color spectrum: the Studio's `ColorSpectrum` look (same
 * gradient, 16 segments, unavailable colors covered) rebuilt as 16 focusable
 * buttons with roving arrow keys. Hover/focus reports the segment for the
 * readout; a click asks the scene to add that color's chord (the scene picks
 * deterministically, where the real spectrum picks at random).
 */
export const HarmonySpectrum = ({
  groups,
  keyRoot,
  keyed,
  pressed,
  cursor,
  flash,
  compact,
  onFlashDone,
  onPick,
  onHover,
}: {
  /** Lit colors (`KEY_COLORS` index → chord tokens). */
  groups: ReadonlyMap<number, readonly string[]>;
  keyRoot: number;
  /** A key is set (the spectrum stays dark and says so until then). */
  keyed: boolean;
  /** The auto cursor's pressed segment. */
  pressed: number | null;
  /** The auto cursor's later click: that segment carries the step's target. */
  cursor: { segment: number; target: string } | null;
  /** One-shot flash on a visitor's pick. */
  flash: { segment: number; n: number } | null;
  compact: boolean;
  onFlashDone: () => void;
  onPick: (segment: number) => void;
  onHover: (segment: number | null) => void;
}) => {
  const firstLit = SPECTRUM_ORDER.find((i) => groups.has(i)) ?? 1;
  const roving = useRovingStop(firstLit, SPECTRUM_ORDER);
  const pickAt = cursor?.target === 'pick' ? cursor.segment : PICK_SEGMENT;
  const tourTarget = (segment: number) =>
    segment === cursor?.segment
      ? cursor.target
      : segment === pickAt
        ? 'pick'
        : undefined;
  // Unmounting under the pointer (a dock switch) sends no pointerleave.
  useEffect(() => () => onHover(null), [onHover]);

  return (
    <div
      className="relative size-full overflow-hidden rounded-lg"
      style={{ background: SPECTRUM_GRADIENT }}
    >
      <div
        role="group"
        aria-label="Harmony colors: click one to add a chord"
        className="absolute inset-0 flex"
        onKeyDown={rovingKeyDown}
        onPointerLeave={() => onHover(null)}
      >
        {SPECTRUM_ORDER.map((segment) => {
          const tokens = groups.get(segment);
          const available = !!tokens;
          const isPressed = pressed === segment;
          const label = !keyed
            ? 'Pick a key first'
            : tokens
              ? `${colorPhrase(segment)}: ${tokens
                  .map((t) => demoChord(t, keyRoot).label)
                  .join(', ')}`
              : `Nothing in ${colorPhrase(segment)} fits next`;
          return (
            <button
              key={segment}
              type="button"
              data-roving
              data-tour-target={tourTarget(segment)}
              tabIndex={segment === roving.stop ? 0 : -1}
              aria-disabled={!available || undefined}
              aria-label={label}
              onClick={() => onPick(segment)}
              onPointerEnter={() => onHover(segment)}
              onFocus={() => {
                roving.onFocus(segment);
                onHover(segment);
              }}
              onBlur={() => onHover(null)}
              className={cn(
                'relative h-full flex-1 transition-colors duration-200 focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white',
                available ? 'hover:bg-white/15' : 'cursor-default',
              )}
              style={{
                backgroundColor: !available
                  ? UNAVAILABLE
                  : isPressed
                    ? PRESS.overlay
                    : undefined,
                boxShadow: isPressed ? PRESS.ring : undefined,
              }}
            >
              {flash?.segment === segment && (
                <motion.span
                  key={flash.n}
                  aria-hidden
                  className="absolute inset-0 bg-white"
                  initial={{ opacity: 0.55 }}
                  animate={{ opacity: 0 }}
                  transition={{ duration: 0.45 }}
                  onAnimationComplete={onFlashDone}
                />
              )}
            </button>
          );
        })}
      </div>
      {!keyed && (
        <span
          aria-hidden
          className={cn(
            'pointer-events-none absolute inset-0 grid place-items-center font-medium text-white/75',
            compact ? 'text-[14px]' : 'text-[12px]',
          )}
        >
          Pick a key to light up the spectrum
        </span>
      )}
    </div>
  );
};
