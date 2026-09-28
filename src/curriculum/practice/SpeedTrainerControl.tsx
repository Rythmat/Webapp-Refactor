import { useId, useState } from 'react';
import {
  GUITAR_THEORY_NOTES,
  theoryString,
} from '@/curriculum/data/guitar/theoryNotes';
import type { SpeedLadderState } from './useLessonPracticeTools';

// ── Speed trainer ──────────────────────────────────────────────────────────
// The ladder's switch and rule for the lesson's tempo bar: loops start slow
// and climb after clean passes. The (i) says what counts as clean.

const CLEAN_NOTE = GUITAR_THEORY_NOTES.find((note) => note.id === 'pt.clean')!;
const DIM = 'var(--color-text-dim, #888)';

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
  const { enabled } = ladder;

  return (
    <div className="flex min-w-0 items-center gap-2 text-[12px]">
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={onToggle}
        className="flex shrink-0 items-center gap-1.5 bg-transparent p-0"
        style={{ color: enabled ? '#eee' : DIM }}
      >
        <span
          aria-hidden="true"
          className="relative inline-block h-3.5 w-6 rounded-full motion-safe:transition-colors"
          style={{
            background: enabled ? '#4a9eff' : 'rgba(255,255,255,0.12)',
          }}
        >
          <span
            className="absolute top-0.5 size-2.5 rounded-full bg-white motion-safe:transition-[left]"
            style={{ left: enabled ? 12 : 2 }}
          />
        </span>
        Speed trainer
      </button>
      <span
        aria-live="polite"
        className="min-w-0 truncate"
        style={{ color: enabled ? '#eee' : DIM }}
      >
        {text}
      </span>
      {enabled && ladder.lastStep === 'back' && (
        <span className="shrink-0" style={{ color: DIM }}>
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
          className="flex size-4 items-center justify-center rounded-full p-0 text-[10px] font-semibold italic leading-none"
          style={{ border: `1px solid ${DIM}`, color: DIM }}
        >
          i
        </button>
        {infoOpen && (
          <span
            id={infoId}
            role="note"
            className="absolute right-0 top-full z-50 mt-1.5 block w-60 rounded-lg p-2.5 text-[12px] leading-snug shadow-lg"
            style={{
              background: 'rgba(25,25,25,0.98)',
              border: '1px solid #444',
              color: '#ddd',
            }}
          >
            <strong className="mb-0.5 block">{CLEAN_NOTE.title}</strong>
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
          className="shrink-0 bg-transparent p-0 hover:text-white"
          style={{ color: DIM }}
        >
          ↺
        </button>
      )}
    </div>
  );
}
