import { TriangleAlert } from 'lucide-react';
import { cn } from '@/components/utilities';

// ── What the editor shows when a part of it fails (milestone 1.12a) ────────
//
// One panel for the three boundaries: the editor route (its chunk failed),
// the editor (a crash) and a lazy part (a view, a dock tab, an instrument,
// a dialog). Plain markup in the app theme's colours (the DAW tokens alias
// them), with no editor imports: the route boundary renders it from the
// app's entry chunk. The first action is the white pill.

export interface ErrorPanelAction {
  label: string;
  onClick(): void;
}

export interface ErrorPanelProps {
  title: string;
  /** One plain line: what happened and what is safe. */
  reason: string;
  actions?: ErrorPanelAction[];
  /** In a dock tab or a view's area rather than the whole editor. */
  compact?: boolean;
  testId?: string;
}

const PILL =
  'inline-flex h-8 min-w-[24px] items-center justify-center rounded-full px-4 text-[13px] font-bold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white/60';

export function ErrorPanel({
  title,
  reason,
  actions = [],
  compact = false,
  testId,
}: ErrorPanelProps) {
  return (
    <div
      role="alert"
      data-testid={testId}
      className={cn(
        'flex w-full flex-1 items-center justify-center bg-background p-4',
        compact ? 'min-h-[120px]' : 'min-h-0',
      )}
    >
      <div
        className={cn(
          'flex max-w-sm flex-col items-center gap-3 text-center',
          compact
            ? ''
            : 'rounded-2xl border border-white/10 bg-white/[0.04] p-6',
        )}
      >
        <TriangleAlert className="size-5 text-white/60" aria-hidden />
        <p className="text-sm font-bold text-white">{title}</p>
        <p className="text-[12px] leading-relaxed text-white/60">{reason}</p>
        {actions.length > 0 && (
          <div className="mt-1 flex flex-wrap items-center justify-center gap-2">
            {actions.map((action, index) => (
              <button
                key={action.label}
                type="button"
                onClick={action.onClick}
                className={cn(
                  PILL,
                  index === 0
                    ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                    : 'border border-white/15 text-white hover:bg-white/10',
                )}
              >
                {action.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
