import type { ActivitySectionId } from '@/curriculum/types/activity';
import { LessonTabStrip } from './LessonTabStrip';
import type { GuitarStepStatus, NavOutlineSection, NavStep } from './types';

// ── A section paged by its exercise groups ─────────────────────────────────
// Theory's navigation (owner, 2026-10-27), for a lesson on guitar's screen
// (guitar and bass) as the keyboard lessons have it: under the section
// pills, a tab row of the section's exercise groups (its steps' subsections,
// numbered), the step line under each tab and its Practice Track last; the
// rail lists every section's steps at once, and there's no ‹ 3 / 20 › pager.

export interface GroupNavStep {
  subsection: string;
  status: GuitarStepStatus;
  title: string;
}

export interface GroupNavSection {
  id: ActivitySectionId;
  name: string;
  done: boolean;
  steps: readonly GroupNavStep[];
}

/** How a step went, after its name on the step line. */
const STATUS_WORDS: Record<GuitarStepStatus, string> = {
  passed: ', passed',
  selfReported: ', counted by you',
  attempted: '',
  todo: '',
};

/** 'A2: Melody' → 'Melody': a group's name without its code. */
export const groupNameOf = (subsection: string) =>
  subsection.replace(/^[A-Z]\d+[a-z]?:\s*/, '');

const groupsIn = (section: GroupNavSection) => [
  ...new Set(section.steps.map((step) => step.subsection)),
];

/** A section's steps for the rail: no codes, under numbered groups. */
function railSteps(section: GroupNavSection): NavStep[] {
  const groups = groupsIn(section);
  return section.steps.map((step) => ({
    code: '',
    title: step.title,
    subsection: `${groups.indexOf(step.subsection) + 1}. ${groupNameOf(step.subsection)}`,
    status: step.status,
  }));
}

/** The rail's outline: every section, its steps under numbered groups. */
export function groupNavOutline(
  sections: readonly GroupNavSection[],
  activeId: ActivitySectionId,
  stepIndex: number,
  openStep: (sectionId: ActivitySectionId, index: number) => void,
): NavOutlineSection[] {
  return sections.map((section) => {
    const active = section.id === activeId;
    return {
      id: section.id,
      name: section.name,
      active,
      done: section.done,
      steps: railSteps(section),
      index: active ? stepIndex : -1,
      onPick: (i: number) => openStep(section.id, i),
    };
  });
}

/** The tab row: the active section's groups, then its Practice Track. */
export function SectionGroupTabs({
  section,
  stepIndex,
  keyColor,
  goToStep,
  onPracticeTrack,
}: {
  section: GroupNavSection;
  stepIndex: number;
  keyColor: string;
  goToStep: (index: number) => void;
  /** Opens the section's Practice Track; null when it has none. */
  onPracticeTrack: (() => void) | null;
}) {
  const groups = groupsIn(section);
  const currentGroup = section.steps[stepIndex]?.subsection;
  return (
    <LessonTabStrip
      label={section.name}
      keyColor={keyColor}
      tabs={[
        ...groups.map((group, g) => ({
          id: group,
          // Just its number on the tab; its name for assistive tech and the
          // tooltip.
          label: String(g + 1),
          name: `${g + 1}. ${groupNameOf(group)}`,
          steps: section.steps.flatMap((step, i) =>
            step.subsection === group
              ? [
                  {
                    status: step.status,
                    current: i === stepIndex,
                    label: `${step.title}${STATUS_WORDS[step.status]}`,
                    onSelect: () => goToStep(i),
                  },
                ]
              : [],
          ),
          active: group === currentGroup,
          onSelect: () => {
            const first = section.steps.findIndex(
              (step) => step.subsection === group,
            );
            if (first >= 0 && group !== currentGroup) goToStep(first);
          },
        })),
        ...(onPracticeTrack
          ? [
              {
                id: 'practice-track',
                label: 'Practice Track',
                active: false,
                onSelect: onPracticeTrack,
              },
            ]
          : []),
      ]}
    />
  );
}
