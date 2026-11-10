/**
 * The stage presets' backdrop (owner, 2026-11-10: one thing, big): the
 * slide's own visual painted edge to edge under its elements.
 *
 *   portrait  the subject's photo, darkened on the left for the name and bio
 *   bleed     a video (the live player on the room's screen), an interactive
 *             globe that flies from place to place, or a photo
 *
 * Painted by the stage, like the Showcase halves, so no teacher moves it and
 * the grid's footer rule holds for the slide's elements.
 */
import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { pickLocalized } from '../../presentation/localized';
import type { StudentLanguage } from '../../types';
import type { SlideSlots } from '../SlideRenderer';
import { paintsBleed, stageKindOf, stageMedia } from '../stage';
import type { Slide, SlideMedia, SlideSurface } from '../types';
import { ShowcasePhoto } from './ShowcaseBackdrop';
import { SlideMediaPanel } from './SlideMediaPanel';

const GlobeCdn = lazy(() =>
  import('@/components/ui/cobe-globe-cdn').then((m) => ({
    default: m.GlobeCdn,
  })),
);

type GlobeMedia = Extract<SlideMedia, { type: 'globePreview' }>;

/** A flight between places, then a pause on each, in ms. */
const FLIGHT_MS = 2200;
const DWELL_MS = 3200;

const WHITE: [number, number, number] = [1, 1, 1];
const DIM: [number, number, number] = [0.55, 0.55, 0.6];

/** The globe's places: its stops, else its focus. */
const stopsOf = (globe: GlobeMedia) =>
  globe.stops && globe.stops.length > 0
    ? globe.stops
    : globe.focus
      ? [{ location: globe.focus }]
      : (globe.markers ?? []).map((m) => ({ location: m.location }));

/**
 * The subject's places on a globe that fills the slide. Shown live, it flies
 * to the first, then on to each in turn, and round again; the one place in
 * view is named low on the left. Students can spin it.
 */
export const TourGlobe = ({
  globe,
  live,
  language,
}: {
  globe: GlobeMedia;
  /** Fly (a shown slide); otherwise sit still on the first place. */
  live: boolean;
  language: StudentLanguage;
}) => {
  const stops = useMemo(() => stopsOf(globe), [globe]);
  const [at, setAt] = useState(0);
  const [arrived, setArrived] = useState(!live);

  useEffect(() => {
    if (!live) return;
    // The first flight is long (from the far side); then a pause on each.
    const wait = (arrived ? 0 : FLIGHT_MS) + DWELL_MS;
    const timer = window.setTimeout(() => {
      setArrived(true);
      if (stops.length > 1) setAt((i) => (i + 1) % stops.length);
    }, wait);
    return () => window.clearTimeout(timer);
  }, [live, at, arrived, stops.length]);

  const here = stops[at];
  const markers = useMemo(
    () =>
      stops.map((stop, i) => ({
        id: `stage-stop-${i}`,
        location: stop.location,
        label: '',
        color: i === at ? WHITE : DIM,
        size: i === at ? 0.07 : 0.04,
      })),
    [stops, at],
  );
  // The story's path: one arc from each place to the next.
  const arcs = useMemo(
    () =>
      stops.slice(1).map((stop, i) => ({
        from: stops[i]!.location,
        to: stop.location,
      })),
    [stops],
  );
  const from: [number, number] | undefined =
    here && !arrived ? [0, here.location[1] - 150] : undefined;
  const label = here && 'label' in here ? here.label : undefined;

  return (
    <div className="absolute inset-0 bg-[#0b0b0d]">
      <Suspense fallback={null}>
        <GlobeCdn
          fill
          markers={markers}
          arcs={arcs}
          focus={here?.location ?? null}
          {...(from ? { focusFrom: from } : {})}
          focusMs={live ? FLIGHT_MS : 0}
          speed={0}
          scale={1.25}
          offset={[0, 0]}
        />
      </Suspense>
      {label && (
        <p
          key={at}
          className="pointer-events-none absolute bottom-[8%] left-[5%] font-semibold text-white [animation:stage-fade-in_600ms_ease-out]"
          style={{ fontSize: 'var(--slide-question-fz)' }}
        >
          {pickLocalized(label, language)}
        </p>
      )}
    </div>
  );
};

/** A video's best still, for the editor and thumbnails. */
const VideoStill = ({ videoId }: { videoId: string }) => {
  const [src, setSrc] = useState(
    `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`,
  );
  return (
    <img
      src={src}
      alt=""
      draggable={false}
      className="absolute inset-0 size-full object-cover"
      onError={() => setSrc(`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`)}
    />
  );
};

const BleedMedia = ({
  media,
  live,
  language,
  command,
}: {
  media: SlideMedia;
  live: boolean;
  language: StudentLanguage;
  command: SlideSlots['mediaCommand'];
}) => {
  switch (media.type) {
    case 'youtube':
      return (
        <div className="absolute inset-0 flex items-center bg-black">
          {live ? (
            <SlideMediaPanel
              media={media}
              language={language}
              interactive
              className="!rounded-none !border-0"
              {...(command ? { command } : {})}
            />
          ) : (
            <VideoStill videoId={media.videoId} />
          )}
        </div>
      );
    case 'globePreview':
      return <TourGlobe globe={media} live={live} language={language} />;
    case 'artistImage':
      return <ShowcasePhoto songId={media.songId} />;
    default:
      return (
        <div className="absolute inset-[64px] flex items-center justify-center">
          <SlideMediaPanel
            media={media}
            language={language}
            interactive={live}
          />
        </div>
      );
  }
};

export const StageBackdrop = ({
  slide,
  surface,
  live,
  language,
  command,
}: {
  slide: Slide;
  surface: SlideSurface;
  /** A shown slide (the room's screen, Present): videos play, globes fly. */
  live: boolean;
  language: StudentLanguage;
  command?: SlideSlots['mediaCommand'];
}) => {
  if (!paintsBleed(slide, surface)) return null;
  const media = stageMedia(slide);
  if (!media) return null;

  if (stageKindOf(slide) === 'portrait') {
    const songId = media.type === 'artistImage' ? media.songId : undefined;
    return (
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden bg-[#0b0b0d]"
      >
        {/* A portrait is tall: it stands on the right, its top (the face)
            kept, and fades into the dark the name sits on. */}
        <div
          className={`absolute inset-y-0 right-0 w-[64%] ${live ? '[animation:stage-push-in_14s_ease-out_both] motion-reduce:animate-none' : ''}`}
        >
          {songId ? (
            <ShowcasePhoto songId={songId} position="top" />
          ) : (
            <BleedMedia
              media={media}
              live={false}
              language={language}
              command={undefined}
            />
          )}
        </div>
        {/* The name and bio sit over the dark left side. */}
        <div className="absolute inset-y-0 left-0 w-[62%] [background:linear-gradient(to_right,#0b0b0d_58%,transparent)]" />
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/60 to-transparent" />
      </div>
    );
  }

  return (
    <div className="absolute inset-0 overflow-hidden">
      <BleedMedia
        media={media}
        live={live}
        language={language}
        command={command}
      />
    </div>
  );
};
