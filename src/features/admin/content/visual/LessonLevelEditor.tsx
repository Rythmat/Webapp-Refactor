/* eslint-disable react/jsx-sort-props */
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Copy,
  Plus,
  Trash2,
} from 'lucide-react';
import { useState, type FC } from 'react';
import { SCALES } from '@/curriculum/engine/genreGeneration/scaleRegistry';
import type { ActivitySectionId } from '@/curriculum/types/activity';
import type { ActivityStepV2 } from '@/curriculum/types/activity.v2';
import {
  DetailCell,
  InlineNumber,
  InlineSelect,
  InlineTagList,
  InlineText,
} from './Editable';
import { IconButton } from './EditableChordChart';
import { StepEditor } from './StepEditor';
import { PRESET_BY_ID, presetForStep } from './activityPresets';

/**
 * One level of a lesson: its parameters, its sections, and the steps inside
 * them.
 *
 * Sections are tabs rather than a list because that is how the student meets
 * them — the lesson player shows A/B/C/D across the top and the steps of one
 * section underneath. Section ids are limited to those four letters by the
 * content schema, so "add section" offers the next free letter and goes away
 * once all four exist.
 */

export interface LessonSection {
  id: ActivitySectionId;
  name: string;
  steps: ActivityStepV2[];
}

export interface LessonFlowBody {
  id: string;
  genre: string;
  level: number;
  title: string;
  version?: 'v2';
  params: {
    defaultKey: string;
    tempoRange: [number, number];
    swing: number;
    grooves: string[];
    defaultScale?: number[];
    defaultScaleId?: string;
  };
  sections: LessonSection[];
}

const SECTION_IDS: ActivitySectionId[] = ['A', 'B', 'C', 'D'];

const DEFAULT_SECTION_NAMES: Record<ActivitySectionId, string> = {
  A: 'Melody',
  B: 'Chords',
  C: 'Bass',
  D: 'Play-Along',
};

const SCALE_OPTIONS = Object.keys(SCALES).sort();

/** Step numbers are positional, so any structural edit renumbers the section. */
const renumber = (steps: ActivityStepV2[]): ActivityStepV2[] =>
  steps.map((step, index) => ({ ...step, stepNumber: index + 1 }));

const newStep = (
  flow: LessonFlowBody,
  section: LessonSection,
  index: number,
): ActivityStepV2 => ({
  stepNumber: index + 1,
  module: section.name,
  section: section.id,
  subsection: 'Listen & Learn',
  activity: `New ${section.name.toLowerCase()} step`,
  direction: '',
  assessment: null,
  // The progress store keys off tag, so a duplicate would silently share
  // completion state between two steps.
  tag: `${flow.genre.replace(/\s+/g, '_')}_l${flow.level}_${section.id.toLowerCase()}${index + 1}`,
  styleRef: '',
  successFeedback: 'Nice work!',
});

