/**
 * The Globe section's own map, alone, for a lesson slide (owner, 2026-11-10:
 * "the same Globe used in the main Globe"). A slide shows this page in a
 * frame: the map, without the rails, tabs, Inspector or the connections
 * card. The slide draws its own card (each place's part in the subject's
 * story) and says how much of the map it covers (`?left=`, a share of the
 * width), so the map frames each place beside it.
 *
 * In a frame because the Globe navigates by its page's address (`?place=`,
 * `?event=`); here that address is the frame's own, so clicking the map
 * never changes the lesson's. The slide moves it on with a message
 * (`slideGlobeStops.ts`), from the same origin only.
 *
 * Composed from the Globe's own pieces, as `components/atlas/atlas.tsx`
 * composes them; nothing in the Globe is changed for it.
 */
import '@/components/atlas/index.css';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AtlasGlobe } from '@/components/atlas/components/Globe';
import { AtlasMapProvider } from '@/components/atlas/components/Globe/mapHandle';
import { stateBoundariesData } from '@/components/atlas/data/loaders';
import { IntroProvider } from '@/components/atlas/layout/intro';
import { AtlasPortalContext } from '@/components/atlas/layout/portalRoot';
import { InspectorProvider } from '@/components/atlas/layout/useInspector';
import { AtlasNavigationProvider } from '@/components/atlas/navigation/useAtlasNavigate';
import { useAtlasUrlSync } from '@/components/atlas/navigation/useAtlasUrlSync';
import {
  AtlasStoreProvider,
  useAtlasDispatch,
} from '@/components/atlas/state/atlasStore';
import { StageSignalsProvider } from '@/components/atlas/state/stageSignals';
import { TimeCameraProvider } from '@/components/atlas/timeline/TimeCamera';
import { stateAt } from '@/components/atlas/utils/stateAt';
import {
  LESSON_KEYS,
  SLIDE_GLOBE_KEY,
  isSlideGlobeGo,
  stopAt,
  stopParams,
} from './slideGlobeStops';

/**
 * Applies the address to the map, and the slide's messages to the address.
 * A coordinate stop (`?at=lat,lng`) becomes the state it lies in, once the
 * Globe's state outlines have loaded; anywhere else the world stays in view.
 */
function SlideGlobeSync() {
  const [params, setParams] = useSearchParams();
  const at = params.get('at');

  useEffect(() => {
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== window.location.origin) return;
      if (!isSlideGlobeGo(e.data)) return;
      const next = stopParams(e.data.ref);
      if (next) setParams(next, { replace: true });
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [setParams]);

  useEffect(() => {
    const position = at ? stopAt(`at:${at}`) : null;
    if (!position) return;
    let alive = true;
    void stateBoundariesData.load().then((boundaries) => {
      if (!alive || !boundaries) return;
      const state = stateAt(boundaries, position[0], position[1]);
      if (state)
        setParams(
          { place: `state:${state.name}:${state.country}` },
          { replace: true },
        );
    });
    return () => {
      alive = false;
    };
  }, [at, setParams]);

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

  useAtlasUrlSync();
  return null;
}

/** What the slide's card covers of the map, so flights land beside it. */
function CardInsets() {
  const dispatch = useAtlasDispatch();
  const [params] = useSearchParams();
  const share = Number(params.get('left'));
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
  return null;
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
          <CardInsets />
        </InspectorProvider>
        <SlideGlobeSync />
      </AtlasPortalContext.Provider>
    </div>
  );
}

export default function SlideGlobePage() {
  return (
    <AtlasStoreProvider>
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
