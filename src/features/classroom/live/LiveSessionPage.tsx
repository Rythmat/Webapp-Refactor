import { ArrowLeft } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ClassroomRoutes } from '@/constants/routes';
import { usePublishedDays } from '../publish/usePublishedDays';
import type {
  Interaction,
  InteractionResponsePayload,
  LocalizedText,
  StudentLanguage,
} from '../types';
import { LockScreen } from './LockScreen';
import { InteractionInput } from './interactions';
import { useSessionSync } from './useSessionSync';

const LANGUAGE_OPTIONS: { value: StudentLanguage; label: string }[] = [
  { value: 'en', label: 'EN' },
  { value: 'es', label: 'ES' },
  { value: 'both', label: 'EN + ES' },
];

export const LiveSessionPage = () => {
  const { classroomId, sessionId } = useParams<{
    classroomId: string;
    sessionId: string;
  }>();
  const cid = classroomId ?? '';
  const sid = sessionId ?? '';

  const { state, connectionStatus, sendResponse } = useSessionSync(
    sid,
    'student',
  );
  const { getPublishedDay } = usePublishedDays(cid);

  const [language, setLanguage] = useState<StudentLanguage>('en');
  const [submissions, setSubmissions] = useState<
    Record<string, InteractionResponsePayload>
  >({});

  const publishedDay = state?.publishedDayId
    ? getPublishedDay(state.publishedDayId)
    : undefined;

  const currentInteractions: Interaction[] = useMemo(() => {
    if (!state || !publishedDay) return [];
    const cell = publishedDay.snapshot.cells[state.currentPhase];
    return cell?.presentation?.interactions ?? [];
  }, [state, publishedDay]);

  if (!state) {
    return (
      <div className="mx-auto flex w-full max-w-[900px] flex-col gap-4 px-6 py-10 text-white">
        <p className="text-sm text-white/60">Session not found.</p>
        <Link
          to={ClassroomRoutes.home({ classroomId: cid })}
          className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/80 hover:border-white/25 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to classroom
        </Link>
      </div>
    );
  }

  if (state.locked) {
    return (
      <LockScreen
        classroom={{ id: cid, name: 'Classroom' }}
        teacherLabel="your teacher"
      />
    );
  }

  const cell = publishedDay?.snapshot.cells[state.currentPhase];
  const title = cell?.presentation?.title;
  const prompt = cell?.presentation?.prompt;

  const handleSubmit =
    (interactionId: string) => (payload: InteractionResponsePayload) => {
      setSubmissions((prev) => ({ ...prev, [interactionId]: payload }));
      sendResponse(interactionId, payload);
    };

  return (
    <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-6 px-6 py-6 md:gap-8 md:px-10 md:py-10 text-white">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Link
          to={ClassroomRoutes.home({ classroomId: cid })}
          className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to classroom
        </Link>
        <div className="flex items-center gap-2">
          <ConnectionPill status={connectionStatus} />
          <SegmentedToggle
            label="Language"
            value={language}
            options={LANGUAGE_OPTIONS}
            onChange={setLanguage}
          />
        </div>
      </header>

      {state.status === 'ended' && (
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-center text-sm text-white/70">
          Session ended.
        </div>
      )}

      {title && (
        <div className="flex flex-col gap-1">
          <span className="text-xs uppercase tracking-wide text-white/40">
            {state.currentPhase}
          </span>
          <h1 className="text-2xl font-medium md:text-3xl">
            <LocalizedRender text={title} language={language} />
          </h1>
          {prompt && (
            <p className="text-sm text-white/70">
              <LocalizedRender text={prompt} language={language} />
            </p>
          )}
        </div>
      )}

      {currentInteractions.length === 0 ? (
        <p className="text-sm text-white/50">
          No interactions on this phase yet. Follow along with your teacher.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {currentInteractions.map((interaction) => (
            <InteractionInput
              key={interaction.id}
              interaction={interaction}
              language={language}
              onSubmit={handleSubmit(interaction.id)}
              submittedPayload={submissions[interaction.id] ?? null}
              disabled={state.status === 'ended'}
            />
          ))}
        </div>
      )}
    </div>
  );
};

const ConnectionPill = ({ status }: { status: string }) => (
  <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-0.5 text-xs text-white/60">
    <span
      className={
        'h-1.5 w-1.5 rounded-full ' +
        (status === 'connected'
          ? 'bg-emerald-400'
          : status === 'disconnected'
            ? 'bg-white/40'
            : 'bg-amber-400')
      }
    />
    {status}
  </span>
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
