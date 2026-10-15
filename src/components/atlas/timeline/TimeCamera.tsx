import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { usePrefersReducedMotion } from '@/components/atlas/hooks/useMediaQuery';
import {
  useAtlasDispatch,
  useAtlasSelector,
} from '@/components/atlas/state/atlasStore';
import { RIVER } from '@/components/atlas/theme/river';
import { createRiverCamera, type RiverCamera } from './riverCamera';
import { DEFAULT_WINDOW, sameWindow, type TimeWindow } from './timeWindow';

const TimeCameraContext = createContext<RiverCamera | null>(null);

/**
 * The page's one view of time: the timeline draws it, the era rail along
 * the bottom moves it, and the map filters by it. Gestures move it many times
 * a frame (riverCamera.ts); the store hears of it once it rests, and the URL
 * a little after that (navigation/useWindowSync.ts). A window the page sets
 * from elsewhere — a link, Back — eases the camera there.
 */
export function TimeCameraProvider({ children }: { children: ReactNode }) {
  const dispatch = useAtlasDispatch();
  const storeWindow = useAtlasSelector((s) => s.timeWindow);
  const reducedMotion = usePrefersReducedMotion();
  const [camera] = useState(() =>
    createRiverCamera(storeWindow ?? DEFAULT_WINDOW),
  );
  const committed = useRef<TimeWindow | null>(null);

  useEffect(() => {
    let timer = 0;
    const unsubscribe = camera.subscribe((source) => {
      if (source === 'page') return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        const w = camera.get();
        committed.current = w;
        dispatch({ type: 'SET_WINDOW', payload: w });
      }, RIVER.commitMs);
    });
    return () => {
      unsubscribe();
      window.clearTimeout(timer);
    };
  }, [camera, dispatch]);

  useEffect(() => {
    if (!storeWindow) return;
    // Its own commit coming back is not news.
    if (committed.current && sameWindow(committed.current, storeWindow)) return;
    if (sameWindow(storeWindow, camera.get())) return;
    camera.tween(storeWindow, reducedMotion ? 0 : RIVER.tweenMs);
  }, [storeWindow, camera, reducedMotion]);

  return (
    <TimeCameraContext.Provider value={camera}>
      {children}
    </TimeCameraContext.Provider>
  );
}

export function useTimeCamera(): RiverCamera {
  const camera = useContext(TimeCameraContext);
  if (!camera) {
    throw new Error('The time camera is used outside <TimeCameraProvider>.');
  }
  return camera;
}
