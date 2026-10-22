import { Check, Search } from 'lucide-react';
import { useRef, useState, type Ref } from 'react';
import { cn } from '@/components/utilities';
import type { EffectSlotType, TrackEffectState } from '@/daw/audio/EffectChain';
import {
  EFFECT_ABOUT,
  EFFECT_CATEGORIES,
  type EffectCategory,
} from '@/daw/data/effectCategories';
import {
  EFFECT_PRESETS,
  presetEffects,
  presetSlotState,
  type EffectPreset,
} from '@/daw/data/effectPresets';
import { FX_LABEL } from '@/daw/data/libraryItems';
import { useStore } from '@/daw/store';
import { withTransaction } from '@/daw/store/history';
import { isTrackLockedByRemote } from '@/daw/store/trackLock';
import {
  anchorRackOf,
  MAX_RACK_EFFECTS,
  type RackTarget,
} from '@/daw/store/effectRack';
import { rackTakes, useRack } from '@/daw/shell/mix/rackAdapters';
import { createShows, useRackTarget } from '@/daw/shell/mix/rackTarget';
import { lazyPart } from '@/daw/shell/lazyPart';
import { previewEffects } from './effectDemo';
import { DawDialog } from '@/daw/ui/DawDialog';
import { EmptyState } from '@/daw/ui/EmptyState';
import { Segmented, type SegmentedOption } from '@/daw/ui/Segmented';
import { FOCUS_RING, TRANSITION, TYPE_CLASS } from '@/daw/ui/styles';

// ── The Add effect picker (after Suno's "Add a track plugin", s40) ─────────
//
// A modal over the editor: a search, then the audio effects by category as
// cards, each with the effect's real device in small (EffectPreview), its
// name and a line on what it does; hovering a card plays its main control
// (effectDemo.ts), as Suno's plugin cards do. A switch shows the effects'
// factory presets instead (data/effectPresets.ts), each card the device set
// to the preset; a preset adds its effect set that way, or sets the effect
// already in the chain, as one undo. Add effect
// (the dock's chain, the Mix rack, the palette's view.effects) opens it; a
// pick adds the effect to the rack in front of the student and closes it,
// and the dock shows the new effect's controls. An effect already in the
// chain shows its controls instead of going in twice. It fills the rack in
// front of the student (shell/mix/rackTarget.ts): in Create the dock's
// Master when it shows or the selected track's chain; in Mix the rack the
// RackDock shows, a return's or the master's included. It is the only list
// that adds effects, so its cards carry the fx-add-* lesson anchors, stamped
// with the rack they add to; a lesson's coach card sits above it and takes
// clicks without closing it.

// The devices are the dock's effect cards, which the editor's first load
// leaves out: they load with the picker's first opening, an empty window
// standing in until they do.
const EffectPreviewPart = lazyPart(
  () => import('./EffectPreview').then((m) => m.EffectPreview),
  {
    name: 'effect preview',
    fallback: (
      <span className="block size-full rounded-[var(--daw-radius-sm)] bg-daw-surface-2" />
    ),
  },
);

/** The window a card's device shows in, as tall as EffectPreview's. */
const PREVIEW_WINDOW_PX = 123;

/** The picker, mounted once in the editor; open while `effectPickerOpen`. */
export function EffectPickerHost() {
  const open = useStore((s) => s.effectPickerOpen);
  const close = useStore((s) => s.cancelEffectsLibrary);
  const searchRef = useRef<HTMLInputElement>(null);
  if (!open) return null;
  return (
    <DawDialog
      open
      onOpenChange={(next) => {
        if (!next) close();
      }}
      title="Add effect"
      size="lg"
      initialFocus={searchRef}
      className="h-[min(640px,calc(100dvh-48px))]"
      data={{ 'data-testid': 'effect-picker' }}
    >
      <EffectPickerBody searchRef={searchRef} />
    </DawDialog>
  );
}

type PickerView = 'effects' | 'presets';

