import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/components/utilities';
import { FOCUS_RING, TRANSITION, TYPE_CLASS } from '@/daw/ui/styles';
import { useDockPanelFolded, type DockSidePanel } from './dockSidePanels';

// ── A dock column that folds to a rail (owner, 2026-10-22) ──────────────────
//
// Open, the column is its own width with a small tab on its right edge to
// fold it. Folded, it is a 28 px rail: the tab to open it at the top, and
// the column's name running up the rail's middle. The column stays mounted while folded (a tuner
// keeps listening, a menu keeps its place), only out of sight.

export const RAIL_PX = 28;

export function FoldableDockColumn({
  panel,
  name,
  width,
  className,
  testId,
  children,
}: {
  panel: DockSidePanel;
  /** The column in words, for the rail and its buttons ('Sounds'). */
  name: string;
  width: number;
  className?: string;
  testId?: string;
  children: ReactNode;
}) {
  const [folded, setFolded] = useDockPanelFolded(panel);
  return (
    <div
      data-testid={testId}
      data-folded={folded || undefined}
      className={cn(
        'group/fold relative flex shrink-0 flex-col border-r border-daw-hairline',
        className,
      )}
      style={{ width: folded ? RAIL_PX : width }}
    >
      {folded ? (
        <button
          type="button"
          aria-expanded={false}
          aria-label={`Show ${name.toLowerCase()}`}
          title={`Show ${name.toLowerCase()}`}
          data-testid={`dock-unfold-${panel}`}
          onClick={() => setFolded(false)}
          className={cn(
            'relative flex h-full w-full items-center justify-center text-daw-text-3 hover:bg-daw-hover hover:text-daw-text',
            TRANSITION,
            FOCUS_RING,
          )}
        >
          <ChevronRight
            aria-hidden
            className="absolute left-1/2 top-2 size-4 -translate-x-1/2"
          />
          <span
            className={cn(TYPE_CLASS.label, 'whitespace-nowrap font-bold')}
            style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
          >
            {name}
          </span>
        </button>
      ) : null}
      {/* A class, not the hidden attribute, which `flex` would override. */}
      <div className={cn('flex min-h-0 flex-1 flex-col', folded && 'hidden')}>
        {children}
      </div>
      {folded ? null : (
        <button
          type="button"
          aria-expanded
          aria-label={`Hide ${name.toLowerCase()}`}
          title={`Hide ${name.toLowerCase()}`}
          data-testid={`dock-fold-${panel}`}
          onClick={() => setFolded(true)}
          className={cn(
            'absolute right-0 top-1/2 flex h-10 w-6 -translate-y-1/2 items-center justify-center rounded-l-md bg-daw-chip text-daw-text-3 opacity-60 hover:text-daw-text hover:opacity-100 focus-visible:opacity-100 group-hover/fold:opacity-100',
            TRANSITION,
            FOCUS_RING,
          )}
        >
          <ChevronLeft aria-hidden className="size-3.5" />
        </button>
      )}
    </div>
  );
}
