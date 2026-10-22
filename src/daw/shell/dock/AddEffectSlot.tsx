import { Plus, X } from 'lucide-react';
import { cn } from '@/components/utilities';
import { useStore } from '@/daw/store';
import { MAX_RACK_EFFECTS } from '@/daw/store/effectRack';
import { Button } from '@/daw/ui/Button';
import { FOCUS_RING, TRANSITION, TYPE_CLASS } from '@/daw/ui/styles';

// ── The chain's Add effect card (milestone 2.8; the floating frame) ───────
//
// The card after the last effect in the rack's row (FxCards), the floating
// frame's size: 528 px wide (less in a narrow dock) and the cards' height, a dashed 1 px edge,
// radius 10. Add effect arms it: the side rail's Effects library opens
// beside the dock, and each pick there fills this slot and arms the next.
// While armed (the library showing) it says so, with a button that stops
// adding and puts the Inspector back as it was. At the cap it says the
// chain is full.

/** The Add effect card's width: the floating frame's 528 px. */
export const ADD_EFFECT_CARD_PX = 528;

/** Whether the chain's next slot is armed: the Effects library is showing. */
export const useEffectsArmed = () =>
  useStore((s) => s.libraryOpen && s.inspectorPanel === 'fx');

const CARD =
  'flex h-full shrink-0 flex-col items-center justify-center gap-1 rounded-[var(--daw-radius-card)] border border-dashed px-4 text-center';

export function AddEffectSlot({ count }: { count: number }) {
  const armed = useEffectsArmed();
  const open = useStore((s) => s.openEffectsLibrary);
  const cancel = useStore((s) => s.cancelEffectsLibrary);
  const full = count >= MAX_RACK_EFFECTS;
  // 528 px where there's room; in a narrow dock it gives way to the
  // effects, down to 160 px.
  const width = { width: `clamp(160px, 40%, ${ADD_EFFECT_CARD_PX}px)` };

  if (full) {
    return (
      <div
        data-testid="fx-add-slot"
        data-state="full"
        className={cn(CARD, 'border-daw-slot-edge')}
        style={width}
      >
        <span className={cn(TYPE_CLASS.label, 'text-daw-text-2')}>
          Chain full
        </span>
        <span className={cn(TYPE_CLASS.label, 'text-daw-text-3')}>
          {count} of {MAX_RACK_EFFECTS} effects
        </span>
      </div>
    );
  }

  if (armed) {
    return (
      <div
        data-testid="fx-add-slot"
        data-state="armed"
        className={cn(
          CARD,
          'gap-2 border-solid border-daw-text-2 bg-daw-hover',
        )}
        style={width}
      >
        <span className={cn(TYPE_CLASS.label, 'text-daw-text')}>
          Pick an effect from the library
        </span>
        <span className={cn(TYPE_CLASS.label, 'text-daw-text-2')}>
          Slot {count + 1}
        </span>
        <Button
          variant="ghost"
          size="sm"
          data-testid="fx-add-cancel"
          onClick={cancel}
        >
          <X aria-hidden />
          Stop adding
        </Button>
      </div>
    );
  }

  return (
    <button
      type="button"
      data-testid="fx-add-slot"
      data-tutorial-id="fx-add-slot"
      data-state="idle"
      onClick={open}
      className={cn(
        CARD,
        'border-daw-slot-edge text-daw-text-2 hover:border-daw-text-3 hover:bg-daw-device hover:text-daw-text [&_svg]:size-4',
        TRANSITION,
        FOCUS_RING,
      )}
      style={width}
    >
      <Plus aria-hidden />
      <span className={TYPE_CLASS.label}>Add effect</span>
      <span className={cn(TYPE_CLASS.label, 'text-daw-text-3')}>
        {count} of {MAX_RACK_EFFECTS}
      </span>
    </button>
  );
}
