import { Minus, Plus } from 'lucide-react';
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import { FixedDigits } from '@/components/common/FixedDigits';
import { cn } from '@/components/utilities';

// ── Tempo stepper ──────────────────────────────────────────────────────────
// In-time steps only: − / "60 bpm" / +. The value takes ↑ ↓ (Shift for 5),
// a click to type a number, and a vertical drag, as the old tempo field did.
// While the speed trainer runs it shows what is playing (70% of 60 → 42);
// every change still sets the step's own tempo.

export const TEMPO_MIN = 40;
export const TEMPO_MAX = 200;

/** Pixels of drag per bpm. */
const DRAG_PX_PER_BPM = 2;
/** A press that moves less than this is a click (to type), not a drag. */
const DRAG_THRESHOLD_PX = 4;

export function clampTempo(
  bpm: number,
  min = TEMPO_MIN,
  max = TEMPO_MAX,
): number {
  return Math.min(max, Math.max(min, Math.round(bpm)));
}

export interface TempoStepperProps {
  /** The step's tempo, as the student set it. */
  bpm: number;
  /** What is playing now; differs from `bpm` while the speed trainer runs. */
  effectiveBpm?: number;
  onChange: (bpm: number) => void;
  min?: number;
  max?: number;
  className?: string;
}

const stepButton =
  'inline-flex size-9 shrink-0 items-center justify-center rounded-full text-[#e8e8f0] transition-colors duration-150 hover:bg-white/[0.08] disabled:opacity-40 disabled:hover:bg-transparent max-[639px]:size-11';

export function TempoStepper({
  bpm,
  effectiveBpm,
  onChange,
  min = TEMPO_MIN,
  max = TEMPO_MAX,
  className,
}: TempoStepperProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const editingRef = useRef(false);
  const valueRef = useRef<HTMLSpanElement>(null);
  const refocusValue = useRef(false);
  const drag = useRef<{ y: number; start: number; moved: boolean } | null>(
    null,
  );
  const suppressClick = useRef(false);

  const shown = effectiveBpm ?? bpm;
  const trainerRunning = shown !== bpm;

  const set = (next: number) => {
    const clamped = clampTempo(next, min, max);
    if (clamped !== bpm) onChange(clamped);
  };

  // Back from typing with Enter or Escape: focus returns to the value.
  useEffect(() => {
    if (!editing && refocusValue.current) {
      refocusValue.current = false;
      valueRef.current?.focus();
    }
  }, [editing]);

  const startEditing = () => {
    setDraft(String(bpm));
    editingRef.current = true;
    setEditing(true);
  };

  const finishEditing = (commit: boolean, refocus: boolean) => {
    // Enter or Escape closes the field; the blur that can follow must not
    // commit a second time.
    if (!editingRef.current) return;
    editingRef.current = false;
    if (commit) {
      const typed = Number.parseInt(draft, 10);
      if (Number.isFinite(typed)) set(typed);
    }
    refocusValue.current = refocus;
    setEditing(false);
  };

  const onValueKeyDown = (event: KeyboardEvent<HTMLSpanElement>) => {
    const by = event.shiftKey ? 5 : 1;
    switch (event.key) {
      case 'ArrowUp':
        set(bpm + by);
        break;
      case 'ArrowDown':
        set(bpm - by);
        break;
      case 'PageUp':
        set(bpm + 10);
        break;
      case 'PageDown':
        set(bpm - 10);
        break;
      case 'Home':
        set(min);
        break;
      case 'End':
        set(max);
        break;
      case 'Enter':
        startEditing();
        break;
      default:
        return;
    }
    event.preventDefault();
  };

  const onPointerDown = (event: PointerEvent<HTMLSpanElement>) => {
    if (event.button !== 0) return;
    drag.current = { y: event.clientY, start: bpm, moved: false };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<HTMLSpanElement>) => {
    const pressed = drag.current;
    if (!pressed) return;
    const dy = pressed.y - event.clientY;
    if (!pressed.moved && Math.abs(dy) < DRAG_THRESHOLD_PX) return;
    pressed.moved = true;
    set(pressed.start + Math.round(dy / DRAG_PX_PER_BPM));
  };

  const endDrag = () => {
    // A drag ends in a click event too; that one must not start typing.
    suppressClick.current = drag.current?.moved ?? false;
    drag.current = null;
  };

  return (
    <div
      role="group"
      aria-label="Tempo"
      data-guitar-tempo
      className={cn(
        'inline-flex h-9 shrink-0 items-center rounded-full border border-white/15 bg-white/[0.04] max-[639px]:h-11',
        className,
      )}
    >
      <button
        type="button"
        aria-label="Slower"
        disabled={bpm <= min}
        onClick={(event) => set(bpm - (event.shiftKey ? 5 : 1))}
        className={stepButton}
      >
        <Minus className="size-4" />
      </button>

      {editing ? (
        <input
          type="number"
          aria-label="Tempo in bpm"
          // Opened by the student's click or Enter, so focus follows it.
          autoFocus
          min={min}
          max={max}
          value={draft}
          onFocus={(event) => event.currentTarget.select()}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              finishEditing(true, true);
            } else if (event.key === 'Escape') {
              event.preventDefault();
              finishEditing(false, true);
            }
          }}
          onBlur={() => finishEditing(true, false)}
          className="h-7 w-[72px] rounded-full bg-white/[0.06] text-center text-sm text-[#e8e8f0] outline-none [appearance:textfield] focus-visible:ring-1 focus-visible:ring-white/40 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
      ) : (
        <span
          ref={valueRef}
          role="spinbutton"
          tabIndex={0}
          aria-label="Tempo"
          aria-valuenow={bpm}
          aria-valuemin={min}
          aria-valuemax={max}
          aria-valuetext={
            trainerRunning
              ? `${shown} bpm with the speed trainer, step tempo ${bpm} bpm`
              : `${bpm} bpm`
          }
          title={
            trainerRunning
              ? `Speed trainer: ${shown} of ${bpm} bpm. Drag, type or use the arrow keys to set the step's tempo.`
              : 'Drag up or down, type, or use the arrow keys'
          }
          onKeyDown={onValueKeyDown}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          onClick={() => {
            if (suppressClick.current) {
              suppressClick.current = false;
              return;
            }
            startEditing();
          }}
          className="flex h-full min-w-[72px] cursor-ns-resize touch-none select-none items-center justify-center whitespace-nowrap rounded-full px-1 text-sm text-[#e8e8f0] outline-none focus-visible:ring-1 focus-visible:ring-white/40"
        >
          <FixedDigits text={String(shown)} />
          &nbsp;<span className="text-white/55">bpm</span>
        </span>
      )}

      <button
        type="button"
        aria-label="Faster"
        disabled={bpm >= max}
        onClick={(event) => set(bpm + (event.shiftKey ? 5 : 1))}
        className={stepButton}
      >
        <Plus className="size-4" />
      </button>
    </div>
  );
}
