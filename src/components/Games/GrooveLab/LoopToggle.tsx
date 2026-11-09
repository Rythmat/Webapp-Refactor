import { Repeat } from 'lucide-react';
import { cn } from '@/components/utilities';

/** Loop on or off: the grid's Listen and Play mine, the pads' groove. */
export function LoopToggle({
  on,
  onChange,
}: {
  on: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      data-testid="groove-loop"
      onClick={() => onChange(!on)}
      className={cn(
        'inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm transition-colors',
        on
          ? 'border-[#7ecfcf] bg-[#7ecfcf]/15 text-[#7ecfcf]'
          : 'border-white/15 text-white/70 hover:bg-white/[0.06]',
      )}
    >
      <Repeat className="size-4" aria-hidden />
      Loop {on ? 'on' : 'off'}
    </button>
  );
}
