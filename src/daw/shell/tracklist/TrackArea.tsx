import { memo, useRef } from 'react';
import { Timeline } from '@/daw/components/Timeline/Timeline';
import { DevProfiler } from '@/daw/dev/DevProfiler';
import { useStore } from '@/daw/store';
import { ChordAnalysisBanner } from '../canvas/ChordAnalysisBanner';
import { cn } from '@/components/utilities';
import { TRANSITION } from '@/daw/ui/styles';
import {
  MasterRow,
  selectMaster,
  useMasterSelected,
} from '../bottombar/MasterRow';
import { TimelineFooter } from '../canvas/TimelineFooter';
import {
  CommentLaneSlot,
  useCommentLaneShown,
} from '../canvas/sections/CommentLaneSlot';
import { SectionsLane } from '../canvas/sections/SectionsLane';
import { PromptBar } from '../prompt/PromptBar';
import { AddTrackMenu } from './AddTrackMenu';
import { ChordRulerSettings } from './ChordRulerSettings';
import { NowPlaying } from './NowPlaying';
import {
  MASTER_OVER_LANES_PX,
  MASTER_STRIP_PX,
  RULER_PX,
  SECTIONS_LANE_PX,
  TRACK_COLUMN_PX,
} from './rowLayout';
import { TrackList } from './TrackList';

// ── Create's track area (milestones 2.6, 2.7 and 2.13) ─────────────────────
//
//   (Comments)   │ the comment lane, only while Comments is open (4.3)   24
//                │ the sections lane                                     24
//                │ the ruler: loop strip and bar numbers   [Snap][Grid]  32
//   Chords · key │ the chord lane                                        24
//   track rows   │ the lanes                                     (scrolls)
//   + Add track  │ centred under the last track (Suno's place for it);
//                │ an empty project's column centres it in its height
//   Master       │ the lanes' foot
//   (80 px)      │ the song overview                [− % + Fit][Follow]  32
//
// The Master strip sits at the area's foot, level with the song overview
// (owner, 2026-10-22, as Suno's Main does): over the track column's last
// 48 px and the footer's empty left end.
//
// Create's toolbar row folded away in 2.13 (decision 16): its controls sit
// where they act, and the lane header is 80 px. The rows and the lanes are
// one vertical scroller, so a row and its lane can't drift apart
// (timeline-12); both take their heights from rowLayout. The ruler and the
// chord lane stay at the top while it scrolls: the canvas draws them at the
// scroll offset, and the left column's corner and the ruler's end controls
// are sticky. The sections row sits above the scroller, which never moves
// it. An empty project shows bare lanes and + Add track in the middle of
// the column (its "Start your song" tiles went, 2026-10-21); the canvas
// still takes a Library row or a .mid file dropped on it.

export const TrackArea = memo(function TrackArea() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const empty = useStore((s) => s.tracks.length === 0);
  const commentLane = useCommentLaneShown();
  return (
    <div
      data-testid="track-area"
      className="relative flex min-h-0 flex-1 flex-col"
    >
      <CommentLaneSlot shown={commentLane} />
      <SectionsRow />
      <div
        ref={scrollRef}
        data-testid="track-scroller"
        className="grid min-h-0 flex-1 grid-cols-[260px_minmax(0,1fr)] overflow-y-auto overflow-x-hidden bg-daw-bg"
        style={{ scrollbarWidth: 'thin' }}
      >
        <div
          data-ds="v2"
          className="relative flex flex-col border-r border-daw-hairline bg-daw-surface-1"
        >
          <div className="sticky top-0 z-[var(--daw-z-sticky)] bg-daw-surface-1">
            {/* Beside the ruler: under Now Playing, which reaches down here
                from the sections row (SectionsRow). */}
            <div aria-hidden style={{ height: RULER_PX }} />
            {/* Beside the chord lane: the chord ruler's settings. */}
            <ChordRulerSettings />
          </div>
          <DevProfiler id="TrackList">
            <TrackList />
          </DevProfiler>
          <AddTrackMenu fill={empty} />
          {/* Room under + Add track for the Master strip, which stands over
              the column's foot (below); the timeline's canvas counts it
              (TRACK_FOOT_PX). */}
          <div
            aria-hidden
            className="mt-auto shrink-0"
            style={{ height: MASTER_OVER_LANES_PX }}
          />
        </div>
        <div className="relative min-w-0">
          <ChordAnalysisBanner />
          <Timeline scrollRef={scrollRef} />
        </div>
      </div>
      <TimelineFooter />
      <MasterStrip />
      <PromptBar />
    </div>
  );
});

/**
 * The row above the ruler: the song's sections over the lanes, and Now
 * Playing over the track list, reaching down beside the ruler. A hairline
 * under it that takes no height keeps the header at 80 px.
 */
function SectionsRow() {
  return (
    <div
      data-ds="v2"
      data-testid="sections-row"
      // Over the scroller, so Now Playing can reach down beside the ruler.
      className="relative z-[var(--daw-z-dock)] grid shrink-0 grid-cols-[260px_minmax(0,1fr)] bg-daw-surface-1 shadow-[inset_0_-1px_0_var(--daw-hairline)]"
      style={{ height: SECTIONS_LANE_PX }}
    >
      {/* The chord being played (it moved here from Insight, 2026-10-21),
          beside the sections row and the ruler under it. */}
      <div className="relative border-r border-daw-hairline">
        <div className="absolute inset-x-0 top-0">
          <NowPlaying />
        </div>
      </div>
      <SectionsLane />
    </div>
  );
}

/**
 * Master, at the area's foot beside the song overview, pinned there as the
 * tracks scroll under it: selectable as a track's row is (a click anywhere
 * on it), its background showing the selection (2026-10-22).
 */
function MasterStrip() {
  const selected = useMasterSelected();
  return (
    <div
      data-ds="v2"
      data-testid="main-strip"
      data-selected={selected || undefined}
      onClick={selectMaster}
      // Opaque, so the rows scrolling under it never show through; the
      // selection's tint (a track row's) is a layer over it.
      className="group/master absolute bottom-0 left-0 z-[var(--daw-z-sticky)] border-r border-t border-daw-hairline bg-daw-surface-1"
      style={{ width: TRACK_COLUMN_PX, height: MASTER_STRIP_PX }}
    >
      <div
        aria-hidden
        className={cn(
          'pointer-events-none absolute inset-0',
          selected ? 'bg-daw-surface-2' : 'group-hover/master:bg-daw-surface-2',
          TRANSITION,
        )}
      />
      <div className="relative px-4 pb-2.5 pt-2">
        <MasterRow layout="strip" />
      </div>
    </div>
  );
}
