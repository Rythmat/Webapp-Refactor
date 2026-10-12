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
 * It lives in the map-control cluster at the top right (layout/AtlasZones.tsx),
 * a zone of its own that the panels and the bottom bar are laid out around,
 * so nothing can paint over it.
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
      className="h-10 gap-2 bg-atlas-panel/95 px-3.5 shadow-2xl hover:bg-atlas-panel"
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
