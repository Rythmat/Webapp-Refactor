/**
 * LearningGoalPicker — Google-Classroom-style "Tag learning goals" drawer with
 * two tabs: Skills (our CLO Bank "I can…" objectives) and Standards (official
 * codes on cell.rationale.standards). Appends selections to the cell rationale.
 * Reused by RationaleEditor; the Standards tab is a simple code entry for now
 * (a standard-set catalog lands in Phase 4).
 */
import { Check, Plus, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useCloBank } from '../content/hooks';
import type { Clo } from '../content/types';

export const cloLabel = (clo: Clo): string =>
  clo.type === 'content-language'
    ? clo.statement
    : clo.awarenessOfTechnique ||
      clo.awarenessOfFeeling ||
      clo.awarenessOfContext ||
      clo.id;

interface LearningGoalPickerProps {
  cloRefs: string[];
  standards: string[];
  onAddClo: (id: string) => void;
  onAddStandard: (code: string) => void;
  onClose: () => void;
}

export const LearningGoalPicker = ({
  cloRefs,
  standards,
  onAddClo,
  onAddStandard,
  onClose,
}: LearningGoalPickerProps) => {
  const { clos } = useCloBank();
  const [tab, setTab] = useState<'skills' | 'standards'>('skills');
  const [query, setQuery] = useState('');
  const [stdInput, setStdInput] = useState('');

  // Distinct learning objectives (many activities share identical CLO text).
  const skills = useMemo(() => {
    const seen = new Set<string>();
    const out: Clo[] = [];
    for (const c of clos) {
      if (c.type !== 'learning') continue;
      const label = cloLabel(c);
      if (seen.has(label)) continue;
      seen.add(label);
      out.push(c);
    }
    const q = query.trim().toLowerCase();
    return q ? out.filter((c) => cloLabel(c).toLowerCase().includes(q)) : out;
  }, [clos, query]);

  const addStandard = () => {
    const code = stdInput.trim();
    if (code) onAddStandard(code);
    setStdInput('');
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/50"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-md flex-col gap-3 border-l border-white/10 bg-neutral-950 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider text-white/40">
            Tag learning goals
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-white/50 hover:bg-white/5 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex gap-1 border-b border-white/10 pb-px">
          {(['skills', 'standards'] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`px-3 py-2 text-sm font-medium capitalize transition-colors ${
                tab === t
                  ? 'border-b-2 border-white text-white'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {tab === 'skills' ? (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search skills…"
                className="w-full rounded-full border border-white/10 bg-white/[0.02] px-9 py-2 text-sm text-white placeholder:text-white/40 focus:border-white/25 focus:outline-none"
              />
            </div>
            <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
              {skills.map((c) => {
                const added = cloRefs.includes(c.id);
                return (
                  <li
                    key={c.id}
                    className="flex items-start justify-between gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"
                  >
                    <span className="text-xs text-white/75">{cloLabel(c)}</span>
                    <button
                      type="button"
                      onClick={() => onAddClo(c.id)}
                      disabled={added}
                      className={`inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1 text-xs font-medium ${
                        added
                          ? 'bg-emerald-400/10 text-emerald-300'
                          : 'bg-white text-black hover:bg-white/85'
                      }`}
                    >
                      {added ? (
                        <>
                          <Check className="h-3 w-3" /> Added
                        </>
                      ) : (
                        <>
                          <Plus className="h-3 w-3" /> Add
                        </>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex gap-2">
              <input
                value={stdInput}
                onChange={(e) => setStdInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addStandard()}
                placeholder="MU:Cr1.1"
                className="flex-1 rounded-full border border-white/10 bg-white/[0.02] px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-white/25 focus:outline-none"
              />
              <button
                type="button"
                onClick={addStandard}
                className="rounded-full bg-white px-4 py-2 text-sm font-medium text-black hover:bg-white/85"
              >
                Add
              </button>
            </div>
            <p className="text-xs text-white/40">
              Add National Core Arts Standards codes for this cell. A selectable
              standard-set catalog is coming.
            </p>
            {standards.length > 0 && (
              <ul className="flex flex-wrap gap-2">
                {standards.map((s) => (
                  <li
                    key={s}
                    className="rounded-full border border-white/10 bg-white/[0.02] px-3 py-1 text-xs text-white/70"
                  >
                    {s}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
