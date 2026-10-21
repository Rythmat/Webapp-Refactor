import { Lightbulb } from 'lucide-react';
import { memo } from 'react';
import { cn } from '@/components/utilities';
import { useDevCommitCount } from '@/daw/dev/DevProfiler';
import { HintLine } from '@/daw/shell/help/HintLine';
import { hintText } from '@/daw/shell/help/hintSource';
import { useStore } from '@/daw/store';
import { Pill, PILL_ZONE } from '@/daw/ui/Pill';
import { ViewTabs } from '../topbar/ViewTabs';
import { MasterRow } from './MasterRow';

// ── The bottom rail (B4a; the floating frame, S0) ──────────────────────────
//
// 44 px, the window's full width, under every view, its zones in pills on
// the page (owner, 2026-10-21): Master at the left (volume, level, its
// automation, Effects → Mix), with the hover hint line (2.11) in the free
// width after it; the view tabs (Create, Mix, Score) centred in the window;
// Learn at the right, which turns the hover hints on and off. The transport
// and the song moved to the top bar.

export const BottomRail = memo(function BottomRail() {
  useDevCommitCount('BottomRail');
  return (
    <div
      data-testid="bottom-rail"
      className="grid h-11 items-center gap-2 px-2"
      style={{ gridTemplateColumns: 'minmax(0, 1fr) auto minmax(0, 1fr)' }}
    >
      <div
        role="group"
        aria-label="Master"
        data-zone="master"
        className="flex min-w-0 items-center gap-3 justify-self-stretch"
      >
        <div className={cn(PILL_ZONE, 'px-3')}>
          <MasterRow />
        </div>
        <HintLine />
      </div>
      <div
        role="group"
        aria-label="Views"
        data-zone="views"
        className={PILL_ZONE}
      >
        <ViewTabs />
      </div>
      <div
        role="group"
        aria-label="Learn"
        data-zone="learn"
        className="flex min-w-0 items-center justify-self-end"
      >
        <LearnPill />
      </div>
    </div>
  );
});

/**
 * Learn: the hover hints' switch. The white pill while they're on, as the
 * floating frame's Learn is.
 */
function LearnPill() {
  const on = useStore((s) => s.hoverHints);
  const setHoverHints = useStore((s) => s.setHoverHints);
  return (
    <Pill
      variant={on ? 'primary' : 'pill'}
      aria-pressed={on}
      data-testid="learn-pill"
      data-hint={hintText(
        'Learn',
        on
          ? 'Stop saying what each control does'
          : 'Say what each control does as you point at it',
      )}
      onClick={() => setHoverHints(!on)}
    >
      <Lightbulb />
      Learn
    </Pill>
  );
}
