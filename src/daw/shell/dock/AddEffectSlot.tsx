import { Plus } from 'lucide-react';
import { cn } from '@/components/utilities';
import { useStore } from '@/daw/store';
import { MAX_RACK_EFFECTS } from '@/daw/store/effectRack';
import { FOCUS_RING, TRANSITION, TYPE_CLASS } from '@/daw/ui/styles';

// ── The chain's Add effect card (milestone 2.8; the floating frame) ───────
//
// The card after the last effect in the rack's row (FxCards), the floating
// frame's size: 528 px wide (less in a narrow dock) and the cards' height, a dashed 1 px edge,
// radius 10. Add effect opens the effect picker (EffectPicker.tsx), a modal
// after Suno's; a pick there fills the next slot. At the cap it says the
// chain is full.

/** The Add effect card's width: the floating frame's 528 px. */
export const ADD_EFFECT_CARD_PX = 528;

/** The dashed Add card's frame; the audio chain's Add card shares it. */
export const ADD_CARD_CLASS =
  'flex h-full shrink-0 flex-col items-center justify-center gap-1 rounded-[var(--daw-radius-card)] border border-dashed px-4 text-center';

export function AddEffectSlot({ count }: { count: number }) {
  const open = useStore((s) => s.openEffectsLibrary);
  const full = count >= MAX_RACK_EFFECTS;
  // 528 px where there's room; in a narrow dock it gives way to the
  // effects, down to 160 px.
  const width = { width: `clamp(160px, 40%, ${ADD_EFFECT_CARD_PX}px)` };

  if (full) {
    return (
      <div
        data-testid="fx-add-slot"
        data-state="full"
        className={cn(ADD_CARD_CLASS, 'border-daw-slot-edge')}
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

  return (
    <button
      type="button"
      data-testid="fx-add-slot"
      data-tutorial-id="fx-add-slot"
      data-state="idle"
      aria-haspopup="dialog"
      onClick={open}
      className={cn(
        ADD_CARD_CLASS,
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
