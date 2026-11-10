/**
 * A slide's globe is the Globe section's own map (owner, 2026-11-10): the
 * MapLibre globe with its lifted regions, pins and cards, framed from its
 * own page (`slides/globe/SlideGlobePage.tsx`, `/globe/slide`). The slide
 * opens it on the first of the subject's places; on the room's screen a small
 * arrow moves it to the next, and the map flies there as it does in the
 * Globe section.
 *
 *   room's screen, Present  the map, the place's story card, the arrow
 *   a student's device      the same, on their own map (on a phone, the card
 *                           and the arrow sit under the map)
 *   the editor's canvas     the map, not taking the pointer (the slide is
 *                           still selected by clicking it)
 *   thumbnails (still)      a dark tile naming the places: no WebGL
 */
import { ChevronRight, Globe2 } from 'lucide-react';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { GlobeRoutes } from '@/constants/routes';
import { pickLocalized } from '../../presentation/localized';
import type { StudentLanguage } from '../../types';
import {
  SLIDE_GLOBE_GO,
  isSlideGlobeKey,
  stopParams,
} from '../globe/slideGlobeStops';
import { SLIDE_CANVAS } from '../slideLayout';
import type { SlideMedia } from '../types';
import { ShowcasePhoto } from './ShowcaseBackdrop';

type GlobeMedia = Extract<SlideMedia, { type: 'globePreview' }>;

/**
 * The stage's scale (design px → screen px), so a framed page can be laid
 * out at the screen's own size and stay sharp on a big projector. Null
 * outside a fitted stage (a phone's reflow), where the frame fills its box.
 */
export const StageScaleContext = createContext<number | null>(null);

/** The card's width and margin on the slide, in design px. */
const CARD_W = 460;
const CARD_M = 40;
/** What the card covers of the map, as a share of its width. */
const CARD_SHARE = ((CARD_M * 2 + CARD_W) / SLIDE_CANVAS.w).toFixed(3);

type GlobeStop = NonNullable<GlobeMedia['stops']>[number];

/** The page the frame opens: the first place, as the Globe's own address. */
const firstSrc = (globe: GlobeMedia, withCard: boolean): string => {
  const ref = globe.stops?.find((s) => s.ref)?.ref;
  const params = ref ? stopParams(ref) : null;
  return GlobeRoutes.slide(undefined, {
    ...(params ?? {}),
    ...(withCard ? { left: CARD_SHARE } : {}),
  });
};

/**
 * The story's picture: the event's video still, or (when the video is gone,
 * which YouTube answers with a small grey placeholder) the subject's photo.
 */
const StoryPicture = ({
  story,
}: {
  story: NonNullable<GlobeStop['story']>;
}) => {
  const [videoGone, setVideoGone] = useState(false);
  if (story.videoId && !videoGone)
    return (
      <img
        src={`https://i.ytimg.com/vi/${story.videoId}/mqdefault.jpg`}
        alt=""
        draggable={false}
        className="aspect-video w-full shrink-0 object-cover"
        onLoad={(e) => {
          if (e.currentTarget.naturalWidth < 200) setVideoGone(true);
        }}
        onError={() => setVideoGone(true)}
      />
    );
  if (story.songId)
    return (
      <div className="relative aspect-video w-full shrink-0">
        <ShowcasePhoto songId={story.songId} position="top" />
      </div>
    );
  return null;
};

/**
 * Why this place matters to the subject (owner, 2026-11-10): the place and
 * year, what happened there, and the sentence that ties it to them.
 */
const StoryCard = ({
  stop,
  language,
  stacked,
}: {
  stop: GlobeStop;
  language: StudentLanguage;
  /** A phone: under the map, not over it. */
  stacked: boolean;
}) => {
  const story = stop.story;
  if (!story) return null;
  return (
    <article
      className={`flex flex-col overflow-hidden border border-white/10 bg-[#141418] text-white [animation:stage-fade-in_500ms_ease-out] ${
        stacked
          ? 'rounded-xl'
          : 'absolute rounded-[24px] shadow-[0_24px_60px_rgba(0,0,0,0.55)]'
      }`}
      style={
        stacked
          ? undefined
          : { left: CARD_M, top: CARD_M, width: CARD_W, maxHeight: 640 }
      }
    >
      <StoryPicture story={story} />
      <div
        className={`flex min-h-0 flex-col ${stacked ? 'gap-2 p-4' : 'gap-[12px] p-[28px]'}`}
      >
        {stop.label && (
          <p
            className={`font-semibold uppercase tracking-[0.08em] text-white/55 ${
              stacked ? 'text-[0.75rem]' : 'text-[17px]'
            }`}
          >
            {pickLocalized(stop.label, language)}
          </p>
        )}
        <h3
          className={`font-semibold leading-tight ${stacked ? 'text-[1.125rem]' : 'text-[30px]'}`}
        >
          {pickLocalized(story.title, language)}
        </h3>
        {story.body && (
          <p
            className={`leading-snug text-white/75 ${stacked ? 'text-[0.9375rem]' : 'text-[21px]'}`}
          >
            {pickLocalized(story.body, language)}
          </p>
        )}
      </div>
    </article>
  );
};

