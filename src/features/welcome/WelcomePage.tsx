import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { HomeGlow } from '@/components/ClassroomLayout/home/HomeGlow';
import { Logo } from '@/components/Logo';
import { MicroLabel } from '@/components/kit/MicroLabel';
import { OUTLINE_PILL, WHITE_PILL_LG } from '@/components/kit/pills';
import { CourseCard } from '@/components/learn/explore/CourseCard';
import { GENRE_COURSES } from '@/components/learn/genreCourses';
import {
  PROMPT_FRAME,
  PROMPT_WASH,
} from '@/components/promptBox/PromptBoxParts';
import { cn } from '@/components/utilities';
import { LearnRoutes } from '@/constants/routes';
import { useAuthContext } from '@/contexts/AuthContext';
import { FOCUS_RING, TRANSITION } from '@/daw/ui/styles';
import { getCortexRecords } from '@/features/cortex/ledger';
import { topicTitle } from '@/features/learn/catalog/learnCatalog';
import { useLearnCatalog } from '@/features/learn/catalog/useLearnCatalog';
import { recommend } from '@/features/learn/dashboard/recommend';
import { useGenreReadiness } from '@/features/learn/genreReadiness';
import {
  BIO_INSTRUMENT,
  bioFocusFor,
  genreSlugOf,
  GOAL_LABELS,
  LEVEL_LABELS,
  type LearnGoal,
  type LearnLevel,
  type LearnProfile,
} from '@/features/learn/profile/learnProfile';
import { useLearnProfile } from '@/features/learn/profile/useLearnProfile';
import {
  isLearnChoiceEnabled,
  useInstrumentStore,
  useLearnChoice,
  type LearnChoice,
} from '@/features/learn/useInstrumentStore';
import { useUserBioPreferences } from '@/hooks/useUserBioPreferences';
import { ALL_GENRES } from '@/types/userProfile';

// ── /welcome: what a student wants from Learn ──────────────────────────────
// One question a screen (Skoove, Fender Play): what they play, how much they
// know, what they love, why they're here, how often. Every question can be
// skipped or answered "Not sure yet"; nothing is locked by an answer, and
// `?edit=1` brings it back with their answers to change. The last screen
// shows where their answers point, each with its reason.

const STEPS = ['play', 'level', 'genres', 'goals', 'days', 'plan'] as const;
type Step = (typeof STEPS)[number];
const QUESTIONS = STEPS.length - 1;

const CHOICES: readonly { id: LearnChoice; label: string; icon: string }[] = [
  { id: 'piano', label: 'Keyboard', icon: '/icons/keyboard-icon.svg' },
  { id: 'guitar', label: 'Guitar', icon: '/icons/guitar-icon.svg' },
  { id: 'bass', label: 'Bass', icon: '/icons/bass-icon.svg' },
  { id: 'ukulele', label: 'Ukulele', icon: '/icons/ukulele-icon.svg' },
  { id: 'audio', label: 'Music production', icon: '/icons/audio-icon.svg' },
];

const DAYS: readonly { value: number; label: string; sub: string }[] = [
  { value: 2, label: '1–2 days', sub: 'A light week' },
  { value: 3, label: '3–4 days', sub: 'Steady progress' },
  { value: 5, label: '5 or more', sub: 'Most days' },
];

const SLUGS = GENRE_COURSES.map((course) => course.slug);

const maskStyle = (icon: string) => ({
  maskImage: `url(${icon})`,
  WebkitMaskImage: `url(${icon})`,
  maskSize: 'contain',
  WebkitMaskSize: 'contain',
  maskRepeat: 'no-repeat',
  WebkitMaskRepeat: 'no-repeat',
  maskPosition: 'center',
  WebkitMaskPosition: 'center',
});

/** A large choice: a card that lights when picked. */
function Option({
  on,
  onClick,
  role,
  children,
  className,
}: {
  on: boolean;
  onClick: () => void;
  role: 'radio' | 'checkbox';
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      role={role}
      aria-checked={on}
      onClick={onClick}
      className={cn(
        'relative flex items-center gap-3 rounded-2xl border px-4 py-3.5 text-left',
        TRANSITION,
        FOCUS_RING,
        on
          ? 'border-white/60 bg-white/[0.1] text-white'
          : 'border-white/10 bg-white/[0.03] text-white/80 hover:border-white/25 hover:bg-white/[0.06]',
        className,
      )}
    >
      {children}
      {on && (
        <Check
          aria-hidden
          className="absolute right-3 top-3 size-4 text-white"
          strokeWidth={3}
        />
      )}
    </button>
  );
}

