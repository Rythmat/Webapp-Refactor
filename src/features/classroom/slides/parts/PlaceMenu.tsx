import { useReducedMotion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { AppIcons } from '@/components/icons/appIcons';
import { pickLocalized } from '../../presentation/localized';
import { resolveModuleUrl } from '../../presentation/resolveModuleUrl';
import { useTeacherConfig } from '../../settings/useTeacherConfig';
import type { StudentLanguage } from '../../types';
import { projectPlaceFor, type ProjectPlace } from '../projectPlaces';
import type { SlideElement, SlideSurface } from '../types';

// ── The Individual Project's menu (owner, 2026-11-11) ──────────────────────
// Where each student works today: Learn, Songs, Library, Studio or Globe, as
// tall cards, each with a short, calm clip of its place. One plays at a time
// (owner: "too busy … calm and sleek"): a spotlight moves from card to card
// every few seconds, and the others rest on their first frame, dimmed. Hover
// or focus a card and it is the one playing, opened wide while the others
// narrow (the 21st.dev gallery the owner chose). The room's screen shows the
// five evenly, not as links; a phone stacks them. A thumbnail or reduced
// motion shows each clip's first frame, none playing, none dimmed.

/** How long the spotlight stays on a card. */
export const SPOTLIGHT_MS = 7000;

/** The place an element opens, if it is one of the five. */
const placeOf = (element: SlideElement): ProjectPlace | undefined => {
  if (element.kind !== 'content') return undefined;
  const ref =
    element.embed?.type === 'atlasCard'
      ? element.embed.ref
      : element.href.kind === 'atlas'
        ? element.href.ref
        : '';
  return projectPlaceFor(ref);
};

/**
 * The slide's places, when its call-to-action row holds nothing else: the
 * stage draws them as one menu instead of a card per element.
 */
export const placeMenuOf = (
  elements: readonly SlideElement[],
): { places: ProjectPlace[]; ids: Set<string> } | null => {
  const row = elements
    .filter((e) => e.zone === 'ctaCenter' && !e.hidden)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const places = row.map(placeOf);
  if (row.length === 0 || places.some((p) => !p)) return null;
  return {
    places: places as ProjectPlace[],
    ids: new Set(row.map((e) => e.id)),
  };
};

/** Words a narrowed card hides (its icon still names it): shown again on
 *  the open card. */
const NARROWED =
  'motion-safe:group-hover/menu:hidden motion-safe:group-focus-within/menu:hidden motion-safe:group-hover/card:!block motion-safe:group-focus-visible/card:!block';

interface PlaceMenuProps {
  places: readonly ProjectPlace[];
  surface: SlideSurface;
  language: StudentLanguage;
  /** For accessibility: the section the menu belongs to. */
  sectionLabel: string;
  /** A thumbnail: stills only. */
  still?: boolean;
  /** A phone's column: short cards stacked, no accordion. */
  stacked?: boolean;
  /**
   * A student's device in a live session: a card opens its place inside
   * the lesson instead of a new tab (the `openPlace` slot).
   */
  onOpen?: (place: ProjectPlace) => void;
}

/** A place's clip: playing from its start while active, else resting. */
const PlaceClip = ({
  clip,
  playing,
}: {
  clip: ProjectPlace['clip'];
  playing: boolean;
}) => {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (playing) {
      void video.play()?.catch(() => {
        // Autoplay refused (a browser setting): it rests on its poster.
      });
    } else {
      video.pause();
      video.currentTime = 0;
    }
  }, [playing]);
  return (
    <video
      ref={ref}
      src={clip.src}
      poster={clip.poster}
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden
      data-playing={playing || undefined}
      className="pointer-events-none absolute inset-0 size-full object-cover"
    />
  );
};

