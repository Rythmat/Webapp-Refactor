import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PHASES, STUDENT_PHASE_LABELS, type PhaseKey } from '../phases';

export type PhaseNavigatorMode = 'teacher_paced' | 'student_paced';

export interface PhaseNavigatorProps {
  currentPhase: PhaseKey;
  onNavigate: (phase: PhaseKey) => void;
  mode: PhaseNavigatorMode;
}

export const PhaseNavigator = ({
  currentPhase,
  onNavigate,
  mode,
}: PhaseNavigatorProps) => {
  const currentIndex = PHASES.indexOf(currentPhase);
  const outOfSet = currentIndex === -1;
  const prevDisabled = outOfSet || currentIndex === 0;
  const nextDisabled = outOfSet || currentIndex === PHASES.length - 1;

  const isTeacherPaced = mode === 'teacher_paced';

  return (
    <div className="flex items-center gap-2">
      {isTeacherPaced && (
        <button
          type="button"
          onClick={() => !prevDisabled && onNavigate(PHASES[currentIndex - 1])}
          disabled={prevDisabled}
          aria-label="Previous phase"
          className="inline-flex items-center justify-center rounded-full border border-white/10 p-2 text-white/70 transition-colors hover:border-white/25 hover:text-white disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}
      <div className="flex flex-wrap items-center gap-1 rounded-full border border-white/[0.06] bg-white/[0.02] p-1">
        {PHASES.map((phase) => {
          const isCurrent = !outOfSet && phase === currentPhase;
          const label = STUDENT_PHASE_LABELS[phase].en;
          if (isTeacherPaced) {
            return (
              <span
                key={phase}
                className={
                  isCurrent
                    ? 'rounded-full bg-white px-3 py-1 text-sm font-medium text-black'
                    : 'rounded-full px-3 py-1 text-sm text-white/60'
                }
              >
                {label}
              </span>
            );
          }
          return (
            <button
              key={phase}
              type="button"
              onClick={() => onNavigate(phase)}
              className={
                isCurrent
                  ? 'rounded-full bg-white px-3 py-1 text-sm font-medium text-black'
                  : 'rounded-full px-3 py-1 text-sm text-white/70 transition-colors hover:text-white'
              }
            >
              {label}
            </button>
          );
        })}
      </div>
      {isTeacherPaced && (
        <button
          type="button"
          onClick={() => !nextDisabled && onNavigate(PHASES[currentIndex + 1])}
          disabled={nextDisabled}
          aria-label="Next phase"
          className="inline-flex items-center justify-center rounded-full border border-white/10 p-2 text-white/70 transition-colors hover:border-white/25 hover:text-white disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}
    </div>
  );
};
