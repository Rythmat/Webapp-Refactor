/* eslint-disable tailwindcss/classnames-order */
/* eslint-disable tailwindcss/enforces-shorthand */
import { useCallback, useMemo } from 'react';
import { FX_CATALOG, type LibraryItem } from '@/daw/data/libraryItems';
import type { EffectSlotType } from '@/daw/audio/EffectChain';
import { FxBlockIcon } from './FxBlockIcon';
import {
  type AnchorRack,
  rackOfFxTrack,
} from '@/daw/components/Tutorial/anchorRegistry';
import { MAX_RACK_EFFECTS } from '@/daw/store/effectRack';
import { COLOR } from '@/daw/ui/tokens';

// A rack holds at most MAX_RACK_EFFECTS (the stores refuse more). The list
// shows the count and, at the cap, says why the other effects are greyed
// out.
const MAX_EFFECTS = MAX_RACK_EFFECTS;

interface FxBrowserProps {
  trackId: string;
  activeEffects: EffectSlotType[];
  onAddEffect: (trackId: string, effectType: EffectSlotType) => void;
  /** Shows the controls of an effect already in the chain. */
  onSelectEffect?: (effectType: EffectSlotType) => void;
}

/** One row of the list: a catalog entry and the effect it adds. */
interface FxEntry {
  item: LibraryItem;
  effectType: EffectSlotType;
}

export function FxBrowser({
  trackId,
  activeEffects,
  onAddEffect,
  onSelectEffect,
}: FxBrowserProps) {
  const atMax = activeEffects.length >= MAX_EFFECTS;
  // The sidechain ducker keys off another TRACK; only per-track racks get a
  // key-source resolver wired, so hide it on the master + return racks where it
  // could never function (a dead control otherwise).
  const isBusRack = trackId === 'master' || trackId.startsWith('return-');
  // This list is mounted once per rack with the same fx-add-* ids; the stamp
  // tells a lesson's spotlight which rack each row is in.
  const rack = rackOfFxTrack(trackId);

  const effects = useMemo(() => {
    const list: FxEntry[] = [];
    for (const item of FX_CATALOG) {
      if (item.dragPayload.kind !== 'audio-effect') continue;
      const { effectType } = item.dragPayload;
      if (isBusRack && effectType === 'ducker') continue;
      list.push({ item, effectType });
    }
    return list;
  }, [isBusRack]);

  return (
    <div
      className="w-[130px] shrink-0 flex flex-col border-r"
      style={{ borderColor: 'var(--daw-hairline)' }}
    >
      <div
        className="flex items-center justify-between px-3 py-2 shrink-0 border-b"
        style={{ borderColor: 'var(--daw-hairline)' }}
      >
        <span
          className="text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: 'var(--daw-text-3)' }}
        >
          FX
        </span>
        <span
          className="text-[12px] tabular-nums"
          style={{ color: 'var(--daw-text-3)' }}
          title={`${activeEffects.length} of ${MAX_EFFECTS} effects`}
        >
          {activeEffects.length}/{MAX_EFFECTS}
        </span>
      </div>
      {/* Always on the page, empty below the cap: a screen reader announces
          a status as its text changes, and often misses one that arrives
          already holding its text. */}
      <div role="status" className="shrink-0">
        {atMax && (
          <p
            className="m-0 px-3 py-2 border-b text-[12px] leading-snug"
            style={{
              borderColor: 'var(--daw-hairline)',
              color: 'var(--daw-text-3)',
            }}
          >
            Max {MAX_EFFECTS} effects. Remove one to add another.
          </p>
        )}
      </div>
      <div className="flex-1 overflow-y-auto">
        <div
          className="px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider"
          style={{ color: 'var(--daw-text-3)' }}
        >
          Audio
        </div>
        {effects.map(({ item, effectType }) => (
          <FxRow
            key={item.id}
            item={item}
            effectType={effectType}
            trackId={trackId}
            rack={rack}
            isActive={activeEffects.includes(effectType)}
            atMax={atMax}
            onAddEffect={onAddEffect}
            onSelectEffect={onSelectEffect}
          />
        ))}
      </div>
    </div>
  );
}

function FxRow({
  item,
  effectType,
  trackId,
  rack,
  isActive,
  atMax,
  onAddEffect,
  onSelectEffect,
}: {
  item: LibraryItem;
  effectType: EffectSlotType;
  trackId: string;
  rack: AnchorRack;
  isActive: boolean;
  atMax: boolean;
  onAddEffect: (trackId: string, effectType: EffectSlotType) => void;
  onSelectEffect?: (effectType: EffectSlotType) => void;
}) {
  const disabled = atMax && !isActive;

  // Clicking adds the effect, or shows the controls of one already in the
  // chain. Rows aren't draggable: no rack, track header or the timeline
  // accepts a dropped effect, so a drag only ever bounced back.
  const handleClick = useCallback(() => {
    if (disabled) return;
    if (isActive) onSelectEffect?.(effectType);
    else onAddEffect(trackId, effectType);
  }, [disabled, isActive, effectType, trackId, onAddEffect, onSelectEffect]);

  return (
    <button
      data-tutorial-id={`fx-add-${effectType}`}
      data-tutorial-target={rack}
      onClick={handleClick}
      className="flex items-center gap-2 w-full text-left px-3 py-1.5 cursor-pointer hover:bg-white/10"
      style={{
        border: 'none',
        background: 'none',
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? 'default' : 'pointer',
      }}
    >
      <FxBlockIcon
        type={effectType}
        size={14}
        color={isActive ? COLOR.accent.value : item.color}
      />
      <span
        className="text-[11px]"
        style={{
          color: isActive ? 'var(--daw-accent)' : 'var(--daw-text)',
        }}
      >
        {item.label}
      </span>
    </button>
  );
}