const toggle = <T,>(list: readonly T[], value: T): T[] =>
  list.includes(value) ? list.filter((v) => v !== value) : [...list, value];

/** Where to go after: the page that sent them here, else their dashboard. */
const safeContinue = (raw: string | null) =>
  raw &&
  raw.startsWith('/') &&
  !raw.startsWith('//') &&
  !raw.startsWith('/welcome')
    ? raw
    : LearnRoutes.root();

/** Waits for their earlier answers before asking, so edits start from them. */
export function WelcomePage() {
  const { settled } = useLearnProfile();
  if (!settled) {
    return <div aria-busy="true" className="min-h-screen bg-[#101012]" />;
  }
  return <WelcomeQuestions />;
}

function WelcomeQuestions() {
  const reduced = useReducedMotion() ?? false;
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const editing = params.get('edit') === '1';
  const { profile, save } = useLearnProfile();
  const { appUser } = useAuthContext();
  const bio = useUserBioPreferences(appUser?.id);
  const currentChoice = useLearnChoice();
  const setInstrument = useInstrumentStore((s) => s.setInstrument);
  const chooseAudio = useInstrumentStore((s) => s.chooseAudio);
  const genreReady = useGenreReadiness(true);
  const topics = useLearnCatalog(genreReady);

  const choices = CHOICES.filter((c) => isLearnChoiceEnabled(c.id));
  const asked = params.get('step') as Step | null;
  const [step, setStep] = useState<Step>(
    asked && STEPS.includes(asked) ? asked : 'play',
  );
  const [direction, setDirection] = useState(1);

  // The answers so far, starting from what they told us before.
  const [instruments, setInstruments] = useState<LearnChoice[]>(
    () => profile.instruments ?? (editing ? [currentChoice] : []),
  );
  const [level, setLevel] = useState<LearnLevel | null>(
    () => profile.level ?? null,
  );
  const [genres, setGenres] = useState<string[]>(() => [...bio.genres]);
  const [goals, setGoals] = useState<LearnGoal[]>(() => profile.goals ?? []);
  const [days, setDays] = useState<number | null>(
    () => profile.daysPerWeek ?? null,
  );

  const draft: LearnProfile = useMemo(
    () => ({ instruments, level, goals, daysPerWeek: days }),
    [instruments, level, goals, days],
  );

  const plan = useMemo(() => {
    if (step !== 'plan') return null;
    const recs = recommend({
      topics,
      profile: { ...profile, ...draft },
      fallbackTopic: instruments[0] ?? currentChoice,
      tasteGenres: genres
        .map((g) => genreSlugOf(g, SLUGS))
        .filter((s): s is string => Boolean(s)),
      records: getCortexRecords(),
      nowMs: Date.now(),
    });
    const picks = [
      recs.lead?.course,
      ...recs.shelves.flatMap((shelf) => shelf.courses.slice(0, 1)),
    ].filter((c): c is NonNullable<typeof c> => Boolean(c));
    const reasons = [
      recs.lead?.kind === 'continue' ? 'Where you left off' : 'Start here',
      ...recs.shelves.map((shelf) => shelf.reason),
    ];
    return picks.slice(0, 3).map((course, i) => ({
      course,
      reason: reasons[i],
    }));
  }, [step, topics, profile, draft, instruments, currentChoice, genres]);

  const finish = (answers: LearnProfile) => {
    save({ ...answers, welcomedAt: profile.welcomedAt ?? Date.now() });
    const main = answers.instruments?.[0];
    if (main === 'audio') chooseAudio();
    else if (main) setInstrument(main);
    // The Bio keeps what it knows that Learn doesn't ask about (Vocals, Drums).
    const learnBio = new Set(Object.values(BIO_INSTRUMENT));
    const bioInstruments = [
      ...[...bio.instruments].filter((i) => !learnBio.has(i)),
      ...(answers.instruments ?? [])
        .map((c) => BIO_INSTRUMENT[c])
        .filter((i): i is string => Boolean(i)),
    ];
    const focus = new Set([
      ...[...bio.focus].filter(
        (f) => !['Audio', 'Producing', 'Performing'].includes(f),
      ),
      ...bioFocusFor(answers.instruments ?? [], answers.goals ?? []),
    ]);
    bio.update({
      instruments: [...new Set(bioInstruments)],
      genres,
      focus: [...focus],
    });
    navigate(safeContinue(params.get('continue')), { replace: true });
  };

  const skip = () => {
    // Skipping still counts as asked: they won't be sent here again.
    save({ welcomedAt: profile.welcomedAt ?? Date.now() });
    navigate(safeContinue(params.get('continue')), { replace: true });
  };

  const index = STEPS.indexOf(step);
  const go = (to: number) => {
    setDirection(to > index ? 1 : -1);
    setStep(STEPS[Math.max(0, Math.min(STEPS.length - 1, to))]);
  };

  const question: Record<
    Step,
    { title: string; sub: string; body: ReactNode }
  > = {
    play: {
      title: 'What do you want to learn on?',
      sub: 'Pick as many as you like. The first one you pick is your main one.',
      body: (
        <div
          role="group"
          aria-label="Instruments"
          className="grid grid-cols-2 gap-3 sm:grid-cols-3"
        >
          {choices.map((choice) => {
            const at = instruments.indexOf(choice.id);
            return (
              <Option
                key={choice.id}
                role="checkbox"
                on={at >= 0}
                onClick={() => setInstruments((was) => toggle(was, choice.id))}
                className="flex-col items-start gap-3 py-4"
              >
                <span
                  aria-hidden
                  className="size-9 bg-white"
                  style={maskStyle(choice.icon)}
                />
                <span className="flex flex-col">
                  <span className="text-[1rem] font-bold">{choice.label}</span>
                  <span className="h-4 text-[0.75rem] text-white/50">
                    {at === 0 ? 'Main' : ''}
                  </span>
                </span>
              </Option>
            );
          })}
        </div>
      ),
    },
    level: {
      title: 'How much do you know already?',
      sub: 'This only decides where we suggest you start. Everything stays open.',
      body: (
        <div role="radiogroup" aria-label="Level" className="grid gap-3">
          {(Object.keys(LEVEL_LABELS) as LearnLevel[]).map((id) => (
            <Option
              key={id}
              role="radio"
              on={level === id}
              onClick={() => setLevel(level === id ? null : id)}
            >
              <span className="text-[1rem]">{LEVEL_LABELS[id]}</span>
            </Option>
          ))}
        </div>
      ),
    },
    genres: {
      title: 'What music do you love?',
      sub: 'We’ll suggest courses and songs in these styles.',
      body: (
        <div role="group" aria-label="Styles" className="flex flex-wrap gap-2">
          {ALL_GENRES.map((genre) => {
            const on = genres.includes(genre);
            return (
              <button
                key={genre}
                type="button"
                role="checkbox"
                aria-checked={on}
                onClick={() => setGenres((was) => toggle(was, genre))}
                className={cn(
                  'inline-flex h-10 items-center gap-1.5 rounded-full border px-4 text-[0.9375rem]',
                  TRANSITION,
                  FOCUS_RING,
                  on
                    ? 'border-white/60 bg-white/[0.12] text-white'
                    : 'border-white/10 bg-white/[0.03] text-white/75 hover:bg-white/[0.07] hover:text-white',
                )}
              >
                {on && (
                  <Check aria-hidden className="size-3.5" strokeWidth={3} />
                )}
                {genre}
              </button>
            );
          })}
        </div>
      ),
    },
    goals: {
      title: 'What are you here for?',
      sub: 'Pick any that fit.',
      body: (
        <div
          role="group"
          aria-label="Goals"
          className="grid gap-3 sm:grid-cols-2"
        >
          {(Object.keys(GOAL_LABELS) as LearnGoal[]).map((id) => (
            <Option
              key={id}
              role="checkbox"
              on={goals.includes(id)}
              onClick={() => setGoals((was) => toggle(was, id))}
            >
              <span className="text-[1rem]">{GOAL_LABELS[id]}</span>
            </Option>
          ))}
        </div>
      ),
    },
    days: {
      title: 'How many days a week will you practise?',
      sub: 'Your weekly goal. Missing a day costs nothing.',
      body: (
        <div
          role="radiogroup"
          aria-label="Days a week"
          className="grid gap-3 sm:grid-cols-3"
        >
          {DAYS.map((option) => (
            <Option
              key={option.value}
              role="radio"
              on={days === option.value}
              onClick={() =>
                setDays(days === option.value ? null : option.value)
              }
              className="flex-col items-start gap-1 py-5"
            >
              <span className="text-[1.125rem] font-bold">{option.label}</span>
              <span className="text-[0.8125rem] text-white/55">
                {option.sub}
              </span>
            </Option>
          ))}
        </div>
      ),
    },
    plan: {
      title: editing ? 'Here’s where that points' : 'Your plan is ready',
      sub: [
        instruments.length ? topicTitle(instruments[0]) : null,
        level ? LEVEL_LABELS[level] : null,
        days ? `${days}+ days a week` : null,
      ]
        .filter(Boolean)
        .join(' · '),
      body: (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {(plan ?? []).map(({ course, reason }) => (
            <li key={course.id}>
              <CourseCard course={course} eyebrow={reason} />
            </li>
          ))}
        </ul>
      ),
    },
  };

  const current = question[step];
  const unanswered =
    (step === 'play' && !instruments.length) ||
    (step === 'level' && !level) ||
    (step === 'genres' && !genres.length) ||
    (step === 'goals' && !goals.length) ||
    (step === 'days' && !days);
  const offset = reduced ? 0 : 28;

  return (
    <div className="relative isolate flex min-h-screen w-full flex-col bg-[#101012] text-white">
      <HomeGlow />
      <header className="flex items-center justify-between gap-4 px-5 py-4 md:px-8">
        <Logo className="h-7 w-auto" />
        <ol
          aria-label={`Question ${Math.min(index + 1, QUESTIONS)} of ${QUESTIONS}`}
          className="flex items-center gap-1.5"
        >
          {STEPS.slice(0, QUESTIONS).map((s, i) => (
            <li
              key={s}
              aria-hidden
              className={cn(
                'h-1 w-6 rounded-full transition-colors duration-300 sm:w-10',
                i <= index ? 'bg-white' : 'bg-white/15',
              )}
            />
          ))}
        </ol>
        {editing ? (
          <button
            type="button"
            className={OUTLINE_PILL}
            onClick={() => finish(draft)}
          >
            Save
          </button>
        ) : (
          <button
            type="button"
            onClick={skip}
            className={cn(
              'rounded-full px-3 py-1.5 text-[0.875rem] text-white/60 hover:text-white',
              FOCUS_RING,
            )}
          >
            Skip for now
          </button>
        )}
      </header>

      <main className="flex flex-1 items-start justify-center px-4 pb-8 pt-[2vh] md:pt-[6vh]">
        <div
          className={cn(
            PROMPT_FRAME,
            PROMPT_WASH,
            'w-full max-w-[44rem] overflow-hidden p-6 md:p-8',
          )}
        >
          <AnimatePresence mode="wait" initial={false} custom={direction}>
            <motion.div
              key={step}
              custom={direction}
              initial={{ opacity: 0, x: direction * offset }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -direction * offset }}
              transition={{ duration: reduced ? 0.12 : 0.24, ease: 'easeOut' }}
              className="flex flex-col gap-6"
            >
              <div className="flex flex-col gap-2">
                <MicroLabel>
                  {step === 'plan'
                    ? 'Your plan'
                    : `Question ${index + 1} of ${QUESTIONS}`}
                </MicroLabel>
                <h1 className="text-balance text-[clamp(1.75rem,3.6vw,2.5rem)] leading-[1.08] text-white">
                  {current.title}
                </h1>
                {current.sub && (
                  <p className="text-[0.9375rem] text-white/60">
                    {current.sub}
                  </p>
                )}
              </div>
              {current.body}
            </motion.div>
          </AnimatePresence>

          <footer className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.08] pt-6">
            {index > 0 ? (
              <button
                type="button"
                onClick={() => go(index - 1)}
                className={OUTLINE_PILL}
              >
                <ArrowLeft aria-hidden />
                Back
              </button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-3">
              {step !== 'plan' && unanswered && (
                <button
                  type="button"
                  onClick={() => go(index + 1)}
                  className={cn(
                    'rounded-full px-3 py-1.5 text-[0.875rem] text-white/60 hover:text-white',
                    FOCUS_RING,
                  )}
                >
                  Not sure yet
                </button>
              )}
              {step === 'plan' ? (
                <button
                  type="button"
                  onClick={() => finish(draft)}
                  className={WHITE_PILL_LG}
                >
                  {editing ? 'Save and go' : 'Start learning'}
                  <ArrowRight aria-hidden />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => go(index + 1)}
                  disabled={unanswered}
                  className={cn(
                    WHITE_PILL_LG,
                    'disabled:cursor-not-allowed disabled:opacity-40',
                  )}
                >
                  Continue
                  <ArrowRight aria-hidden />
                </button>
              )}
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}
