import { Pause, Play } from 'lucide-react';
import {
  useAppDispatch,
  useAppState,
} from '@/components/atlas/context/AppContext';

/**
 * The globe's spin control.
 *
 * It sits in the corner of the globe rather than inside an event card, where a
 * copy of it used to appear on whichever card happened to be pinned. That made
 * it hard to find, impossible to reach with no card open, and it implied the
 * spin belonged to that one event. Rotation is a property of the globe, so the
 * control belongs on the globe.
 *
 * Top right specifically. The bottom looks free but is not: the timeline is
 * `bottom-6 w-[min(90vw,800px)]` and the pathway/tour bars are
 * `bottom-4 w-[min(640px,calc(100%-2rem))]`, all centred — centred but wide
 * enough to reach both corners, and all at `z-[1000]`, rendered after this in
 * atlas.tsx. A bottom-right pill was therefore painted over and unclickable on
 * any window narrower than about 1010px. The left column is taken by the
 * details card and the artist/search panels (all `left-4 top-4`), which leaves
 * the top right — and `z-[1001]` so nothing can win a tie against it.
 */
export function GlobeSpinToggle() {
  const { globeRotating } = useAppState();
  const dispatch = useAppDispatch();

  return (
    <button
      type="button"
      aria-pressed={globeRotating}
      aria-label={globeRotating ? 'Stop the globe spinning' : 'Spin the globe'}
      title={globeRotating ? 'Stop spinning' : 'Spin the globe'}
      className="absolute right-4 top-4 z-[1001] flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-3.5 py-2.5 text-sm text-white/90 shadow-2xl backdrop-blur-md transition-colors hover:border-white/30 hover:bg-black/55 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#60a5fa]"
      onClick={() =>
        dispatch({ type: 'SET_GLOBE_ROTATING', payload: !globeRotating })
      }
    >
      {globeRotating ? (
        <Pause aria-hidden className="size-4" />
      ) : (
        <Play aria-hidden className="size-4" />
      )}
      <span>{globeRotating ? 'Stop' : 'Spin'}</span>
    </button>
  );
}
