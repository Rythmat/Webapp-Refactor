import { Circle, Eraser, Play, RotateCcw, Square, Volume2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/components/utilities';
import { LoopToggle } from './LoopToggle';
import type { Playing } from './useGrooveRound';

// The row under the grid, the same in both views: Listen, Play mine, Loop,
// (on the pads) Record a Take, Clear, and Check, then Next groove.

export function GrooveControls({
  ready,
  playing,
  placed,
  checked,
  loop,
  busy = false,
  onLoop,
  onListen,
  onPlayMine,
  onClear,
  onCheck,
  onNext,
  record,
}: {
  ready: boolean;
  playing: Playing;
  /** Cells on the player's grid. */
  placed: number;
  checked: boolean;
  loop: boolean;
  /** A take under way: everything waits. */
  busy?: boolean;
  onLoop: (on: boolean) => void;
  onListen: () => void;
  onPlayMine: () => void;
  onClear: () => void;
  onCheck: () => void;
  onNext: () => void;
  record?: { recording: boolean; onRecord: () => void };
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <PlayButton
        label="Listen"
        icon={<Volume2 className="size-4" />}
        on={playing === 'target'}
        disabled={!ready || busy}
        onClick={onListen}
      />
      <PlayButton
        label="Play mine"
        icon={<Play className="size-4" />}
        on={playing === 'mine'}
        disabled={!ready || placed === 0 || busy}
        onClick={onPlayMine}
      />
      <LoopToggle on={loop} onChange={onLoop} />
      {record && !checked && (
        <button
          type="button"
          onClick={record.onRecord}
          disabled={!ready || busy}
          data-testid="groove-record"
          className={cn(
            'inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition-colors disabled:opacity-60',
            record.recording
              ? 'border-[#ef4444] bg-[#ef4444] text-white'
              : 'border-[#ef4444] text-[#ef4444] hover:bg-[#ef4444]/10',
          )}
        >
          <Circle className="size-3.5" fill="currentColor" aria-hidden />
          {record.recording ? 'Recording…' : 'Record a Take'}
        </button>
      )}
      {!checked && (
        <button
          type="button"
          onClick={onClear}
          disabled={placed === 0 || busy}
          className="inline-flex h-10 items-center gap-2 rounded-full border border-white/15 px-4 text-sm text-white/80 transition-colors hover:bg-white/[0.06] disabled:opacity-40"
        >
          <Eraser className="size-4" /> Clear
        </button>
      )}
      {checked ? (
        <button
          type="button"
          onClick={onNext}
          data-testid="groove-next"
          className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-[#101012]"
        >
          <RotateCcw className="size-4" /> Next groove
        </button>
      ) : (
        <button
          type="button"
          onClick={onCheck}
          disabled={placed === 0 || busy}
          data-testid="groove-check"
          className="inline-flex h-10 items-center gap-2 rounded-full bg-white px-5 text-sm font-semibold text-[#101012] disabled:opacity-40"
        >
          Check
        </button>
      )}
    </div>
  );
}

function PlayButton({
  label,
  icon,
  on,
  disabled,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  on: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={on}
      className={cn(
        'inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm transition-colors disabled:opacity-40',
        on
          ? 'border-[#7ecfcf] bg-[#7ecfcf]/15 text-[#7ecfcf]'
          : 'border-white/15 text-white/85 hover:bg-white/[0.06]',
      )}
    >
      {on ? <Square className="size-4" /> : icon}
      {on ? 'Stop' : label}
    </button>
  );
}

/** How a check went, in a line. */
export function CheckLine({
  passed,
  mistakes,
  accuracy,
}: {
  passed: boolean;
  mistakes: number;
  accuracy: number;
}) {
  return (
    <p
      className={cn(
        'text-center text-sm font-semibold',
        passed ? 'text-emerald-400' : 'text-rose-400',
      )}
      role="status"
    >
      {passed
        ? mistakes === 0
          ? 'Every hit right!'
          : `Right, give or take ${mistakes === 1 ? 'one hit' : `${mistakes} hits`}.`
        : `${Math.round(accuracy * 100)}% of the hits: ${mistakes} to fix.`}
    </p>
  );
}
