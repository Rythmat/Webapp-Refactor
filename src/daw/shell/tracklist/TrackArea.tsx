import { Plus } from 'lucide-react';
import { memo, useRef } from 'react';
import { AutomationLaneEditor } from '@/daw/components/Timeline/AutomationLaneEditor';
import { Timeline } from '@/daw/components/Timeline/Timeline';
import { DevProfiler } from '@/daw/dev/DevProfiler';
import { hintText } from '@/daw/shell/help/hintSource';
import { useStore } from '@/daw/store';
import { Button } from '@/daw/ui/Button';
import { ChordAnalysisBanner } from '../canvas/ChordAnalysisBanner';
import { MasterRow } from '../bottombar/MasterRow';
import { ChordLaneHeader } from '../canvas/ChordLaneHeader';
import { TimelineFooter } from '../canvas/TimelineFooter';
import { TimelineTools } from '../canvas/TimelineTools';
import {
  CommentLaneSlot,
  useCommentLaneShown,
} from '../canvas/sections/CommentLaneSlot';
import { SectionsLane } from '../canvas/sections/SectionsLane';
import { AddTrackSheet } from './AddTrackSheet';
import { openAddTrackSheet } from './addTrack';
import { EmptyProjectTiles } from './EmptyProjectTiles';
import { LANE_HEADER_PX, SECTIONS_LANE_PX } from './rowLayout';
import { TrackList } from './TrackList';

// ── Create's track area (milestones 2.6, 2.7 and 2.13) ─────────────────────
//
//   (Comments)   │ the comment lane, only while Comments is open (4.3)   24
//   + Add track  │ the sections lane                                     24
//   V B C        │ the ruler: loop strip and bar numbers   [Snap][Grid]  32
//   Chords · key │ the chord lane                                        24
//   track rows   │ the lanes                                     (scrolls)
//   (automation lane, when one is open)
//                │ the scrollbar                    [− % + Fit][Follow]  24
//
// Create's toolbar row folded away in 2.13 (decision 16): its controls sit
// where they act, and the lane header is 80 px. The rows and the lanes are
// one vertical scroller, so a row and its lane can't drift apart
// (timeline-12); both take their heights from rowLayout. The ruler and the
// chord lane stay at the top while it scrolls: the canvas draws them at the
// scroll offset, and the left column's corner and the ruler's end controls
// are sticky. The sections row sits above the scroller, which never moves
// it. An empty project shows its first steps in the lanes.

export const TrackArea = memo(function TrackArea() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const empty = useStore((s) => s.tracks.length === 0);
  const commentLane = useCommentLaneShown();
  return (
    <div data-testid="track-area" className="flex min-h-0 flex-1 flex-col">
      <CommentLaneSlot shown={commentLane} />
      <SectionsRow />
      <div
        ref={scrollRef}
        data-testid="track-scroller"
        className="grid min-h-0 flex-1 grid-cols-[200px_minmax(0,1fr)] overflow-y-auto overflow-x-hidden bg-daw-bg"
        style={{ scrollbarWidth: 'thin' }}
      >
        <div
          data-ds="v2"
          className="relative flex flex-col border-r border-daw-hairline bg-daw-surface-1"
        >
          <div className="sticky top-0 z-[var(--daw-z-sticky)] bg-daw-surface-1">
            <TimelineTools />
            <ChordLaneHeader />
          </div>
          <DevProfiler id="TrackList">
            <TrackList />
          </DevProfiler>
          {/* Main, the master strip, at the column's foot, where the
              floating frame keeps it: pinned there as the tracks scroll. */}
          <div
            data-testid="main-strip"
            className="sticky bottom-0 z-[var(--daw-z-sticky)] mt-auto border-t border-daw-hairline bg-daw-surface-1 px-4 pb-2.5 pt-2"
          >
            <MasterRow layout="strip" />
          </div>
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
      <TimelineFooter />
      <AddTrackSheet />
    </div>
  );
});

/**
 * The row above the ruler: + Add track over the track list (the lessons'
 * anchor, where the toolbar had it), and the song's sections over the
 * lanes. A hairline under it that takes no height keeps the header at 80 px.
 */
function SectionsRow() {
  return (
    <div
      data-ds="v2"
      data-testid="sections-row"
      className="grid shrink-0 grid-cols-[200px_minmax(0,1fr)] bg-daw-surface-1 shadow-[inset_0_-1px_0_var(--daw-hairline)]"
      style={{ height: SECTIONS_LANE_PX }}
    >
      <div className="flex items-center border-r border-daw-hairline px-2">
        <Button
          size="sm"
          variant="ghost"
          data-tutorial-id="add-track-button"
          data-testid="add-track-button"
          data-hint={hintText(
            'Add track',
            'Choose an instrument, drums or audio for a new track',
          )}
          className="w-full justify-start"
          onClick={openAddTrackSheet}
        >
          <Plus aria-hidden />
          Add track
        </Button>
      </div>
      <SectionsLane />
    </div>
  );
}
