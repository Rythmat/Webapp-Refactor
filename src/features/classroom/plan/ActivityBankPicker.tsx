/**
 * ActivityBankPicker — the Studio's side sheet, to insert a canonical activity
 * into the selected slide's phase. Filters the Activity Bank by phase,
 * searchable.
 * Inserting routes through `insertActivityIntoCell` (actionable text →
 * presentation, structured pedagogy → rationale).
 */
import { Check, Plus, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { MicroLabel, microLabel } from '@/components/kit';
import { Button } from '@/daw/ui/Button';
import { Sheet } from '@/daw/ui/DawDialog';
import { OFFICE_CARD } from '@/features/office/ui/styles';
import { useActivityBank } from '../content/hooks';
import type { Activity } from '../content/types';
import { usePersonalContent } from '../content/usePersonalContent';
import type { PhaseKey } from '../phases';
import { phaseSectionsLabel } from '../slides/sections';

/** A text field in the Studio's look. */
const FIELD =
  'h-9 w-full rounded-full border border-daw-outline bg-transparent text-[0.875rem] text-daw-text placeholder:text-daw-text-3 focus:border-white/40 focus:outline-none';

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
    addActivity(
      newPersonalActivity(phase, draftTitle.trim(), draftDesc.trim()),
    );
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
    <Sheet
      open
      onOpenChange={(open) => !open && onClose()}
      title="Activity Bank"
      description={`${phaseSectionsLabel(phase).en} activities`}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-3">
        <div className="relative">
          <Search
            aria-hidden
            className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-daw-text-3"
          />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search activities…"
            aria-label="Search activities"
            className={`${FIELD} px-9`}
          />
        </div>

        {authoring ? (
          <div className={`${OFFICE_CARD} flex flex-col gap-2 p-3`}>
            <input
              value={draftTitle}
              onChange={(e) => setDraftTitle(e.target.value)}
              placeholder="Activity title"
              aria-label="Activity title"
              className={`${FIELD} px-3`}
            />
            <textarea
              value={draftDesc}
              onChange={(e) => setDraftDesc(e.target.value)}
              placeholder="What students do…"
              aria-label="What students do"
              rows={2}
              className={`${FIELD} h-auto resize-y rounded-xl px-3 py-2`}
            />
            <div className="flex justify-end gap-2">
              <Button variant="quiet" onClick={() => setAuthoring(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={saveActivity}
                disabled={!draftTitle.trim()}
              >
                Save to my bank
              </Button>
            </div>
          </div>
        ) : (
          <Button
            variant="secondary"
            className="w-fit"
            onClick={() => setAuthoring(true)}
          >
            <Plus aria-hidden />
            Author your own
          </Button>
        )}

        <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
          {filtered.map((a) => {
            const added = justAdded.has(a.id) || addedIds.includes(a.id);
            return (
              <li
                key={a.id}
                className={`${OFFICE_CARD} flex flex-col gap-1.5 p-3`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-0.5">
                    <MicroLabel>
                      {microLabel(
                        a.purpose,
                        a.source === 'personal' && 'Yours',
                      )}
                    </MicroLabel>
                    <span className="text-[0.875rem] font-bold text-daw-text">
                      {a.title.en}
                    </span>
                  </div>
                  <Button
                    variant={added ? 'quiet' : 'primary'}
                    onClick={() => add(a)}
                    disabled={added}
                  >
                    {added ? <Check aria-hidden /> : <Plus aria-hidden />}
                    {added ? 'Added' : 'Add'}
                  </Button>
                </div>
                <p className="line-clamp-2 text-[0.8125rem] text-daw-text-2">
                  {a.description}
                </p>
              </li>
            );
          })}
          {filtered.length === 0 && (
            <li className="rounded-[1.25rem] border border-dashed border-white/10 p-6 text-center text-[0.8125rem] text-daw-text-3">
              No activities match “{query}”.
            </li>
          )}
        </ul>
      </div>
    </Sheet>
  );
};
