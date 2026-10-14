import * as Popover from '@radix-ui/react-popover';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, Earth, Info, Play, X } from 'lucide-react';
import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { AtlasVideo } from '@/components/atlas/components/UI/AtlasVideo';
import { GenreBadge } from '@/components/atlas/components/UI/GenreBadge';
import {
  ATLAS_FOCUS,
  ATLAS_NO_EXIT_ANIMATION,
  ATLAS_POPOVER,
  AtlasEyebrow,
  AtlasPillButton,
} from '@/components/atlas/components/UI/primitives';
import { eventImage } from '@/components/atlas/data/eventImage';
import { eraOfYear } from '@/components/atlas/data/musicalEras';
import type { TimelineEvent } from '@/components/atlas/data/timelineIndex';
import { useEscapeLayer } from '@/components/atlas/hooks/useEscapeLayer';
import { useAtlasPortal } from '@/components/atlas/layout/portalRoot';
import { ATLAS_Z } from '@/components/atlas/theme/layers';
import { eventPlaceName } from '@/components/atlas/utils/eventPlace';
import { cn } from '@/lib/utils';

/** The curves of theme/motion.ts, as framer-motion takes them. */
const EASE_OUT = [0.23, 1, 0.32, 1] as const;
const EASE_IN_OUT = [0.77, 0, 0.175, 1] as const;

export interface StageRect {
  top: number;
  height: number;
}

/**
 * An event opened on the timeline, after Dorot's: its lane's band grows to
 * hold it, and it sits on the band as a stadium-shaped card — its picture a
 * round end, its title large, its year and place, its story. The arrows at
 * either side walk the lane, a moment at a time; Escape or the close button
 * fold it back into the river. Pressing the picture plays its video in
 * place.
 *
 * Mounted under AnimatePresence (TimeRiver), so it grows out of its lane
 * and folds back into it.
 */
