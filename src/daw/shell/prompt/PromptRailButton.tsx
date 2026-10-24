import { cn } from '@/components/utilities';
import { FOCUS_RING, TRANSITION } from '@/daw/ui/styles';
import { Tooltip } from '@/daw/ui/Tooltip';
import { PromptDeltaIcon } from './PromptDeltaIcon';
import { usePromptBarStore } from './promptBarStore';

// ── The prompt bar's place on the side rail (owner, 2026-10-23) ────────────
//
// The ∆ at the top of the side rail opens the prompt bar over the lanes and
// folds it again; folded, the bar leaves nothing over the timeline. It has
// the white tile while the bar is open, as a panel's icon does.

const TEST_ID = 'rail-prompt';

/** Focus the rail's ∆, where Escape in the bar sends focus as it folds. */
export function focusPromptRailButton(): void {
  document
    .querySelector<HTMLButtonElement>(`[data-testid="${TEST_ID}"]`)
    ?.focus();
}

export function PromptRailButton() {
  const open = usePromptBarStore((s) => !s.collapsed);
  return (
    <Tooltip content="Ask for a part" side="left">
      <button
        type="button"
        aria-label="Ask for a part"
        aria-pressed={open}
        data-testid={TEST_ID}
        data-tutorial-id={TEST_ID}
        onClick={() => {
          const bar = usePromptBarStore.getState();
          if (open) bar.collapse();
          else bar.expand();
        }}
        className={cn(
          'relative flex size-8 items-center justify-center rounded-[var(--daw-radius-sm)] [&_svg]:size-[18px]',
          open
            ? 'bg-daw-primary text-daw-on-primary hover:bg-daw-primary-hover'
            : 'text-daw-text-2 hover:bg-daw-hover hover:text-daw-text',
          TRANSITION,
          FOCUS_RING,
        )}
      >
        <PromptDeltaIcon />
      </button>
    </Tooltip>
  );
}
