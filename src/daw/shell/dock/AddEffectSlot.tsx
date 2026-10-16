import { Plus, X } from 'lucide-react';
import { cn } from '@/components/utilities';
import { useStore } from '@/daw/store';
import { MAX_RACK_EFFECTS } from '@/daw/store/effectRack';
import { IconButton } from '@/daw/ui/IconButton';
import { FOCUS_RING, TRANSITION, TYPE_CLASS } from '@/daw/ui/styles';

// ── The chain's Add effect slot (milestone 2.8) ────────────────────────────
//
// The card after the last effect in the dock's chain, after Soundtrap's.
// Add effect arms it: the side rail's Effects library opens beside the
// dock, and each pick there fills this slot and arms the next. While armed
// (the library showing) it says so, with a × that stops adding and puts the
// Inspector back as it was. At the cap it says the chain is full. The same
// size as the chain's blocks (68 px), so the row keeps its height.

/** Whether the chain's next slot is armed: the Effects library is showing. */
export const useEffectsArmed = () =>
  useStore((s) => s.libraryOpen && s.inspectorPanel === 'fx');

export function AddEffectSlot({ count }: { count: number }) {
  const armed = useEffectsArmed();
  const open = useStore((s) => s.openEffectsLibrary);
  const cancel = useStore((s) => s.cancelEffectsLibrary);
  const full = count >= MAX_RACK_EFFECTS;

  if (full) {
    return (
      <div
        data-testid="fx-add-slot"
        data-state="full"
        className="flex shrink-0 flex-col items-center"
      >
        <div className="flex size-[68px] items-center justify-center rounded-xl border border-dashed border-daw-hairline px-1 text-center">
          <span className={cn(TYPE_CLASS.label, 'text-daw-text-3')}>
            Chain full
          </span>
        </div>
        <span className={cn(TYPE_CLASS.label, 'mt-1 text-daw-text-3')}>
          {count} of {MAX_RACK_EFFECTS}
        </span>
      </div>
    );
  }

  if (armed) {
    return (
      <div
        data-testid="fx-add-slot"
        data-state="armed"
        className="flex shrink-0 flex-col items-center"
      >
        <div className="relative flex size-[68px] items-center justify-center rounded-xl border-2 border-daw-text-2 bg-daw-hover px-1 text-center">
          <span className={cn(TYPE_CLASS.label, 'leading-tight text-daw-text')}>
            Pick from the library
          </span>
          <IconButton
            label="Stop adding effects"
            icon={<X />}
            size="sm"
            variant="secondary"
            tooltipSide="top"
            data-testid="fx-add-cancel"
            onClick={cancel}
            className="absolute -right-3 -top-3 rounded-full bg-daw-surface-1"
          />
        </div>
        <span className={cn(TYPE_CLASS.label, 'mt-1 text-daw-text-2')}>
          Slot {count + 1}
        </span>
      </div>
    );
  }

  return (
    <div className="flex shrink-0 flex-col items-center">
      <button
        type="button"
        data-testid="fx-add-slot"
        data-tutorial-id="fx-add-slot"
        data-state="idle"
        onClick={open}
        className={cn(
          'flex size-[68px] flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-daw-outline text-daw-text-2 hover:border-daw-text-2 hover:bg-daw-hover hover:text-daw-text [&_svg]:size-5',
          TRANSITION,
          FOCUS_RING,
        )}
      >
        <Plus aria-hidden />
        <span className={TYPE_CLASS.label}>Add effect</span>
      </button>
      <span className={cn(TYPE_CLASS.label, 'mt-1 text-daw-text-3')}>
        {count} of {MAX_RACK_EFFECTS}
      </span>
    </div>
  );
}