export const LessonLevelEditor: FC<{
  flow: LessonFlowBody;
  onChange: (flow: LessonFlowBody) => void;
}> = ({ flow, onChange }) => {
  const sections = flow.sections ?? [];
  const [activeId, setActiveId] = useState<ActivitySectionId>(
    sections[0]?.id ?? 'A',
  );
  const [expanded, setExpanded] = useState<number | null>(0);

  const active =
    sections.find((section) => section.id === activeId) ?? sections[0];
  const activeIndex = sections.indexOf(active);

  const patch = (next: Partial<LessonFlowBody>) =>
    onChange({ ...flow, ...next });
  const patchParams = (next: Partial<LessonFlowBody['params']>) =>
    patch({ params: { ...flow.params, ...next } });

  const patchSection = (next: Partial<LessonSection>) =>
    patch({
      sections: sections.map((section, i) =>
        i === activeIndex ? { ...section, ...next } : section,
      ),
    });

  const patchSteps = (map: (steps: ActivityStepV2[]) => ActivityStepV2[]) =>
    patchSection({ steps: renumber(map(active.steps ?? [])) });

  const freeSectionId = SECTION_IDS.find(
    (id) => !sections.some((section) => section.id === id),
  );

  const addSection = () => {
    if (!freeSectionId) return;
    const section: LessonSection = {
      id: freeSectionId,
      name: DEFAULT_SECTION_NAMES[freeSectionId],
      steps: [],
    };
    patch({
      // Keep A/B/C/D order regardless of the order they were added in.
      sections: [...sections, section].sort(
        (a, b) => SECTION_IDS.indexOf(a.id) - SECTION_IDS.indexOf(b.id),
      ),
    });
    setActiveId(freeSectionId);
    setExpanded(null);
  };

  const moveStep = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= active.steps.length) return;
    patchSteps((steps) => {
      const next = [...steps];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
    setExpanded((current) => (current === index ? target : current));
  };

  return (
    <div className="flex flex-col gap-5">
      {/* ── Level parameters ── */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 md:grid-cols-4">
        <DetailCell label="Lesson title" className="col-span-2">
          <InlineText
            value={flow.title}
            onChange={(value) => patch({ title: value })}
            placeholder="Funk Foundations"
            ariaLabel="Lesson title"
            className="text-base font-medium text-white"
          />
        </DetailCell>
        <DetailCell label="Default key">
          <InlineText
            value={flow.params?.defaultKey}
            onChange={(value) => patchParams({ defaultKey: value })}
            placeholder="C"
            ariaLabel="Default key"
          />
        </DetailCell>
        <DetailCell label="Default scale">
          <InlineSelect
            value={flow.params?.defaultScaleId ?? ''}
            onChange={(value) =>
              patchParams({
                defaultScaleId: value,
                defaultScale: SCALES[value],
              })
            }
            options={SCALE_OPTIONS}
            placeholder="Select…"
            ariaLabel="Default scale"
            className="text-sm"
          />
        </DetailCell>
        <DetailCell label="Tempo range (BPM)">
          <span className="inline-flex items-center gap-1">
            <InlineNumber
              value={flow.params?.tempoRange?.[0]}
              onChange={(value) =>
                patchParams({
                  tempoRange: [
                    value ?? 80,
                    flow.params?.tempoRange?.[1] ?? 110,
                  ],
                })
              }
              min={20}
              max={300}
              ariaLabel="Minimum tempo"
            />
            <span className="text-white/25">–</span>
            <InlineNumber
              value={flow.params?.tempoRange?.[1]}
              onChange={(value) =>
                patchParams({
                  tempoRange: [
                    flow.params?.tempoRange?.[0] ?? 80,
                    value ?? 110,
                  ],
                })
              }
              min={20}
              max={300}
              ariaLabel="Maximum tempo"
            />
          </span>
        </DetailCell>
        <DetailCell label="Swing (0–1)">
          <InlineNumber
            value={flow.params?.swing}
            onChange={(value) => patchParams({ swing: value ?? 0 })}
            min={0}
            max={1}
            step={0.05}
            ariaLabel="Swing"
          />
        </DetailCell>
        <DetailCell label="Grooves" className="col-span-2">
          <InlineTagList
            values={flow.params?.grooves ?? []}
            onChange={(values) => patchParams({ grooves: values })}
            addLabel="Groove"
            ariaLabel="Grooves"
          />
        </DetailCell>
      </div>

      {/* ── Section tabs, as the lesson player shows them ── */}
      <div className="flex flex-wrap items-center gap-2">
        {sections.map((section) => {
          const isActive = section.id === active?.id;
          return (
            <button
              key={section.id}
              type="button"
              className={`rounded-lg border px-3.5 py-1.5 text-sm transition-colors ${
                isActive
                  ? 'border-2 border-[#4a9eff] bg-[#1a3a5c] font-semibold text-[#4a9eff]'
                  : 'border-white/20 bg-white/[0.03] text-white/60 hover:text-white'
              }`}
              onClick={() => {
                setActiveId(section.id);
                setExpanded(null);
              }}
            >
              {section.id} {section.name}
              <span className="ml-1.5 text-xs opacity-60">
                {section.steps?.length ?? 0}
              </span>
            </button>
          );
        })}

        {freeSectionId && (
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-lg border border-dashed border-white/20 px-3 py-1.5 text-sm text-white/40 transition-colors hover:border-white/40 hover:text-white"
            onClick={addSection}
          >
            <Plus className="size-3.5" />
            Section {freeSectionId}
          </button>
        )}
      </div>

      {!active ? (
        <p className="rounded-xl border border-dashed border-white/10 p-8 text-center text-sm text-white/30">
          This level has no sections yet. Add section A to start.
        </p>
      ) : (
        <>
          {/* ── Active section ── */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs uppercase tracking-wide text-white/30">
              Section {active.id}
            </span>
            <InlineText
              value={active.name}
              onChange={(value) => patchSection({ name: value })}
              placeholder="Section name"
              ariaLabel={`Section ${active.id} name`}
              className="text-lg font-medium text-white"
            />
            <span className="ml-auto">
              <IconButton
                label={`Delete section ${active.id}`}
                danger
                onClick={() => {
                  patch({
                    sections: sections.filter((s) => s.id !== active.id),
                  });
                  setActiveId(
                    sections.find((s) => s.id !== active.id)?.id ?? 'A',
                  );
                  setExpanded(null);
                }}
              >
                <Trash2 className="size-4" />
              </IconButton>
            </span>
          </div>

          {/* ── Steps ── */}
          <div className="flex flex-col gap-2">
            {(active.steps ?? []).map((step, index) => {
              const isOpen = expanded === index;
              const preset = PRESET_BY_ID[presetForStep(step)];
              return (
                <div
                  key={index}
                  className="overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02]"
                >
                  <div className="flex items-center gap-3 px-3 py-2">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      className="flex min-w-0 flex-1 items-center gap-3 text-left"
                      onClick={() => setExpanded(isOpen ? null : index)}
                    >
                      {isOpen ? (
                        <ChevronDown className="size-4 shrink-0 text-white/40" />
                      ) : (
                        <ChevronRight className="size-4 shrink-0 text-white/40" />
                      )}
                      <span className="w-6 shrink-0 text-xs tabular-nums text-white/30">
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-sm text-white/85">
                        {step.activity || 'Untitled step'}
                      </span>
                      <span className="shrink-0 rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-white/45">
                        {preset.label}
                      </span>
                    </button>

                    <div className="flex shrink-0 items-center gap-0.5">
                      <IconButton
                        label={`Move step ${index + 1} up`}
                        disabled={index === 0}
                        onClick={() => moveStep(index, -1)}
                      >
                        <ChevronUp className="size-3.5" />
                      </IconButton>
                      <IconButton
                        label={`Move step ${index + 1} down`}
                        disabled={index === active.steps.length - 1}
                        onClick={() => moveStep(index, 1)}
                      >
                        <ChevronDown className="size-3.5" />
                      </IconButton>
                      <IconButton
                        label={`Duplicate step ${index + 1}`}
                        onClick={() =>
                          patchSteps((steps) => [
                            ...steps.slice(0, index + 1),
                            {
                              ...structuredClone(step),
                              tag: `${step.tag}_copy`,
                            },
                            ...steps.slice(index + 1),
                          ])
                        }
                      >
                        <Copy className="size-3.5" />
                      </IconButton>
                      <IconButton
                        label={`Delete step ${index + 1}`}
                        danger
                        onClick={() => {
                          patchSteps((steps) =>
                            steps.filter((_, i) => i !== index),
                          );
                          setExpanded(null);
                        }}
                      >
                        <Trash2 className="size-3.5" />
                      </IconButton>
                    </div>
                  </div>

                  {isOpen && (
                    <StepEditor
                      step={step}
                      onChange={(next) =>
                        patchSteps((steps) =>
                          steps.map((s, i) => (i === index ? next : s)),
                        )
                      }
                    />
                  )}
                </div>
              );
            })}

            <button
              type="button"
              className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/15 py-3 text-sm text-white/40 transition-colors hover:border-white/40 hover:bg-white/[0.03] hover:text-white"
              onClick={() => {
                const index = active.steps?.length ?? 0;
                patchSteps((steps) => [...steps, newStep(flow, active, index)]);
                setExpanded(index);
              }}
            >
              <Plus className="size-4" />
              Add step to section {active.id}
            </button>
          </div>
        </>
      )}
    </div>
  );
};
