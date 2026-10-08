/* eslint-disable react/jsx-sort-props */
import { Volume2, VolumeX, X } from 'lucide-react';
import { memo, type FC } from 'react';
import { cn } from '@/components/utilities';
import {
  barTicks,
  gridTicks,
  nextVelocity,
  type DrumGroove,
  type DrumGrooveHit,
} from '@/curriculum/engine/drumGrooves/drumGroove';
import { padLabel } from '@/daw/instruments/drumKits';
import { CONSOLE_LABEL, CONSOLE_PANEL } from '../ui/styles';

/** Pad colours by family: kick, snare-ish, hats, toms, cymbals. */
const PAD_COLOR: Record<number, string> = {
  36: 'bg-amber-500',
  38: 'bg-rose-500',
  40: 'bg-rose-400',
  42: 'bg-sky-500',
  44: 'bg-sky-600',
  46: 'bg-sky-400',
  41: 'bg-orange-700',
  45: 'bg-orange-600',
  48: 'bg-orange-500',
  49: 'bg-yellow-400',
  51: 'bg-violet-400',
};

const key = (note: number, tick: number) => `${note}:${tick}`;

interface Props {
  groove: DrumGroove;
  /** Rows top to bottom. */
  rows: number[];
  kitBase: string;
  muted: ReadonlySet<number>;
  playTick: number | null;
  onChange: (hits: DrumGrooveHit[]) => void;
  onPadGain: (note: number, gain: number) => void;
  onToggleMute: (note: number) => void;
  onAudition: (note: number) => void;
  onRemoveRow: (note: number) => void;
}

/**
 * One block per bar: pads down the side, grid steps across. Click an empty
 * cell to add a hit, click a hit to cycle ghost → soft → normal → accent,
 * right-click (or ⌥-click) to clear it. Velocity reads as opacity.
 */
