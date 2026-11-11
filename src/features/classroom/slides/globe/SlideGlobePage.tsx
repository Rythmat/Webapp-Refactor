/**
 * The Globe section's own map, alone, for a lesson slide (owner, 2026-11-10:
 * "the same Globe used in the main Globe"). A slide shows this page in a
 * frame, with only the subject's story on it (owner: "non-related events do
 * not need to be displayed"):
 *
 *   - the Globe's own land and borders, with its cities, artist points and
 *     influence arcs switched off (this page's own store, never the
 *     viewer's saved Layers);
 *   - the story's path, drawn place to place along great circles, the part
 *     travelled solid and the rest dashed (`StoryPath`);
 *   - a marker at each place, and at the current one the Globe's own
 *     selected-place light and pulses (its `atlas-sun-*` styles);
 *   - the camera flying slowly to each place, the region it lies in lifted
 *     as the Globe lifts a selection, and the globe breathing in and out
 *     while it is read (`useStoryCamera`).
 *
 * In a frame because the Globe navigates by its page's address; here that
 * address is the frame's own, so the map never changes the lesson's. The
 * slide says where the story is (`?path=`, `?at=`, then messages) and how
 * much of the map its card and controls cover (`?left=`, `?foot=`), from the
 * same origin only.
 *
 * Composed from the Globe's own pieces, as `components/atlas/atlas.tsx`
 * composes them; nothing in the Globe is changed for it.
 */
import '@/components/atlas/index.css';
import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AtlasGlobe } from '@/components/atlas/components/Globe';
import type { Ring } from '@/components/atlas/components/Globe/mapFraming';
import {
  AtlasMapProvider,
  useAtlasMap,
  type AtlasMapHandle,
} from '@/components/atlas/components/Globe/mapHandle';
import { IntroProvider } from '@/components/atlas/layout/intro';
import { AtlasPortalContext } from '@/components/atlas/layout/portalRoot';
import { InspectorProvider } from '@/components/atlas/layout/useInspector';
import { AtlasNavigationProvider } from '@/components/atlas/navigation/useAtlasNavigate';
import {
  DEFAULT_LAYERS,
  initialAppState,
} from '@/components/atlas/state/appReducer';
import {
  AtlasStoreProvider,
  createAtlasStore,
  useAtlasDispatch,
} from '@/components/atlas/state/atlasStore';
import {
  StageSignalsProvider,
  useStageSignals,
} from '@/components/atlas/state/stageSignals';
import { TimeCameraProvider } from '@/components/atlas/timeline/TimeCamera';
import {
  LESSON_KEYS,
  SLIDE_GLOBE_KEY,
  decodePath,
  isSlideGlobeGo,
} from './slideGlobeStops';
import { insideRings } from './storyCamera';
import { useStoryCamera } from './useStoryCamera';

/** Points along each leg of the path. */
const LEG_POINTS = 48;

/** The map's handle, once the map is up. */
const useMapHandle = (): AtlasMapHandle | null => {
  const ref = useAtlasMap();
  const [handle, setHandle] = useState<AtlasMapHandle | null>(null);
  useEffect(() => {
    if (handle) return;
    let raf = 0;
    const look = () => {
      if (ref?.current) setHandle(ref.current);
      else raf = requestAnimationFrame(look);
    };
    look();
    return () => cancelAnimationFrame(raf);
  }, [ref, handle]);
  return handle;
};

/** Re-render on every frame the camera moves. */
const useCameraFrame = (handle: AtlasMapHandle | null) => {
  const [, setFrame] = useState(0);
  useEffect(() => {
    if (!handle) return;
    let raf = 0;
    const off = handle.onCamera(() => {
      if (!raf)
        raf = requestAnimationFrame(() => {
          raf = 0;
          setFrame((n) => n + 1);
        });
    });
    return () => {
      off();
      cancelAnimationFrame(raf);
    };
  }, [handle]);
};

const toVector = ([lat, lng]: readonly [number, number]) => {
  const φ = (lat * Math.PI) / 180;
  const λ = (lng * Math.PI) / 180;
  return [Math.cos(φ) * Math.cos(λ), Math.cos(φ) * Math.sin(λ), Math.sin(φ)];
};

