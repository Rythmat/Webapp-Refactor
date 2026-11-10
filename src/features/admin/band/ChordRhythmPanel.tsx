/**
 * A band style's chord rhythm (owner, 2026-11-10: chord rhythms are saved
 * per band style, a rhythm can push a chord early, admins only): how long
 * each chord holds, how early the changes arrive, and, for a loop of the
 * preview chart's length, each chord's own hold. Prism lays every
 * progression it plays in this style this way (harmonicRhythm.ts), and the
 * band's preview plays the chart in it, so what is heard here is what
 * Prism writes.
 */

import { Minus, Plus, RotateCcw } from 'lucide-react';
import { cn } from '@/components/utilities';
import {
  BARS_PER_CHORD,
  holdsFor,
  PUSHES,
  type StyleHarmony,
} from '@/curriculum/engine/band/harmonicRhythm';
import { CONSOLE_LABEL } from '../ui/styles';

interface ChordRhythmPanelProps {
  harmony: StyleHarmony | undefined;
  /** Undefined clears the style's rhythm: a chord a bar, on the beat. */
  onChange: (next: StyleHarmony | undefined) => void;
  /** The preview chart's chords, one each, as they read ('Am7', 'D7'). */
  chords: readonly string[];
  beatsPerBar: number;
  inputClass: string;
  /** A content editor sees the style's chord rhythm; only an admin sets it. */
  readOnly?: boolean;
}

const barsLabel = (bars: number) =>
  bars === 0.5 ? '½ bar' : bars === 1 ? '1 bar' : `${bars} bars`;

/** The harmony with a field set, or with nothing left to say, none. */
function tidy(harmony: StyleHarmony): StyleHarmony | undefined {
  const out: StyleHarmony = {};
  if (harmony.barsPerChord && harmony.barsPerChord !== 1)
    out.barsPerChord = harmony.barsPerChord;
  if (harmony.push) out.push = harmony.push;
  if (harmony.rhythms && Object.keys(harmony.rhythms).length)
    out.rhythms = harmony.rhythms;
  return Object.keys(out).length ? out : undefined;
}

export function ChordRhythmPanel({
  harmony,
  onChange,
  chords,
  beatsPerBar,
  inputClass,
  readOnly = false,
}: ChordRhythmPanelProps) {
  const set = (patch: Partial<StyleHarmony>) =>
    onChange(tidy({ ...harmony, ...patch }));
  const n = chords.length;
  const holds = holdsFor(n, harmony, beatsPerBar);
  const own = !!harmony?.rhythms?.[String(n)];
  const total = holds.reduce((a, b) => a + b, 0);
  const setHold = (i: number, beats: number) => {
    const next = [...holds];
    next[i] = Math.max(1, beats);
    set({ rhythms: { ...harmony?.rhythms, [String(n)]: next } });
  };
  const resetOwn = () => {
    const rest = { ...harmony?.rhythms };
    delete rest[String(n)];
    set({ rhythms: rest });
  };

  return (
    <div className="flex flex-col gap-2" data-testid="chord-rhythm">
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className={CONSOLE_LABEL}>Each chord</span>
          <select
            value={harmony?.barsPerChord ?? 1}
            onChange={(e) => set({ barsPerChord: Number(e.target.value) })}
            disabled={readOnly}
            className={inputClass}
            aria-label="Bars each chord holds"
          >
            {BARS_PER_CHORD.map((b) => (
              <option key={b} value={b}>
                {barsLabel(b)}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className={CONSOLE_LABEL}>Changes</span>
          <select
            value={harmony?.push ?? 0}
            onChange={(e) => set({ push: Number(e.target.value) })}
            disabled={readOnly}
            className={inputClass}
            aria-label="How early the changes arrive"
          >
            {PUSHES.map((p) => (
              <option key={p.ticks} value={p.ticks}>
                {p.label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {n > 0 && (
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <span className={CONSOLE_LABEL}>
              {n}-chord loops · {total / beatsPerBar} bars
            </span>
            {own && !readOnly && (
              <button
                type="button"
                onClick={resetOwn}
                className="inline-flex items-center gap-1 text-xs text-white/50 hover:text-white/80"
                title="Hold each chord as the style does"
              >
                <RotateCcw className="size-3" /> Reset
              </button>
            )}
          </div>
          <div className="flex w-full gap-1" role="list">
            {chords.map((chord, i) => (
              <div
                key={i}
                role="listitem"
                style={{ flexGrow: holds[i] }}
                className={cn(
                  'flex min-w-0 basis-0 items-center justify-between gap-1 rounded-md border px-1.5 py-1 text-xs',
                  own
                    ? 'border-white/20 bg-white/10'
                    : 'border-white/[0.08] bg-white/[0.03]',
                )}
              >
                <button
                  type="button"
                  aria-label={`Shorten ${chord}`}
                  disabled={readOnly || holds[i] <= 1}
                  onClick={() => setHold(i, holds[i] - 1)}
                  className="rounded p-0.5 text-white/50 hover:text-white disabled:opacity-30"
                >
                  <Minus className="size-3" />
                </button>
                <span className="truncate text-white/80">
                  {chord}{' '}
                  <span className="tabular-nums text-white/40">{holds[i]}</span>
                </span>
                <button
                  type="button"
                  aria-label={`Lengthen ${chord}`}
                  disabled={readOnly}
                  onClick={() => setHold(i, holds[i] + 1)}
                  className="rounded p-0.5 text-white/50 hover:text-white disabled:opacity-30"
                >
                  <Plus className="size-3" />
                </button>
              </div>
            ))}
          </div>
          <span className="text-xs text-white/40">
            Beats each chord holds, for every {n}-chord loop this style plays.
            {readOnly && ' Only an admin can change it.'}
          </span>
        </div>
      )}
    </div>
  );
}
