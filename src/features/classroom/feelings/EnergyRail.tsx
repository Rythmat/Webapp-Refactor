import { useRef, type KeyboardEvent, type PointerEvent } from 'react';
import { cn } from '@/components/utilities';
import type { StudentLanguage } from '../types';
import { FeelingFace } from './FeelingFace';
import {
  ENERGY_EMOTIONS,
  ENERGY_GRADIENT,
  energyColor,
  energyEmotion,
  energyWord,
} from './feelings';

/**
 * The energy check-in (owner, 2026-11-10): one slider, low energy on the left
 * to high on the right, cool colours to greens to warm. Drawn as the Globe's
 * era rail is: fine streaks rising off a crisp coloured rim, its bloom below,
 * a line where one zone gives way to the next, and a white grip to drag. No
 * words on it: a mark for each feeling (`ENERGY_EMOTIONS`), its face and name
 * revealed over the grip as a student slides onto it.
 *
 *   - a student: drags it (or uses the arrow keys) to where they are;
 *   - the room's screen and the editor: the slider and its marks, no grip;
 *   - the teacher: each student a dot on the rim (Rule 2: never projected).
 *
 * Sized in em, so it takes its size from where it sits (a slide's type, or
 * the teacher's panel).
 */

const say = (
  text: { en: string; es?: string | undefined },
  language: StudentLanguage,
) => (language === 'es' && text.es ? text.es : text.en);

/** The streaks rising off the rim, fading upward (the era rail's). */
const STREAKS = {
  backgroundImage:
    'repeating-linear-gradient(to right, rgba(255,255,255,0.1) 0 1px, transparent 1px 0.45em)',
  maskImage: 'linear-gradient(to top, black, transparent)',
  WebkitMaskImage: 'linear-gradient(to top, black, transparent)',
};

/**
 * The glow about the rim, brightest on it and fading every way: drawn with
 * masks, not a blur, so a band that clips its content shows no hard edge.
 */
const BLOOM_MASK =
  'linear-gradient(to bottom, transparent, black 80%, transparent), linear-gradient(to right, transparent, black 10%, black 90%, transparent)';
const BLOOM = {
  background: ENERGY_GRADIENT,
  maskImage: BLOOM_MASK,
  maskComposite: 'intersect',
  WebkitMaskImage: BLOOM_MASK,
  WebkitMaskComposite: 'source-in',
} as const;

const STEP = 5;

