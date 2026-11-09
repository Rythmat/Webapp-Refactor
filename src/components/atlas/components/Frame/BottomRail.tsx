import { LayoutGrid, Pause, Play } from 'lucide-react';
import { prefetchRing } from '@/components/atlas/components/Ring/prefetchRing';
import { prefetchRiver } from '@/components/atlas/components/River/prefetchRiver';
import {
  ATLAS_PILL_ZONE,
  ATLAS_SEGMENT,
  AtlasIconButton,
  AtlasPillButton,
} from '@/components/atlas/components/UI/primitives';
import { useIsPhone } from '@/components/atlas/hooks/useMediaQuery';
import { RAIL_PANELS } from '@/components/atlas/layout/railPanels';
import {
  isMapView,
  isTimelineView,
} from '@/components/atlas/navigation/atlasFrame';
import {
  ATLAS_SECTIONS,
  sectionOf,
  type AtlasSectionId,
} from '@/components/atlas/navigation/sections';
import {
  useAtlasFrame,
  useAtlasNavigate,
} from '@/components/atlas/navigation/useAtlasNavigate';
import {
  useAtlasDispatch,
  useAtlasSelector,
} from '@/components/atlas/state/atlasStore';
import { cn } from '@/lib/utils';
import { usePanelAvailability, useTogglePanel } from './usePanels';

/** The views' names on a phone, where the rail is narrow. */
const SHORT: Record<AtlasSectionId, string> = {
  explore: 'Map',
  ring: 'Ring',
  eras: 'Eras',
  regions: 'Places',
};

/**
 * The views, as the Studio's Create · Mix · Score: the map, the timeline of
 * the world's regions, and that timeline opened into regions and cities.
 * Switching keeps the stop and adds no step to Back.
 */
function ViewTabs({ short }: { short: boolean }) {
  const active = useAtlasFrame(sectionOf);
  const navigate = useAtlasNavigate();
  return (
    <nav aria-label="Globe sections" className={ATLAS_PILL_ZONE}>
      {ATLAS_SECTIONS.map((section) => {
        const label = short ? SHORT[section.id] : section.label;
        const river = section.id === 'eras' || section.id === 'regions';
        const ring = section.id === 'ring';
        const prefetch = river
          ? prefetchRiver
          : ring
            ? prefetchRing
            : undefined;
        return (
          <button
            key={section.id}
            aria-current={active === section.id ? 'page' : undefined}
            aria-label={short ? section.label : undefined}
            className={cn(ATLAS_SEGMENT, short && 'px-3')}
            type="button"
            onClick={() => navigate.toSection(section.id)}
            onFocus={prefetch}
            onPointerEnter={prefetch}
          >
            {label}
          </button>
        );
      })}
    </nav>
  );
}

/** The globe's spin, as the store has it, and the way to change it. */
function useSpin() {
  const rotating = useAtlasSelector((s) => s.globeRotating);
  const dispatch = useAtlasDispatch();
  return {
    rotating,
    label: rotating ? 'Stop the globe spinning' : 'Spin the globe',
    toggle: () => dispatch({ type: 'SET_GLOBE_ROTATING', payload: !rotating }),
    icon: rotating ? (
      <Pause aria-hidden className="size-4" />
    ) : (
      <Play aria-hidden className="size-4" />
    ),
  };
}

/**
 * The globe's spin. Rotation is a property of the globe, so the control sits
 * with the map's own, on the rail under it, rather than on any one card.
 */
function SpinToggle() {
  const spin = useSpin();
  return (
    <AtlasPillButton
      aria-label={spin.label}
      aria-pressed={spin.rotating}
      title={spin.rotating ? 'Stop spinning' : 'Spin the globe'}
      variant="pill"
      onClick={spin.toggle}
    >
      {spin.icon}
      <span>{spin.rotating ? 'Stop' : 'Spin'}</span>
    </AtlasPillButton>
  );
}

/** On the map, chosen years filter it; this lets all of time back in. */
function AllYears() {
  const filtered = useAtlasSelector((s) => s.timeWindow !== null);
  const dispatch = useAtlasDispatch();
  if (!filtered) return null;
  return (
    <AtlasPillButton
      aria-label="Show all years"
      title="Show every year on the map again"
      variant="pill"
      onClick={() => dispatch({ type: 'SET_WINDOW', payload: null })}
    >
      All years
    </AtlasPillButton>
  );
}