export const PlaceMenu = ({
  places,
  surface,
  language,
  sectionLabel,
  still = false,
  stacked = false,
  onOpen,
}: PlaceMenuProps) => {
  const reduce = useReducedMotion() ?? false;
  const { config } = useTeacherConfig();
  // The room's screen can't be tapped, and nobody points at it.
  const projected = surface === 'projector';
  const open = !projected && !stacked;
  const moving = !still && !reduce && !stacked;
  // The spotlight's card, and the one a hand is on (which wins).
  const [spot, setSpot] = useState(0);
  const [held, setHeld] = useState<number | null>(null);
  const active = held ?? spot;

  useEffect(() => {
    if (!moving || held !== null) return;
    const timer = window.setInterval(
      () => setSpot((at) => (at + 1) % places.length),
      SPOTLIGHT_MS,
    );
    return () => window.clearInterval(timer);
  }, [moving, held, places.length]);

  /** A hand leaves: the spotlight carries on from where it was. */
  const release = (index: number) => {
    setSpot(index);
    setHeld(null);
  };

  return (
    <div
      className={
        stacked
          ? 'flex w-full flex-col gap-2'
          : 'group/menu flex size-full gap-3'
      }
      style={{ fontSize: 'var(--slide-body-fz)' }}
    >
      {places.map((place, index) => {
        const name = pickLocalized(place.label, language);
        const Icon = AppIcons[place.id];
        const lit = !moving || index === active;
        const url =
          projected || onOpen
            ? null
            : resolveModuleUrl(
                {
                  id: place.id,
                  module: place.module,
                  activityRef: place.ref,
                },
                config.moduleUrls,
              );
        const card = `group/card relative overflow-hidden rounded-[0.5em] bg-[#141418] text-white ${
          stacked
            ? 'h-[4.5rem] w-full'
            : `min-w-0 flex-1 ${
                open
                  ? 'motion-safe:transition-[flex-grow] motion-safe:duration-500 motion-safe:ease-[cubic-bezier(.4,0,.2,1)] motion-safe:group-hover/menu:flex-[0.5] motion-safe:group-focus-within/menu:flex-[0.5] motion-safe:hover:!flex-[2] motion-safe:focus-visible:!flex-[2]'
                  : ''
              }`
        }`;
        const body = (
          <>
            <span
              aria-hidden
              className="absolute inset-0 transition-[filter] duration-700 ease-out"
              style={{ filter: lit ? undefined : 'brightness(0.55)' }}
            >
              {moving ? (
                <PlaceClip clip={place.clip} playing={index === active} />
              ) : (
                <img
                  src={place.clip.poster}
                  alt=""
                  draggable={false}
                  className="absolute inset-0 size-full object-cover"
                />
              )}
            </span>
            <span
              className={`absolute inset-x-0 bottom-0 flex items-center gap-[0.4em] from-black/75 via-black/30 to-transparent text-[0.85em] leading-none text-white/90 ${
                stacked
                  ? 'top-0 bg-gradient-to-r px-4'
                  : 'bg-gradient-to-t px-[0.85em] pb-[0.8em] pt-[3em]'
              }`}
            >
              <Icon className="size-[1em] shrink-0" aria-hidden />
              <span
                className={`min-w-0 flex-1 truncate ${open ? NARROWED : ''}`}
              >
                {name}
              </span>
              {url && (!moving || index === active) && (
                <ArrowUpRight
                  className={`size-[0.9em] shrink-0 text-white/60 ${open ? NARROWED : ''}`}
                  aria-hidden
                />
              )}
            </span>
          </>
        );
        const hand = moving
          ? {
              onPointerEnter: () => setHeld(index),
              onPointerLeave: () => release(index),
              onFocus: () => setHeld(index),
              onBlur: () => release(index),
            }
          : {};
        const focusRing =
          'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white';
        if (onOpen) {
          return (
            <button
              key={place.id}
              type="button"
              onClick={() => onOpen(place)}
              aria-label={`${name}, opens inside the lesson (${sectionLabel})`}
              data-active={index === active || undefined}
              className={`${card} text-left ${focusRing}`}
              {...hand}
            >
              {body}
            </button>
          );
        }
        return url ? (
          <a
            key={place.id}
            href={url}
            target="_blank"
            rel="noreferrer"
            aria-label={`${name}, opens ${name} (${sectionLabel})`}
            data-active={index === active || undefined}
            className={`${card} ${focusRing}`}
            {...hand}
          >
            {body}
          </a>
        ) : (
          <div
            key={place.id}
            data-active={index === active || undefined}
            className={card}
            {...hand}
          >
            {body}
          </div>
        );
      })}
    </div>
  );
};
