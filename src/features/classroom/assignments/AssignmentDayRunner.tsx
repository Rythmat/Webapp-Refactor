import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ClassroomRoutes } from '@/constants/routes';
import { InteractionInput } from '../live/interactions';
import { findForbiddenSubstring } from '../publish/publishDay';
import { usePublishedDays } from '../publish/usePublishedDays';
import type {
  Interaction,
  InteractionResponsePayload,
  LocalizedText,
  StudentLanguage,
} from '../types';
import {
  useLocalEnrollmentId,
  useMyAssignmentProgress,
} from './useAssignmentProgress';
import { useAssignments } from './useAssignments';

const LANGUAGE_OPTIONS: { value: StudentLanguage; label: string }[] = [
  { value: 'en', label: 'EN' },
  { value: 'es', label: 'ES' },
  { value: 'both', label: 'EN + ES' },
];

export const AssignmentDayRunner = () => {
  const { classroomId, assignmentId } = useParams<{
    classroomId: string;
    assignmentId: string;
  }>();
  const cid = classroomId ?? '';
  const aid = assignmentId ?? '';
  const navigate = useNavigate();

  const { getAssignment } = useAssignments(cid);
  const { getPublishedDay } = usePublishedDays(cid);
  const enrollmentId = useLocalEnrollmentId();
  const { myProgress, myResponses, setMyProgress, recordMyResponse } =
    useMyAssignmentProgress(aid, enrollmentId, cid);

  const assignment = getAssignment(aid);
  const publishedDay = assignment?.publishedDayId
    ? getPublishedDay(assignment.publishedDayId)
    : undefined;

  const [language, setLanguage] = useState<StudentLanguage>('en');

  const forbidden = useMemo(
    () => (publishedDay ? findForbiddenSubstring(publishedDay.snapshot) : null),
    [publishedDay],
  );

  if (!assignment || !publishedDay || forbidden !== null) {
    return (
      <div className="mx-auto flex w-full max-w-[900px] flex-col gap-4 px-6 py-10">
        <p className="text-sm text-white/60">Assignment not available.</p>
        <button
          type="button"
          onClick={() =>
            navigate(ClassroomRoutes.assignments({ classroomId: cid }))
          }
          className="w-fit rounded-full border border-white/10 px-4 py-2 text-sm text-white/80 hover:border-white/25 hover:text-white"
        >
          Back to Assignments
        </button>
      </div>
    );
  }

  const status = myProgress?.status ?? 'not_started';
  const isDone = status === 'done';

  const handleSubmit =
    (interactionId: string) => (payload: InteractionResponsePayload) => {
      recordMyResponse({ interactionId, payload });
      if (status === 'not_started') {
        void setMyProgress({ status: 'in_progress' }).catch(() => {});
      }
    };

  const handleMarkDone = () => {
    void setMyProgress({ status: 'done' }).catch(() => {});
  };

  const handleReopen = () => {
    void setMyProgress({ status: 'in_progress' }).catch(() => {});
  };

  return (
    <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-6 px-6 py-6 md:gap-8 md:px-10 md:py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Link
          to={ClassroomRoutes.assignments({ classroomId: cid })}
          className="inline-flex items-center gap-2 text-sm text-white/60 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Assignments
        </Link>
        <div className="flex items-center gap-2">
          <SegmentedToggle
            label="Language"
            value={language}
            options={LANGUAGE_OPTIONS}
            onChange={setLanguage}
          />
          {isDone ? (
            <button
              type="button"
              onClick={handleReopen}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm text-white/80 hover:text-white"
            >
              <CheckCircle2 className="h-4 w-4" />
              Done — Reopen
            </button>
          ) : (
            <button
              type="button"
              onClick={handleMarkDone}
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-white/85"
            >
              <CheckCircle2 className="h-4 w-4" />
              Mark Done
            </button>
          )}
        </div>
      </header>

      <div className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-wide text-white/40">
          Assignment
        </span>
        <h1 className="text-2xl font-medium text-white md:text-3xl">
          {assignment.title}
        </h1>
      </div>

      <div className="flex flex-col gap-4 md:gap-5">
        {Object.entries(publishedDay.snapshot.cells).map(([phaseKey, cell]) => (
          <PhaseBlock
            key={phaseKey}
            phaseKey={phaseKey}
            title={cell.presentation.title}
            prompt={cell.presentation.prompt}
            language={language}
            interactions={cell.presentation.interactions ?? []}
            responses={myResponses}
            onSubmit={handleSubmit}
            enrollmentId={enrollmentId}
            assignmentId={aid}
          />
        ))}
      </div>
    </div>
  );
};

interface PhaseBlockProps {
  phaseKey: string;
  title: LocalizedText;
  prompt: LocalizedText;
  language: StudentLanguage;
  interactions: Interaction[];
  responses: Record<string, InteractionResponsePayload>;
  onSubmit: (
    interactionId: string,
  ) => (payload: InteractionResponsePayload) => void;
  enrollmentId: string;
  assignmentId: string;
}

const PhaseBlock = ({
  phaseKey,
  title,
  prompt,
  language,
  interactions,
  responses,
  onSubmit,
  enrollmentId,
  assignmentId,
}: PhaseBlockProps) => (
  <section
    className="flex flex-col gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 md:p-6"
    style={{
      borderLeftColor: `var(--pres-accent-${phaseKey}, transparent)`,
      borderLeftWidth: 4,
    }}
  >
    <div className="flex flex-col gap-1">
      <h2 className="text-lg font-medium text-white md:text-xl">
        <LocalizedRender text={title} language={language} />
      </h2>
      <p className="text-sm text-white/70">
        <LocalizedRender text={prompt} language={language} />
      </p>
    </div>

    {interactions.length > 0 && (
      <div className="flex flex-col gap-3 border-t border-white/[0.06] pt-4">
        {interactions.map((interaction) => (
          <InteractionInput
            key={interaction.id}
            interaction={interaction}
            language={language}
            onSubmit={onSubmit(interaction.id)}
            submittedPayload={responses[interaction.id] ?? null}
            enrollmentId={enrollmentId}
            assignmentId={assignmentId}
          />
        ))}
      </div>
    )}
  </section>
);

const LocalizedRender = ({
  text,
  language,
}: {
  text: LocalizedText;
  language: StudentLanguage;
}) => {
  if (language === 'both') {
    return (
      <>
        <span>{text.en}</span>
        {text.es ? <span className="text-white/60"> · {text.es}</span> : null}
      </>
    );
  }
  if (language === 'es') return <>{text.es ?? text.en}</>;
  return <>{text.en}</>;
};

interface SegmentedToggleProps<T extends string> {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}

const SegmentedToggle = <T extends string>({
  label,
  value,
  options,
  onChange,
}: SegmentedToggleProps<T>) => (
  <div
    role="group"
    aria-label={label}
    className="inline-flex items-center gap-0.5 rounded-full border border-white/10 bg-white/[0.02] p-0.5 text-xs"
  >
    {options.map((option) => {
      const active = option.value === value;
      return (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          aria-pressed={active}
          className={
            'rounded-full px-3 py-1 transition-colors ' +
            (active ? 'bg-white text-black' : 'text-white/60 hover:text-white')
          }
        >
          {option.label}
        </button>
      );
    })}
  </div>
);
