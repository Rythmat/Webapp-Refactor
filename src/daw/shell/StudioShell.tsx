import { memo, useRef, type RefObject } from 'react';
import { ChannelStrip } from '@/daw/components/ChannelStrip/ChannelStrip';
import { DevProfiler } from '@/daw/dev/DevProfiler';
import { useStore } from '@/daw/store';
import { Resizer } from '@/daw/ui/Resizer';
import {
  clampInspectorPx,
  DOCK_DEFAULT_FRAC,
  DOCK_MAX_FRAC,
  DOCK_MIN_PX,
  DOCK_TALL_FRAC,
  INSPECTOR_DEFAULT_PX,
  INSPECTOR_MAX_PX,
  INSPECTOR_MIN_PX,
  BOTTOM_RAIL_PX,
  SIDE_RAIL_PX,
  snapDockPx,
  TOP_BAR_PX,
} from './layout/layoutModel';
import {
  DOCK_HEIGHT_VAR,
  dockPxFor,
  INSPECTOR_WIDTH_VAR,
  useShellBodyPx,
  useShellGeometry,
} from './layout/shellGeometry';
import { useInspectorFollowsPrefs } from './layout/useInspectorFollowsPrefs';
import {
  LeadSheetViewPart,
  PianoRollModalHost,
  PracticeTrackViewPart,
  ScoreViewPart,
  StudioViewPart,
} from './lazyParts';
import { BottomRail } from './bottombar/BottomRail';
import { InspectorPanel } from './inspector/InspectorPanel';
import { SideRail } from './inspector/SideRail';
import { TopBar } from './topbar/TopBar';
import { TrackArea } from './tracklist/TrackArea';

// ── The editor shell (milestones 2.4, 2.5 and B4a) ─────────────────────────
//
// Seven regions, laid out once and rendered outside the view switch, so a
// view change remounts only what the main region shows:
//
//   top     top        top    the 44 px top bar
//   main    inspector  rail   the view: Create's timeline, Mix, Score, Lead sheet
//   dock    inspector  rail   Create's editor dock
//   bottom  bottom     bottom the 44 px bottom rail: Master, transport, song
//
// The side rail (48 px of icons) picks what the Inspector beside it shows:
// Insight, Library, Effects, Lessons, People, Chat (owner, 2026-10-16, after
// Soundtrap's). The Inspector runs from the top bar to the bottom rail, so
// the dock stops at it. It stays mounted in every view and only opens and
// closes, as the student keeps it per view. The practice screen is
// full-window: the top bar, the rails and the Inspector are hidden (still
// mounted) while it shows.
//
// Sizes the student drags are CSS variables on this root (shellGeometry):
// the dock's height per tab and the Inspector's width, both per-user prefs.
// Panels resize at once; their content fades in (motion rules, 2.4).
//
// Until their own milestones restyle them, the main and dock regions'
// contents are the editor's legacy components (data-ds="legacy"); the bars,
// the rails and the Inspector are built on the design system (data-ds="v2").

/** The main region's id: the view tabs control it. */
export const MAIN_REGION_ID = 'daw-main-region';

/** Each Inspector mount gets a new id, so a test can tell it never remounts. */
let inspectorMounts = 0;

export interface StudioShellProps {
  isReady: boolean;
  onInit(): void;
}

export const StudioShell = memo(function StudioShell({
  isReady,
  onInit,
}: StudioShellProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const view = useStore((s) => s.currentView);
  const practiceSession = useStore((s) => s.practiceSession);
  const practiceScreen = view === 'practice' && practiceSession !== null;
  // Create's timeline is the practice view's too until its session exists.
  const create = view === 'arrange' || (view === 'practice' && !practiceScreen);
  useShellGeometry(rootRef);
  useInspectorFollowsPrefs();

  return (
    <div
      ref={rootRef}
      data-testid="studio-shell"
      data-view={view}
      className="relative grid min-h-0 w-full flex-1 overflow-hidden"
      style={{
        gridTemplateAreas: practiceScreen
          ? '"main main main"'
          : '"top top top" "main inspector rail" "dock inspector rail" "bottom bottom bottom"',
        gridTemplateRows: practiceScreen
          ? 'minmax(0, 1fr)'
          : `${TOP_BAR_PX}px minmax(0, 1fr) auto ${BOTTOM_RAIL_PX}px`,
        gridTemplateColumns: practiceScreen
          ? 'minmax(0, 1fr) 0 0'
          : `minmax(0, 1fr) auto ${SIDE_RAIL_PX}px`,
      }}
    >
      <div
        data-region="top"
        data-ds="v2"
        className="min-w-0"
        style={{ gridArea: 'top' }}
        hidden={practiceScreen}
      >
        <DevProfiler id="TopBar">
          <TopBar />
        </DevProfiler>
      </div>

      <section
        id={MAIN_REGION_ID}
        data-region="main"
        data-ds="legacy"
        aria-label={MAIN_LABEL[practiceScreen ? 'practice' : view]}
        className="flex min-h-0 min-w-0 flex-col overflow-hidden"
        style={{ gridArea: 'main' }}
      >
        {practiceScreen && practiceSession ? (
          <DevProfiler id="PracticeTrackView">
            <PracticeTrackViewPart
              session={practiceSession}
              isReady={isReady}
              onInit={onInit}
            />
          </DevProfiler>
        ) : create ? (
          <DevProfiler id="TrackArea">
            <TrackArea />
          </DevProfiler>
        ) : view === 'studio' ? (
          <DevProfiler id="StudioView">
            <StudioViewPart isReady={isReady} />
          </DevProfiler>
        ) : view === 'score' ? (
          <DevProfiler id="ScoreView">
            <ScoreViewPart />
          </DevProfiler>
        ) : (
          <DevProfiler id="LeadSheetView">
            <LeadSheetViewPart />
          </DevProfiler>
        )}
      </section>

      <InspectorRegion hidden={practiceScreen} rootRef={rootRef} />

      <nav
        data-region="rail"
        data-ds="v2"
        aria-label="Panels"
        className="min-h-0"
        style={{ gridArea: 'rail' }}
        hidden={practiceScreen}
      >
        <SideRail />
      </nav>

      {create && !practiceScreen ? (
        <section
          data-region="dock"
          data-ds="legacy"
          aria-label="Editor dock"
          className="relative min-w-0"
          style={{ gridArea: 'dock' }}
        >
          <DockResizer rootRef={rootRef} />
          <DevProfiler id="ChannelStrip">
            <ChannelStrip />
          </DevProfiler>
          <PianoRollModalHost />
        </section>
      ) : null}

      <div
        data-region="bottom"
        data-ds="v2"
        className="min-w-0"
        style={{ gridArea: 'bottom' }}
        hidden={practiceScreen}
      >
        <DevProfiler id="BottomRail">
          <BottomRail isReady={isReady} onInit={onInit} />
        </DevProfiler>
      </div>
    </div>
  );
});