/**
 * The floating cards over the map, hidden or shown for good (the viewer's
 * choice, remembered); a phone has no column, so none there.
 */
function CardsToggle() {
  const hidden = useAtlasSelector((s) => s.cards.hidden);
  const dispatch = useAtlasDispatch();
  return (
    <AtlasPillButton
      aria-label={hidden ? 'Show the cards' : 'Hide the cards'}
      aria-pressed={!hidden}
      title={
        hidden ? 'Show the cards over the map' : 'Hide the cards over the map'
      }
      variant="pill"
      onClick={() =>
        dispatch({ type: 'SET_CARD_PREFS', payload: { hidden: !hidden } })
      }
    >
      <LayoutGrid aria-hidden className="size-4" />
      <span>Cards</span>
    </AtlasPillButton>
  );
}

/**
 * The panels' icons (the Globe has no side rail: owner, 2026-10-30). On a
 * desktop, at the rail's right: the stop's details, shown or hidden without
 * leaving the stop, Layers, a lesson's mind map. On a phone, at its left,
 * their panels opening in the bottom sheet, and the globe's spin with them
 * while the map shows.
 */
function PanelLaunchers({
  spin: withSpin,
  details = false,
}: {
  spin: boolean;
  details?: boolean;
}) {
  const { active, toggle } = useTogglePanel();
  const { shown, disabled } = usePanelAvailability();
  const spin = useSpin();
  return (
    <div aria-label="Panels" className={ATLAS_PILL_ZONE} role="group">
      {RAIL_PANELS.filter(
        (panel) =>
          shown(panel) &&
          (panel.id !== 'details' || (details && !disabled('details'))),
      ).map((panel) => {
        const Icon = panel.icon;
        return (
          <AtlasIconButton
            key={panel.id}
            aria-label={panel.title}
            aria-pressed={active === panel.id}
            title={panel.hint}
            disabled={disabled(panel.id)}
            variant="pill"
            onClick={() => toggle(panel.id)}
          >
            <Icon aria-hidden className="size-4" strokeWidth={1.75} />
          </AtlasIconButton>
        );
      })}
      {withSpin && (
        <AtlasIconButton
          aria-label={spin.label}
          aria-pressed={spin.rotating}
          variant="pill"
          onClick={spin.toggle}
        >
          {spin.icon}
        </AtlasIconButton>
      )}
    </div>
  );
}

/**
 * The Globe's bottom rail, as the Studio's (owner, 2026-10-29): 44 px, the
 * window's full width, its zones in pills on the page. At the left, what
 * the map does (its spin, the years it shows); the views centred in the
 * window; at the right, the panels' icons and the floating cards' switch. On
 * a phone, the
 * panels' icons join the left.
 */
export function BottomRail() {
  const isPhone = useIsPhone();
  const onMap = useAtlasFrame(isMapView);
  const river = useAtlasFrame(isTimelineView);
  if (isPhone) {
    // One row: the panels (and the spin) at the left, the views in the rest.
    return (
      <div
        className="grid h-11 items-center gap-2 px-2"
        data-testid="globe-bottom-rail"
        style={{ gridTemplateColumns: 'auto minmax(0, 1fr)' }}
      >
        <PanelLaunchers spin={onMap} />
        <div className="flex min-w-0 justify-center">
          <ViewTabs short />
        </div>
      </div>
    );
  }
  return (
    <div
      className="grid h-11 items-center gap-2 px-2"
      data-testid="globe-bottom-rail"
      style={{ gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)' }}
    >
      <div className="flex min-w-0 items-center gap-2" data-zone="map">
        {onMap && <SpinToggle />}
        {!river && <AllYears />}
      </div>
      <ViewTabs short={false} />
      <div
        className="flex min-w-0 items-center justify-end gap-2"
        data-zone="end"
      >
        <PanelLaunchers details spin={false} />
        {!river && <CardsToggle />}
      </div>
    </div>
  );
}
