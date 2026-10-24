import { memo } from 'react';
import { useDevCommitCount } from '@/daw/dev/DevProfiler';
import { HintLine } from '@/daw/shell/help/HintLine';
import { useStore } from '@/daw/store';
import { PILL_ZONE } from '@/daw/ui/Pill';
import { ViewTabs } from '../topbar/ViewTabs';
import { dockKindOf, type DockKind } from '../dock/dockTabs';
import { DockViews } from './DockViews';
import { TypingKeys } from './TypingKeys';

// ── The bottom rail (B4a; the floating frame, S0) ──────────────────────────
//
// 44 px, the window's full width, under every view, its zones in pills on
// the page (owner, 2026-10-21): at the left, Create's dock views
// (Instrument · FX and Edit · Automation, DockViews), Typing keys (the
// computer keyboard's switch, in every view); the view tabs (Create, Mix,
// Score) centred in the window; and the hover hint line (2.11) centred in
// the space to their right (owner, 2026-10-22). Learn went from the right
// (owner, 2026-10-21): the hover hints switch is in the top bar's ⋯ menu.
// The transport and the song moved to the top bar, and Master to the foot
// of the track column (the Master strip, TrackArea).

/** The tracks the computer keyboard plays no notes on. */
const NOTELESS: ReadonlySet<DockKind> = new Set<DockKind>([
  'audio',
  'audio-in',
]);

export const BottomRail = memo(function BottomRail() {
  useDevCommitCount('BottomRail');
  // The dock and the automation lane are Create's (StudioShell): its
  // timeline is the practice view's too until a practice session exists.
  const create = useStore(
    (s) =>
      s.currentView === 'arrange' ||
      (s.currentView === 'practice' && s.practiceSession === null),
  );
  // The computer keyboard plays notes: no Typing keys while an audio track
  // (an Audio track or an upload) or Master is selected (owner,
  // 2026-10-22).
  const typingApplies = useStore(
    (s) =>
      !s.dockMaster &&
      !NOTELESS.has(
        dockKindOf(s.tracks.find((t) => t.id === s.selectedTrackId)),
      ),
  );
  return (
    <div
      data-testid="bottom-rail"
      className="grid h-11 items-center gap-2 px-2"
      style={{ gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)' }}
    >
      <div
        data-zone="editors"
        className="flex min-w-0 items-center gap-2 justify-self-stretch"
      >
        {create ? <DockViews /> : null}
        {typingApplies ? <TypingKeys /> : null}
      </div>
      <div
        role="group"
        aria-label="Views"
        data-zone="views"
        className={PILL_ZONE}
      >
        <ViewTabs />
      </div>
      {/* The hover hint, centred in the space right of the view tabs
          (owner, 2026-10-22). */}
      <div
        data-zone="hint"
        className="flex min-w-0 items-center justify-self-stretch"
      >
        <HintLine align="center" />
      </div>
    </div>
  );
});