export const EnergyRail = ({
  value = null,
  onChange,
  disabled = false,
  points,
  language = 'en',
  className,
}: {
  /** Where the grip is, 0–100; null before a student has moved it. */
  value?: number | null;
  /** A student's slider; without it the rail is a picture. */
  onChange?: (value: number) => void;
  disabled?: boolean;
  /** The teacher's view: each student where they put it. */
  points?: readonly { value: number; name: string }[];
  language?: StudentLanguage;
  className?: string;
}) => {
  const railRef = useRef<HTMLDivElement>(null);
  const live = Boolean(onChange) && !disabled;

  const setFrom = (clientX: number) => {
    const rect = railRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || !onChange) return;
    const share = (clientX - rect.left) / rect.width;
    onChange(Math.round(Math.min(1, Math.max(0, share)) * 100));
  };
  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (!live) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    setFrom(e.clientX);
  };
  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!live || !e.currentTarget.hasPointerCapture(e.pointerId)) return;
    setFrom(e.clientX);
  };
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (!live || !onChange) return;
    const at = value ?? 50;
    const next =
      e.key === 'ArrowLeft' || e.key === 'ArrowDown'
        ? at - STEP
        : e.key === 'ArrowRight' || e.key === 'ArrowUp'
          ? at + STEP
          : e.key === 'Home'
            ? 0
            : e.key === 'End'
              ? 100
              : null;
    if (next === null) return;
    e.preventDefault();
    e.stopPropagation();
    onChange(Math.min(100, Math.max(0, next)));
  };

  const shown = value ?? 50;
  // Nothing is revealed until a student has moved the grip.
  const emotion = onChange && value !== null ? energyEmotion(value) : null;

  return (
    <div
      data-energy-rail=""
      className={cn('flex w-full select-none flex-col', className)}
    >
      {/* The feeling the grip is on, over it; its room kept from the start
          so nothing moves when it appears. Clamped clear of the ends. */}
      {onChange && (
        <div aria-hidden className="relative h-[2.7em]">
          {emotion && (
            <div
              key={emotion.id}
              data-energy-emotion={emotion.id}
              className="absolute bottom-[-0.55em] z-10 flex -translate-x-1/2 flex-col items-center gap-[0.25em] duration-150 animate-in fade-in zoom-in-90 motion-reduce:zoom-in-100"
              style={{ left: `clamp(2.6em, ${shown}%, calc(100% - 2.6em))` }}
            >
              <FeelingFace
                face={emotion.face}
                color={energyColor(shown)}
                className="size-[1.9em]"
              />
              <span className="whitespace-nowrap text-[0.8em] font-bold leading-none text-white">
                {say(emotion.word, language)}
              </span>
            </div>
          )}
        </div>
      )}

      {/* The rail: the streaks, the bloom, the rim; where the zones meet. */}
      <div
        ref={railRef}
        className={cn(
          'relative h-[2.2em] touch-none',
          live && 'cursor-pointer',
        )}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
      >
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-[0.45em] h-[1.75em] opacity-80"
          style={STREAKS}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[2.2em] opacity-45"
          style={BLOOM}
        />
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-0 bottom-[0.45em] h-[0.18em] rounded-full"
          style={{ background: ENERGY_GRADIENT }}
        />
        {[1, 2].map((n) => (
          <div
            key={n}
            aria-hidden
            className="pointer-events-none absolute bottom-[0.45em] h-[1.5em] w-px bg-gradient-to-t from-white/55 to-transparent"
            style={{ left: `${(n * 100) / 3}%` }}
          />
        ))}

        {/* A mark for each feeling; the one under the grip lit. */}
        {ENERGY_EMOTIONS.map((e) => (
          <span
            key={e.id}
            aria-hidden
            className={cn(
              'pointer-events-none absolute bottom-[0.54em] size-[0.28em] -translate-x-1/2 translate-y-1/2 rounded-full bg-white transition-opacity duration-150',
              emotion?.id === e.id ? 'opacity-100' : 'opacity-40',
            )}
            style={{ left: `${e.at}%` }}
          />
        ))}

        {/* The teacher's view: every student on the rim. */}
        {points?.map((p, i) => (
          <span
            key={`${p.name}-${i}`}
            title={`${p.name}: ${say(energyWord(p.value), language)}`}
            className="absolute bottom-[0.54em] size-[0.6em] -translate-x-1/2 translate-y-1/2 rounded-full ring-2 ring-[#141418]"
            style={{ left: `${p.value}%`, background: energyColor(p.value) }}
          />
        ))}

        {/* A student's grip. */}
        {onChange && (
          <button
            type="button"
            role="slider"
            aria-label="How much energy you have"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={shown}
            aria-valuetext={say(energyWord(shown), language)}
            disabled={disabled}
            onKeyDown={onKeyDown}
            className={cn(
              'absolute bottom-[0.54em] flex h-[1.15em] w-[1.6em] -translate-x-1/2 translate-y-1/2 items-center justify-center gap-[0.12em] rounded-full bg-white shadow-lg ring-2 ring-[#141418] transition-[opacity,scale] duration-150 focus-visible:outline-none focus-visible:ring-white',
              value === null && 'opacity-60',
              live && 'hover:scale-110',
            )}
            style={{ left: `${shown}%` }}
          >
            {[0, 1, 2].map((g) => (
              <span
                key={g}
                aria-hidden
                className="h-[0.5em] w-px bg-[#141418]"
              />
            ))}
          </button>
        )}
      </div>
    </div>
  );
};