/** Points along the great circle from `a` to `b`, both ends included. */
export const greatCircle = (
  a: readonly [number, number],
  b: readonly [number, number],
  n: number,
): [number, number][] => {
  const va = toVector(a);
  const vb = toVector(b);
  const dot = Math.min(
    1,
    Math.max(-1, va[0]! * vb[0]! + va[1]! * vb[1]! + va[2]! * vb[2]!),
  );
  const ω = Math.acos(dot);
  if (ω < 1e-6) return [[a[0], a[1]]];
  const out: [number, number][] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const ka = Math.sin((1 - t) * ω) / Math.sin(ω);
    const kb = Math.sin(t * ω) / Math.sin(ω);
    const x = ka * va[0]! + kb * vb[0]!;
    const y = ka * va[1]! + kb * vb[1]!;
    const z = ka * va[2]! + kb * vb[2]!;
    out.push([
      (Math.atan2(z, Math.hypot(x, y)) * 180) / Math.PI,
      (Math.atan2(y, x) * 180) / Math.PI,
    ]);
  }
  return out;
};

/** Re-render when the lifted region's lid rises or settles. */
const useLiftPx = (): number => {
  const { lift } = useStageSignals();
  const [px, setPx] = useState(() => lift.get());
  useEffect(() => lift.subscribe(() => setPx(lift.get())), [lift]);
  return px;
};

/**
 * The story's path and places over the map, and the current place's light.
 * What lies in the lifted region rises with its lid, as the Globe's own
 * place light does (SunFx).
 */
function StoryPath({
  handle,
  path,
  at,
  lifted,
}: {
  handle: AtlasMapHandle | null;
  path: readonly [number, number][];
  at: number;
  /** The lifted region's outline, while one is lifted. */
  lifted: readonly Ring[] | null;
}) {
  useCameraFrame(handle);
  const liftPx = useLiftPx();
  const rise = (place: readonly [number, number]) =>
    liftPx > 0 && lifted && insideRings(lifted, place) ? liftPx : 0;
  const legs = useMemo(
    () => path.slice(1).map((to, i) => greatCircle(path[i]!, to, LEG_POINTS)),
    [path],
  );
  if (!handle) return null;

  // Each leg as screen paths, broken where it goes behind the globe.
  const drawn = legs.map((leg, i) => {
    const points = handle.project(
      leg.map(([lat, lng], k) => ({ id: `${i}:${k}`, lat, lng })),
    );
    // The leg runs straight from one end's height to the other's (an end on
    // the lifted region rides on its lid), never bending at the region's
    // edge (owner, 2026-11-10: "I want the lines to stay straight").
    const from = rise(path[i]!);
    const to = rise(path[i + 1]!);
    const last = Math.max(1, leg.length - 1);
    const heights = leg.map((_, k) => from + ((to - from) * k) / last);
    let d = '';
    let pen = false;
    points.forEach((p, k) => {
      if (!p.visible) {
        pen = false;
        return;
      }
      const y = p.y - (heights[k] ?? 0);
      d += `${pen ? 'L' : 'M'}${p.x.toFixed(1)},${y.toFixed(1)}`;
      pen = true;
    });
    return { d, travelled: i < at };
  });
  const places = handle
    .project(path.map(([lat, lng], i) => ({ id: String(i), lat, lng })))
    .map((p, i) => ({ ...p, y: p.y - rise(path[i]!) }));
  const here = places[at];

  return (
    <>
      <svg
        aria-hidden
        className="pointer-events-none absolute inset-0 size-full"
        style={{ zIndex: 5 }}
      >
        {drawn.map((leg, i) =>
          leg.d ? (
            <path
              key={i}
              d={leg.d}
              fill="none"
              stroke="white"
              strokeLinecap="round"
              strokeWidth={leg.travelled ? 2.5 : 1.5}
              strokeOpacity={leg.travelled ? 0.85 : 0.35}
              strokeDasharray={leg.travelled ? undefined : '4 6'}
            />
          ) : null,
        )}
        {places.map((p, i) =>
          p.visible && i !== at ? (
            <circle
              key={p.id}
              cx={p.x}
              cy={p.y}
              r={5}
              fill={i < at ? 'white' : '#0b0b10'}
              stroke="white"
              strokeOpacity={0.8}
              strokeWidth={2}
            />
          ) : null,
        )}
        {here?.visible && (
          <>
            <circle
              cx={here.x}
              cy={here.y}
              r={22}
              fill="rgb(255 236 214 / 0.18)"
            />
            <circle cx={here.x} cy={here.y} r={7} fill="white" />
          </>
        )}
      </svg>
      {/* The Globe's own selected-place burst and pulses, replayed per place. */}
      {here?.visible && (
        <div
          key={at}
          aria-hidden
          className="atlas-sun-fx"
          style={{
            zIndex: 6,
            transform: `translate(${here.x}px, ${here.y}px)`,
          }}
        >
          <span className="atlas-sun-burst" />
          <span className="atlas-sun-pulse" />
          <span className="atlas-sun-pulse atlas-sun-pulse-late" />
        </div>
      )}
    </>
  );
}

