import { memo, useRef } from 'react';
import { AutomationLaneEditor } from '@/daw/components/Timeline/AutomationLaneEditor';
import { Timeline } from '@/daw/components/Timeline/Timeline';
import { DevProfiler } from '@/daw/dev/DevProfiler';
import { useStore } from '@/daw/store';
import { ChordAnalysisBanner } from '../canvas/ChordAnalysisBanner';
import { ChordLaneHeader } from '../canvas/ChordLaneHeader';
import { CreateToolbar } from '../canvas/CreateToolbar';
import { TimelineScrollbar } from '../canvas/TimelineScrollbar';
import { AddTrackSheet } from './AddTrackSheet';
import { EmptyProjectTiles } from './EmptyProjectTiles';
import { MasterRow } from './MasterRow';
import { LANE_HEADER_PX, MASTER_ROW_PX, RULER_PX } from './rowLayout';
import { TrackList } from './TrackList';

// ── Create's track area (milestones 2.6 and 2.7) ───────────────────────────
//
//   + Add track  │ the toolbar (tools, grid, zoom, Follow, + Marker)    32
//   (ruler)      │ the ruler: loop strip and bar numbers                 32
//   Chords · key │ the chord lane                                        24
//   track rows   │ the lanes                                     (scrolls)
//   (automation lane, when one is open)
//   Master       │ the timeline's scrollbar                              40
//
// The rows and the lanes are one vertical scroller, so a row and its lane
// can't drift apart (timeline-12); both take their heights from rowLayout.
// The ruler and the chord lane stay at the top while it scrolls: the canvas
// draws them at the scroll offset, and the left column's corner is sticky.
// The Master row and the scrollbar share the footer, so the lanes give up no
// height to either. An empty project shows its first steps in the lanes.

export const TrackArea = memo(function TrackArea() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const empty = useStore((s) => s.tracks.length === 0);
  return (
    <div data-testid="track-area" className="flex min-h-0 flex-1 flex-col">
      <CreateToolbar />
      <div
        ref={scrollRef}
        data-testid="track-scroller"
        className="grid min-h-0 flex-1 grid-cols-[200px_minmax(0,1fr)] overflow-y-auto overflow-x-hidden bg-daw-bg"
        style={{ scrollbarWidth: 'thin' }}
      >
        <div
          data-ds="v2"
          className="relative border-r border-daw-hairline bg-daw-surface-1"
        >
          <div className="sticky top-0 z-[var(--daw-z-sticky)] bg-daw-surface-1">
            <div
              aria-hidden
              className="border-b border-daw-hairline"
              style={{ height: RULER_PX }}
            />
            <ChordLaneHeader />
          </div>
          <DevProfiler id="TrackList">
            <TrackList />
          </DevProfiler>
        </div>
        <div className="relative min-w-0">
          <ChordAnalysisBanner />
          <Timeline scrollRef={scrollRef} />
          {empty ? (
            <div
              className="absolute inset-x-0 bottom-0"
              style={{ top: LANE_HEADER_PX }}
            >
              <EmptyProjectTiles />
            </div>
          ) : null}
        </div>
      </div>
      <AutomationLaneEditor />
      <div
        data-ds="v2"
        className="flex shrink-0 border-t border-daw-hairline"
        style={{ height: MASTER_ROW_PX }}
      >
        <div className="w-[200px] shrink-0 border-r border-daw-hairline">
          <MasterRow />
        </div>
        <div className="flex min-w-0 flex-1 items-center bg-daw-surface-1 px-2">
          <TimelineScrollbar />
        </div>
      </div>
      <AddTrackSheet />
    </div>
  );
});
