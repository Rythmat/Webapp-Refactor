import { Check } from 'lucide-react';
import { cn } from '@/components/utilities';
import type { EffectSlotType } from '@/daw/audio/EffectChain';
import { FxBlockIcon } from '@/daw/components/Effects/FxBlockIcon';
import { EFFECT_ABOUT, EFFECT_CATEGORIES } from '@/daw/data/effectCategories';
import { FX_LABEL } from '@/daw/data/libraryItems';
import { useStore } from '@/daw/store';
import { MAX_RACK_EFFECTS } from '@/daw/store/effectRack';
import { EmptyState } from '@/daw/ui/EmptyState';
import { FOCUS_RING, TRANSITION, TYPE_CLASS } from '@/daw/ui/styles';

// ── The Effects library (B4a; milestone 2.8) ───────────────────────────────
//
// The audio effects by category, each category with a one-line purpose and
// each effect with a line on what it does (after Soundtrap's library, in
// neutral colours). It and the dock's chain are one state: while this panel
// shows, the chain's next empty slot is armed, and a pick fills it and arms
// the next, so the student can keep adding; the armed slot's × stops
// (uiSlice: openEffectsLibrary, cancelEffectsLibrary). A pick switches the
// dock to its Effects tab in Create; an effect already in the chain shows
// its controls there instead. This is the only list that adds effects to a
// track, so its rows carry the fx-add-* lesson anchors, stamped with the
// track rack (the Mix view's racks keep their own lists).

export function FxBody() {
  const trackId = useStore((s) => s.selectedTrackId);
  const track = useStore((s) =>
    s.selectedTrackId === null
      ? null
      : (s.tracks.find((t) => t.id === s.selectedTrackId) ?? null),
  );

  if (!track || !trackId) {
    return (
      <EmptyState
        title="Pick a track"
        description="Select a track in the list, then pick effects for it here."
      />
    );
  }

  const chain = track.activeEffects;
  const full = chain.length >= MAX_RACK_EFFECTS;

  const pick = (type: EffectSlotType) => {
    const s = useStore.getState();
    if (!chain.includes(type)) {
      if (full) return;
      s.addActiveEffect(trackId, type);
    }
    s.setDockEffect(type);
    if (s.currentView === 'arrange' && s.channelStripTab !== 'fx') {
      s.setChannelStripTab('fx');
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col" data-testid="effects-library">
      <div className="flex shrink-0 flex-col gap-0.5 border-b border-daw-hairline px-3 py-2">
        <span
          className={cn(TYPE_CLASS.body, 'truncate text-daw-text-2')}
          data-testid="effects-library-target"
        >
          Adding to{' '}
          <span className="font-bold text-daw-text">{track.name}</span>
        </span>
        {/* Always on the page: a screen reader announces a status as its
            text changes. */}
        <span
          role="status"
          className={cn(TYPE_CLASS.label, 'tabular-nums text-daw-text-3')}
          data-testid="effects-library-slot"
        >
          {full
            ? `The chain is full: ${MAX_RACK_EFFECTS} of ${MAX_RACK_EFFECTS}. Remove one to add another.`
            : `Pick an effect for slot ${chain.length + 1} of ${MAX_RACK_EFFECTS}`}
        </span>
      </div>
      <div
        className="min-h-0 flex-1 overflow-y-auto pb-2"
        style={{ scrollbarWidth: 'thin' }}
      >
        {EFFECT_CATEGORIES.map((category) => (
          <section
            key={category.id}
            aria-labelledby={`fx-cat-${category.id}`}
            className="pt-3"
          >
            <h3
              id={`fx-cat-${category.id}`}
              className={cn(TYPE_CLASS.micro, 'px-3 text-daw-text-2')}
            >
              {category.label}
            </h3>
            <p className={cn(TYPE_CLASS.label, 'px-3 pb-1 text-daw-text-3')}>
              {category.purpose}
            </p>
            <ul aria-label={category.label}>
              {category.effects.map((type) => {
                const on = chain.includes(type);
                const disabled = full && !on;
                const label = FX_LABEL[type] ?? type;
                return (
                  <li key={type}>
                    <button
                      type="button"
                      data-tutorial-id={`fx-add-${type}`}
                      data-tutorial-target="track"
                      data-testid={`inspector-fx-${type}`}
                      aria-disabled={disabled || undefined}
                      aria-label={
                        on ? `${label}: in the chain, show it` : `Add ${label}`
                      }
                      onClick={() => {
                        if (!disabled) pick(type);
                      }}
                      className={cn(
                        'flex w-full items-start gap-2.5 px-3 py-1.5 text-left',
                        disabled
                          ? 'cursor-default opacity-50'
                          : 'hover:bg-daw-hover',
                        TRANSITION,
                        FOCUS_RING,
                      )}
                    >
                      <span
                        aria-hidden
                        className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-[var(--daw-radius-sm)] bg-daw-surface-2 text-daw-text-2"
                      >
                        <FxBlockIcon
                          type={type}
                          size={16}
                          color="currentColor"
                        />
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span
                          className={cn(
                            TYPE_CLASS.body,
                            'truncate font-bold text-daw-text',
                          )}
                        >
                          {label}
                        </span>
                        <span
                          className={cn(TYPE_CLASS.label, 'text-daw-text-3')}
                        >
                          {EFFECT_ABOUT[type]}
                        </span>
                      </span>
                      {on ? (
                        <Check
                          aria-hidden
                          className="mt-1.5 size-4 shrink-0 text-daw-text-2"
                        />
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