/**
 * The story's state: where it is (`?at=`, then the slide's messages), the
 * camera flying there, the card's share of the map, and the lesson's keys
 * handed back to the slide.
 */
function SlideGlobeStory() {
  const [params] = useSearchParams();
  const dispatch = useAtlasDispatch();
  const path = useMemo(() => decodePath(params.get('path')), [params]);
  const [at, setAt] = useState(() =>
    Math.max(0, Math.min(Number(params.get('at')) || 0, path.length - 1)),
  );
  const share = Number(params.get('left'));
  const foot = Number(params.get('foot'));

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (!isSlideGlobeGo(e.data)) return;
      if (e.data.at < path.length) setAt(e.data.at);
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [path.length]);

  // The camera: slow flights, the region lifted, the globe breathing.
  const handle = useMapHandle();
  const { regions } = useStoryCamera({
    handle,
    path,
    at,
    cardShare: share > 0 && share < 1 ? share : 0,
    footShare: foot > 0 && foot < 1 ? foot : 0,
  });

  // What the slide's card covers, so the place lands beside it.
  useEffect(() => {
    if (!(share > 0 && share < 1)) return;
    const report = () =>
      dispatch({
        type: 'SET_ZONE_INSETS',
        payload: {
          zone: 'cards',
          insets: {
            top: 0,
            right: 0,
            bottom: 0,
            left: Math.round(window.innerWidth * share),
          },
        },
      });
    report();
    window.addEventListener('resize', report);
    return () => window.removeEventListener('resize', report);
  }, [dispatch, share]);

  // Framed in a lesson: the keys that move the lesson go back to it.
  useEffect(() => {
    if (window.parent === window) return;
    const onKey = (e: KeyboardEvent) => {
      if (!LESSON_KEYS.includes(e.key)) return;
      window.parent.postMessage(
        { type: SLIDE_GLOBE_KEY, key: e.key },
        window.location.origin,
      );
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <StoryPath
      handle={handle}
      path={path}
      at={at}
      lifted={regions?.[at]?.rings ?? null}
    />
  );
}

function SlideGlobeLayout() {
  // The root, for the map's portals (layout/portalRoot).
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  return (
    <div
      ref={setRoot}
      className="atlas-root relative isolate h-dvh w-screen overflow-hidden bg-atlas-page text-atlas-text"
      data-tab="globe"
    >
      <AtlasPortalContext.Provider value={root}>
        <InspectorProvider>
          <h1 className="sr-only">Globe</h1>
          <div className="absolute inset-0">
            <AtlasGlobe />
          </div>
          <SlideGlobeStory />
        </InspectorProvider>
      </AtlasPortalContext.Provider>
    </div>
  );
}

/**
 * Only the story: the Globe's cities, artist points and influence arcs off,
 * the land in its continents' colours (owner, 2026-11-10), in a store of
 * this page's own (never the viewer's saved Layers).
 */
const storyStore = () =>
  createAtlasStore({
    ...initialAppState,
    layers: {
      ...DEFAULT_LAYERS,
      landColor: 'continent',
      cities: false,
      artistPoints: false,
      arcs: false,
    },
  });

export default function SlideGlobePage() {
  const [store] = useState(storyStore);
  return (
    <AtlasStoreProvider store={store}>
      <AtlasNavigationProvider>
        <TimeCameraProvider>
          <AtlasMapProvider>
            <StageSignalsProvider>
              <IntroProvider>
                <SlideGlobeLayout />
              </IntroProvider>
            </StageSignalsProvider>
          </AtlasMapProvider>
        </TimeCameraProvider>
      </AtlasNavigationProvider>
    </AtlasStoreProvider>
  );
}