/** The places, named, for a still preview. */
const StillGlobe = ({
  globe,
  language,
}: {
  globe: GlobeMedia;
  language: StudentLanguage;
}) => (
  <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-[#0b0b10] text-white/70">
    <Globe2 aria-hidden className="size-[120px] text-white/25" />
    <p className="text-[28px]">
      {(globe.stops ?? [])
        .map((s) => (s.label ? pickLocalized(s.label, language) : ''))
        .filter(Boolean)
        .join('  →  ')}
    </p>
  </div>
);

export const SlideGlobe = ({
  globe,
  language,
  still = false,
  inert = false,
}: {
  globe: GlobeMedia;
  language: StudentLanguage;
  /**
   * The room's screen or Present. Kept for callers: every surface but the
   * editor's canvas steps through the places (a student, on their own map).
   */
  live?: boolean;
  /** A thumbnail: no map at all. */
  still?: boolean;
  /** The editor's canvas: the map shows but does not take the pointer. */
  inert?: boolean;
}) => {
  const scale = useContext(StageScaleContext);
  const frame = useRef<HTMLIFrameElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [at, setAt] = useState(0);
  // Opened once, on the first place; later places are messages, not reloads.
  const stops = (globe.stops ?? []).filter((s) => s.ref);
  // On a fitted slide the card sits over the map's left; on a phone, below.
  const stacked = !(scale && scale > 0);
  const withCard = !stacked && stops.some((s) => s.story);
  const src = useMemo(() => firstSrc(globe, withCard), [globe, withCard]);
  const here = stops[at];

  // The map's frame takes the keyboard once it is touched: the keys that
  // move the lesson (the arrows, Space, Page Up/Down) come back from it and
  // are replayed on the document, where Present and the projector listen.
  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (e.source !== frame.current?.contentWindow) return;
      if (!isSlideGlobeKey(e.data)) return;
      document.dispatchEvent(new KeyboardEvent('keydown', { key: e.data.key }));
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  if (still) return <StillGlobe globe={globe} language={language} />;

  const next = () => {
    if (stops.length < 2) return;
    const to = (at + 1) % stops.length;
    setAt(to);
    frame.current?.contentWindow?.postMessage(
      { type: SLIDE_GLOBE_GO, ref: stops[to]!.ref },
      window.location.origin,
    );
  };

  // Laid out at the screen's size and scaled back into the design canvas.
  const box =
    scale && scale > 0
      ? {
          width: SLIDE_CANVAS.w * scale,
          height: SLIDE_CANVAS.h * scale,
          transform: `scale(${1 / scale})`,
          transformOrigin: '0 0',
        }
      : { width: '100%', height: '100%' };

  const arrow =
    !inert && stops.length > 1 ? (
      <div
        className={`flex items-center rounded-full bg-black/60 ${
          stacked
            ? 'gap-2 self-end px-3 py-2'
            : 'absolute bottom-[40px] right-[40px] gap-[16px] px-[20px] py-[12px]'
        }`}
      >
        {stops.map((stop, i) => (
          <span
            key={stop.ref}
            aria-hidden
            className={`rounded-full transition-colors ${
              stacked ? 'size-2' : 'size-[12px]'
            } ${i === at ? 'bg-white' : 'bg-white/30'}`}
          />
        ))}
        <button
          type="button"
          onClick={next}
          aria-label="Next place"
          className={`flex items-center justify-center rounded-full bg-white text-black transition-transform hover:scale-105 ${
            stacked ? 'ml-1 size-9' : 'ml-[8px] size-[56px]'
          }`}
        >
          <ChevronRight
            aria-hidden
            className={stacked ? 'size-5' : 'size-[32px]'}
          />
        </button>
      </div>
    ) : null;

  const map = (
    <div
      className={`overflow-hidden bg-black ${
        stacked
          ? 'relative aspect-square w-full rounded-xl'
          : 'absolute inset-0'
      }`}
    >
      <iframe
        ref={frame}
        title="Globe"
        src={src}
        onLoad={() => setLoaded(true)}
        className={`absolute left-0 top-0 border-0 transition-opacity duration-700 ${
          loaded ? 'opacity-100' : 'opacity-0'
        } ${inert ? 'pointer-events-none' : ''}`}
        style={box}
        // The app's own page, from its own origin.
        sandbox="allow-scripts allow-same-origin"
      />
      {!stacked && here && (
        <StoryCard key={at} stop={here} language={language} stacked={false} />
      )}
      {!stacked && arrow}
    </div>
  );

  if (!stacked) return map;
  // A phone: the map, then the place's story, then the arrow.
  return (
    <div className="flex flex-col gap-3">
      {map}
      {here && <StoryCard key={at} stop={here} language={language} stacked />}
      {arrow}
    </div>
  );
};
