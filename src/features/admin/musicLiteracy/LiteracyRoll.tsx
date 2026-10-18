import { useLayoutEffect, useMemo, useRef, type FC } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminRoutes } from '@/constants/routes';
import type {
  LiteracyMelodicEchoStep,
  MusicLiteracyLesson,
} from '@/content/musicLiteracy/schemas';
import { uniquePartId } from '@/curriculum/engine/parts/part';
import { useInstrumentStore } from '../drumGrooves/instrumentStore';
import { PartEditor } from '../parts/PartEditor';
import { usePartList } from '../parts/partFiles';
import { ConsoleCallout } from '../ui/ConsoleCallout';
import {
  partFigure,
  partTonic,
  partWords,
  PLACEHOLDER_SYLLABLE,
  SEGMENT_LABEL,
  segmentPart,
  wordsOf,
  type Segment,
} from './literacyPart';

/**
 * A step's words, call or response in the Parts editor — piano roll, the
 * Studio's Score editor, live capture from a MIDI keyboard — committed back
 * into the lesson being edited, the way a lesson step's notes are
 * (AdminLessonPartPage.tsx). The lesson is not saved here: Commit writes
 * the notes into the editor's draft, and the lesson's Save keeps them.
 */

export const LiteracyRoll: FC<{
  lesson: MusicLiteracyLesson;
  /** The step, at `stepIndex`: a melodic echo, the kind the roll edits. */
  step: LiteracyMelodicEchoStep;
  stepIndex: number;
  segment: Segment;
  /** The lesson's editor, without the roll. */
  backHref: string;
  onCommit: (step: LiteracyMelodicEchoStep) => void;
}> = ({ lesson, step, stepIndex, segment, backHref, onCommit }) => {
  const navigate = useNavigate();
  const store = useInstrumentStore();
  const parts = usePartList();
  const id = `literacy-${lesson.id}-${step.tag}-${segment}`;
  // Seeded once per step and segment: an edit here stays the roll's own,
  // and comes back from the 1 it went out from.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const part = useMemo(() => segmentPart(lesson, step, segment, id), [id]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const tonic = useMemo(() => partTonic(lesson, step), [id]);
  const what = `step ${stepIndex + 1}’s ${SEGMENT_LABEL[segment].toLowerCase()}`;
  // Opened from a step far down the lesson: start at the roll's top.
  const top = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => top.current?.scrollIntoView({ block: 'start' }), []);

  const commit = async (
    edited: Parameters<typeof partFigure>[0],
  ): Promise<string> => {
    let note = '';
    let next: LiteracyMelodicEchoStep;
    if (segment === 'words') {
      const back = partWords(edited, lesson, wordsOf(step), tonic);
      next = { ...step, words: back.words };
      if (back.added)
        note += ` ${back.added} new note${back.added === 1 ? '' : 's'} sing${back.added === 1 ? 's' : ''} “${PLACEHOLDER_SYLLABLE}” until you retype the line.`;
      if (back.dropped.length)
        note += ` The roll has fewer notes than the line, so “${back.dropped.join(' ')}” ${back.dropped.length === 1 ? 'was' : 'were'} left out.`;
    } else if (segment === 'call') {
      next = { ...step, call: partFigure(edited, lesson, tonic) };
    } else {
      next = { ...step, response: partFigure(edited, lesson, tonic) };
    }
    onCommit(next);
    return `Written into ${what}.${note} Go back to the lesson and Save to keep it.`;
  };

  return (
    <div ref={top} className="flex scroll-mt-8 flex-col gap-3">
      <ConsoleCallout tone="info">
        {SEGMENT_LABEL[segment]} of step {stepIndex + 1}, “{step.title}”, in{' '}
        {lesson.key.tonic} {lesson.key.mode}. Commit brings the notes and the
        loop length back to the step as degrees of the key; the filing fields,
        tempo and key here are the roll’s own and are not kept.
        {segment === 'words' && ' The syllables go onto the notes in order.'}
        {segment === 'words' &&
          (step.words?.pickup ?? 0) > 0 &&
          ' The roll’s first bar is the pickup bar, the end of the count-in, so the words’ bar 1 is its bar 2.'}
      </ConsoleCallout>
      <PartEditor
        key={id}
        part={part}
        lesson={{
          label: `${lesson.name} · Step ${stepIndex + 1} ${SEGMENT_LABEL[segment].toLowerCase()}`,
          backHref,
          askOnBack: true,
          onCommit: commit,
        }}
        onDuplicate={async (source) => {
          const partId = uniquePartId(
            source.name,
            new Set(parts.map((p) => p.id)),
          );
          await store.save('instrument_part', {
            ...source,
            id: partId,
            status: 'draft',
          });
          navigate(AdminRoutes.part({ id: partId }));
        }}
      />
    </div>
  );
};