const MAIN_LABEL: Record<string, string> = {
  arrange: 'Create',
  studio: 'Mix',
  score: 'Score',
  leadsheet: 'Lead sheet',
  practice: 'Practice',
};

// ── The Inspector column ─────────────────────────────────────────────────────

const InspectorRegion = memo(function InspectorRegion({
  hidden,
  rootRef,
}: {
  hidden: boolean;
  rootRef: RefObject<HTMLDivElement>;
}) {
  const mountId = useRef<number | null>(null);
  if (mountId.current === null) mountId.current = ++inspectorMounts;
  const libraryOpen = useStore((s) => s.libraryOpen);
  return (
    <aside
      data-region="inspector"
      data-ds="v2"
      data-mount-id={mountId.current}
      data-open={libraryOpen || undefined}
      aria-label="Inspector"
      className="relative flex min-h-0 overflow-hidden"
      style={{ gridArea: 'inspector' }}
      hidden={hidden}
    >
      {libraryOpen ? (
        <>
          <InspectorResizer rootRef={rootRef} />
          <DevProfiler id="Inspector">
            <InspectorPanel />
          </DevProfiler>
        </>
      ) : null}
    </aside>
  );
});

/** The Inspector's left edge: dragging left widens it. */
function InspectorResizer({ rootRef }: { rootRef: RefObject<HTMLDivElement> }) {
  const width = useStore((s) => s.inspectorWidth);
  const setWidth = useStore((s) => s.setInspectorWidth);
  return (
    <Resizer
      label="Resize the Inspector"
      orientation="vertical"
      direction={-1}
      value={width}
      min={INSPECTOR_MIN_PX}
      max={INSPECTOR_MAX_PX}
      constrain={clampInspectorPx}
      onPreview={(px) =>
        rootRef.current?.style.setProperty(INSPECTOR_WIDTH_VAR, `${px}px`)
      }
      onCommit={setWidth}
      onDoubleClick={() => setWidth(INSPECTOR_DEFAULT_PX)}
      data-testid="inspector-resizer"
      className="left-0 z-[var(--daw-z-sticky)]"
    />
  );
}

/**
 * The dock's top edge: dragging up makes it taller, for the tab open (each
 * tab keeps its own height). It snaps to 25, 40, 60 and 85% of the body;
 * a double-click goes between the tab's default and 60%, Enter closes or
 * opens the dock.
 */
function DockResizer({ rootRef }: { rootRef: RefObject<HTMLDivElement> }) {
  const tab = useStore((s) => s.channelStripTab);
  const heights = useStore((s) => s.dockHeights);
  const setDockHeight = useStore((s) => s.setDockHeight);
  const setTab = useStore((s) => s.setChannelStripTab);
  const bodyPx = useShellBodyPx(rootRef);
  // A shut dock is its tab bar only: nothing to drag until a tab opens.
  if (tab === null || bodyPx === 0) return null;
  const value = dockPxFor(tab, heights, bodyPx);
  const max = Math.max(DOCK_MIN_PX, Math.round(bodyPx * DOCK_MAX_FRAC));
  const commit = (px: number) => setDockHeight(tab, px / bodyPx);
  return (
    <Resizer
      label="Resize the dock"
      orientation="horizontal"
      direction={-1}
      value={value}
      min={DOCK_MIN_PX}
      max={max}
      constrain={(px) => snapDockPx(px, bodyPx)}
      onPreview={(px) =>
        rootRef.current?.style.setProperty(DOCK_HEIGHT_VAR, `${px}px`)
      }
      onCommit={commit}
      onDoubleClick={() => {
        const fallback = DOCK_DEFAULT_FRAC[tab] ?? DOCK_DEFAULT_FRAC.controls;
        const tall = Math.abs(value - bodyPx * DOCK_TALL_FRAC) < 2;
        setDockHeight(tab, tall ? fallback : DOCK_TALL_FRAC);
      }}
      onToggle={() => setTab(null)}
      data-testid="dock-resizer"
      className="top-0 z-[var(--daw-z-sticky)]"
    />
  );
}
