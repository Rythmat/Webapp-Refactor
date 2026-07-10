import type { StudentDayView, StudentPhaseView } from '../buildStudentView';
import type { PhaseKey } from '../phases';
import type { StudentLanguage } from '../types';
import { LaunchTile } from './LaunchTile';
import { pickLocalized, secondaryLine } from './localized';

interface BoardProps {
  view: StudentDayView;
  currentPhaseKey: PhaseKey;
  onSelectPhase: (phaseKey: PhaseKey) => void;
}

/**
 * Level 1 — the Lesson Board.
 *
 * All five phases visible at once, one card per phase, current phase elevated
 * with a "We're here" marker. Tapping a card opens Focus (Level 2). Tapping a
 * launch tile inside a card opens the Atlas module in a new tab (Level 3).
 *
 * The board is the persistent agenda: a student who drifts can always re-
 * orient because where the class is and where it's going is on the wall
 * the whole period.
 */
export const Board = ({ view, currentPhaseKey, onSelectPhase }: BoardProps) => {
  return (
    <div className="mx-auto grid w-full max-w-[1720px] grid-cols-1 gap-5 px-8 py-10 md:grid-cols-2 lg:grid-cols-5">
      {view.phases.map((phase) => (
        <BoardCard
          key={phase.phaseKey}
          phase={phase}
          isCurrent={phase.phaseKey === currentPhaseKey}
          language={view.language}
          onSelect={() => onSelectPhase(phase.phaseKey)}
        />
      ))}
    </div>
  );
};

interface BoardCardProps {
  phase: StudentPhaseView;
  isCurrent: boolean;
  language: StudentLanguage;
  onSelect: () => void;
}

const BoardCard = ({
  phase,
  isCurrent,
  language,
  onSelect,
}: BoardCardProps) => {
  const title = pickLocalized(phase.title, language);
  const prompt = pickLocalized(phase.prompt, language);
  const titleAlt = secondaryLine(phase.title, language);
  const promptAlt = secondaryLine(phase.prompt, language);
  const labelPrimary = pickLocalized(phase.label, language);

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={isCurrent ? 'step' : undefined}
      aria-label={`Open ${labelPrimary} in focus mode`}
      className={`presentation-card flex flex-col gap-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
        isCurrent ? 'is-current' : ''
      }`}
    >
      <div className="flex items-center justify-between">
        <span
          className="inline-flex rounded-full bg-white/[0.06] font-semibold uppercase tracking-widest text-white/80"
          style={{
            fontSize: 'calc(var(--pres-label-fz) * 0.75)',
            padding: '0.25rem 0.625rem',
          }}
        >
          {labelPrimary}
        </span>
        {isCurrent && (
          <span className="presentation-here" aria-hidden="true">
            We&apos;re here
          </span>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <h3
          className="font-semibold leading-tight"
          style={{ fontSize: 'var(--pres-title-fz)' }}
        >
          {title}
        </h3>
        {titleAlt && (
          <p
            className="text-white/50"
            style={{ fontSize: 'calc(var(--pres-title-fz) * 0.6)' }}
          >
            {titleAlt}
          </p>
        )}
      </div>

      <p
        className="text-white/85"
        style={{ fontSize: 'var(--pres-prompt-fz)' }}
      >
        {prompt}
      </p>
      {promptAlt && (
        <p
          className="text-white/50"
          style={{ fontSize: 'calc(var(--pres-prompt-fz) * 0.85)' }}
        >
          {promptAlt}
        </p>
      )}

      {phase.launchTiles.length > 0 && (
        <div
          className="mt-auto flex flex-wrap gap-2 pt-2"
          onClick={(e) => e.stopPropagation()}
        >
          {phase.launchTiles.map((tile) => (
            <LaunchTile
              key={tile.id}
              tile={tile}
              language={language}
              phaseLabel={labelPrimary}
            />
          ))}
        </div>
      )}
    </button>
  );
};
