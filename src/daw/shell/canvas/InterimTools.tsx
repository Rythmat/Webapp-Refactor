import { Hash, Magnet, Maximize2, Minus, Plus } from 'lucide-react';
import { memo } from 'react';
import { cn } from '@/components/utilities';
import { songLengthTicks, ZOOM_STEP } from '@/daw/commands/clipCommands';
import { shortcutKeys } from '@/daw/commands/shortcuts';
import { useStore } from '@/daw/store';
import { ticksPerBar, timeSignatureOf } from '@/daw/time/timeModel';
import { IconButton } from '@/daw/ui/IconButton';
import { TYPE_CLASS } from '@/daw/ui/styles';
import { Toggle } from '@/daw/ui/Toggle';
import { Tooltip } from '@/daw/ui/Tooltip';
import { chordNotationLockTitle } from '@/daw/utils/chordRegionNotation';
import { useChordNotation } from '@/lib/chordNotation';

// ── The timeline's tools, until the Create toolbar (milestone 2.5 → 2.7) ───
//
// Snap, the chord ruler's numbers or note names, and zoom (−, the zoom
// level, +, fit the song) left the top bar with 2.5, which keeps only what
// every view needs. Until 2.7 gives Create its 32 px toolbar they sit here,
// in the empty corner above the track headers, so none of them disappears
// and the lanes keep their height.

const ZOOM_IN_KEYS = shortcutKeys('timeline.zoomIn');
const ZOOM_OUT_KEYS = shortcutKeys('timeline.zoomOut');
const FIT_KEYS = shortcutKeys('timeline.zoomToFit');

export interface InterimToolsProps {
  /** The timeline's visible width in px (its scroll box), when it has one. */
  viewportWidth(): number;
}

export const InterimTools = memo(function InterimTools({
  viewportWidth,
}: InterimToolsProps) {
  const zoom = useStore((s) => s.timelineZoom);
  const snap = useStore((s) => s.timelineSnapEnabled);
  const toggleSnap = useStore((s) => s.toggleTimelineSnap);
  const showNotes = useStore((s) => s.chordRulerShowNotes);
  const toggleLabels = useStore((s) => s.toggleChordRulerLabels);
  // Jazz and Roman decide the chord ruler's labels; the toggle applies to
  // hybrid only.
  const notation = useChordNotation();
  const labelsLocked = notation !== 'hybrid';

  // Around the middle of what's on screen, as ⌥= and ⌥− do.
  const zoomBy = (factor: number) => {
    const s = useStore.getState();
    s.zoomAtPoint(factor, s.timelineScrollLeft + viewportWidth() / 2);
  };
  const fit = () => {
    const s = useStore.getState();
    s.zoomToFit(
      viewportWidth(),
      songLengthTicks(ticksPerBar(timeSignatureOf(s))),
    );
  };

  return (
    <div
      data-ds="v2"
      data-testid="interim-tools"
      className="flex h-full flex-col justify-center gap-1 px-2"
    >
      <div className="flex items-center gap-1">
        {/* Only gestures snap: toggling it never moves the playhead
            (shell-18). */}
        <Toggle
          label="Snap to grid"
          icon={<Magnet />}
          pressed={snap}
          onPressedChange={() => toggleSnap()}
          size="sm"
          data-testid="snap-toggle"
        />
        <Toggle
          label={
            labelsLocked
              ? chordNotationLockTitle(notation)
              : showNotes
                ? 'Chord ruler: note names (show degree numbers)'
                : 'Chord ruler: degree numbers (show note names)'
          }
          icon={<Hash />}
          pressed={showNotes && !labelsLocked}
          disabled={labelsLocked}
          onPressedChange={() => toggleLabels()}
          size="sm"
          data-testid="chord-ruler-labels"
        />
      </div>
      <div className="flex items-center gap-0.5">
        <IconButton
          label="Zoom out"
          icon={<Minus />}
          shortcut={ZOOM_OUT_KEYS.label}
          size="sm"
          onClick={() => zoomBy(-ZOOM_STEP / (1 + ZOOM_STEP))}
        />
        <Tooltip content="Timeline zoom" side="bottom">
          <span
            className={cn(
              TYPE_CLASS.label,
              'w-10 text-center tabular-nums text-daw-text-2',
            )}
            data-testid="zoom-level"
          >
            {Math.round(zoom * 100)}%
          </span>
        </Tooltip>
        <IconButton
          label="Zoom in"
          icon={<Plus />}
          shortcut={ZOOM_IN_KEYS.label}
          size="sm"
          onClick={() => zoomBy(ZOOM_STEP)}
        />
        <IconButton
          label="Fit the song"
          icon={<Maximize2 />}
          shortcut={FIT_KEYS.label}
          size="sm"
          onClick={fit}
        />
      </div>
    </div>
  );
});
