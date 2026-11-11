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
import { ChevronLeft, ChevronRight, Globe2, Play } from 'lucide-react';
import {
  Suspense,
  createContext,
  lazy,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { GlobeRoutes } from '@/constants/routes';
import { pickLocalized } from '../../presentation/localized';
import { PresentControlsContext } from '../../presentation/presentControls';
import type { LocalizedText, StudentLanguage } from '../../types';
import {
  SLIDE_GLOBE_GO,
  encodePath,
  isSlideGlobeKey,
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

const YouTubeSlidePlayer = lazy(() => import('./YouTubeSlidePlayer'));

/** A card's clip starts as it opens: it was tapped to play. */
const PLAY_NOW = { action: 'play', cmdId: 1 } as const;

/** The card's width and margin on the slide, in design px. */
const CARD_W = 460;
const CARD_M = 40;
/** What the card covers of the map, as a share of its width. */
const CARD_SHARE = ((CARD_M * 2 + CARD_W) / SLIDE_CANVAS.w).toFixed(3);
/**
 * What the place controls over the map's foot cover, as a share of its
 * height: their 86 px band 40 px up, and room above it.
 */
const FOOT_SHARE = (144 / SLIDE_CANVAS.h).toFixed(3);

type GlobeStop = NonNullable<GlobeMedia['stops']>[number];

/**
 * The page the frame opens: the story's places, from the first, and what the
 * slide covers of the map (on a phone the card and the arrow sit under it).
 */
const firstSrc = (
  globe: GlobeMedia,
  overMap: { card: boolean; controls: boolean },
): string =>
  GlobeRoutes.slide(undefined, {
    path: encodePath((globe.stops ?? []).map((s) => s.location)),
    at: '0',
    ...(overMap.card ? { left: CARD_SHARE } : {}),
    ...(overMap.controls ? { foot: FOOT_SHARE } : {}),
  });

/**
 * The story's picture: the event's video still, or (when the video is gone,
 * which YouTube answers with a small grey placeholder) the subject's photo.
 */
const StoryPicture = ({
  story,
  playable,
  stacked,
}: {
  story: NonNullable<GlobeStop['story']>;
  /** Not on the editor's canvas: there the card is only looked at. */
  playable: boolean;
  stacked: boolean;
}) => {
  const [videoGone, setVideoGone] = useState(false);
  const [playing, setPlaying] = useState(false);
  if (story.videoId && !videoGone && playing)
    return (
      <div className="aspect-video w-full shrink-0 bg-black">
        <Suspense fallback={null}>
          <YouTubeSlidePlayer
            videoId={story.videoId}
            className="!rounded-none !border-0"
            // Started by the tap that asked for it.
            command={PLAY_NOW}
          />
        </Suspense>
      </div>
    );
  if (story.videoId && !videoGone)
    return (
      <div className="group relative aspect-video w-full shrink-0">
        <img
          src={`https://i.ytimg.com/vi/${story.videoId}/mqdefault.jpg`}
          alt=""
          draggable={false}
          className="size-full object-cover"
          onLoad={(e) => {
            if (e.currentTarget.naturalWidth < 200) setVideoGone(true);
          }}
          onError={() => setVideoGone(true)}
        />
        {playable && (
          <button
            type="button"
            onClick={() => setPlaying(true)}
            aria-label="Play the clip"
            className="absolute inset-0 flex items-center justify-center bg-black/10 transition-colors hover:bg-black/25"
          >
            <span
              className={`flex items-center justify-center rounded-full bg-white text-black shadow-lg transition-transform group-hover:scale-105 ${
                stacked ? 'size-12' : 'size-[72px]'
              }`}
            >
              <Play
                aria-hidden
                className={`fill-current ${stacked ? 'size-5' : 'size-[30px]'} translate-x-[2px]`}
              />
            </span>
          </button>
        )}
      </div>
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
/**
 * The card's pages: the story itself, then any it carries (a song that
 * sampled or covered the music there), each with its own words and clip.
 */
const pagesOf = (
  story: NonNullable<GlobeStop['story']>,
): {
  tab?: LocalizedText | undefined;
  label?: LocalizedText | undefined;
  title: LocalizedText;
  body?: LocalizedText | undefined;
  videoId?: string | undefined;
}[] => [
  {
    tab: story.tab,
    title: story.title,
    body: story.body,
    videoId: story.videoId,
  },
  ...(story.pages ?? []),
];

/**
 * The way to a card's next page (owner, 2026-11-10: a chevron at the card's
 * bottom right, no toggle): on to the next, and from the last back to the
 * first. Named by the page it goes to.
 */
const PageChevron = ({
  pages,
  page,
  onPage,
  language,
  stacked,
}: {
  pages: { tab?: LocalizedText | undefined }[];
  page: number;
  onPage: (page: number) => void;
  language: StudentLanguage;
  stacked: boolean;
}) => {
  const last = page >= pages.length - 1;
  const to = last ? 0 : page + 1;
  const tab = pages[to]?.tab;
  const Icon = last ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={() => onPage(to)}
      aria-label={
        tab
          ? `${last ? 'Back' : 'Next'}: ${pickLocalized(tab, language)}`
          : last
            ? 'Back to the first page'
            : 'Next page'
      }
      className={`flex shrink-0 items-center justify-center self-end rounded-full bg-white text-black transition-transform hover:scale-105 ${
        stacked ? 'size-9' : 'size-[48px]'
      }`}
    >
      <Icon aria-hidden className={stacked ? 'size-5' : 'size-[26px]'} />
    </button>
  );
};

const StoryCard = ({
  stop,
  language,
  stacked,
  playable,
}: {
  stop: GlobeStop;
  language: StudentLanguage;
  /** A phone: under the map, not over it. */
  stacked: boolean;
  /** The clip plays from the card (not on the editor's canvas). */
  playable: boolean;
}) => {
  const [page, setPage] = useState(0);
  const story = stop.story;
  if (!story) return null;
  const pages = pagesOf(story);
  const shown = pages[page] ?? pages[0]!;
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
      {/* A page's own clip; their photo when it has none. */}
      <StoryPicture
        key={page}
        story={{
          title: shown.title,
          ...(shown.videoId ? { videoId: shown.videoId } : {}),
          ...(story.songId ? { songId: story.songId } : {}),
        }}
        playable={playable}
        stacked={stacked}
      />
      <div
        className={`flex min-h-0 flex-col ${stacked ? 'gap-2 p-4' : 'gap-[12px] p-[28px]'}`}
      >
        {(shown.label ?? stop.label) && (
          <p
            className={`font-semibold uppercase tracking-[0.08em] text-white/55 ${
              stacked ? 'text-[0.75rem]' : 'text-[17px]'
            }`}
          >
            {pickLocalized((shown.label ?? stop.label)!, language)}
          </p>
        )}
        <h3
          key={`t${page}`}
          className={`font-semibold leading-tight [animation:stage-fade-in_350ms_ease-out] ${stacked ? 'text-[1.125rem]' : 'text-[30px]'}`}
        >
          {pickLocalized(shown.title, language)}
        </h3>
        {shown.body && (
          <p
            key={`b${page}`}
            className={`leading-snug text-white/75 [animation:stage-fade-in_350ms_ease-out] ${stacked ? 'text-[0.9375rem]' : 'text-[21px]'}`}
          >
            {pickLocalized(shown.body, language)}
          </p>
        )}
        {pages.length > 1 && (
          <PageChevron
            pages={pages}
            page={page}
            onPage={setPage}
            language={language}
            stacked={stacked}
          />
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
  const stops = globe.stops ?? [];
  // On a fitted slide the card sits over the map's left; on a phone, below.
  const stacked = !(scale && scale > 0);
  const withCard = !stacked && stops.some((s) => s.story);
  const withControls = !stacked && !inert && stops.length > 1;
  const src = useMemo(
    () => firstSrc(globe, { card: withCard, controls: withControls }),
    [globe, withCard, withControls],
  );
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

  const barSlot = useContext(PresentControlsContext);

  if (still) return <StillGlobe globe={globe} language={language} />;

  const next = () => {
    if (stops.length < 2) return;
    const to = (at + 1) % stops.length;
    setAt(to);
    frame.current?.contentWindow?.postMessage(
      { type: SLIDE_GLOBE_GO, at: to },
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

  // Presenting: on the slide bar's row, at its height (owner, 2026-11-10).
  const docked =
    barSlot && !stacked && !inert && stops.length > 1
      ? createPortal(
          <div className="pointer-events-auto flex items-center gap-3 rounded-full border border-daw-edge bg-daw-pill py-2 pl-4 pr-3">
            {stops.map((stop, i) => (
              <span
                key={i}
                aria-hidden
                className={`size-2 rounded-full transition-colors ${
                  i === at ? 'bg-white' : 'bg-white/30'
                }`}
              />
            ))}
            <button
              type="button"
              onClick={next}
              aria-label="Next place"
              className="ml-1 inline-flex size-9 items-center justify-center rounded-full bg-white text-black transition-transform hover:scale-105"
            >
              <ChevronRight aria-hidden className="h-5 w-5" />
            </button>
          </div>,
          barSlot,
        )
      : null;

  const arrow =
    !barSlot && !inert && stops.length > 1 ? (
      <div
        className={`flex items-center rounded-full bg-black/60 ${
          stacked
            ? 'gap-2 self-end px-3 py-2'
            : 'absolute bottom-[40px] right-[40px] gap-[16px] px-[20px] py-[12px]'
        }`}
      >
        {stops.map((stop, i) => (
          <span
            key={i}
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
        <StoryCard
          key={at}
          stop={here}
          language={language}
          stacked={false}
          playable={!inert}
        />
      )}
      {!stacked && arrow}
      {docked}
    </div>
  );

  if (!stacked) return map;
  // A phone: the map, then the place's story, then the arrow.
  return (
    <div className="flex flex-col gap-3">
      {map}
      {here && (
        <StoryCard
          key={at}
          stop={here}
          language={language}
          stacked
          playable={!inert}
        />
      )}
      {arrow}
    </div>
  );
};
