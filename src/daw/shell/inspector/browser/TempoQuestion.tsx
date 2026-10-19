import { useId } from 'react';
import { cn } from '@/components/utilities';
import { Button } from '@/daw/ui/Button';
import { TYPE_CLASS } from '@/daw/ui/styles';
import { useBrowserStore } from './browserStore';

// ── A groove at another tempo asks first (milestone 2.14) ──────────────────
//
// As the dock's Grooves tab asks: change the song's tempo to the groove's,
// add it as it is, or add nothing. Asked in the panel, not in a modal: a
// lesson's coach card, which sits above modals, keeps clear of this panel
// but not of the middle of the window. Escape is Cancel. The change and the
// add are one undo step.

export function TempoQuestion() {
  const question = useBrowserStore((s) => s.question);
  const titleId = useId();
  const textId = useId();
  if (!question) return null;
  const answer = (changeTempo: boolean | null) => {
    useBrowserStore.getState().dismissQuestion();
    question.answer(changeTempo);
    // The question took focus; it goes back to the row's + (or the search).
    requestAnimationFrame(() => {
      const add = document.querySelector<HTMLElement>(
        `[data-item-id="${CSS.escape(question.itemId)}"] [data-testid="library-add"]`,
      );
      (
        add ??
        document.querySelector<HTMLElement>('[data-testid="library-search"]')
      )?.focus();
    });
  };
  return (
    <div
      role="alertdialog"
      aria-labelledby={titleId}
      aria-describedby={textId}
      data-testid="library-tempo-question"
      onKeyDown={(e) => {
        if (e.key !== 'Escape') return;
        e.stopPropagation();
        answer(null);
      }}
      className="absolute inset-x-3 top-24 z-[var(--daw-z-panel)] flex flex-col gap-3 rounded-[var(--daw-radius-lg)] border border-daw-hairline bg-daw-popover p-4 shadow-2xl shadow-black/60"
    >
      <div className="flex flex-col gap-1">
        <p id={titleId} className={cn(TYPE_CLASS.title, 'text-daw-text')}>
          Change the tempo to {question.itemBpm} BPM?
        </p>
        <p id={textId} className={cn(TYPE_CLASS.label, 'text-daw-text-2')}>
          {question.name} was played at {question.itemBpm} BPM; your song is at{' '}
          {question.songBpm} BPM.
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Button
          variant="primary"
          autoFocus
          data-testid="library-tempo-change"
          onClick={() => answer(true)}
        >
          Change to {question.itemBpm} BPM
        </Button>
        <Button data-testid="library-tempo-keep" onClick={() => answer(false)}>
          Keep {question.songBpm} BPM
        </Button>
        <Button
          variant="quiet"
          data-testid="library-tempo-cancel"
          onClick={() => answer(null)}
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
