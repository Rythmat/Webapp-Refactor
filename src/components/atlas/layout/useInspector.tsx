import {
  Suspense,
  createContext,
  createElement,
  lazy,
  useContext,
  useMemo,
  type ReactNode,
} from 'react';
import { PanelLoading } from '@/components/atlas/components/Panels/PanelLoading';
import { ArtistPanel } from '@/components/atlas/components/UI/ArtistPanel';
import { DetailsCard } from '@/components/atlas/components/UI/DetailsCard';
import { SearchResultsPanel } from '@/components/atlas/components/UI/SearchResultsPanel';
import type { InspectorPanelId } from '@/components/atlas/navigation/atlasFrame';
import { stopKey } from '@/components/atlas/navigation/atlasStop';
import {
  useAtlasFrame,
  useAtlasNavigate,
  useAtlasParams,
  useAtlasStop,
} from '@/components/atlas/navigation/useAtlasNavigate';
import { useAtlasSelector } from '@/components/atlas/state/atlasStore';
import { resolveInspectorPanel } from './inspectorModel';
import { railPanel } from './railPanels';
import type { PanelZoneSlot } from './usePanelZone';

// The panels a student opens from the rail, each fetched the first time.
const LayersPanel = lazy(
  () => import('@/components/atlas/components/Panels/LayersPanel'),
);
const LegendPanel = lazy(
  () => import('@/components/atlas/components/Panels/LegendPanel'),
);
// A Cortex lesson's Promoter mind map (`?mindmap=1`), loaded only when asked.
const MindMapPanel = lazy(
  () => import('@/components/atlas/components/MindMap/MindMapPanel'),
);

/** What the Inspector (or the phone's sheet) shows. */
export interface InspectorSlot extends PanelZoneSlot {
  panel: InspectorPanelId;
  /** The Inspector's name: the panel's. */
  title: string;
  node: ReactNode;
}

/**
 * The stop's details: an artist or a search has its own panel; otherwise the
 * selected place's card — on the map, since the timeline shows a place's
 * events itself.
 */
function useDetails(): { key: string; node: ReactNode } | null {
  const stop = useAtlasStop();
  const timeline = useAtlasFrame((frame) => frame.view === 'timeline');
  const place = useAtlasSelector((s) =>
    s.selectedLocation !== null &&
    (s.activeTour === null || s.pinnedEvent !== null)
      ? s.selectedLocation
      : null,
  );
  return useMemo(() => {
    if (stop.kind === 'artist') {
      return { key: stopKey(stop), node: <ArtistPanel name={stop.artist} /> };
    }
    if (stop.kind === 'search') {
      return {
        key: stopKey(stop),
        node: <SearchResultsPanel query={stop.query} />,
      };
    }
    if (!place || timeline) return null;
    return { key: stopKey({ kind: 'place', place }), node: <DetailsCard /> };
  }, [stop, place, timeline]);
}

const lazyPanel = (title: string, panel: ReactNode) => (
  <Suspense fallback={<PanelLoading title={title} />}>{panel}</Suspense>
);

/**
 * The Inspector's slot (owner, 2026-10-29: the Globe in the Studio's frame):
 * the panel chosen on the side rail, else a lesson's mind map, else the
 * stop's details (layout/inspectorModel.ts). Closing details leaves the stop;
 * closing a tool panel goes back to the details under it.
 */
/** The panels about the map itself, which the timeline has no use for. */
const MAP_PANELS: ReadonlySet<InspectorPanelId> = new Set(['layers', 'legend']);

function useInspector(): InspectorState {
  const navigate = useAtlasNavigate();
  // A map panel chosen on the map stands down while the timeline shows (it
  // comes back with the map).
  const choice = useAtlasFrame((frame) =>
    frame.view === 'timeline' &&
    frame.panel !== null &&
    frame.panel !== 'none' &&
    MAP_PANELS.has(frame.panel)
      ? null
      : frame.panel,
  );
  const mindmap = useAtlasParams((params) => params.get('mindmap') === '1');
  const details = useDetails();
  const panel = resolveInspectorPanel({
    panel: choice,
    mindmap,
    hasDetails: details !== null,
  });
  const hasDetails = details !== null;
  const slot = useMemo((): InspectorSlot | null => {
    if (!panel) return null;
    const title = railPanel(panel).title;
    const back = () => navigate.setFrame({ panel: null });
    switch (panel) {
      case 'details':
        return details
          ? {
              panel,
              title,
              key: details.key,
              node: details.node,
              onClose: navigate.home,
            }
          : null;
      case 'layers':
        return {
          panel,
          title,
          key: panel,
          node: lazyPanel(title, <LayersPanel onClose={back} />),
          onClose: back,
        };
      case 'legend':
        return {
          panel,
          title,
          key: panel,
          node: lazyPanel(title, <LegendPanel onClose={back} />),
          onClose: back,
        };
      case 'mindmap': {
        if (!mindmap) return null;
        const hide = () => navigate.setFrame({ panel: 'none' });
        return {
          panel,
          title,
          key: panel,
          node: lazyPanel(title, <MindMapPanel />),
          onClose: hide,
        };
      }
      default:
        return null;
    }
  }, [panel, details, mindmap, navigate]);
  return useMemo(() => ({ slot, hasDetails }), [slot, hasDetails]);
}

/** The Inspector's slot, and whether the stop has details to show. */
export interface InspectorState {
  slot: InspectorSlot | null;
  hasDetails: boolean;
}

const InspectorContext = createContext<InspectorState>({
  slot: null,
  hasDetails: false,
});

/**
 * Works out the Inspector's slot once for the frame: the Inspector, the side
 * rail and the phone's sheet all read it (useInspectorState). Only they
 * re-render when it changes; the frame and the globe do not.
 */
export function InspectorProvider({ children }: { children: ReactNode }) {
  return createElement(
    InspectorContext.Provider,
    { value: useInspector() },
    children,
  );
}

export const useInspectorState = (): InspectorState =>
  useContext(InspectorContext);
