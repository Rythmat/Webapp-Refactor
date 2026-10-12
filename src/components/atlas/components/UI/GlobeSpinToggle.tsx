import { Pause, Play } from 'lucide-react';
import { AtlasPillButton } from '@/components/atlas/components/UI/primitives';
import {
  useAtlasDispatch,
  useAtlasSelector,
} from '@/components/atlas/state/atlasStore';

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
  const globeRotating = useAtlasSelector((s) => s.globeRotating);
  const dispatch = useAtlasDispatch();

  return (
    <AtlasPillButton
      aria-pressed={globeRotating}
      aria-label={globeRotating ? 'Stop the globe spinning' : 'Spin the globe'}
      title={globeRotating ? 'Stop spinning' : 'Spin the globe'}
      // An outline pill on the panel surface: over the globe, the pill's own
      // white/4 fill would leave the label on whatever colour spins past.
      className="absolute right-4 top-4 z-[1001] h-10 gap-2 bg-atlas-panel/95 px-3.5 shadow-2xl hover:bg-atlas-panel"
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
    </AtlasPillButton>
  );
}
