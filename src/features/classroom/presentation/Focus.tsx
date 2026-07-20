import { ArrowLeft } from 'lucide-react';
import { useEffect } from 'react';
import type { StudentPhaseView } from '../buildStudentView';
import type { StudentLanguage } from '../types';
import { LaunchTile } from './LaunchTile';
import { pickLocalized, secondaryLine } from './localized';

interface FocusProps {
  phase: StudentPhaseView;
  language: StudentLanguage;
  onClose: () => void;
}

/**
 * Level 2 — Focus. One phase, full-screen (of the presentation surface),
 * large enough for the back row.
 *
 * Renders the phase's title + prompt at the focus type scale set by the age
 * preset. The Reflect phase adds its reset checklist as tickable boxes whose
 * state is deliberately ephemeral: the check state lives in local component
 * state and evaporates on close.
 *
 * Esc closes Focus and returns to Board (handled by the parent
 * PresentationMode). Focus also renders its own back button for touch users.
 */
export const Focus = ({ phase, language, onClose }: FocusProps) => {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const title = pickLocalized(phase.title, language);
  const prompt = pickLocalized(phase.prompt, language);
  const titleAlt = secondaryLine(phase.title, language);
  const promptAlt = secondaryLine(phase.prompt, language);
  const labelPrimary = pickLocalized(phase.label, language);

  return (
    <div className="mx-auto flex w-full max-w-[1720px] flex-col gap-8 px-8 py-10">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-transparent px-4 py-2 text-sm font-medium text-white/80 transition-colors hover:border-white/25 hover:text-white"
          aria-label="Back to Board"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Board
        </button>
        <span
          className="inline-flex rounded-full bg-white/[0.06] font-semibold uppercase tracking-widest text-white/80"
          style={{
            fontSize: 'var(--pres-label-fz)',
            padding: '0.375rem 1rem',
          }}
        >
          {labelPrimary}
        </span>
      </div>

      <div className="flex flex-col gap-3">
        <h1
          className="font-semibold leading-tight text-white"
          style={{ fontSize: 'var(--pres-focus-title-fz)' }}
        >
          {title}
        </h1>
        {titleAlt && (
          <p
            className="text-white/50"
            style={{ fontSize: 'calc(var(--pres-focus-title-fz) * 0.5)' }}
          >
            {titleAlt}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-3">
        <p
          className="text-white/85"
          style={{ fontSize: 'var(--pres-focus-prompt-fz)', lineHeight: 1.4 }}
        >
          {prompt}
        </p>
        {promptAlt && (
          <p
            className="text-white/50"
            style={{ fontSize: 'calc(var(--pres-focus-prompt-fz) * 0.75)' }}
          >
            {promptAlt}
          </p>
        )}
      </div>

      {phase.launchTiles.length > 0 && (
        <div className="flex flex-wrap gap-3">
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

      {phase.resetChecklist && phase.resetChecklist.length > 0 && (
        <ResetChecklist items={phase.resetChecklist} language={language} />
      )}
    </div>
  );
};

interface ResetChecklistProps {
  items: NonNullable<StudentPhaseView['resetChecklist']>;
  language: StudentLanguage;
}

/**
 * Reset checklist for the Reflect phase. Check state lives here (ephemeral —
 * resets every time Focus mounts) exactly as the brief specifies.
 */
const ResetChecklist = ({ items, language }: ResetChecklistProps) => {
  return (
    <ul className="mt-2 flex flex-col gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6">
      {items.map((item, i) => (
        <ResetChecklistItem key={i} label={pickLocalized(item, language)} />
      ))}
    </ul>
  );
};

const ResetChecklistItem = ({ label }: { label: string }) => {
  return (
    <li>
      <label className="flex cursor-pointer items-center gap-3 text-white/85">
        <input type="checkbox" className="size-5 accent-white" />
        <span style={{ fontSize: 'var(--pres-prompt-fz)' }}>{label}</span>
      </label>
    </li>
  );
};
