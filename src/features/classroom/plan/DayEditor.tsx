import { ArrowLeft, Check, Play } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ClassroomRoutes } from '@/constants/routes';
import {
  PHASE_FULL_NAMES,
  PHASES,
  STUDENT_PHASE_LABELS,
  type PhaseKey,
} from '../phases';
import type { Cell, Day, LocalizedText } from '../types';
import { useLocalPlan } from './useLocalPlan';

const AUTOSAVE_DEBOUNCE_MS = 500;

/**
 * Minimal Day editor — the teacher's authoring surface for a single Day.
 *
 * Scope (v1): edit the Day's label + each of the five Cells' presentation
 * title and prompt in both English and Spanish. Everything else — launch
 * tile picker, rationale block, Reflect checklist editor, per-phase
 * initiation style, standards / CLO tags — is intentionally out of scope
 * for this pass; those layers come once this authoring loop is smooth.
 *
 * Persistence is autosave-on-change with a 500 ms debounce so the plan hits
 * localStorage without a Save button. A "Saved" indicator confirms the write.
 */
export const DayEditor = () => {
  const { classroomId, dayId } = useParams<{
    classroomId: string;
    dayId: string;
  }>();
  const navigate = useNavigate();
  const { getDay, saveDay } = useLocalPlan();
  const cid = classroomId ?? '';

  const [draft, setDraft] = useState<Day | undefined>(() =>
    dayId ? getDay(dayId) : undefined,
  );
  const [savedAt, setSavedAt] = useState<number | null>(null);

  // If the dayId isn't in the plan, kick the user back to the plan list.
  useEffect(() => {
    if (dayId && getDay(dayId) === undefined) {
      navigate(ClassroomRoutes.plan({ classroomId: cid }));
    }
  }, [dayId, getDay, navigate, cid]);

  // Autosave the draft (debounced).
  useEffect(() => {
    if (!draft) return;
    const handle = setTimeout(() => {
      saveDay(draft);
      setSavedAt(Date.now());
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [draft, saveDay]);

  const updateLabel = useCallback((label: string) => {
    setDraft((prev) => (prev ? { ...prev, label } : prev));
  }, []);

  const updateCellField = useCallback(
    (
      phaseKey: PhaseKey,
      field: 'title' | 'prompt',
      language: 'en' | 'es',
      value: string,
    ) => {
      setDraft((prev) => {
        if (!prev) return prev;
        const cell = prev.cells[phaseKey];
        const current = cell.presentation[field];
        const nextField: LocalizedText = { ...current, [language]: value };
        // Drop the `es` key entirely when cleared so the fallback path stays clean.
        if (language === 'es' && !value) delete nextField.es;
        const nextCell: Cell = {
          ...cell,
          presentation: { ...cell.presentation, [field]: nextField },
        };
        return {
          ...prev,
          cells: { ...prev.cells, [phaseKey]: nextCell },
        };
      });
    },
    [],
  );

  const savedLabel = useMemo(() => {
    if (savedAt === null) return null;
    const secondsAgo = Math.max(0, Math.floor((Date.now() - savedAt) / 1000));
    return secondsAgo < 5 ? 'Saved' : 'Saved a moment ago';
  }, [savedAt]);

  if (!draft) {
    return null;
  }

  return (
    <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6 px-6 py-6 md:gap-8 md:px-10 md:py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Link
          to={ClassroomRoutes.plan({ classroomId: cid })}
          className="inline-flex items-center gap-2 text-sm text-white/60 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Plan
        </Link>
        <div className="flex items-center gap-3">
          {savedLabel && (
            <span className="inline-flex items-center gap-1.5 text-xs text-white/50">
              <Check className="h-3.5 w-3.5" />
              {savedLabel}
            </span>
          )}
          <Link
            to={ClassroomRoutes.present({
              classroomId: cid,
              dayId: draft.id,
            })}
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-white/85"
          >
            <Play className="h-4 w-4" />
            Present
          </Link>
        </div>
      </header>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs uppercase tracking-wide text-white/40">
          Day Label
        </span>
        <input
          type="text"
          value={draft.label}
          onChange={(e) => updateLabel(e.target.value)}
          placeholder="e.g. Day 3 — Blues call & response"
          className="w-full rounded-2xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-2xl font-medium text-white placeholder:text-white/30 focus:border-white/25 focus:outline-none md:text-3xl"
        />
      </label>

      <div className="flex flex-col gap-4 md:gap-5">
        {PHASES.map((phaseKey) => (
          <PhaseEditor
            key={phaseKey}
            phaseKey={phaseKey}
            cell={draft.cells[phaseKey]}
            onFieldChange={updateCellField}
          />
        ))}
      </div>
    </div>
  );
};

interface PhaseEditorProps {
  phaseKey: PhaseKey;
  cell: Cell;
  onFieldChange: (
    phaseKey: PhaseKey,
    field: 'title' | 'prompt',
    language: 'en' | 'es',
    value: string,
  ) => void;
}

const PhaseEditor = ({ phaseKey, cell, onFieldChange }: PhaseEditorProps) => {
  const studentLabel = STUDENT_PHASE_LABELS[phaseKey].en;
  const internalLabel = PHASE_FULL_NAMES[phaseKey];

  return (
    <section
      aria-label={internalLabel}
      className="flex flex-col gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 md:p-6"
    >
      <header className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="flex items-baseline gap-3">
          <span
            className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-widest text-black"
            style={{
              background: `var(--pres-accent-${phaseKey}, rgba(255,255,255,0.15))`,
            }}
          >
            {studentLabel}
          </span>
          <span className="text-xs text-white/50">{internalLabel}</span>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:gap-4">
        <LocalizedField
          label="Title (EN)"
          value={cell.presentation.title.en}
          placeholder="What students see at the top of this phase"
          onChange={(v) => onFieldChange(phaseKey, 'title', 'en', v)}
        />
        <LocalizedField
          label="Title (ES)"
          value={cell.presentation.title.es ?? ''}
          placeholder="Translation (optional)"
          onChange={(v) => onFieldChange(phaseKey, 'title', 'es', v)}
        />
        <LocalizedTextArea
          label="Prompt (EN)"
          value={cell.presentation.prompt.en}
          placeholder="Question or instruction for the class"
          onChange={(v) => onFieldChange(phaseKey, 'prompt', 'en', v)}
        />
        <LocalizedTextArea
          label="Prompt (ES)"
          value={cell.presentation.prompt.es ?? ''}
          placeholder="Traducción (opcional)"
          onChange={(v) => onFieldChange(phaseKey, 'prompt', 'es', v)}
        />
      </div>
    </section>
  );
};

interface FieldProps {
  label: string;
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
}

const LocalizedField = ({
  label,
  value,
  placeholder,
  onChange,
}: FieldProps) => (
  <label className="flex flex-col gap-1.5">
    <span className="text-xs uppercase tracking-wide text-white/40">
      {label}
    </span>
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/25 focus:outline-none"
    />
  </label>
);

const LocalizedTextArea = ({
  label,
  value,
  placeholder,
  onChange,
}: FieldProps) => (
  <label className="flex flex-col gap-1.5">
    <span className="text-xs uppercase tracking-wide text-white/40">
      {label}
    </span>
    <textarea
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      rows={3}
      className="w-full resize-y rounded-lg border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white placeholder:text-white/30 focus:border-white/25 focus:outline-none"
    />
  </label>
);