/** The effects of `target`'s rack as the store has them now. */
function rackEffectsOf(
  target: RackTarget,
  s: ReturnType<typeof useStore.getState>,
): TrackEffectState | null {
  if (target.kind === 'master') return s.masteringEffects;
  if (target.kind === 'return') {
    return s.returns.find((r) => r.id === target.id)?.effects ?? null;
  }
  return s.tracks.find((t) => t.id === target.id)?.effects ?? null;
}

const VIEW_OPTIONS: readonly SegmentedOption<PickerView>[] = [
  { value: 'effects', label: 'Effects', testId: 'effect-picker-view-effects' },
  { value: 'presets', label: 'Presets', testId: 'effect-picker-view-presets' },
];

/** Whether a search finds `type`: by its name, its line, or its category's. */
const matches = (
  type: EffectSlotType,
  category: EffectCategory,
  query: string,
) => {
  if (!query) return true;
  const q = query.toLowerCase();
  return [
    FX_LABEL[type] ?? type,
    EFFECT_ABOUT[type],
    category.label,
    category.purpose,
  ].some((text) => text.toLowerCase().includes(q));
};

/** Whether a search finds preset `p`: by its name, its line or its effect. */
const presetMatches = (
  p: EffectPreset,
  category: EffectCategory,
  query: string,
) =>
  !query ||
  [p.name, p.about].some((text) =>
    text.toLowerCase().includes(query.toLowerCase()),
  ) ||
  matches(p.slot, category, query);

