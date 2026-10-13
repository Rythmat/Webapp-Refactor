import { Info } from 'lucide-react';
import { useId, useRef } from 'react';
import { GlobeLegend } from '@/components/atlas/components/UI/GlobeLegend';
import { GlobeSpinToggle } from '@/components/atlas/components/UI/GlobeSpinToggle';
import { LayersControl } from '@/components/atlas/components/UI/LayersControl';
import {
  ATLAS_MAP_CONTROL,
  AtlasPillButton,
} from '@/components/atlas/components/UI/primitives';
import { useIsPhone } from '@/components/atlas/hooks/useMediaQuery';
import {
  useAtlasDispatch,
  useAtlasSelector,
} from '@/components/atlas/state/atlasStore';

/**
 * The map-control cluster at the top right (layout/AtlasZones.tsx): Legend,
 * Layers and Spin in a row, and the legend's card under them when open. The
 * legend starts open on larger screens and closed on phones, until the
 * viewer opens or closes it.
 */
export function MapControls() {
  const isPhone = useIsPhone();
  const stored = useAtlasSelector((s) => s.legendOpen);
  const dispatch = useAtlasDispatch();
  const legendOpen = stored ?? !isPhone;
  const legendId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const setLegendOpen = (open: boolean) =>
    dispatch({ type: 'SET_LEGEND_OPEN', payload: open });

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex items-start gap-2">
        <AtlasPillButton
          ref={toggleRef}
          aria-controls={legendOpen ? legendId : undefined}
          aria-expanded={legendOpen}
          // The word hides on phones, so the name cannot rest on it.
          aria-label="Legend"
          className={ATLAS_MAP_CONTROL}
          title={legendOpen ? 'Hide the legend' : 'What the marks mean'}
          onClick={() => setLegendOpen(!legendOpen)}
        >
          <Info aria-hidden className="size-4" />
          <span aria-hidden className="hidden sm:inline">
            Legend
          </span>
        </AtlasPillButton>
        <LayersControl />
        <GlobeSpinToggle />
      </div>
      {legendOpen && (
        <GlobeLegend
          id={legendId}
          onClose={() => {
            // Its close button goes with it: hand focus to the toggle.
            setLegendOpen(false);
            toggleRef.current?.focus();
          }}
        />
      )}
    </div>
  );
}
