import { Maximize2, Minus, MoveRight, Plus } from 'lucide-react';
import { memo } from 'react';
import { cn } from '@/components/utilities';
import { shortcutKeys } from '@/daw/commands/shortcuts';
import { hintText } from '@/daw/shell/help/hintSource';
import {
  fitTimeline,
  zoomTimelineIn,
  zoomTimelineOut,
} from '@/daw/editor/viewport';
import { zoomPercent } from '@/daw/editor/zoom';
import { useStore } from '@/daw/store';
import { IconButton } from '@/daw/ui/IconButton';
import { TYPE_CLASS } from '@/daw/ui/styles';
import { Toggle } from '@/daw/ui/Toggle';
import { Tooltip } from '@/daw/ui/Tooltip';
import { SCROLL_FOOTER_PX } from '../tracklist/rowLayout';
import { TimelineScrollbar } from './TimelineScrollbar';

// ── The timeline's footer (milestones 2.6 and 2.13) ────────────────────────
//
// Under the lanes: the horizontal scrollbar, and beside its right end the
// view's own controls, zoom (−, the level, +, Fit) and Follow, as
// Soundtrap keeps its zoom (decision 16). They were in Create's toolbar
// until it folded away; the footer grew from 16 to 24 px so each is a 24 px
// target.

const ZOOM_IN_KEYS = shortcutKeys('timeline.zoomIn');
const ZOOM_OUT_KEYS = shortcutKeys('timeline.zoomOut');
const FIT_KEYS = shortcutKeys('timeline.zoomToFit');

export const TimelineFooter = memo(function TimelineFooter() {
  return (
    <div
      data-ds="v2"
      data-testid="timeline-footer"
      className="flex shrink-0 items-center gap-1 border-t border-daw-hairline bg-daw-surface-1 pl-[200px] pr-1"
      style={{ height: SCROLL_FOOTER_PX }}
    >
      <div className="min-w-0 flex-1 px-2">
        <TimelineScrollbar />
      </div>
      <ZoomControls />
      <span aria-hidden className="mx-0.5 h-4 w-px shrink-0 bg-daw-hairline" />
      <FollowToggle />
    </div>
  );
});

function ZoomControls() {
  const zoom = useStore((s) => s.timelineZoom);
  return (
    <div
      role="group"
      aria-label="Timeline zoom"
      className="flex shrink-0 items-center gap-0.5"
    >
      <IconButton
        label="Zoom out"
        icon={<Minus />}
        shortcut={ZOOM_OUT_KEYS.label}
        size="sm"
        tooltipSide="top"
        data-hint={hintText(
          'Zoom out',
          'See more of the song at once',
          ZOOM_OUT_KEYS.label,
        )}
        data-testid="zoom-out"
        onClick={zoomTimelineOut}
      />
      <Tooltip content="Timeline zoom" side="top">
        <span
          className={cn(
            TYPE_CLASS.label,
            'w-10 text-center tabular-nums text-daw-text-2',
          )}
          data-testid="zoom-level"
          data-hint={hintText(
            'Timeline zoom',
            'How far the timeline is zoomed in',
          )}
        >
          {zoomPercent(zoom)}
        </span>
      </Tooltip>
      <IconButton
        label="Zoom in"
        icon={<Plus />}
        shortcut={ZOOM_IN_KEYS.label}
        size="sm"
        tooltipSide="top"
        data-hint={hintText(
          'Zoom in',
          'See the timeline in more detail',
          ZOOM_IN_KEYS.label,
        )}
        data-testid="zoom-in"
        onClick={zoomTimelineIn}
      />
      <IconButton
        label="Fit the song"
        icon={<Maximize2 />}
        shortcut={FIT_KEYS.label}
        size="sm"
        tooltipSide="top"
        data-hint={hintText(
          'Fit the song',
          'Zoom so the whole song fits the window',
          FIT_KEYS.label,
        )}
        data-testid="zoom-fit"
        onClick={fitTimeline}
      />
    </div>
  );
}

function FollowToggle() {
  const follow = useStore((s) => s.followPlayhead);
  return (
    <Toggle
      label="Follow the playhead"
      icon={<MoveRight />}
      size="sm"
      pressed={follow}
      onPressedChange={(on) => useStore.getState().setFollowPlayhead(on)}
      data-hint={hintText(
        'Follow the playhead',
        'Scroll along with the playhead as the song plays',
      )}
      data-testid="follow-toggle"
    />
  );
}
