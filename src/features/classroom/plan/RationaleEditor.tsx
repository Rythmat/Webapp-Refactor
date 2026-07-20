import { ChevronDown, Lock } from 'lucide-react';
import { useState } from 'react';
import type { CellRationale, LocalizedText } from '../types';

const INITIATION_STYLES = [
  'learn-to-apply',
  'try-it-first',
  'join-the-expert',
  'self-guided',
  'hybrid',
] as const;

const csvToArray = (raw: string): string[] =>
  raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

const arrayToCsv = (arr: string[]): string => arr.join(', ');

interface RationaleEditorProps {
  rationale: CellRationale;
  onChange: (next: CellRationale) => void;
}

/**
 * Collapsible teacher-only rationale editor. Rendered under each phase in
 * DayEditor. Every field lands in `Cell.rationale` and is structurally
 * unreachable from the projected board — Rule 1 firewall test proves this.
 *
 * The panel starts collapsed to keep the DayEditor lean; teachers who want
 * to fill in standards / IMPACT tags / notes expand it per-phase.
 */
export const RationaleEditor = ({
  rationale,
  onChange,
}: RationaleEditorProps) => {
  const [open, setOpen] = useState(false);

  const patch = (patchObj: Partial<CellRationale>) => {
    onChange({ ...rationale, ...patchObj });
  };

  const patchAssessment = (field: 'en' | 'es', value: string) => {
    const current: LocalizedText = rationale.assessment ?? { en: '' };
    const next: LocalizedText = { ...current, [field]: value };
    if (field === 'es' && !value) delete next.es;
    if (field === 'en' && !value && !next.es) {
      patch({ assessment: null });
      return;
    }
    patch({ assessment: next });
  };

  return (
    <section className="rounded-xl border border-white/[0.06] bg-white/[0.02]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-xs text-white/60 hover:text-white"
      >
        <span className="flex items-center gap-2">
          <Lock className="h-3.5 w-3.5" />
          Teacher-only rationale
          <span className="text-white/30">
            (standards, CLOs, IMPACT, notes — never reaches students)
          </span>
        </span>
        <ChevronDown
          className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="flex flex-col gap-3 border-t border-white/[0.06] px-4 py-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <TinyTextArea
              label="Notes (private)"
              value={rationale.notes}
              placeholder="Anything you want to remember about this phase…"
              onChange={(v) => patch({ notes: v })}
            />
            <TinySelectField
              label="Initiation style"
              value={rationale.initiationStyle ?? ''}
              options={['', ...INITIATION_STYLES]}
              onChange={(v) =>
                patch({
                  initiationStyle:
                    v === ''
                      ? undefined
                      : (v as (typeof INITIATION_STYLES)[number]),
                })
              }
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <TinyField
              label="Standards (comma-separated)"
              value={arrayToCsv(rationale.standards)}
              placeholder="MU:Cr1.1, MU:Pr4.2, …"
              onChange={(v) => patch({ standards: csvToArray(v) })}
            />
            <TinyField
              label="Common Anchors"
              value={arrayToCsv(rationale.commonAnchors)}
              placeholder="Anchor Standard 1, …"
              onChange={(v) => patch({ commonAnchors: csvToArray(v) })}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <TinyField
              label="SEL competencies"
              value={arrayToCsv(rationale.selCompetencies)}
              placeholder="Self-Awareness, Relationship Skills, …"
              onChange={(v) => patch({ selCompetencies: csvToArray(v) })}
            />
            <TinyField
              label="IMPACT tags"
              value={arrayToCsv(rationale.impactTags)}
              placeholder="Community, Empowerment, …"
              onChange={(v) => patch({ impactTags: csvToArray(v) })}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <TinyField
              label="CLO refs"
              value={arrayToCsv(rationale.cloRefs)}
              placeholder="clo-learn-rhythmic-entrainment, …"
              onChange={(v) => patch({ cloRefs: csvToArray(v) })}
            />
            <TinyField
              label="Scaffold lane IDs"
              value={arrayToCsv(rationale.scaffoldLaneIds)}
              placeholder="track-all-students, role-ambassador, …"
              onChange={(v) => patch({ scaffoldLaneIds: csvToArray(v) })}
            />
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <TinyField
              label="Assessment (EN)"
              value={rationale.assessment?.en ?? ''}
              placeholder="How you'll check for understanding"
              onChange={(v) => patchAssessment('en', v)}
            />
            <TinyField
              label="Assessment (ES)"
              value={rationale.assessment?.es ?? ''}
              placeholder="Traducción (opcional)"
              onChange={(v) => patchAssessment('es', v)}
            />
          </div>

          <TinyTextArea
            label="Local context (optional)"
            value={rationale.localContext ?? ''}
            placeholder="Denver-specific tie-in, local artist, community example…"
            onChange={(v) => patch({ localContext: v || null })}
          />
        </div>
      )}
    </section>
  );
};

// ============================================================
// Tiny reusable primitives
// ============================================================

const TinyField = ({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
}) => (
  <label className="flex flex-col gap-1">
    <span className="text-[10px] uppercase tracking-wide text-white/40">
      {label}
    </span>
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-white/10 bg-white/[0.02] px-2 py-1 text-xs text-white placeholder:text-white/30 focus:border-white/25 focus:outline-none"
    />
  </label>
);

const TinyTextArea = ({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder?: string;
  onChange: (v: string) => void;
}) => (
  <label className="flex flex-col gap-1">
    <span className="text-[10px] uppercase tracking-wide text-white/40">
      {label}
    </span>
    <textarea
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      rows={2}
      className="w-full resize-y rounded-md border border-white/10 bg-white/[0.02] px-2 py-1 text-xs text-white placeholder:text-white/30 focus:border-white/25 focus:outline-none"
    />
  </label>
);

const TinySelectField = ({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (v: string) => void;
}) => (
  <label className="flex flex-col gap-1">
    <span className="text-[10px] uppercase tracking-wide text-white/40">
      {label}
    </span>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-white/10 bg-[#1a1a1c] px-2 py-1 text-xs text-white focus:border-white/25 focus:outline-none"
    >
      {options.map((option) => (
        <option key={option} value={option}>
          {option === '' ? '(none)' : option}
        </option>
      ))}
    </select>
  </label>
);