export function EventStage({
  item,
  laneLabel,
  colors,
  from,
  stage,
  narrow,
  prev,
  next,
  position,
  reducedMotion,
  onStep,
  onClose,
  onShowOnGlobe,
}: {
  item: TimelineEvent;
  laneLabel: string;
  /** The lane's two colours, which the grown band keeps. */
  colors: [string, string];
  /** The lane's band, where the stage grows from and folds back to. */
  from: StageRect;
  /** Where the grown band sits. */
  stage: StageRect;
  narrow: boolean;
  prev?: TimelineEvent;
  next?: TimelineEvent;
  /** "4 of 37". */
  position: { index: number; total: number };
  reducedMotion: boolean;
  onStep: (to: TimelineEvent, direction: 1 | -1) => void;
  onClose: () => void;
  onShowOnGlobe: () => void;
}) {
  const { event } = item;
  const titleId = useId();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const portal = useAtlasPortal();
  const [direction, setDirection] = useState<1 | -1>(1);
  const [playing, setPlaying] = useState(false);
  const [hint, setHint] = useState<'prev' | 'next' | null>(null);
  const era = eraOfYear(event.year);
  const picture = eventImage(event, 'stage');
  const time = reducedMotion ? 0 : 1;

  // A new event starts on its picture, not its video.
  const [shownId, setShownId] = useState(event.id);
  if (shownId !== event.id) {
    setShownId(event.id);
    setPlaying(false);
  }

  // Focus comes to the title as the stage opens and as it steps, so a
  // screen reader hears where it is.
  useLayoutEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
  }, [event.id]);

  useEscapeLayer(true, onClose);

  const step = (to: TimelineEvent | undefined, dir: 1 | -1) => {
    if (!to) return;
    setDirection(dir);
    setHint(null);
    onStep(to, dir);
  };

  // ← and → walk the lane while the stage is open.
  const stepRef = useRef(step);
  stepRef.current = step;
  const near = useRef({ prev, next });
  near.current = { prev, next };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.defaultPrevented) return;
      const target = e.target as HTMLElement | null;
      if (
        target?.closest('input, textarea, select, [contenteditable="true"]')
      ) {
        return;
      }
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        stepRef.current(near.current.prev, -1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        stepRef.current(near.current.next, 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const cardHeight = narrow
    ? stage.height - 24
    : Math.min(400, stage.height - 56);
  const disc = narrow ? Math.min(150, cardHeight * 0.42) : cardHeight;
  const videoWidth = (disc * 16) / 9;

  const arrow = (side: 'prev' | 'next') => {
    const to = side === 'prev' ? prev : next;
    const Icon = side === 'prev' ? ChevronLeft : ChevronRight;
    return (
      <div
        className={cn('absolute', side === 'prev' ? 'left-5' : 'right-5')}
        style={{ top: stage.top + stage.height / 2, translate: '0 -50%' }}
      >
        <button
          aria-label={
            to
              ? `${side === 'prev' ? 'Earlier' : 'Later'}: ${to.event.title}`
              : side === 'prev'
                ? 'No earlier moment here'
                : 'No later moment here'
          }
          className={cn(
            'flex size-14 shrink-0 items-center justify-center rounded-full border-2 border-white/80 bg-atlas-page/40 text-white transition-[scale,background-color] duration-150 [transition-timing-function:var(--ease-out)] hover:bg-atlas-page/70 active:scale-95 disabled:cursor-not-allowed disabled:border-dashed disabled:border-white/30 disabled:text-white/30',
            ATLAS_FOCUS,
          )}
          disabled={!to}
          type="button"
          onBlur={() => setHint(null)}
          onClick={() => step(to, side === 'prev' ? -1 : 1)}
          onFocus={() => setHint(side)}
          onPointerEnter={() => setHint(side)}
          onPointerLeave={() => setHint(null)}
        >
          <Icon aria-hidden className="size-6" />
        </button>
        {/* Where the arrow goes, as Dorot shows it: under the arrow, along
            the band's edge, clear of the card's text. */}
        {hint === side && to && !narrow && (
          <span
            aria-hidden
            className={cn(
              'atlas-river-tooltip absolute top-full mt-3 w-max max-w-56 truncate rounded-full bg-atlas-page/85 px-3 py-1 text-sm font-bold text-white',
              side === 'prev' ? 'left-0' : 'right-0',
            )}
            data-flip={side === 'next'}
          >
            {to.event.title}
          </span>
        )}
      </div>
    );
  };

  return (
    <div
      aria-labelledby={titleId}
      className={cn('absolute inset-0', ATLAS_Z.panels)}
      role="dialog"
    >
      {/* The lane's band, grown from where it ran. */}
      <motion.div
        animate={{ transform: 'translateY(0px) scaleY(1)', opacity: 0.85 }}
        aria-hidden
        className="absolute inset-x-0 origin-top"
        exit={{
          transform: `translateY(${from.top - stage.top}px) scaleY(${
            from.height / stage.height
          })`,
          opacity: 0,
          transition: {
            duration: 0.42 * time,
            ease: EASE_IN_OUT,
            opacity: { delay: 0.3 * time, duration: 0.12 * time },
          },
        }}
        initial={{
          transform: `translateY(${from.top - stage.top}px) scaleY(${
            from.height / stage.height
          })`,
          opacity: 0.85,
        }}
        style={{
          top: stage.top,
          height: stage.height,
          background: `linear-gradient(90deg, ${colors[0]}, ${colors[1]})`,
        }}
        transition={{ duration: 0.45 * time, ease: EASE_IN_OUT }}
      />

      <motion.div
        animate={{ opacity: 1, transform: 'scale(1)' }}
        className="absolute inset-0"
        exit={{
          opacity: 0,
          transform: 'scale(0.98)',
          transition: { duration: 0.15 * time, ease: EASE_OUT },
        }}
        initial={{ opacity: 0, transform: 'scale(0.97)' }}
        transition={{
          delay: 0.22 * time,
          duration: 0.3 * time,
          ease: EASE_OUT,
        }}
      >
        {/* The card: a stadium on the band. */}
        <div
          className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            top: stage.top + stage.height / 2,
            width: narrow
              ? 'calc(100% - 24px)'
              : 'min(1120px, calc(100% - 200px))',
            height: cardHeight,
          }}
        >
          <div
            className={cn(
              'relative h-full overflow-hidden border border-white/15 bg-atlas-panel text-atlas-text shadow-2xl',
              narrow ? 'rounded-[2rem]' : 'rounded-full',
            )}
          >
            <AnimatePresence
              custom={direction}
              initial={false}
              mode="popLayout"
            >
              <motion.div
                key={event.id}
                animate={{ opacity: 1, transform: 'translateX(0px)' }}
                className={cn(
                  'absolute inset-0 flex',
                  narrow ? 'flex-col items-center p-4 pt-5' : 'items-stretch',
                )}
                custom={direction}
                exit={{
                  opacity: 0,
                  transform: `translateX(${-direction * 24}px)`,
                  transition: { duration: 0.15 * time, ease: EASE_OUT },
                }}
                initial={{
                  opacity: 0,
                  transform: `translateX(${direction * 24}px)`,
                }}
                transition={{ duration: 0.22 * time, ease: EASE_OUT }}
              >
                {/* The picture, the card's round end; pressed, the video. */}
                <motion.div
                  className={cn(
                    'relative shrink-0 overflow-hidden bg-black',
                    playing ? 'rounded-2xl' : 'rounded-full',
                    narrow ? '' : 'my-auto',
                  )}
                  layout
                  style={{
                    width: playing ? videoWidth : disc,
                    height: playing
                      ? narrow
                        ? (videoWidth * 9) / 16
                        : disc
                      : disc,
                    marginLeft: narrow ? 0 : playing ? 16 : 0,
                  }}
                  transition={{ duration: 0.35 * time, ease: EASE_IN_OUT }}
                >
                  {playing && event.videoId ? (
                    <AtlasVideo
                      autoplay
                      className="size-full"
                      title={event.title}
                      videoId={event.videoId}
                    />
                  ) : (
                    <button
                      aria-label={
                        event.videoId
                          ? `Play the video: ${event.title}`
                          : event.title
                      }
                      className={cn(
                        'group/disc relative size-full',
                        ATLAS_FOCUS,
                      )}
                      disabled={!event.videoId}
                      type="button"
                      onClick={() => setPlaying(true)}
                    >
                      {picture ? (
                        <img
                          alt=""
                          className="size-full scale-[1.34] object-cover transition-transform duration-500 [transition-timing-function:var(--ease-out)] group-hover/disc:scale-[1.4]"
                          src={picture}
                        />
                      ) : (
                        <span className="block size-full bg-white/10" />
                      )}
                      {event.videoId && (
                        <span
                          aria-hidden
                          className="absolute left-1/2 top-1/2 flex size-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white opacity-80 transition-[opacity,scale] duration-200 group-hover/disc:scale-110 group-hover/disc:opacity-100"
                        >
                          <Play
                            aria-hidden
                            className="ml-0.5 size-6 fill-current"
                          />
                        </span>
                      )}
                    </button>
                  )}
                </motion.div>

                {/* The words. */}
                <motion.div
                  className={cn(
                    'flex min-h-0 min-w-0 flex-1 flex-col',
                    narrow ? 'mt-4 w-full' : 'justify-center py-8 pl-10',
                  )}
                  layout="position"
                  style={
                    narrow ? undefined : { paddingRight: cardHeight * 0.32 }
                  }
                  transition={{ duration: 0.35 * time, ease: EASE_IN_OUT }}
                >
                  <AtlasEyebrow>
                    {laneLabel} · {era.label} · {position.index} of{' '}
                    {position.total}
                  </AtlasEyebrow>
                  <h2
                    ref={titleRef}
                    className="mt-2 text-2xl font-bold leading-tight tracking-[-0.01em] text-atlas-text outline-none md:text-3xl xl:text-4xl"
                    id={titleId}
                    tabIndex={-1}
                  >
                    {event.title}
                  </h2>
                  <p className="mt-1 text-lg text-atlas-text-2">
                    {event.year}, {eventPlaceName(event)}
                  </p>
                  <div className="atlas-stage-story mt-3 min-h-0 flex-1 overflow-y-auto pr-2 text-sm leading-relaxed text-atlas-text-2 md:text-base">
                    {event.description}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {event.genre.slice(0, 4).map((g) => (
                      <GenreBadge key={g} genre={g} />
                    ))}
                  </div>
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {event.videoId && !playing && (
                      <AtlasPillButton
                        variant="primary"
                        onClick={() => setPlaying(true)}
                      >
                        <Play aria-hidden className="size-4 fill-current" />
                        Play
                      </AtlasPillButton>
                    )}
                    <AtlasPillButton onClick={onShowOnGlobe}>
                      <Earth aria-hidden className="size-4" />
                      Show on the globe
                    </AtlasPillButton>
                  </div>
                </motion.div>
              </motion.div>
            </AnimatePresence>

            {/* Where the picture comes from. */}
            {picture && (
              <Popover.Root>
                <Popover.Trigger asChild>
                  <button
                    aria-label="About this picture"
                    className={cn(
                      'absolute flex size-8 items-center justify-center rounded-full border border-white/20 bg-atlas-page/70 text-atlas-text-2 hover:text-atlas-text',
                      narrow ? 'right-3 top-3' : 'bottom-[18%] right-[6%]',
                      ATLAS_FOCUS,
                    )}
                    type="button"
                  >
                    <Info aria-hidden className="size-4" />
                  </button>
                </Popover.Trigger>
                <Popover.Portal container={portal}>
                  <Popover.Content
                    className={cn(
                      ATLAS_POPOVER,
                      ATLAS_Z.popovers,
                      ATLAS_NO_EXIT_ANIMATION,
                      'max-w-64 p-3 text-xs text-atlas-text-2',
                    )}
                    collisionPadding={8}
                    side="top"
                    sideOffset={6}
                  >
                    A still from this moment’s video on YouTube.
                    {event.videoId && (
                      <>
                        {' '}
                        <a
                          className="font-bold text-atlas-text underline-offset-2 hover:underline"
                          href={`https://www.youtube.com/watch?v=${event.videoId}`}
                          rel="noreferrer"
                          target="_blank"
                        >
                          Watch on YouTube
                        </a>
                      </>
                    )}
                  </Popover.Content>
                </Popover.Portal>
              </Popover.Root>
            )}
          </div>
        </div>

        {!narrow && arrow('prev')}
        {!narrow && arrow('next')}

        {/* Close, below the band; on a phone, the arrows beside it. */}
        <div
          className="absolute left-1/2 flex -translate-x-1/2 items-center gap-4"
          style={{ top: stage.top + stage.height + 14 }}
        >
          {narrow && (
            <button
              aria-label={
                prev ? `Earlier: ${prev.event.title}` : 'No earlier moment here'
              }
              className={cn(
                'flex size-11 items-center justify-center rounded-full border border-white/40 text-white disabled:opacity-30',
                ATLAS_FOCUS,
              )}
              disabled={!prev}
              type="button"
              onClick={() => step(prev, -1)}
            >
              <ChevronLeft aria-hidden className="size-5" />
            </button>
          )}
          <button
            aria-label="Close"
            className={cn(
              'flex size-12 items-center justify-center rounded-full border-2 border-white/70 bg-atlas-page/60 text-white transition-[scale,background-color] duration-150 [transition-timing-function:var(--ease-out)] hover:bg-atlas-page active:scale-95',
              ATLAS_FOCUS,
            )}
            title="Back to the river (Esc)"
            type="button"
            onClick={onClose}
          >
            <X aria-hidden className="size-5" />
          </button>
          {narrow && (
            <button
              aria-label={
                next ? `Later: ${next.event.title}` : 'No later moment here'
              }
              className={cn(
                'flex size-11 items-center justify-center rounded-full border border-white/40 text-white disabled:opacity-30',
                ATLAS_FOCUS,
              )}
              disabled={!next}
              type="button"
              onClick={() => step(next, 1)}
            >
              <ChevronRight aria-hidden className="size-5" />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
