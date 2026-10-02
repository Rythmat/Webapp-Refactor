import { Info } from 'lucide-react';
import { useId, useState } from 'react';
import { Switch } from '@/components/ui/switch';
import {
  GUITAR_THEORY_NOTES,
  theoryString,
} from '@/curriculum/data/guitar/theoryNotes';
import type { SpeedLadderState } from './useLessonPracticeTools';

// ── Speed trainer ──────────────────────────────────────────────────────────
// The ladder's switch and rule for the lesson's tempo bar: loops start slow
// and climb after clean passes. The (i) says what counts as clean. The
// switch is the app's white one; the rule reads in the text colour while the
// trainer runs and dimmer while it is off.

const CLEAN_NOTE = GUITAR_THEORY_NOTES.find((note) => note.id === 'pt.clean')!;

export interface SpeedTrainerControlProps {
  ladder: SpeedLadderState;
  /** The rule, from useLessonPracticeTools' ladderText. */
  text: string;
  onToggle: () => void;
  onReset: () => void;
}

export function SpeedTrainerControl({
  ladder,
  text,
  onToggle,
  onReset,
}: SpeedTrainerControlProps) {
  const [infoOpen, setInfoOpen] = useState(false);
  const infoId = useId();
  const switchId = useId();
  const { enabled } = ladder;
  const tone = enabled ? 'text-[#e8e8f0]' : 'text-white/55';

  return (
    <div className="flex min-w-0 items-center gap-2 text-xs">
      <div className="flex min-h-11 shrink-0 items-center sm:min-h-9">
        <Switch
          id={switchId}
          checked={enabled}
          onCheckedChange={onToggle}
          // A 20px switch that takes taps the row's full height (44px on a
          // phone, 36px from sm up). The thumb slides; under reduced motion
          // it just moves.
          className="relative before:absolute before:-inset-x-1 before:-inset-y-3.5 before:content-[''] sm:before:-inset-y-2.5 [&>span]:motion-reduce:transition-none"
        />
        {/* The label takes taps too, the gap included, so the target is the
            whole row. */}
        <label
          htmlFor={switchId}
          className={`flex min-h-11 cursor-pointer items-center pl-2 transition-colors sm:min-h-9 ${tone}`}
        >
          Speed trainer
        </label>
      </div>
      <span aria-live="polite" className={`min-w-0 truncate ${tone}`}>
        {text}
      </span>
      {enabled && ladder.lastStep === 'back' && (
        <span className="shrink-0 text-white/55">
          {theoryString('pt.stepBack', { tempo: ladder.currentPct })}
        </span>
      )}
      <span className="relative shrink-0">
        <button
          type="button"
          aria-label={`What is a ${CLEAN_NOTE.title.toLowerCase()}?`}
          aria-expanded={infoOpen}
          aria-controls={infoId}
          onClick={() => setInfoOpen((open) => !open)}
          onBlur={() => setInfoOpen(false)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') setInfoOpen(false);
          }}
          // 24px to the eye, 32px to a finger.
          className="relative flex size-6 items-center justify-center rounded-full p-0 text-white/55 transition-colors before:absolute before:-inset-1 before:content-[''] hover:bg-white/[0.06] hover:text-[#e8e8f0]"
        >
          <Info aria-hidden className="size-4" />
        </button>
        {infoOpen && (
          // Above the (i): the control sits in the lesson's bottom bar, and
          // a note hung below it would open off the screen.
          <span
            id={infoId}
            role="note"
            className="absolute bottom-full right-0 z-50 mb-1.5 block w-60 rounded-xl border border-white/[0.08] bg-[#141416] p-3 text-xs leading-snug text-white/55 shadow-lg"
          >
            <strong className="mb-0.5 block font-bold text-[#e8e8f0]">
              {CLEAN_NOTE.title}
            </strong>
            {CLEAN_NOTE.body}
          </span>
        )}
      </span>
      {enabled && (
        <button
          type="button"
          onClick={onReset}
          aria-label="Start the speed trainer again"
          title="Start again from the slowest tempo"
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-transparent p-0 text-sm text-white/55 transition-colors hover:bg-white/[0.06] hover:text-[#e8e8f0] sm:size-9"
        >
          ↺
        </button>
      )}
    </div>
  );
}
