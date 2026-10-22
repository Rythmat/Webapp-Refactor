import { Check, Search } from 'lucide-react';
import { useRef, useState, type ReactNode } from 'react';
import { cn } from '@/components/utilities';
import {
  AUDIO_EFFECT_GROUPS,
  AUDIO_EFFECTS,
  TONE_LABEL,
  type AudioEffectItem,
} from '@/daw/data/audioEffects';
import { BUNDLED_MODELS } from '@/daw/audio/nam/NamModelStore';
import { DawDialog } from '@/daw/ui/DawDialog';
import { FOCUS_RING, TRANSITION, TYPE_CLASS } from '@/daw/ui/styles';

// ── The Add audio effect picker (an audio track's chain) ───────────────────
//
// The Add effect picker's sibling for what only an audio track's own chain
// can hold (data/audioEffects.ts): pitch correction and the amps, as cards
// with their icon, name, tone and a line on how they sound, and a search.
// The track's Instrument dock opens it from its chain's + slots
// (GuitarBassView, on a plain audio track); a pick goes into the chain and
// closes it. A chain holds one amp at a time (audioChain.ts), so with one
// there the amp cards say Swap and a pick swaps its model in place; the amp
// and pitch correction already there are marked.

export interface AudioEffectPickerProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  /** The model of the amp in the chain, if it has one. */
  ampModelId: string | null;
  /** Whether the chain has pitch correction. */
  hasPitchCorrection: boolean;
  onPick(item: AudioEffectItem): void;
  /** Each card's picture: the dock's own icon for the effect. */
  renderIcon(item: AudioEffectItem): ReactNode;
}

const matches = (item: AudioEffectItem, query: string) => {
  if (!query) return true;
  const q = query.toLowerCase();
  const group = AUDIO_EFFECT_GROUPS.find((g) => g.id === item.group);
  return [
    item.name,
    item.about,
    item.tone ? TONE_LABEL[item.tone] : '',
    group?.label ?? '',
  ].some((text) => text.toLowerCase().includes(q));
};

export function AudioEffectPicker({
  open,
  onOpenChange,
  ...body
}: AudioEffectPickerProps) {
  const searchRef = useRef<HTMLInputElement>(null);
  if (!open) return null;
  return (
    <DawDialog
      open
      onOpenChange={onOpenChange}
      title="Add audio effect"
      size="lg"
      initialFocus={searchRef}
      className="h-[min(640px,calc(100dvh-48px))]"
      data={{ 'data-testid': 'audio-effect-picker' }}
    >
      <AudioEffectPickerBody {...body} searchRef={searchRef} />
    </DawDialog>
  );
}

