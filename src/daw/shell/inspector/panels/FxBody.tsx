import { Check } from 'lucide-react';
import { cn } from '@/components/utilities';
import type { EffectSlotType } from '@/daw/audio/EffectChain';
import { FxBlockIcon } from '@/daw/components/Effects/EffectsPanel';
import { FX_CATALOG } from '@/daw/data/libraryItems';
import { useStore } from '@/daw/store';
import { EmptyState } from '@/daw/ui/EmptyState';
import { FOCUS_RING, TRANSITION, TYPE_CLASS } from '@/daw/ui/styles';

// ── The Effects panel (B4a) ────────────────────────────────────────────────
//
// The audio effects, for the selected track: a click adds one to its chain
// and opens the dock's Effects tab on it in Create; one already in the chain
// just opens the tab. A rack holds five, as the dock's list says. The
// effects' own controls stay in the dock; this is where the student finds
// them. Rows carry test ids, not the dock's fx-add-* anchors, so a lesson's
// spotlight never lands here instead of the rack it names.

const MAX_EFFECTS = 5;

const EFFECTS = FX_CATALOG.flatMap((item) =>
  item.dragPayload.kind === 'audio-effect' && !item.disabled
    ? [{ id: item.id, label: item.label, type: item.dragPayload.effectType }]
    : [],
);

export function FxBody() {
  const trackId = useStore((s) => s.selectedTrackId);
  const track = useStore((s) =>
    s.selectedTrackId === null
      ? null
      : (s.tracks.find((t) => t.id === s.selectedTrackId) ?? null),
  );
  const active = track?.activeEffects;
  const atMax = (active?.length ?? 0) >= MAX_EFFECTS;

  const add = (type: EffectSlotType) => {
    if (!trackId) return;
    const s = useStore.getState();
    if (!active?.includes(type)) s.addActiveEffect(trackId, type);
    if (s.currentView === 'arrange') s.setChannelStripTab('fx');
  };

  if (!track) {
    return (
      <EmptyState
        title="Pick a track"
        description="Select a track in the list, then add an effect to it here."
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-baseline gap-2 border-b border-daw-hairline px-3 py-2">
        <span
          className={cn(
            TYPE_CLASS.body,
            'min-w-0 flex-1 truncate text-daw-text-2',
          )}
        >
          On <span className="font-bold text-daw-text">{track.name}</span>
        </span>
        <span
          className={cn(TYPE_CLASS.label, 'tabular-nums text-daw-text-3')}
          title={`${active?.length ?? 0} of ${MAX_EFFECTS} effects`}
        >
          {active?.length ?? 0}/{MAX_EFFECTS}
        </span>
      </div>
      <div role="status">
        {atMax ? (
          <p
            className={cn(
              TYPE_CLASS.label,
              'border-b border-daw-hairline px-3 py-2 text-daw-text-3',
            )}
          >
            Max {MAX_EFFECTS} effects. Remove one to add another.
          </p>
        ) : null}
      </div>
      <ul
        aria-label="Audio effects"
        className="min-h-0 flex-1 overflow-y-auto py-1"
        style={{ scrollbarWidth: 'thin' }}
      >
        {EFFECTS.map((fx) => {
          const on = !!active?.includes(fx.type);
          const disabled = atMax && !on;
          return (
            <li key={fx.id}>
              <button
                type="button"
                data-testid={`inspector-fx-${fx.type}`}
                aria-disabled={disabled || undefined}
                aria-label={
                  on ? `${fx.label}: in the chain, show it` : `Add ${fx.label}`
                }
                onClick={() => {
                  if (!disabled) add(fx.type);
                }}
                className={cn(
                  TYPE_CLASS.body,
                  'flex h-9 w-full items-center gap-2.5 px-3 text-left',
                  disabled
                    ? 'cursor-default text-daw-text-3 opacity-50'
                    : 'text-daw-text hover:bg-daw-hover',
                  TRANSITION,
                  FOCUS_RING,
                )}
              >
                <FxBlockIcon type={fx.type} size={16} color="currentColor" />
                <span className="min-w-0 flex-1 truncate">{fx.label}</span>
                {on ? (
                  <Check aria-hidden className="size-4 text-daw-text-2" />
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
