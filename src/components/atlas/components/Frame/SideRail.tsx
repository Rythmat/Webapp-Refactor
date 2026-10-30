import {
  ATLAS_FOCUS,
  ATLAS_TRANSITION,
} from '@/components/atlas/components/UI/primitives';
import {
  RAIL_PANELS,
  type RailPanel,
} from '@/components/atlas/layout/railPanels';
import { useInspectorState } from '@/components/atlas/layout/useInspector';
import {
  isMapView,
  type InspectorPanelId,
} from '@/components/atlas/navigation/atlasFrame';
import {
  useAtlasFrame,
  useAtlasNavigate,
  useAtlasParams,
} from '@/components/atlas/navigation/useAtlasNavigate';
import { Tooltip, TooltipGroup } from '@/daw/ui/Tooltip';
import { cn } from '@/lib/utils';

/**
 * Which rail panels apply right now: the stop's details only when it has
 * some; the map's layers only on the map; a lesson's mind map only
 * while its lesson has the Globe open.
 */
export function usePanelAvailability() {
  const { hasDetails } = useInspectorState();
  const offMap = useAtlasFrame((frame) => !isMapView(frame));
  const mindmap = useAtlasParams((params) => params.get('mindmap') === '1');
  return {
    shown: (panel: RailPanel) => panel.id !== 'mindmap' || mindmap,
    disabled: (id: InspectorPanelId) =>
      (id === 'details' && !hasDetails) || (id === 'layers' && offMap),
  };
}

/** Open a panel in the Inspector, or close the Inspector on its own panel. */
export function useTogglePanel() {
  const { slot } = useInspectorState();
  const navigate = useAtlasNavigate();
  return {
    active: slot?.panel ?? null,
    toggle: (id: InspectorPanelId) =>
      navigate.setFrame({ panel: slot?.panel === id ? 'none' : id }),
  };
}

/**
 * The side rail, as the Studio's (owner, 2026-10-29: the Globe in the
 * Studio's frame): a 48 px column of icons at the window's right edge, under
 * the top rail and over the bottom rail. Each icon shows its panel in the
 * Inspector beside it; the open one has the white tile, and a click on it
 * closes the Inspector.
 */
export function SideRail() {
  const { active, toggle } = useTogglePanel();
  const { shown, disabled } = usePanelAvailability();
  return (
    <TooltipGroup>
      <div
        aria-label="Panels"
        aria-orientation="vertical"
        className="flex h-full flex-col items-center gap-1 py-2"
        data-testid="globe-side-rail"
        role="toolbar"
      >
        {RAIL_PANELS.filter(shown).map((panel) => {
          const Icon = panel.icon;
          const on = active === panel.id;
          return (
            <Tooltip key={panel.id} content={panel.hint} side="left">
              <button
                aria-controls="atlas-inspector"
                aria-label={panel.title}
                aria-pressed={on}
                className={cn(
                  'relative flex size-8 items-center justify-center rounded disabled:cursor-not-allowed disabled:opacity-40 [&_svg]:size-[18px]',
                  on
                    ? 'bg-white text-atlas-page hover:bg-white/90'
                    : 'text-atlas-text-2 hover:bg-white/[0.06] hover:text-atlas-text disabled:hover:bg-transparent disabled:hover:text-atlas-text-2',
                  ATLAS_TRANSITION,
                  ATLAS_FOCUS,
                )}
                data-atlas-rail={panel.id}
                disabled={disabled(panel.id)}
                type="button"
                onClick={() => toggle(panel.id)}
              >
                <Icon aria-hidden strokeWidth={1.75} />
              </button>
            </Tooltip>
          );
        })}
      </div>
    </TooltipGroup>
  );
}