export function EffectPickerBody({
  searchRef,
}: {
  searchRef?: Ref<HTMLInputElement>;
}) {
  const target = useRackTarget();
  const rack = useRack(target);
  const bpm = useStore((s) => s.bpm);
  const [query, setQuery] = useState('');
  const [view, setView] = useState<PickerView>('effects');
  // The card whose demo plays: the one under the pointer or focused.
  const [playing, setPlaying] = useState<string | null>(null);
  // A track a collaborator holds is read-only for everyone else (trackLock).
  const held = useStore(
    (s) =>
      target?.kind === 'track' &&
      isTrackLockedByRemote(s.remoteUsers, target.id),
  );

  if (!target || !rack) {
    return (
      <EmptyState
        title="Pick a track"
        description="Select a track in the list, then add effects to it."
      />
    );
  }

  const chain = rack.chain;
  const full = chain.length >= MAX_RACK_EFFECTS;
  const anchorRack = anchorRackOf(target);
  const q = query.trim();

  /** Adds `type` (or finds it in the chain), then `apply`, as one undo. */
  const pick = (type: EffectSlotType, preset?: EffectPreset) => {
    if (held) return;
    if (!chain.includes(type) && full) return;
    const write = () => {
      if (!chain.includes(type)) rack.add(type);
      if (preset) {
        // The rack after the add: the slot as the store now has it.
        const current = useStore.getState();
        const fresh = rackEffectsOf(target, current) ?? rack.effects;
        rack.update({
          [type]: presetSlotState(preset, fresh[type], current.bpm),
        });
      }
    };
    if (preset) withTransaction(`Add ${preset.name}`, write);
    else write();
    const s = useStore.getState();
    // Show the pick in the rack it went into, in one write, and close.
    const showRack =
      target.kind === 'track' && s.currentView === 'studio' && !s.mixRack;
    useStore.setState({
      dockEffect: type,
      effectPickerOpen: false,
      ...(showRack ? { mixRack: target } : {}),
    });
    if (
      target.kind === 'track' &&
      createShows(s) &&
      s.channelStripTab !== 'fx'
    ) {
      s.setChannelStripTab('fx');
    }
  };

  const categories = EFFECT_CATEGORIES.map((category) => ({
    ...category,
    effects: category.effects.filter(
      (type) => rackTakes(target, type) && matches(type, category, q),
    ),
    presets: EFFECT_PRESETS.filter(
      (p) =>
        category.effects.includes(p.slot) &&
        rackTakes(target, p.slot) &&
        presetMatches(p, category, q),
    ),
  })).filter((category) =>
    view === 'effects'
      ? category.effects.length > 0
      : category.presets.length > 0,
  );

  const hover = (id: string) => ({
    onPointerEnter: () => setPlaying(id),
    onPointerLeave: () => setPlaying((p) => (p === id ? null : p)),
    onFocus: () => setPlaying(id),
    onBlur: () => setPlaying((p) => (p === id ? null : p)),
  });

  return (
    <div className="flex flex-col gap-3 pb-2" data-testid="effects-library">
      <div className="flex flex-col gap-0.5">
        <span
          className={cn(TYPE_CLASS.body, 'truncate text-daw-text-2')}
          data-testid="effects-library-target"
        >
          Adding to <span className="font-bold text-daw-text">{rack.name}</span>
        </span>
        {/* Always on the page: a screen reader announces a status as its
            text changes. */}
        <span
          role="status"
          className={cn(TYPE_CLASS.label, 'tabular-nums text-daw-text-3')}
          data-testid="effects-library-slot"
        >
          {held
            ? `A collaborator is working on ${rack.name}: its effects can't change now.`
            : full
              ? `The chain is full: ${MAX_RACK_EFFECTS} of ${MAX_RACK_EFFECTS}. Remove one to add another.`
              : `Pick an effect for slot ${chain.length + 1} of ${MAX_RACK_EFFECTS}`}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Segmented<PickerView>
          label="Show"
          options={VIEW_OPTIONS}
          value={view}
          onValueChange={setView}
          testId="effect-picker-view"
        />
        <label className="relative block min-w-0 flex-1">
          <span className="sr-only">
            {view === 'effects' ? 'Search effects' : 'Search presets'}
          </span>
          <Search
            aria-hidden
            className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-daw-text-3"
          />
          <input
            ref={searchRef}
            type="search"
            value={query}
            placeholder={
              view === 'effects' ? 'Search effects' : 'Search presets'
            }
            autoComplete="off"
            spellCheck={false}
            data-testid="effect-picker-search"
            onChange={(event) => setQuery(event.target.value)}
            className={cn(
              'h-8 w-full rounded-[var(--daw-radius-sm)] border border-daw-outline bg-daw-surface-2 pl-8 pr-2 text-daw-text placeholder:text-daw-text-3 [&::-webkit-search-cancel-button]:appearance-none',
              TYPE_CLASS.body,
              TRANSITION,
              FOCUS_RING,
            )}
          />
        </label>
      </div>

      {categories.length === 0 ? (
        <p
          className={cn(TYPE_CLASS.body, 'py-6 text-center text-daw-text-3')}
          data-testid="effect-picker-none"
        >
          {view === 'effects' ? 'No effect' : 'No preset'} matches “{q}”.
        </p>
      ) : null}

      {categories.map((category) => (
        <section
          key={category.id}
          aria-labelledby={`fx-cat-${category.id}`}
          className="flex flex-col gap-1.5"
        >
          <div className="flex items-baseline gap-2">
            <h3
              id={`fx-cat-${category.id}`}
              className={cn(TYPE_CLASS.micro, 'text-daw-text-2')}
            >
              {category.label}
            </h3>
            <p className={cn(TYPE_CLASS.label, 'truncate text-daw-text-3')}>
              {category.purpose}
            </p>
          </div>
          <ul
            aria-label={category.label}
            className="grid grid-cols-2 gap-2 sm:grid-cols-3"
          >
            {view === 'effects'
              ? category.effects.map((type) => {
                  const on = chain.includes(type);
                  const disabled = held || (full && !on);
                  const label = FX_LABEL[type] ?? type;
                  return (
                    <PickerCard
                      key={type}
                      type={type}
                      name={label}
                      about={EFFECT_ABOUT[type]}
                      check={on}
                      disabled={disabled}
                      playing={playing === type}
                      hover={hover(type)}
                      onPick={() => pick(type)}
                      ariaLabel={
                        on ? `${label}: in the chain, show it` : `Add ${label}`
                      }
                      anchorRack={anchorRack}
                      testId={`effect-picker-${type}`}
                    />
                  );
                })
              : category.presets.map((p) => {
                  const on = chain.includes(p.slot);
                  const disabled = held || (full && !on);
                  const label = FX_LABEL[p.slot] ?? p.slot;
                  return (
                    <PickerCard
                      key={p.id}
                      type={p.slot}
                      name={p.name}
                      tag={label}
                      about={p.about}
                      effects={presetEffects(p, previewEffects(p.slot), bpm)}
                      disabled={disabled}
                      playing={playing === p.id}
                      hover={hover(p.id)}
                      onPick={() => pick(p.slot, p)}
                      ariaLabel={
                        on
                          ? `${p.name}: set the ${label} in the chain to it`
                          : `Add ${label}: ${p.name}`
                      }
                      testId={`effect-preset-${p.id}`}
                    />
                  );
                })}
          </ul>
        </section>
      ))}
    </div>
  );
}