export const GrooveGrid: FC<Props> = memo(function GrooveGrid({
  groove,
  rows,
  kitBase,
  muted,
  playTick,
  onChange,
  onPadGain,
  onToggleMute,
  onAudition,
  onRemoveRow,
}) {
  const step = gridTicks(groove.grid);
  const barT = barTicks(groove.timeSignature);
  const stepsPerBar = Math.max(1, Math.floor(barT / step));
  const beatT = barT / Math.max(1, groove.feltBeats);
  const byKey = new Map(groove.hits.map((h) => [key(h.note, h.tick), h]));
  const playStep =
    playTick === null ? null : Math.floor(playTick / step) * step;

  const clickCell = (note: number, tick: number, clear: boolean) => {
    const hit = byKey.get(key(note, tick));
    if (clear) {
      if (hit) onChange(groove.hits.filter((h) => h !== hit));
      return;
    }
    if (!hit) {
      onChange([...groove.hits, { tick, note, velocity: 96 }]);
      return;
    }
    onChange(
      groove.hits.map((h) =>
        h === hit ? { ...h, velocity: nextVelocity(h.velocity) } : h,
      ),
    );
  };

  return (
    <div className="flex flex-col gap-4">
      {Array.from({ length: groove.bars }, (_, bar) => (
        <div key={bar} className={cn(CONSOLE_PANEL, 'p-3')}>
          <div className={cn(CONSOLE_LABEL, 'mb-2')}>Bar {bar + 1}</div>
          <div className="overflow-x-auto">
            <div className="flex w-max flex-col gap-1">
              {rows.map((note) => {
                const gain = groove.padGains[note] ?? 1;
                const isMuted = muted.has(note);
                const hasHits = groove.hits.some((h) => h.note === note);
                return (
                  <div key={note} className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => onAudition(note)}
                      className="w-24 shrink-0 truncate text-left text-xs font-medium uppercase tracking-[0.14em] text-white/70 hover:text-white"
                      title="Hear this pad"
                    >
                      {padLabel(note, kitBase)}
                    </button>
                    {bar === 0 ? (
                      <>
                        <input
                          type="range"
                          min={0}
                          max={1.5}
                          step={0.05}
                          value={gain}
                          onChange={(e) =>
                            onPadGain(note, Number(e.target.value))
                          }
                          aria-label={`${padLabel(note, kitBase)} level`}
                          title={`Level ${Math.round(gain * 100)}%`}
                          className="w-16 shrink-0 accent-white"
                        />
                        <button
                          type="button"
                          onClick={() => onToggleMute(note)}
                          aria-label={isMuted ? 'Unmute' : 'Mute'}
                          title={
                            isMuted ? 'Unmute (not saved)' : 'Mute (not saved)'
                          }
                          className="shrink-0 text-white/40 hover:text-white"
                        >
                          {isMuted ? (
                            <VolumeX className="size-3.5 text-rose-400" />
                          ) : (
                            <Volume2 className="size-3.5" />
                          )}
                        </button>
                      </>
                    ) : (
                      <div className="w-[5.25rem] shrink-0" />
                    )}
                    {Array.from({ length: stepsPerBar }, (__, s) => {
                      const tick = bar * barT + s * step;
                      const hit = byKey.get(key(note, tick));
                      const onBeat = tick % beatT === 0;
                      const beatIndex = Math.floor((tick % barT) / beatT);
                      const isPlayhead = playStep === tick;
                      return (
                        <button
                          key={s}
                          type="button"
                          aria-label={`${padLabel(note, kitBase)}, bar ${bar + 1}, step ${s + 1}${hit ? `, velocity ${hit.velocity}` : ''}`}
                          title={
                            hit
                              ? `Velocity ${hit.velocity}${hit.offset ? ` · played ${Math.abs(hit.offset)} ticks ${hit.offset > 0 ? 'behind' : 'ahead'}` : ''} — click to cycle, right-click to clear`
                              : 'Click to add'
                          }
                          onClick={(e) => clickCell(note, tick, e.altKey)}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            clickCell(note, tick, true);
                          }}
                          className={cn(
                            'relative h-7 w-6 shrink-0 rounded-[3px] border',
                            onBeat ? 'border-white/25' : 'border-white/[0.08]',
                            !hit &&
                              (beatIndex % 2 === 0
                                ? 'bg-white/[0.06]'
                                : 'bg-white/[0.02]'),
                            isPlayhead && 'ring-1 ring-white/70',
                          )}
                        >
                          {hit && (
                            <span
                              className={cn(
                                'absolute inset-0 rounded-[2px]',
                                PAD_COLOR[note] ?? 'bg-white',
                                isMuted && 'grayscale',
                              )}
                              style={{
                                opacity: Math.max(0.25, hit.velocity / 127),
                              }}
                            />
                          )}
                          {/* Feel: a tick mark where it's really played —
                              left of centre is ahead, right is behind. */}
                          {hit?.offset ? (
                            <span
                              className="absolute inset-y-1 w-0.5 rounded bg-white/90"
                              style={{
                                left: `calc(50% + ${Math.max(-10, Math.min(10, (hit.offset / step) * 24))}px)`,
                              }}
                            />
                          ) : null}
                        </button>
                      );
                    })}
                    {bar === 0 && !hasHits && (
                      <button
                        type="button"
                        onClick={() => onRemoveRow(note)}
                        aria-label="Hide this row"
                        className="ml-1 text-white/30 hover:text-white"
                      >
                        <X className="size-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
              {/* beat ruler */}
              <div className="flex items-center gap-1.5">
                <div className="w-24 shrink-0" />
                <div className="w-[5.25rem] shrink-0" />
                {Array.from({ length: stepsPerBar }, (__, s) => {
                  const t = s * step;
                  return (
                    <div
                      key={s}
                      className="w-6 shrink-0 text-center text-[10px] text-white/35"
                    >
                      {t % beatT === 0 ? t / beatT + 1 : ''}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
});