export function AudioEffectPickerBody({
  ampModelId,
  hasPitchCorrection,
  onPick,
  renderIcon,
  searchRef,
}: Omit<AudioEffectPickerProps, 'open' | 'onOpenChange'> & {
  searchRef?: React.Ref<HTMLInputElement>;
}) {
  const [query, setQuery] = useState('');
  const q = query.trim();
  // One amp at a time: with one in the chain, an amp pick swaps it.
  const currentAmp = ampModelId
    ? (BUNDLED_MODELS.find((m) => m.id === ampModelId)?.name ?? 'the amp')
    : null;
  const groups = AUDIO_EFFECT_GROUPS.map((group) => ({
    ...group,
    items: AUDIO_EFFECTS.filter(
      (item) => item.group === group.id && matches(item, q),
    ),
  })).filter((group) => group.items.length > 0);

  return (
    <div className="flex flex-col gap-3 pb-2" data-testid="audio-effects">
      <p className={cn(TYPE_CLASS.body, 'text-daw-text-2')}>
        These shape the track’s own sound, recorded or live, before its mixer
        effects. A track has one amp at a time
        {currentAmp ? `: picking another swaps ${currentAmp}.` : '.'}
      </p>

      <label className="relative block">
        <span className="sr-only">Search audio effects</span>
        <Search
          aria-hidden
          className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-daw-text-3"
        />
        <input
          ref={searchRef}
          type="search"
          value={query}
          placeholder="Search amps and pitch correction"
          autoComplete="off"
          spellCheck={false}
          data-testid="audio-effect-search"
          onChange={(event) => setQuery(event.target.value)}
          className={cn(
            'h-8 w-full rounded-[var(--daw-radius-sm)] border border-daw-outline bg-daw-surface-2 pl-8 pr-2 text-daw-text placeholder:text-daw-text-3 [&::-webkit-search-cancel-button]:appearance-none',
            TYPE_CLASS.body,
            TRANSITION,
            FOCUS_RING,
          )}
        />
      </label>

      {groups.length === 0 ? (
        <p
          className={cn(TYPE_CLASS.body, 'py-6 text-center text-daw-text-3')}
          data-testid="audio-effect-none"
        >
          Nothing matches “{q}”.
        </p>
      ) : null}

      {groups.map((group) => (
        <section
          key={group.id}
          aria-labelledby={`audio-fx-${group.id}`}
          className="flex flex-col gap-1.5"
        >
          <div className="flex items-baseline gap-2">
            <h3
              id={`audio-fx-${group.id}`}
              className={cn(TYPE_CLASS.micro, 'text-daw-text-2')}
            >
              {group.label}
            </h3>
            <p
              className={cn(TYPE_CLASS.label, 'truncate text-daw-text-3')}
              data-testid={`audio-fx-purpose-${group.id}`}
            >
              {currentAmp && group.id !== 'voice'
                ? `One at a time: a pick here swaps ${currentAmp}`
                : group.purpose}
            </p>
          </div>
          <ul
            aria-label={group.label}
            className="grid grid-cols-2 gap-2 sm:grid-cols-3"
          >
            {group.items.map((item) => {
              const on =
                item.kind === 'amp'
                  ? item.id === ampModelId
                  : hasPitchCorrection;
              const swaps = item.kind === 'amp' && ampModelId !== null && !on;
              return (
                <li key={item.id} className="flex">
                  <button
                    type="button"
                    data-testid={`audio-effect-${item.id}`}
                    aria-label={
                      on
                        ? `${item.name}: in the chain, show it`
                        : swaps
                          ? `Swap the amp for ${item.name}`
                          : `Add ${item.name}`
                    }
                    onClick={() => onPick(item)}
                    className={cn(
                      'group flex w-full flex-col gap-2 rounded-[var(--daw-radius-card)] border border-daw-hairline bg-daw-surface-1 p-2 pb-3 text-left hover:border-daw-outline hover:bg-daw-hover',
                      TRANSITION,
                      FOCUS_RING,
                    )}
                  >
                    <span
                      aria-hidden
                      className="flex h-[96px] w-full items-center justify-center rounded-[var(--daw-radius-sm)] bg-daw-surface-2"
                    >
                      <span className="transition-transform duration-daw-fast ease-out group-hover:scale-110 motion-reduce:transition-none motion-reduce:group-hover:scale-100">
                        {renderIcon(item)}
                      </span>
                    </span>
                    <span className="flex items-center gap-1.5 px-1">
                      <span
                        className={cn(
                          TYPE_CLASS.body,
                          'min-w-0 flex-1 truncate font-bold text-daw-text',
                        )}
                      >
                        {item.name}
                      </span>
                      {item.tone ? (
                        <span
                          className={cn(
                            TYPE_CLASS.label,
                            'shrink-0 rounded-[var(--daw-radius-sm)] bg-daw-surface-2 px-1.5 text-daw-text-2',
                          )}
                        >
                          {TONE_LABEL[item.tone]}
                        </span>
                      ) : null}
                      {on ? (
                        <Check
                          aria-hidden
                          className="size-4 shrink-0 text-daw-text-2"
                        />
                      ) : swaps ? (
                        <span
                          aria-hidden
                          className={cn(
                            TYPE_CLASS.label,
                            'shrink-0 rounded-[var(--daw-radius-sm)] border border-daw-hairline px-1.5 text-daw-text-2',
                          )}
                        >
                          Swap
                        </span>
                      ) : null}
                    </span>
                    <span
                      className={cn(
                        TYPE_CLASS.label,
                        'line-clamp-2 px-1 text-daw-text-3',
                      )}
                    >
                      {item.about}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