/** One card: the device in small, its name (and effect), what it does. */
function PickerCard({
  type,
  name,
  tag,
  about,
  effects,
  check = false,
  disabled,
  playing,
  hover,
  onPick,
  ariaLabel,
  anchorRack,
  testId,
}: {
  type: EffectSlotType;
  name: string;
  /** A preset's effect, beside its name. */
  tag?: string;
  about: string;
  /** What the device shows at rest; else the effect's defaults. */
  effects?: TrackEffectState;
  /** In the chain already. */
  check?: boolean;
  disabled: boolean;
  playing: boolean;
  hover: {
    onPointerEnter(): void;
    onPointerLeave(): void;
    onFocus(): void;
    onBlur(): void;
  };
  onPick(): void;
  ariaLabel: string;
  /**
   * An effect's card: the rack its fx-add-* lesson anchor adds to. A
   * preset's card has no anchor; the lessons add bare effects.
   */
  anchorRack?: string;
  testId: string;
}) {
  return (
    <li className="flex">
      <button
        type="button"
        data-tutorial-id={anchorRack ? `fx-add-${type}` : undefined}
        data-tutorial-target={anchorRack}
        data-testid={testId}
        {...hover}
        aria-disabled={disabled || undefined}
        aria-label={ariaLabel}
        onClick={() => {
          if (!disabled) onPick();
        }}
        className={cn(
          'flex w-full flex-col gap-2 rounded-[var(--daw-radius-card)] border border-daw-hairline bg-daw-surface-1 p-2 pb-3 text-left',
          disabled
            ? 'cursor-default opacity-50'
            : 'hover:border-daw-outline hover:bg-daw-hover',
          TRANSITION,
          FOCUS_RING,
        )}
      >
        <span
          className="relative block w-full"
          style={{ height: PREVIEW_WINDOW_PX }}
        >
          <span className="absolute inset-0">
            <EffectPreviewPart
              type={type}
              effects={effects}
              playing={playing && !disabled}
            />
          </span>
        </span>
        <span className="flex items-center gap-1.5 px-1">
          <span
            className={cn(
              TYPE_CLASS.body,
              'min-w-0 flex-1 truncate font-bold text-daw-text',
            )}
          >
            {name}
          </span>
          {tag ? (
            <span
              className={cn(
                TYPE_CLASS.label,
                'shrink-0 rounded-[var(--daw-radius-sm)] bg-daw-surface-2 px-1.5 text-daw-text-2',
              )}
            >
              {tag}
            </span>
          ) : null}
          {check ? (
            <Check aria-hidden className="size-4 shrink-0 text-daw-text-2" />
          ) : null}
        </span>
        <span
          className={cn(TYPE_CLASS.label, 'line-clamp-2 px-1 text-daw-text-3')}
        >
          {about}
        </span>
      </button>
    </li>
  );
}
