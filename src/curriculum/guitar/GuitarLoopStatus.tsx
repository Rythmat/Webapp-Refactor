import { Repeat, X } from 'lucide-react';
import { HandCareChip, loopLabel, type LoopRange } from '@/curriculum/practice';

// ── Guitar loop status ─────────────────────────────────────────────────────
// In the guitar lesson's action bar while practising: which bars are looping
// and which pass this is, the one-bar pad, a way out of the loop — or, with
// no loop, how to make one. Nothing sits over the TAB.

/** The bar's secondary pill: 36px, 44px on a phone. */
const PILL =
  'inline-flex h-9 shrink-0 items-center whitespace-nowrap rounded-full border border-white/15 bg-white/[0.04] px-3 text-sm font-normal text-[#e8e8f0] transition-colors duration-150 hover:bg-white/[0.08] aria-pressed:border-white/40 aria-pressed:bg-white/[0.08] max-[639px]:h-11';

/** The same pill, round, for the ✕ that ends the loop. */
const ICON_PILL =
  'inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] text-[#e8e8f0] transition-colors duration-150 hover:bg-white/[0.08] max-[639px]:size-11';

export interface GuitarLoopStatusProps {
  loop: LoopRange | null;
  padBars: 0 | 1;
  /** Passes played since the loop was set. */
  passCount: number;
  onPadChange: (padBars: 0 | 1) => void;
  onClear: () => void;
}

export function GuitarLoopStatus({
  loop,
  padBars,
  passCount,
  onPadChange,
  onClear,
}: GuitarLoopStatusProps) {
  return (
    <div
      data-guitar-loop-status
      className="flex min-w-0 flex-wrap items-center gap-2 text-[15px] leading-5 text-[#e8e8f0]"
    >
      {loop ? (
        <>
          <span
            role="status"
            className="mr-1 flex items-center gap-2 whitespace-nowrap"
          >
            <Repeat aria-hidden className="size-4 shrink-0 text-white/55" />
            {loopLabel(loop)} · pass {passCount + 1}
          </span>
          <button
            type="button"
            aria-pressed={padBars === 1}
            onClick={() => onPadChange(padBars === 1 ? 0 : 1)}
            className={PILL}
          >
            {padBars === 1 ? '✓ ' : ''}A bar either side
          </button>
          {/* A ✕ rather than words: the loop's row stays one line, even
              on a phone. */}
          <button
            type="button"
            onClick={onClear}
            aria-label="Stop looping"
            title="Stop looping"
            className={ICON_PILL}
          >
            <X aria-hidden className="size-4" />
          </button>
        </>
      ) : (
        <span>Tap a bar to loop it, or drag across bars.</span>
      )}
    </div>
  );
}

export interface GuitarPracticeNotesProps {
  /** Looping time on barre steps this session (useBarreLoopingMs). */
  handCareMs: number;
  /** The microphone hears the speakers, so the practice guide is off. */
  guideMuted?: boolean;
}

/**
 * Beside the speed trainer in the action bar: why the guide is quiet, and
 * the barre-chord break reminder. Renders nothing when neither applies.
 */
export function GuitarPracticeNotes({
  handCareMs,
  guideMuted = false,
}: GuitarPracticeNotesProps) {
  return (
    <div
      data-guitar-practice-notes
      className="flex flex-wrap items-center gap-x-3 gap-y-2 text-xs leading-4 text-white/55 empty:hidden"
    >
      {guideMuted && (
        <span>
          The guide is off: your microphone can hear the speakers. Use
          headphones to hear it while you play.
        </span>
      )}
      <HandCareChip loopingMsOnBarreSteps={handCareMs} />
    </div>
  );
}
