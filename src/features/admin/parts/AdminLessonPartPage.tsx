import { useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminRoutes } from '@/constants/routes';
import { flowKey } from '@/content/flowStore';
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';
import {
  partFromLessonStep,
  writePartToStep,
  type StepHands,
} from '@/curriculum/engine/parts/convert';
import {
  uniquePartId,
  type InstrumentPart,
} from '@/curriculum/engine/parts/part';
import type { ActivityFlowV2 } from '@/curriculum/types/activity.v2';
import { flowKeyRoot } from '@/curriculum/utils/flowKey';
import {
  useContentItem,
  useContentItems,
  useSaveContentItem,
  type ContentItemDetail,
} from '@/hooks/data/admin/useAdminContent';
import { isContentEditor } from '../consoleRoles';
import { useInstrumentStore } from '../drumGrooves/instrumentStore';
import { PartEditor } from './PartEditor';
import { usePartList } from './partFiles';

/** The body an edit should build on: an editor's queued proposal, else live. */
function workingBody(item: ContentItemDetail, isEditor: boolean) {
  return ((isEditor && item.pendingBody) ||
    item.body) as unknown as ActivityFlowV2;
}

/**
 * A lesson step's notes in the Parts editor — piano roll, the Studio's Score
 * editor, live capture — committed straight back to the lesson. Reads the
 * step from the lesson's content item (what the course editor edits), not the
 * bundled repo data, so the two can't disagree.
 */
export const AdminLessonPartPage = () => {
  const { genre = '', level = '' } = useParams();
  const [search] = useSearchParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { role } = useAuthContext();
  const isEditor = isContentEditor(role);
  const section = search.get('section') ?? '';
  const index = Number(search.get('index') ?? -1);
  const hands = (search.get('hands') ?? 'both') as StepHands;
  const variantParam = search.get('variant');
  const variant = variantParam === null ? undefined : Number(variantParam);

  const slug = flowKey(genre, Number(level));
  const list = useContentItems({ kind: 'activity_flow' });
  const entry = list.data?.items.find((item) => item.slug === slug);
  const detail = useContentItem(entry?.id);
  const save = useSaveContentItem();
  const parts = usePartList();
  const store = useInstrumentStore();

  const located = useMemo(() => {
    if (!detail.data) return null;
    const flow = workingBody(detail.data, isEditor);
    const step = flow.sections?.find((s) => s.id === section)?.steps[index];
    if (!step) return { flow, step: null, part: null };
    const part = partFromLessonStep(flow, step, {
      id: `lesson-${slug}-${section.toLowerCase()}${index + 1}`,
      hands,
      variant,
    });
    return { flow, step, part };
    // Seed once per item version, never on a background refetch mid-edit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [detail.data?.id, section, index, hands, variant]);

  const backHref = AdminRoutes.lessonCourse({ genre }, { level });

  const failed = list.error ?? detail.error;
  if (failed || (list.data && !entry)) {
    return (
      <div className="text-sm text-muted-foreground">
        {failed
          ? `Couldn't load the lesson: ${failed.message}`
          : `No lesson ${slug} in the content store.`}
      </div>
    );
  }
  if (list.isLoading || detail.isLoading || !located) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-[480px] w-full" />
      </div>
    );
  }
  if (!located.step || !located.part) {
    return (
      <div className="text-sm text-muted-foreground">
        {!located.step
          ? `No step ${section}${index + 1} in ${slug}.`
          : 'That step has no written notes for that hand.'}
      </div>
    );
  }

  const { step } = located;
  const handLabel = hands === 'both' ? '' : ` (${hands.toUpperCase()})`;

  const commit = async (edited: InstrumentPart) => {
    // Re-read the lesson so a change made elsewhere since opening isn't lost,
    // and refuse if the step at this position is no longer this step.
    const fresh = (await detail.refetch()).data;
    if (!fresh) throw new Error('Could not reload the lesson.');
    const flow = workingBody(fresh, isEditor);
    const sec = flow.sections.find((s) => s.id === section);
    const current = sec?.steps[index];
    if (
      !sec ||
      !current ||
      current.tag !== step.tag ||
      current.subsection !== step.subsection
    ) {
      throw new Error(
        'This step moved or changed in the lesson since you opened it. Reopen it from the lesson editor and try again.',
      );
    }
    const updated = writePartToStep(edited, current, flowKeyRoot(flow) % 12);
    const body = {
      ...flow,
      sections: flow.sections.map((s) =>
        s.id === section
          ? {
              ...s,
              steps: s.steps.map((st, i) => (i === index ? updated : st)),
            }
          : s,
      ),
    };
    await save.mutateAsync({
      kind: 'activity_flow',
      slug,
      body,
      status: isEditor ? undefined : fresh.status,
    });
    await queryClient.invalidateQueries({ queryKey: ['admin', 'content'] });
    return isEditor
      ? `Submitted to ${located.flow.title} for review — an admin approves it, then Publishing sends it to students.`
      : `Saved to ${located.flow.title}. Publish lessons (Publishing) to send it to students.`;
  };

  return (
    <PartEditor
      key={`${slug}:${section}:${index}:${hands}:${variant ?? ''}`}
      part={located.part}
      lesson={{
        label: `${located.flow.title} · ${section}${index + 1}${handLabel}`,
        backHref,
        onCommit: commit,
      }}
      onDuplicate={async (source) => {
        const id = uniquePartId(source.name, new Set(parts.map((p) => p.id)));
        await store.save('instrument_part', { ...source, id, status: 'draft' });
        navigate(AdminRoutes.part({ id }));
      }}
    />
  );
};
