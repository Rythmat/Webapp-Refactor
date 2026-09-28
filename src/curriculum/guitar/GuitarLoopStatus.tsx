import { Repeat } from 'lucide-react';
import { HandCareChip, loopLabel, type LoopRange } from '@/curriculum/practice';

// ── Guitar loop status ─────────────────────────────────────────────────────
// Sits in the TAB's header strip while practising on guitar, beside the bars
// it's about: which bars are looping and which pass this is, the one-bar pad,
// a way out of the loop — or, with no loop, how to make one.

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
      className="flex items-center gap-2 whitespace-nowrap text-[12px] text-white/70"
    >
      {loop ? (
        <>
          <span role="status" className="flex items-center gap-1.5 text-white">
            <Repeat size={13} aria-hidden />
            {loopLabel(loop)} · pass {passCount + 1}
          </span>
          <button
            type="button"
            aria-pressed={padBars === 1}
            onClick={() => onPadChange(padBars === 1 ? 0 : 1)}
            className="rounded-full border border-white/20 px-2.5 py-0.5 text-white/80 hover:bg-white/10"
          >
            {padBars === 1 ? '✓ ' : ''}A bar either side
          </button>
          <button
            type="button"
            onClick={onClear}
            className="rounded-full border border-white/20 px-2.5 py-0.5 text-white/80 hover:bg-white/10"
          >
            Stop looping
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
 * Under the practice controls: why the guide is quiet, and the barre-chord
 * break reminder. Renders nothing when neither applies.
 */
export function GuitarPracticeNotes({
  handCareMs,
  guideMuted = false,
}: GuitarPracticeNotesProps) {
  return (
    <div
      data-guitar-practice-notes
      className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-[12px] text-white/70 empty:hidden"
    >
      {guideMuted && (
        <span className="text-center">
          The guide is off: your microphone can hear the speakers. Use
          headphones to hear it while you play.
        </span>
      )}
      <HandCareChip loopingMsOnBarreSteps={handCareMs} />
    </div>
  );
}
