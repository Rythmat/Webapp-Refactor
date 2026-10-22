import { Check, X } from 'lucide-react';
import { cn } from '@/components/utilities';
import type { GridGrade, LaneCells } from '@/curriculum/engine/grooveLab/grade';
import {
  LAB_LANES,
  type LabGroove,
  type LabLane,
} from '@/curriculum/engine/grooveLab/labGroove';
import { laneColor, laneName } from './lanes';

// ── The drum grid ───────────────────────────────────────────────────────────
// Three rows (the hi-hat or ride, the snare, the kick) of the groove's own
// grid, a block per bar so a two-bar groove reads as two lines of music.
// The player clicks the cells in; after a check the grid shows what was
// right, what the groove had that the player missed (outlined) and what the
// player added (crossed). Read-only, it shows the pads' result the same way.
//
// An open hi-hat is the hat's cell clicked again: a ring in the cell, as
// drum notation circles an open hat. A third click clears it.
//
// On the pads each track has a record-arm button beside its name, a red
// circle (filled: armed), under the word RECORD: a take records the armed
// tracks only.

export interface GrooveGridProps {
  groove: LabGroove;
  cells: LaneCells;
  /** Clicking a cell; none makes the grid read-only. */
  onToggle?: (lane: LabLane, step: number) => void;
  /** The step sounding now. */
  playStep?: number | null;
  result?: Pick<GridGrade, 'right' | 'missing' | 'extra'> | null;
  /** The groove's open hats, to show on the cells the player missed. */
  targetOpen?: ReadonlySet<number>;
  /** Record arm, each track (the pads). */
  armed?: Record<LabLane, boolean>;
  onArm?: (lane: LabLane) => void;
  compact?: boolean;
}

export function GrooveGrid({
  groove,
  cells,
  onToggle,
  playStep = null,
  result = null,
  targetOpen,
  armed,
  onArm,
  compact = false,
}: GrooveGridProps) {
  const bars = Array.from(
    { length: Math.ceil(groove.steps / groove.stepsPerBar) },
    (_, b) => b,
  );
  const per = groove.stepsPerBar;
  const beatOf = (i: number) => Math.floor(i / groove.stepsPerBeat);
  const has = (
    r: Record<LabLane, number[]> | undefined,
    lane: LabLane,
    s: number,
  ) => !!r && r[lane].includes(s);

  return (
    <div
      className="flex w-full flex-col gap-4 overflow-x-auto pb-1"
      data-groove-grid
    >
      {bars.map((bar) => (
        <div
          key={bar}
          className="flex min-w-fit flex-col gap-1.5"
          data-groove-bar={bar + 1}
        >
          {armed && bar === 0 && (
            <div className="flex items-end gap-2" aria-hidden>
              <span className="w-7 shrink-0 text-center text-[9px] font-bold tracking-[0.12em] text-[#ef4444]">
                RECORD
              </span>
            </div>
          )}
          {LAB_LANES.map((lane) => (
            <div key={lane} className="flex items-center gap-2">
              {armed &&
                (bar === 0 ? (
                  <button
                    type="button"
                    aria-pressed={armed[lane]}
                    aria-label={`Record ${laneName(groove, lane)}`}
                    title={
                      armed[lane]
                        ? `${laneName(groove, lane)} records`
                        : `${laneName(groove, lane)} won’t record`
                    }
                    data-arm={lane}
                    onClick={() => onArm?.(lane)}
                    className="grid w-7 shrink-0 place-items-center"
                  >
                    <span
                      className="block size-4 rounded-full border-2 border-[#ef4444] transition-colors"
                      style={{
                        background: armed[lane] ? '#ef4444' : 'transparent',
                      }}
                    />
                  </button>
                ) : (
                  <span className="w-7 shrink-0" aria-hidden />
                ))}
              <span
                className={cn(
                  'shrink-0 text-right text-xs font-semibold uppercase tracking-wide',
                  compact ? 'w-14' : 'w-20',
                )}
                style={{ color: laneColor(groove, lane) }}
              >
                {laneName(groove, lane)}
              </span>
              <div className="flex flex-1 items-center">
                {Array.from({ length: per }, (_, i) => {
                  const step = bar * per + i;
                  const on = cells[lane].has(step);
                  const hat = lane === 'cymbal' && groove.cymbal === 'hat';
                  const open = hat && on && !!cells.open?.has(step);
                  const right = has(result?.right, lane, step);
                  const missed = has(result?.missing, lane, step);
                  const extra = has(result?.extra, lane, step);
                  const color = laneColor(groove, lane);
                  const sounding = playStep === step;
                  const openMissed = hat && missed && !!targetOpen?.has(step);
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={!onToggle}
                      aria-label={`${laneName(groove, lane)}${open ? ' open' : ''}, bar ${bar + 1}, step ${i + 1}`}
                      title={
                        hat && onToggle
                          ? 'Click again for an open hi-hat'
                          : undefined
                      }
                      aria-pressed={on}
                      data-lane={lane}
                      data-step={step}
                      onClick={() => onToggle?.(lane, step)}
                      className={cn(
                        'relative grid aspect-square min-w-[22px] flex-1 place-items-center rounded-md border transition-colors',
                        compact ? 'max-w-[30px]' : 'max-w-[44px]',
                        i > 0 && i % groove.stepsPerBeat === 0 && 'ml-2',
                        i > 0 && i % groove.stepsPerBeat !== 0 && 'ml-1',
                        onToggle ? 'cursor-pointer' : 'cursor-default',
                      )}
                      style={{
                        background: on
                          ? color
                          : beatOf(i) % 2 === 0
                            ? 'rgba(255,255,255,0.05)'
                            : 'rgba(255,255,255,0.03)',
                        borderColor: missed
                          ? color
                          : extra
                            ? '#f87171'
                            : sounding
                              ? 'rgba(255,255,255,0.85)'
                              : 'rgba(255,255,255,0.08)',
                        borderStyle: missed ? 'dashed' : 'solid',
                        borderWidth: missed || extra || sounding ? 2 : 1,
                        opacity: extra ? 0.75 : 1,
                      }}
                    >
                      {(open || openMissed) && (
                        <span
                          aria-hidden
                          className="pointer-events-none absolute inset-[20%] rounded-full border-2"
                          style={{
                            borderColor: open ? 'rgba(16,16,18,0.75)' : color,
                          }}
                        />
                      )}
                      {right && (
                        <Check
                          aria-hidden
                          className="size-3.5 text-[#101012]"
                          strokeWidth={3}
                        />
                      )}
                      {extra && (
                        <X
                          aria-hidden
                          className="size-3.5 text-[#101012]"
                          strokeWidth={3}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          <div className="flex items-center gap-2" aria-hidden>
            {armed && <span className="w-7 shrink-0" />}
            <span className={compact ? 'w-14' : 'w-20'} />
            <div className="flex flex-1 items-center">
              {Array.from({ length: per }, (_, i) => (
                <span
                  key={i}
                  className={cn(
                    'min-w-[22px] flex-1 text-center text-[10px] text-white/35',
                    compact ? 'max-w-[30px]' : 'max-w-[44px]',
                    i > 0 && i % groove.stepsPerBeat === 0 && 'ml-2',
                    i > 0 && i % groove.stepsPerBeat !== 0 && 'ml-1',
                  )}
                >
                  {i % groove.stepsPerBeat === 0 ? beatOf(i) + 1 : ''}
                </span>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
