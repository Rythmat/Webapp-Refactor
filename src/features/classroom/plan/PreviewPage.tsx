/**
 * Preview — the teacher's "student view" smoke-test for a Day they're
 * authoring locally. Runs the current draft Day through `buildStudentView`
 * (the load-bearing firewall selector) and renders each phase the way a
 * student would see it during a live session: student label, title, prompt,
 * launch tiles, and any interactions the teacher has attached, rendered via
 * the real `InteractionInput` components.
 *
 * Submissions are captured in local state only — no server round trip, no
 * localStorage write. The preview is a rendering harness, not a persistence
 * surface.
 */
import { ArrowLeft, Pencil } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { TeacherRoutes } from '@/constants/routes';
import { buildStudentView, type StudentPhaseView } from '../buildStudentView';
import { InteractionInput } from '../live/interactions';
import type {
  AgePreset,
  InteractionResponsePayload,
  LocalizedText,
  StudentLanguage,
  StudentViewConfig,
} from '../types';
import { useLocalPlan } from './useLocalPlan';

const LANGUAGE_OPTIONS: { value: StudentLanguage; label: string }[] = [
  { value: 'en', label: 'EN' },
  { value: 'es', label: 'ES' },
  { value: 'both', label: 'EN + ES' },
];

export const PreviewPage = () => {
  const { classroomId, dayId } = useParams<{
    classroomId: string;
    dayId: string;
  }>();
  const navigate = useNavigate();
  const { getDay } = useLocalPlan();
  const cid = classroomId ?? '';

  const day = dayId ? getDay(dayId) : undefined;

  const [language, setLanguage] = useState<StudentLanguage>('en');
  // Age preset pinned to 'high' (the type-scale baseline); picker removed.
  const agePreset: AgePreset = 'high';
  const [submissions, setSubmissions] = useState<
    Record<string, InteractionResponsePayload>
  >({});

  const view = useMemo(() => {
    if (!day) return null;
    const config: StudentViewConfig = { language, agePreset };
    return buildStudentView(day, config);
  }, [day, language, agePreset]);

  if (!day || !view) {
    return (
      <div className="mx-auto flex w-full max-w-[900px] flex-col gap-4 px-6 py-10">
        <p className="text-sm text-white/60">Day not found in local plan.</p>
        <button
          type="button"
          onClick={() => navigate(TeacherRoutes.plan({ classroomId: cid }))}
          className="w-fit rounded-full border border-white/10 px-4 py-2 text-sm text-white/80 hover:border-white/25 hover:text-white"
        >
          Back to Lessons
        </button>
      </div>
    );
  }

  const handleSubmit =
    (interactionId: string) => (payload: InteractionResponsePayload) => {
      setSubmissions((prev) => ({ ...prev, [interactionId]: payload }));
    };

  return (
    <div className="mx-auto flex w-full max-w-[1000px] flex-col gap-6 px-6 py-6 md:gap-8 md:px-10 md:py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Link
          to={TeacherRoutes.dayEditor({ classroomId: cid, dayId: day.id })}
          className="inline-flex items-center gap-2 text-sm text-white/60 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Editor
        </Link>
        <div className="flex items-center gap-2">
          <SegmentedToggle
            label="Language"
            value={language}
            options={LANGUAGE_OPTIONS}
            onChange={setLanguage}
          />
          <Link
            to={TeacherRoutes.dayEditor({
              classroomId: cid,
              dayId: day.id,
            })}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/70 hover:border-white/25 hover:text-white"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </Link>
        </div>
      </header>

      <div className="flex flex-col gap-1">
        <span className="text-xs uppercase tracking-wide text-white/40">
          Student preview
        </span>
        <h1 className="text-2xl font-medium text-white md:text-3xl">
          {day.label || 'Untitled Day'}
        </h1>
        <p className="text-xs text-white/40">
          Responses below are local to this preview — nothing is persisted. Use
          this to smoke-test how a student device will render the Day you're
          authoring.
        </p>
      </div>

      <div className="flex flex-col gap-4 md:gap-5">
        {view.phases.map((phase) => (
          <PhasePreview
            key={phase.phaseKey}
            phase={phase}
            language={language}
            submissions={submissions}
            onSubmit={handleSubmit}
          />
        ))}
      </div>
    </div>
  );
};

interface PhasePreviewProps {
  phase: StudentPhaseView;
  language: StudentLanguage;
  submissions: Record<string, InteractionResponsePayload>;
  onSubmit: (
    interactionId: string,
  ) => (payload: InteractionResponsePayload) => void;
}

const PhasePreview = ({
  phase,
  language,
  submissions,
  onSubmit,
}: PhasePreviewProps) => {
  const interactions = phase.interactions ?? [];

  return (
    <section
      aria-label={phase.label.en}
      className="flex flex-col gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 md:p-6"
    >
      <header className="flex items-baseline gap-3">
        <span
          className="inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-widest text-black"
          style={{
            background: `var(--pres-accent-${phase.phaseKey}, rgba(255,255,255,0.15))`,
          }}
        >
          <LocalizedRender text={phase.label} language={language} />
        </span>
      </header>

      <div className="flex flex-col gap-1">
        <h2 className="text-lg font-medium text-white md:text-xl">
          <LocalizedRender text={phase.title} language={language} />
        </h2>
        <p className="text-sm text-white/70">
          <LocalizedRender text={phase.prompt} language={language} />
        </p>
      </div>

      {phase.launchTiles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {phase.launchTiles.map((tile) => (
            <span
              key={tile.id}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 px-3 py-1 text-xs text-white/70"
            >
              <span className="uppercase tracking-wide text-white/40">
                {tile.module}
              </span>
              {tile.label ? (
                <LocalizedRender text={tile.label} language={language} />
              ) : (
                <span className="text-white/70">{tile.activityRef}</span>
              )}
            </span>
          ))}
        </div>
      )}

      {phase.resetChecklist && phase.resetChecklist.length > 0 && (
        <ul className="flex flex-col gap-1.5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
          {phase.resetChecklist.map((item, i) => (
            <li key={i} className="text-sm text-white/75">
              <span aria-hidden className="mr-2 text-white/40">
                ▢
              </span>
              <LocalizedRender text={item} language={language} />
            </li>
          ))}
        </ul>
      )}

      {interactions.length > 0 ? (
        <div className="flex flex-col gap-3 border-t border-white/[0.06] pt-4">
          {interactions.map((interaction) => (
            <InteractionInput
              key={interaction.id}
              interaction={interaction}
              language={language}
              onSubmit={onSubmit(interaction.id)}
              submittedPayload={submissions[interaction.id] ?? null}
            />
          ))}
        </div>
      ) : (
        <p className="border-t border-white/[0.06] pt-4 text-xs text-white/40">
          No interactions on this phase yet — add one in the editor to preview
          it here.
        </p>
      )}
    </section>
  );
};

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
