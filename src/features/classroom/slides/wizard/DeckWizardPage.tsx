import {
  ArrowLeft,
  CalendarDays,
  Check,
  Music,
  Radio,
  Save,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { TeacherRoutes } from '@/constants/routes';
import {
  CURRICULUM_GENRE_SLUGS,
  type CurriculumGenreId,
} from '@/curriculum/bridge/genreIdMap';
import { getModesForGenreLevel } from '@/curriculum/bridge/learnCurriculumLinks';
import { getActivityFlow } from '@/curriculum/data/activityFlows';
import { getGenreProfile } from '@/curriculum/data/genreProfiles';
import { getSong } from '@/curriculum/data/songs';
import type { ActivityFlow } from '@/curriculum/types/activity';
import type { GCMKey, CurriculumLevelId } from '@/curriculum/types/curriculum';
import type { Song } from '@/curriculum/types/songLibrary';
import { useStartClassroomSession } from '../../live/useStartClassroomSession';
import { useLocalPlan } from '../../plan/useLocalPlan';
import { usePublishedDays } from '../../publish/usePublishedDays';
import type { Day } from '../../types';
import { enrichDayWithSongSessionDeck } from '../templates/fromPlannedDay';
import {
  DEFAULT_GENRE_LESSON_PARAMS,
  buildGenreLessonDay,
} from '../templates/genreLesson';
import {
  buildSongSessionDay,
  DEFAULT_SONG_SESSION_PARAMS,
  type SongSessionParams,
} from '../templates/songSession';
import { DeckPreview } from './DeckPreview';
import { GenreLevelPicker } from './GenreLevelPicker';
import { PollTextEditor } from './PollTextEditor';
import { SongPickerDialog } from './SongPickerDialog';

const STEPS = ['Template', 'Content', 'Questions', 'Go Live'] as const;

type DeckSource = 'song' | 'plannedDay' | 'genre';

const genreOf = (gcmKey: GCMKey): CurriculumGenreId =>
  gcmKey.slice(0, gcmKey.lastIndexOf(':')) as CurriculumGenreId;

/** Find the song id planned into a Day. Prefers the structured
 *  `presentation.song` reference the annual-plan materializer now writes;
 *  falls back to scraping a legacy `/songs/<id>` slug from the prompts of Days
 *  materialized before that field existed. */
const songIdFromDay = (day: Day): string | null => {
  for (const cell of Object.values(day.cells)) {
    const id = cell.presentation.song?.id;
    if (id) return id;
  }
  const serialized = JSON.stringify(day.cells);
  const match = /\/songs\/([A-Za-z0-9_-]+)/.exec(serialized);
  return match ? match[1] : null;
};

/**
 * Template-first deck setup: pick the template → pick content (today's
 * planned Day or a song) → tweak the poll texts → preview → Go Live. The
 * generated Day flows through the EXACT same path as PlanPage's "Start
 * session": saveDay → publish → startSession → teacher dashboard. It also
 * lands in Plan Days, editable later like any other Day.
 */
export const DeckWizardPage = () => {
  const { classroomId } = useParams<{ classroomId: string }>();
  const cid = classroomId ?? '';
  const navigate = useNavigate();

  const { listDays, saveDay } = useLocalPlan();
  const { publishDayToClassroom } = usePublishedDays(cid);
  const startClassroomSession = useStartClassroomSession();

  const [step, setStep] = useState(0);
  const [source, setSource] = useState<DeckSource>('song');
  const [song, setSong] = useState<Song | null>(null);
  const [plannedDayId, setPlannedDayId] = useState<string | null>(null);
  const [params, setParams] = useState<SongSessionParams>(
    DEFAULT_SONG_SESSION_PARAMS,
  );
  const [pickerOpen, setPickerOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  // Genre-lesson source state. The ActivityFlow fetch is async, so it's loaded
  // into state on pick — keeping `builtDay` a synchronous memo.
  const [gcmKey, setGcmKey] = useState<GCMKey | null>(null);
  const [genreFlow, setGenreFlow] = useState<ActivityFlow | null>(null);
  const [flowLoading, setFlowLoading] = useState(false);
  const [theoryMode, setTheoryMode] = useState<string | undefined>(undefined);
  const genreReqRef = useRef<GCMKey | null>(null);

  const days = listDays();
  const plannedDay = plannedDayId
    ? (days.find((d) => d.id === plannedDayId) ?? null)
    : null;

  const contentReady =
    source === 'genre'
      ? genreFlow !== null
      : source === 'song'
        ? song !== null
        : plannedDay !== null;

  const builtDay = useMemo<Day | null>(() => {
    if (source === 'genre' && gcmKey && genreFlow) {
      const profile = getGenreProfile(CURRICULUM_GENRE_SLUGS[genreOf(gcmKey)]);
      if (profile)
        return buildGenreLessonDay({
          gcmKey,
          profile,
          flow: genreFlow,
          theoryMode,
          params,
        });
      return null;
    }
    if (source === 'plannedDay' && plannedDay) {
      return enrichDayWithSongSessionDeck(plannedDay, {
        song: song ?? undefined,
        params,
        dayStubSlug: plannedDay.label,
      });
    }
    if (song) return buildSongSessionDay({ song, params });
    return null;
  }, [source, gcmKey, genreFlow, theoryMode, plannedDay, song, params]);

  const handlePickGenre = (key: GCMKey) => {
    setSource('genre');
    setGcmKey(key);
    setGenreFlow(null);
    setFlowLoading(true);
    genreReqRef.current = key;
    const genreId = genreOf(key);
    const levelId = key.slice(key.lastIndexOf(':') + 1) as CurriculumLevelId;
    const levelNum = Number(levelId.replace(/^L/i, ''));
    setTheoryMode(getModesForGenreLevel(genreId, levelId)[0]?.mode);
    void getActivityFlow(CURRICULUM_GENRE_SLUGS[genreId], levelNum)
      .then((flow) => {
        if (genreReqRef.current !== key) return; // stale select — ignore
        setGenreFlow(flow);
        setFlowLoading(false);
      })
      .catch(() => {
        if (genreReqRef.current !== key) return;
        setFlowLoading(false);
      });
  };

  const handlePickPlannedDay = (day: Day) => {
    setPlannedDayId(day.id);
    setSource('plannedDay');
    // Prefill the song from the Day's "song of the day" reference if the
    // teacher hasn't picked one yet.
    if (!song) {
      const songId = songIdFromDay(day);
      if (songId) setSong(getSong(songId));
    }
  };

  const launch = async (mode: 'save' | 'live') => {
    if (!builtDay || busy) return;
    setBusy(true);
    try {
      saveDay(builtDay);
      if (mode === 'save') {
        navigate(TeacherRoutes.plan({ classroomId: cid }));
        return;
      }
      const pd = await publishDayToClassroom({
        classroomId: cid,
        day: builtDay,
      });
      const firstSlidePhase =
        builtDay.deck?.slides[0]?.phase ?? 'connectRegulate';
      const started = await startClassroomSession({
        classroomId: cid,
        publishedDayId: pd.id,
        initialPhase: firstSlidePhase,
        initialSlideIndex: 0,
      });
      navigate(
        TeacherRoutes.session({
          classroomId: cid,
          sessionId: started.sessionId,
        }),
      );
    } catch (err) {
      window.alert(err instanceof Error ? err.message : 'Could not start');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-[900px] flex-col gap-6 px-6 py-6 text-white md:gap-8 md:px-10 md:py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <Link
          to={TeacherRoutes.plan({ classroomId: cid })}
          className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Plan
        </Link>
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-[#7ecfcf]" />
          <h1 className="text-lg font-medium md:text-xl">
            Interactive Session
          </h1>
        </div>
      </header>

      <Stepper step={step} onStep={setStep} contentReady={contentReady} />

      {step === 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => {
              setSource('song');
              setParams(DEFAULT_SONG_SESSION_PARAMS);
              setStep(1);
            }}
            className="flex flex-col gap-2 rounded-2xl border border-[#7ecfcf]/40 bg-[#7ecfcf]/[0.06] p-5 text-left transition-colors hover:border-[#7ecfcf]/70"
          >
            <span className="inline-flex items-center gap-2 text-sm font-medium">
              <Sparkles className="h-4 w-4 text-[#7ecfcf]" />
              Song Session
              {source !== 'genre' && (
                <Check className="ml-auto h-4 w-4 text-[#7ecfcf]" />
              )}
            </span>
            <span className="text-xs text-white/60">
              Welcome + emotional check-in → listen to a song → respond → exit
              reflection. Polls live on student devices, reveal on the
              projector.
            </span>
          </button>
          <button
            type="button"
            onClick={() => {
              setSource('genre');
              setParams(DEFAULT_GENRE_LESSON_PARAMS);
              setStep(1);
            }}
            className="flex flex-col gap-2 rounded-2xl border border-[#7ecfcf]/40 bg-[#7ecfcf]/[0.06] p-5 text-left transition-colors hover:border-[#7ecfcf]/70"
          >
            <span className="inline-flex items-center gap-2 text-sm font-medium">
              <Sparkles className="h-4 w-4 text-[#7ecfcf]" />
              Genre Lesson
              {source === 'genre' && (
                <Check className="ml-auto h-4 w-4 text-[#7ecfcf]" />
              )}
            </span>
            <span className="text-xs text-white/60">
              Built from the genre curriculum — overview → warm-up theory →
              Melody/Chords/Bass/Play-Along stations students complete in the
              real modules.
            </span>
          </button>
        </div>
      )}

      {step === 1 && source === 'genre' && (
        <div className="flex flex-col gap-4">
          <GenreLevelPicker
            selected={gcmKey}
            loading={flowLoading}
            onSelect={handlePickGenre}
          />
          {gcmKey && genreFlow && (
            <p className="text-sm text-white/70">
              Selected: <span className="text-white">{gcmKey}</span>
            </p>
          )}
          {gcmKey && flowLoading && (
            <p className="text-sm text-white/50">Loading curriculum…</p>
          )}
          {gcmKey && !flowLoading && !genreFlow && (
            <p className="text-sm text-amber-300/80">
              That level has no interactive curriculum yet — pick another.
            </p>
          )}
          <NextButton
            disabled={!contentReady}
            onClick={() => setStep(2)}
            label="Questions"
          />
        </div>
      )}

      {step === 1 && source !== 'genre' && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <SourceCard
              active={source === 'plannedDay'}
              icon={<CalendarDays className="h-4 w-4" />}
              title="From today's plan"
              hint={
                days.length === 0
                  ? 'No planned Days yet — pick a song instead.'
                  : 'Present a Day you already planned, upgraded with interactive slides.'
              }
            >
              {days.length > 0 && (
                <ul className="mt-1 flex max-h-40 flex-col gap-1 overflow-y-auto">
                  {days.map((d) => (
                    <li key={d.id}>
                      <button
                        type="button"
                        onClick={() => handlePickPlannedDay(d)}
                        className={
                          'w-full truncate rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors ' +
                          (plannedDayId === d.id && source === 'plannedDay'
                            ? 'bg-white text-black'
                            : 'text-white/70 hover:bg-white/[0.06] hover:text-white')
                        }
                      >
                        {d.label}
                        {d.scheduledDate ? ` · ${d.scheduledDate}` : ''}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </SourceCard>
            <SourceCard
              active={source === 'song'}
              icon={<Music className="h-4 w-4" />}
              title="Pick a song"
              hint="An ad-hoc session built around one song from the library."
            >
              <button
                type="button"
                onClick={() => {
                  setSource('song');
                  setPickerOpen(true);
                }}
                className="mt-1 inline-flex w-fit items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/80 hover:border-white/25 hover:text-white"
              >
                <Music className="h-3.5 w-3.5" />
                {song ? 'Change song' : 'Browse songs'}
              </button>
            </SourceCard>
          </div>

          {song && (
            <p className="text-sm text-white/70">
              Song: <span className="text-white">{song.title}</span>
              <span className="text-white/50"> — {song.artist}</span>
            </p>
          )}

          <NextButton
            disabled={!contentReady}
            onClick={() => setStep(2)}
            label="Questions"
          />
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-4">
          <PollTextEditor
            params={params}
            onChange={setParams}
            variant={source === 'genre' ? 'genre' : 'song'}
          />
          <NextButton onClick={() => setStep(3)} label="Preview" />
        </div>
      )}

      {step === 3 && builtDay && (
        <div className="flex flex-col gap-5">
          <DeckPreview day={builtDay} />
          <div className="flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => launch('save')}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/80 transition-colors hover:border-white/25 hover:text-white disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              Save to Plan
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => launch('live')}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-400 px-5 py-2 text-sm font-medium text-black transition-colors hover:bg-emerald-300 disabled:opacity-50"
            >
              <Radio className="h-4 w-4" />
              {busy ? 'Starting…' : 'Go Live'}
            </button>
          </div>
        </div>
      )}

      <SongPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        onSelect={setSong}
      />
    </div>
  );
};

const Stepper = ({
  step,
  onStep,
  contentReady,
}: {
  step: number;
  onStep: (s: number) => void;
  contentReady: boolean;
}) => (
  <ol className="flex flex-wrap items-center gap-2">
    {STEPS.map((label, i) => {
      const reachable =
        i <= step || (i === step + 1 && (i !== 3 || contentReady));
      return (
        <li key={label} className="flex items-center gap-2">
          {i > 0 && <span className="h-px w-4 bg-white/15" />}
          <button
            type="button"
            disabled={!reachable}
            onClick={() => reachable && onStep(i)}
            className={
              'rounded-full px-3 py-1 text-xs transition-colors ' +
              (i === step
                ? 'bg-white text-black'
                : reachable
                  ? 'border border-white/10 text-white/70 hover:border-white/25 hover:text-white'
                  : 'border border-white/[0.06] text-white/30')
            }
          >
            {i + 1}. {label}
          </button>
        </li>
      );
    })}
  </ol>
);

const SourceCard = ({
  active,
  icon,
  title,
  hint,
  children,
}: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  hint: string;
  children?: React.ReactNode;
}) => (
  <div
    className={
      'flex flex-col gap-2 rounded-2xl border p-5 transition-colors ' +
      (active
        ? 'border-[#7ecfcf]/50 bg-[#7ecfcf]/[0.05]'
        : 'border-white/10 bg-white/[0.02]')
    }
  >
    <span className="inline-flex items-center gap-2 text-sm font-medium">
      {icon}
      {title}
    </span>
    <span className="text-xs text-white/55">{hint}</span>
    {children}
  </div>
);

const NextButton = ({
  onClick,
  label,
  disabled,
}: {
  onClick: () => void;
  label: string;
  disabled?: boolean;
}) => (
  <button
    type="button"
    disabled={disabled}
    onClick={onClick}
    className="inline-flex w-fit items-center gap-2 self-end rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-white/85 disabled:cursor-not-allowed disabled:opacity-40"
  >
    Next: {label}
  </button>
);
