import { Magnet } from 'lucide-react';
import { memo } from 'react';
import { useStore } from '@/daw/store';
import { Toggle } from '@/daw/ui/Toggle';
import { RULER_PX } from '../tracklist/rowLayout';
import { GridMenu } from './GridMenu';

// ── Snap and Grid at the ruler's right end (milestone 2.13) ────────────────
//
// Where Soundtrap keeps them (anatomy §3, decision 16): over the ruler's
// right end, which stays at the top of the lanes as they scroll. The ruler
// is drawn on the timeline's canvas, so these float over it in a sticky
// layer of no height of their own.

const CONTROL_PX = 24;

export const RulerEndControls = memo(function RulerEndControls() {
  return (
    <div className="pointer-events-none sticky top-0 z-[var(--daw-z-sticky)] h-0">
      <div
        data-ds="v2"
        data-testid="ruler-end"
        role="group"
        aria-label="Grid and snap"
        className="pointer-events-auto absolute right-1 flex items-center gap-0.5 rounded-full bg-daw-surface-1"
        style={{ top: (RULER_PX - CONTROL_PX) / 2 }}
      >
        <SnapToggle />
        <GridMenu />
      </div>
    </div>
  );
});

function SnapToggle() {
  const snap = useStore((s) => s.timelineSnapEnabled);
  // Only gestures snap: toggling it never moves the playhead (shell-18).
  return (
    <Toggle
      label="Snap to grid"
      icon={<Magnet />}
      pressed={snap}
      onPressedChange={() => useStore.getState().toggleTimelineSnap()}
      size="sm"
      data-testid="snap-toggle"
    />
  );
}
