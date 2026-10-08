/* eslint-disable tailwindcss/classnames-order */
/* eslint-disable tailwindcss/enforces-shorthand */
import { useCallback, useMemo } from 'react';
import {
  FX_CATALOG,
  type LibraryCategory,
  type LibraryItem,
} from '@/daw/data/libraryItems';
import type { EffectSlotType } from '@/daw/audio/EffectChain';
import { FxBlockIcon } from './EffectsPanel';

// A rack holds at most five effects: this list enforces it for tracks, and
// the return and master stores also refuse a sixth. The list shows the count
// and, at the cap, says why the other effects are greyed out.
const MAX_EFFECTS = 5;

interface FxBrowserProps {
  trackId: string;
  activeEffects: EffectSlotType[];
  onAddEffect: (trackId: string, effectType: EffectSlotType) => void;
  hideMidi?: boolean;
}

export function FxBrowser({
  trackId,
  activeEffects,
  onAddEffect,
  hideMidi,
}: FxBrowserProps) {
  const atMax = activeEffects.length >= MAX_EFFECTS;
  // The sidechain ducker keys off another TRACK; only per-track racks get a
  // key-source resolver wired, so hide it on the master + return racks where it
  // could never function (a dead control otherwise).
  const isBusRack = trackId === 'master' || trackId.startsWith('return-');

  const categories = useMemo(() => {
    const map = new Map<LibraryCategory, LibraryItem[]>();
    for (const item of FX_CATALOG) {
      if (hideMidi && item.category === 'MIDI Effects') continue;
      if (
        isBusRack &&
        item.dragPayload.kind === 'audio-effect' &&
        item.dragPayload.effectType === 'ducker'
      )
        continue;
      const list = map.get(item.category) ?? [];
      list.push(item);
      map.set(item.category, list);
    }
    return Array.from(map.entries());
  }, [hideMidi, isBusRack]);

  return (
    <div
      className="w-[130px] shrink-0 flex flex-col border-r"
      style={{ borderColor: 'var(--color-border)' }}
    >
      <div
        className="flex items-center justify-between px-3 py-2 shrink-0 border-b"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <span
          className="text-[11px] font-semibold uppercase tracking-wider"
          style={{ color: 'var(--color-text-dim)' }}
        >
          FX
        </span>
        <span
          className="text-[11px] tabular-nums"
          style={{ color: 'var(--color-text-dim)' }}
          title={`${activeEffects.length} of ${MAX_EFFECTS} effects`}
        >
          {activeEffects.length}/{MAX_EFFECTS}
        </span>
      </div>
      {atMax && (
        <p
          role="status"
          className="m-0 px-3 py-2 shrink-0 border-b text-[12px] leading-snug"
          style={{
            borderColor: 'var(--color-border)',
            color: 'var(--color-text-dim)',
          }}
        >
          Max {MAX_EFFECTS} effects. Remove one to add another.
        </p>
      )}
      <div className="flex-1 overflow-y-auto">
        {categories.map(([category, items], ci) => (
          <div key={category}>
            {ci > 0 && (
              <div
                className="mx-3"
                style={{ borderTop: '1px solid var(--color-border)' }}
              />
            )}
            <div
              className="px-3 py-1.5 text-[9px] font-semibold uppercase tracking-wider"
              style={{ color: 'var(--color-text-dim)' }}
            >
              {category === 'Audio Effects' ? 'Audio' : 'MIDI'}
            </div>
            {items.map((item) => (
              <FxRow
                key={item.id}
                item={item}
                trackId={trackId}
                isActive={
                  item.dragPayload.kind === 'audio-effect' &&
                  activeEffects.includes(item.dragPayload.effectType)
                }
                atMax={atMax}
                onAddEffect={onAddEffect}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function FxRow({
  item,
  trackId,
  isActive,
  atMax,
  onAddEffect,
}: {
  item: LibraryItem;
  trackId: string;
  isActive: boolean;
  atMax: boolean;
  onAddEffect: (trackId: string, effectType: EffectSlotType) => void;
}) {
  const disabled = item.disabled || (atMax && !isActive);

  // Clicking adds the effect. Rows aren't draggable: no rack, track header or
  // the timeline accepts a dropped effect, so a drag only ever bounced back.
  const handleClick = useCallback(() => {
    if (disabled || isActive) return;
    if (item.dragPayload.kind === 'audio-effect') {
      onAddEffect(trackId, item.dragPayload.effectType);
    }
  }, [disabled, isActive, item.dragPayload, trackId, onAddEffect]);

  return (
    <button
      data-tutorial-id={
        item.dragPayload.kind === 'audio-effect'
          ? `fx-add-${item.dragPayload.effectType}`
          : undefined
      }
      onClick={handleClick}
      className="flex items-center gap-2 w-full text-left px-3 py-1.5 cursor-pointer hover:bg-white/10"
      style={{
        border: 'none',
        background: 'none',
        opacity: disabled ? 0.4 : 1,
        cursor: disabled ? 'default' : 'pointer',
      }}
    >
      {item.dragPayload.kind === 'audio-effect' ? (
        <FxBlockIcon
          type={item.dragPayload.effectType}
          size={14}
          color={isActive ? '#7ecfcf' : item.color}
        />
      ) : (
        <div
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: isActive ? '#7ecfcf' : item.color }}
        />
      )}
      <span
        className="text-[11px]"
        style={{
          color: isActive ? 'var(--color-accent)' : 'var(--color-text)',
        }}
      >
        {item.label}
      </span>
      {item.disabled && (
        <span
          className="ml-auto text-[8px] uppercase font-medium"
          style={{ color: 'var(--color-text-dim)' }}
        >
          Soon
        </span>
      )}
    </button>
  );
}
