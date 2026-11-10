/**
 * A slide's globe is the Globe section's own map (owner, 2026-11-10): the
 * MapLibre globe with its lifted regions, pins and cards, framed from its
 * own page (`slides/globe/SlideGlobePage.tsx`, `/globe/slide`). The slide
 * opens it on the first of the subject's places; on the room's screen a small
 * arrow moves it to the next, and the map flies there as it does in the
 * Globe section.
 *
 *   room's screen, Present  the map, live, with the arrow
 *   a student's device      the map, to spin and explore; no arrow
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

type GlobeMedia = Extract<SlideMedia, { type: 'globePreview' }>;

/**
 * The stage's scale (design px → screen px), so a framed page can be laid
 * out at the screen's own size and stay sharp on a big projector. Null
 * outside a fitted stage (a phone's reflow), where the frame fills its box.
 */
export const StageScaleContext = createContext<number | null>(null);

/** The page the frame opens: the first place, as the Globe's own address. */
const firstSrc = (globe: GlobeMedia): string => {
  const ref = globe.stops?.find((s) => s.ref)?.ref;
  const params = ref ? stopParams(ref) : null;
  return GlobeRoutes.slide(undefined, params ?? undefined);
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
  live,
  still = false,
  inert = false,
}: {
  globe: GlobeMedia;
  language: StudentLanguage;
  /** The room's screen or Present: the arrow moves the class's map on. */
  live: boolean;
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
  const src = useMemo(() => firstSrc(globe), [globe]);
  const stops = (globe.stops ?? []).filter((s) => s.ref);

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

  return (
    <div className="absolute inset-0 overflow-hidden bg-black">
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
      {live && stops.length > 1 && (
        <div className="absolute bottom-[40px] right-[40px] flex items-center gap-[16px] rounded-full bg-black/60 px-[20px] py-[12px]">
          {stops.map((stop, i) => (
            <span
              key={stop.ref}
              aria-hidden
              className={`size-[12px] rounded-full transition-colors ${
                i === at ? 'bg-white' : 'bg-white/30'
              }`}
            />
          ))}
          <button
            type="button"
            onClick={next}
            aria-label="Next place"
            className="ml-[8px] flex size-[56px] items-center justify-center rounded-full bg-white text-black transition-transform hover:scale-105"
          >
            <ChevronRight aria-hidden className="size-[32px]" />
          </button>
        </div>
      )}
    </div>
  );
};
