import { Check, Minus, X } from 'lucide-react';
import { cn } from '@/components/utilities';
import type { EchoMark } from './types';

// ── A cell of a class's Echo grid ──────────────────────────────────────────
// ✓ a good echo, ✗ missed, – no answer, ○ not joined (docs/echo-classroom.md,
// The Teacher's Screen). Each says what it is to a screen reader.

const MARK_LABEL: Record<EchoMark, string> = {
  good: 'Good echo',
  miss: 'Missed',
  none: 'No answer',
  out: 'Not joined',
};

/** A mark of the grid: ✓ ✗ – ○. */
export function EchoMarkIcon({
  mark,
  keyColor,
  className,
}: {
  mark: EchoMark;
  keyColor: string;
  className?: string;
}) {
  const label = MARK_LABEL[mark];
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      data-echo-mark={mark}
      className={cn(
        'inline-flex size-6 items-center justify-center',
        className,
      )}
    >
      {mark === 'good' ? (
        <Check aria-hidden className="size-5" style={{ color: keyColor }} />
      ) : mark === 'miss' ? (
        <X aria-hidden className="size-5 text-white/70" />
      ) : mark === 'none' ? (
        <Minus aria-hidden className="size-5 text-white/35" />
      ) : (
        <span
          aria-hidden
          className="size-3 rounded-full border border-white/30"
        />
      )}
    </span>
  );
}
