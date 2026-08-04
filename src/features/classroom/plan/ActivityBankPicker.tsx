/**
 * ActivityBankPicker — a right-side drawer to insert a canonical activity into
 * a phase cell from DayEditor. Filters the Activity Bank by phase, searchable.
 * Inserting routes through `insertActivityIntoCell` (actionable text →
 * presentation, structured pedagogy → rationale).
 */
import { Check, Plus, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useActivityBank } from '../content/hooks';
import type { Activity } from '../content/types';
import { usePersonalContent } from '../content/usePersonalContent';
import { PHASE_FULL_NAMES, type PhaseKey } from '../phases';

const newPersonalActivity = (
  phase: PhaseKey,
  title: string,
  description: string,
): Activity => ({
  id: `act-personal-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
  title: { en: title },
  phase,
  purpose: 'Custom',
  initiationStyle: null,
  description,
  learningOutcome: '',
  assessment: '',
  clos: {},
  standards: [],
  impactValues: [],
  atlasResources: [],
  source: 'personal',
  createdBy: null,
  createdAt: new Date().toISOString(),
  cloIds: [],
});

interface ActivityBankPickerProps {
  phase: PhaseKey;
  addedIds: string[];
  onInsert: (activity: Activity) => void;
  onClose: () => void;
}

export const ActivityBankPicker = ({
  phase,
  addedIds,
  onInsert,
  onClose,
}: ActivityBankPickerProps) => {
  const { activities } = useActivityBank({ phase });
  const { addActivity } = usePersonalContent();
  const [query, setQuery] = useState('');
  const [justAdded, setJustAdded] = useState<Set<string>>(new Set());
  const [authoring, setAuthoring] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftDesc, setDraftDesc] = useState('');

  const saveActivity = () => {
    if (!draftTitle.trim()) return;
    addActivity(newPersonalActivity(phase, draftTitle.trim(), draftDesc.trim()));
    setDraftTitle('');
    setDraftDesc('');
    setAuthoring(false);
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return activities;
    return activities.filter(
      (a) =>
        a.title.en.toLowerCase().includes(q) ||
        a.purpose.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q),
    );
  }, [activities, query]);

  const add = (a: Activity) => {
    onInsert(a);
    setJustAdded((prev) => new Set(prev).add(a.id));
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
          <div className="flex flex-col">
            <span className="text-xs uppercase tracking-wider text-white/40">
              Activity Bank
            </span>
            <span className="text-sm text-white/70">
              {PHASE_FULL_NAMES[phase]}
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-white/50 hover:bg-white/5 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search activities…"
            className="w-full rounded-full border border-white/10 bg-white/[0.02] px-9 py-2 text-sm text-white placeholder:text-white/40 focus:border-white/25 focus:outline-none"
          />
        </div>

        {authoring ? (
          <div className="flex flex-col gap-2 rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <input
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              placeholder="Activity title"
              className="w-full rounded-md border border-white/10 bg-white/[0.02] px-2 py-1 text-sm text-white placeholder:text-white/30 focus:border-white/25 focus:outline-none"
            />
            <textarea
              value={draftDesc}
              onChange={(e) => setDraftDesc(e.target.value)}
              placeholder="What students do…"
              rows={2}
              className="w-full resize-y rounded-md border border-white/10 bg-white/[0.02] px-2 py-1 text-xs text-white placeholder:text-white/30 focus:border-white/25 focus:outline-none"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAuthoring(false)}
                className="rounded-full px-3 py-1 text-xs text-white/60 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveActivity}
                disabled={!draftTitle.trim()}
                className="rounded-full bg-white px-3 py-1 text-xs font-medium text-black hover:bg-white/85 disabled:opacity-40"
              >
                Save to my bank
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setAuthoring(true)}
            className="inline-flex w-fit items-center gap-1.5 rounded-full border border-white/10 px-3 py-1 text-xs text-white/60 hover:border-white/25 hover:text-white"
          >
            <Plus className="h-3 w-3" />
            Author your own
          </button>
        )}

        <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
          {filtered.map((a) => {
            const added = justAdded.has(a.id) || addedIds.includes(a.id);
            return (
              <li
                key={a.id}
                className="flex flex-col gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-0.5">
                    <span className="flex items-center gap-1.5 text-sm font-medium text-white">
                      {a.title.en}
                      {a.source === 'personal' && (
                        <span className="rounded-full border border-white/15 px-1.5 py-0 text-[9px] uppercase tracking-wide text-white/50">
                          Yours
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] uppercase tracking-wide text-white/40">
                      {a.purpose}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => add(a)}
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
                </div>
                <p className="line-clamp-2 text-xs text-white/60">
                  {a.description}
                </p>
              </li>
            );
          })}
          {filtered.length === 0 && (
            <li className="rounded-xl border border-dashed border-white/10 p-6 text-center text-xs text-white/40">
              No activities match “{query}”.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
};
