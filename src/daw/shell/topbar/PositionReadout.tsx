import { memo, useLayoutEffect, useRef } from 'react';
import { cn } from '@/components/utilities';
import { getPlayheadTick, subscribePlayhead } from '@/daw/engine/playheadClock';
import { useStore } from '@/daw/store';
import type { ReadoutMode } from '@/daw/shell/layout/layoutModel';
import { FOCUS_RING, TRANSITION } from '@/daw/ui/styles';
import { Tooltip } from '@/daw/ui/Tooltip';

// ── The position readout (milestone 2.5) ───────────────────────────────────
//
// Where the playhead is, as bar:beat:sixteenth or as m:ss.t; a click
// switches between them (the student's pref, readoutMode). The playhead
// moves every frame while playing: React renders the readout once and a
// playhead clock subscription writes its text, only when the text changes,
// so playback re-renders neither the readout nor the bar around it
// (shell-17, milestone 1.7). During a count-in it says so instead.

const PPQ = 480;

export function formatPosition(
  ticks: number,
  numerator = 4,
  denominator = 4,
): string {
  const beatTicks = (PPQ * 4) / denominator;
  const barTicks = numerator * beatTicks;
  const sixteenthTicks = PPQ / 4;

  const bar = Math.floor(ticks / barTicks) + 1;
  const beat = (Math.floor((ticks % barTicks) / beatTicks) % numerator) + 1;
  const sixteenth = Math.floor((ticks % beatTicks) / sixteenthTicks) + 1;

  return `${bar}:${beat}:${sixteenth}`;
}

/** The song time at `ticks` and a steady `bpm`: m:ss.t. */
export function formatTime(ticks: number, bpm: number): string {
  const seconds = Math.max(0, (ticks / PPQ) * (60 / bpm));
  const tenths = Math.floor(seconds * 10) % 10;
  const whole = Math.floor(seconds);
  const minutes = Math.floor(whole / 60);
  const secs = String(whole % 60).padStart(2, '0');
  return `${minutes}:${secs}.${tenths}`;
}

function readoutText(tick: number, mode: ReadoutMode): string {
  const s = useStore.getState();
  return mode === 'time'
    ? formatTime(tick, s.bpm)
    : formatPosition(
        tick,
        s.timeSignatureNumerator,
        s.timeSignatureDenominator,
      );
}

/** FixedDigits' cell widths in em (src/components/common/FixedDigits.tsx):
 *  each digit and separator sits in a cell of its own, so the readout holds
 *  still while it counts. */
const DIGIT_CELL_EM = 0.62;
const SEPARATOR_CELL_EM = 0.32;

/** The text in FixedDigits' cells. */
export function writeReadout(el: HTMLElement, text: string): void {
  el.replaceChildren(
    ...Array.from(text, (ch) => {
      const cell = document.createElement('span');
      cell.textContent = ch;
      const em = ch === ':' || ch === '.' ? SEPARATOR_CELL_EM : DIGIT_CELL_EM;
      // Centred, and free of inherited letter-spacing, as in FixedDigits.
      cell.style.cssText = `display:inline-block;width:${em}em;text-align:center;letter-spacing:0`;
      return cell;
    }),
  );
}

export const PositionReadout = memo(function PositionReadout() {
  const ref = useRef<HTMLSpanElement>(null);
  const mode = useStore((s) => s.readoutMode);
  const setMode = useStore((s) => s.setReadoutMode);
  const countingIn = useStore((s) => s.isCountingIn);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || countingIn) return;
    let shown = '';
    const show = (tick: number) => {
      const text = readoutText(tick, mode);
      if (text === shown) return;
      shown = text;
      writeReadout(el, text);
    };
    show(getPlayheadTick());
    const offPlayhead = subscribePlayhead(show);
    // A metre or tempo change re-counts the same tick.
    const offSong = useStore.subscribe(
      (s) =>
        `${s.timeSignatureNumerator}/${s.timeSignatureDenominator}/${s.bpm}`,
      () => show(getPlayheadTick()),
    );
    return () => {
      offPlayhead();
      offSong();
    };
  }, [mode, countingIn]);

  const hint =
    mode === 'time'
      ? 'Minutes and seconds. Click for bars and beats'
      : 'Bar : beat : sixteenth. Click for minutes and seconds';

  return (
    <Tooltip content={hint} side="bottom">
      <button
        type="button"
        data-testid="position-readout"
        data-mode={mode}
        onClick={() => setMode(mode === 'time' ? 'bars' : 'time')}
        className={cn(
          'inline-flex h-7 min-w-[84px] shrink-0 items-center justify-center rounded-[var(--daw-radius-sm)] bg-daw-chip px-2 text-[length:var(--daw-font-title)] font-bold tabular-nums text-daw-text hover:bg-daw-hover',
          TRANSITION,
          FOCUS_RING,
        )}
      >
        <span className="sr-only">Position </span>
        {countingIn ? (
          <span>Count-in…</span>
        ) : (
          <span ref={ref} data-testid="position-readout-text" />
        )}
      </button>
    </Tooltip>
  );
});
