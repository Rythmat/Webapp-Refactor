/* eslint-disable react/jsx-sort-props */
import { Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState, type FC } from 'react';
import { Button } from '@/components/ui/button';
import { loadAllFlows } from '@/content/flowStore';
import {
  partFromLessonStep,
  type StepHands,
} from '@/curriculum/engine/parts/convert';
import type { InstrumentPart } from '@/curriculum/engine/parts/part';
import type {
  ActivityFlowV2,
  ActivityStepV2,
} from '@/curriculum/types/activity.v2';

const SECTION_NAME: Record<string, string> = {
  A: 'Melody',
  B: 'Chords',
  C: 'Bass',
  D: 'Play-Along',
};

const noteCount = (step: ActivityStepV2) =>
  Math.max(
    step.targetNotes?.length ?? 0,
    ...(step.variants ?? []).map((v) => v.targetNotes.length),
  );

const hasHand = (step: ActivityStepV2, hand: 'lh' | 'rh') =>
  (step.targetNotes ?? []).some((n) => (n.hand ?? 'rh') === hand);

/**
 * Any written step of any genre lesson, as the starting point for a part:
 * both hands, or one — a Bass-section left hand becomes a bass line. Only
 * steps with authored notes are listed; generated scales and play-alongs have
 * nothing to copy.
 */
export const LessonStepPicker: FC<{
  makeId: (name: string) => string;
  onPick: (part: InstrumentPart) => void;
}> = ({ makeId, onPick }) => {
  const [flows, setFlows] = useState<ActivityFlowV2[] | null>(null);
  const [genre, setGenre] = useState('');
  const [level, setLevel] = useState(1);
  const [section, setSection] = useState('');

  useEffect(() => {
    void loadAllFlows().then((byGenre) => {
      const all = [...byGenre.values()]
        .flat()
        .filter(
          (f): f is ActivityFlowV2 => (f as ActivityFlowV2).version === 'v2',
        )
        .filter((f) =>
          f.sections.some((s) => s.steps.some((st) => noteCount(st) > 0)),
        );
      setFlows(all);
      if (all[0]) {
        setGenre(all[0].genre);
        setLevel(all[0].level);
      }
    });
  }, []);

  const genres = useMemo(
    () => [...new Set((flows ?? []).map((f) => f.genre))].sort(),
    [flows],
  );
  const levels = (flows ?? [])
    .filter((f) => f.genre === genre)
    .map((f) => f.level)
    .sort();
  const flow = flows?.find((f) => f.genre === genre && f.level === level);
  const steps = (flow?.sections ?? [])
    .filter((s) => !section || s.id === section)
    .flatMap((s) => s.steps.filter((st) => noteCount(st) > 0));

  if (!flows) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading lessons…
      </div>
    );
  }

  const take = (step: ActivityStepV2, hands: StepHands, variant?: number) => {
    if (!flow) return;
    const draft = partFromLessonStep(flow, step, { id: '', hands, variant });
    if (draft) onPick({ ...draft, id: makeId(draft.name) });
  };

  const select =
    'rounded-md border border-white/10 bg-white/5 px-2 py-1 text-sm';

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={genre}
          onChange={(e) => {
            setGenre(e.target.value);
            setLevel(flows.find((f) => f.genre === e.target.value)?.level ?? 1);
          }}
          className={select}
          aria-label="Genre"
        >
          {genres.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
        <select
          value={level}
          onChange={(e) => setLevel(Number(e.target.value))}
          className={select}
          aria-label="Level"
        >
          {levels.map((l) => (
            <option key={l} value={l}>
              Level {l}
            </option>
          ))}
        </select>
        <select
          value={section}
          onChange={(e) => setSection(e.target.value)}
          className={select}
          aria-label="Section"
        >
          <option value="">All sections</option>
          {Object.entries(SECTION_NAME).map(([id, name]) => (
            <option key={id} value={id}>
              {id} · {name}
            </option>
          ))}
        </select>
        {flow && (
          <span className="text-xs text-muted-foreground">
            {flow.title} · {flow.params.defaultKey}
          </span>
        )}
      </div>

      <div className="max-h-96 overflow-y-auto rounded-lg border border-white/[0.08]">
        {steps.length === 0 && (
          <p className="p-3 text-sm italic text-muted-foreground">
            No written steps here.
          </p>
        )}
        {steps.map((step, i) => (
          <div
            key={`${step.section}${step.stepNumber}`}
            className={`flex flex-wrap items-center gap-2 px-3 py-2 text-sm ${i ? 'border-t border-white/[0.06]' : ''}`}
          >
            <span className="w-10 shrink-0 tabular-nums text-xs text-white/50">
              {step.section}
              {step.stepNumber}
            </span>
            <span className="min-w-0 flex-1 truncate">
              {step.subsection}
              <span className="ml-2 text-xs text-muted-foreground">
                {noteCount(step)} notes
                {step.chordSymbols?.length
                  ? ` · ${step.chordSymbols.join(' ')}`
                  : ''}
              </span>
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => take(step, 'both')}
            >
              Both hands
            </Button>
            {hasHand(step, 'rh') && hasHand(step, 'lh') && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => take(step, 'rh')}
                >
                  RH
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => take(step, 'lh')}
                >
                  {step.section === 'C' ? 'LH → bass' : 'LH'}
                </Button>
              </>
            )}
            {(step.variants ?? []).map((v, vi) => (
              <Button
                key={v.variantId}
                size="sm"
                variant="ghost"
                onClick={() => take(step, 'both', vi)}
                title={v.description}
              >
                Variant {vi + 1}
              </Button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};
