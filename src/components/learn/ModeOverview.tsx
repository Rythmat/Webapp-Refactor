/* eslint-disable import/order, react/jsx-sort-props, tailwindcss/classnames-order */
import { useEffect, useMemo, useState } from 'react';
import { PianoKeyboard } from '@/components/PianoKeyboard';
import { YouTubePlayer } from '@/features/admin/chapters/components/YouTubePlayer';
import { useProgressSummary } from '@/hooks/data/progress';
import { usePrismMode, type PrismModeSlug } from '@/hooks/data/prism';
import { type PlaybackEvent } from '@/contexts/PlaybackContext';
import { LearnRoutes } from '@/constants/routes';
import { useNavigate } from 'react-router';
import { HeaderBar } from '@/components/ClassroomLayout/HeaderBar';
import { keyLabelToUrlParam, urlParamToKeyLabel } from '@/lib/musicKeyUrl';
import { colorForKeyMode } from '@/lib/modeColorShift';
import { formatActivityTitle } from '@/lib/activityTitle';
import { getNoteSpelling } from './noteSpellingLookup';
import { getChordScales, type ChordScaleEntry } from './chordScaleData';
import './learn.css';

type ModeOverviewProps = {
  mode: PrismModeSlug;
  // type: string;
};

type KeyStep = {
  label: string;
  semitone: number;
};

const chromaticFlatInterval = [
  '1',
  '♭2',
  '2',
  '♭3',
  '3',
  '4',
  '♭5',
  '5',
  '♭6',
  '6',
  '♭7',
  '7',
  '',
  '♭9',
  '',
  '9',
  '',
  '',
  '11',
  '',
  '',
  '♭13',
  '13',
];

const chromaticSharpInterval = [
  '1',
  '#1',
  '2',
  '#2',
  '3',
  '4',
  '#4',
  '5',
  '#5',
  '6',
  '#6',
  '7',
  '',
  '#8',
  '9',
  '',
  '',
  '11',
  '#11',
  '',
  '',
  '13',
];

const BASE_C4 = 60;
const DEFAULT_INTERVALS = [0, 2, 4, 5, 7, 9, 11, 12];
const START_OVER_ACTIVITY_DEF_ID = 'lesson-overview';

const CHROMATIC_KEYS: KeyStep[] = [
  { label: 'C', semitone: 0 },
  { label: 'G', semitone: 7 },
  { label: 'D', semitone: 2 },
  { label: 'A', semitone: 9 },
  { label: 'E', semitone: 4 },
  { label: 'B', semitone: 11 },
  { label: 'F#', semitone: 6 },
  { label: 'Db', semitone: 1 },
  { label: 'Ab', semitone: 8 },
  { label: 'Eb', semitone: 3 },
  { label: 'Bb', semitone: 10 },
  { label: 'F', semitone: 5 },
];
const normalizeSteps = (steps?: number[]) => {
  if (!steps || steps.length === 0) return DEFAULT_INTERVALS;
  const unique = new Set<number>();
  steps.forEach((step) => {
    if (typeof step === 'number' && Number.isFinite(step)) {
      unique.add(Math.round(step));
    }
  });
  if (!unique.has(0)) unique.add(0);
  if (!Array.from(unique).some((n) => n >= 12)) unique.add(12);
  return Array.from(unique).sort((a, b) => a - b);
};

const buildScaleMidis = (rootMidi: number, steps?: number[]) =>
  normalizeSteps(steps).map((interval) => rootMidi + interval);

function ChordRow({
  label,
  entries,
  extra,
  color,
}: {
  label: string;
  entries: ChordScaleEntry[];
  extra?: ChordScaleEntry[];
  color: string;
}) {
  if (entries.length === 0 && (!extra || extra.length === 0)) return null;
  return (
    <div className="mb-3">
      <div
        className="text-[10px] uppercase tracking-widest mb-1 opacity-50"
        style={{ color: 'var(--color-text-dim)' }}
      >
        {label}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {entries.map((e, i) => (
          <span
            key={`${e.degree}-${e.quality}-${i}`}
            className="inline-block px-2 py-0.5 rounded text-xs"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid var(--color-border)',
              color,
            }}
          >
            <span className="opacity-60">{e.degree}</span> {e.quality}
          </span>
        ))}
        {extra?.map((e, i) => (
          <span
            key={`extra-${e.degree}-${e.quality}-${i}`}
            className="inline-block px-2 py-0.5 rounded text-xs opacity-40"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px dashed var(--color-border)',
              color,
            }}
          >
            <span className="opacity-60">{e.degree}</span> {e.quality}
          </span>
        ))}
      </div>
    </div>
  );
}

export function ModeOverview({ mode }: ModeOverviewProps) {
  const [keyIndex, setKeyIndex] = useState(0);
  const [noteIndex, setNoteIndex] = useState(0);
  const [chordsOpen, setChordsOpen] = useState(false);
  const { data: modeDetail } = usePrismMode(mode);
  const navigate = useNavigate();
  const { data: progressSummary } = useProgressSummary(true);
  const videoId = '';

  useEffect(() => {
    setKeyIndex(0);
    setNoteIndex(0);
  }, [mode]);

  const scaleSteps = modeDetail?.steps ?? DEFAULT_INTERVALS;
  const activeKey = CHROMATIC_KEYS[keyIndex];
  const activeKeyColor = colorForKeyMode(activeKey.label, mode);
  const displayName =
    getChordScales(mode)?.modeName ??
    mode.charAt(0).toUpperCase() + mode.slice(1);
  const rootMidi = BASE_C4 + activeKey.semitone;
  const scaleMidis = useMemo(
    () => buildScaleMidis(rootMidi, scaleSteps),
    [rootMidi, scaleSteps],
  );

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNoteIndex((prev) => {
        const next = prev + 1;
        if (next >= scaleMidis.length) {
          setKeyIndex((prevKey) => (prevKey + 1) % CHROMATIC_KEYS.length);
          return 0;
        }
        return next;
      });
    }, 600);
    return () => window.clearInterval(intervalId);
  }, [scaleMidis.length]);

  const activeNotes = useMemo(() => {
    const now = Date.now();
    const cappedIndex = Math.min(noteIndex, scaleMidis.length - 1);
    return scaleMidis
      .slice(0, cappedIndex + 1)
      .map<PlaybackEvent>((midi, index) => ({
        id: `${mode}-${activeKey.label}-${midi}-${index}`,
        type: 'note',
        midi,
        time: now,
        duration: 0.6,
        velocity: 1,
      }));
  }, [activeKey.label, mode, noteIndex, scaleMidis]);

  const resumeByKey = useMemo(() => {
    const map = new Map<
      string,
      {
        activityDefId: string | null;
        completedCount: number;
        totalCount: number | null;
        updatedAtMs: number;
      }
    >();
    const parseSummaryLessonIdentity = (lesson: {
      lessonId: string;
      lessonVersion: number;
      mode?: string | null;
      root?: string | null;
      currentActivityInstanceId: string | null;
    }) => {
      let parsedMode = lesson.mode ?? null;
      let parsedRoot = lesson.root ?? null;

      if ((!parsedMode || !parsedRoot) && lesson.currentActivityInstanceId) {
        const parts = lesson.currentActivityInstanceId.split('::');
        if (parts.length >= 5) {
          parsedMode = parsedMode ?? parts[3];
          parsedRoot = parsedRoot ?? parts[4];
        }
      }

      if (
        (!parsedMode || !parsedRoot) &&
        lesson.lessonId.startsWith('mode-lesson-flow__')
      ) {
        const scoped = lesson.lessonId.split('__');
        if (scoped.length >= 3) {
          parsedRoot = parsedRoot ?? urlParamToKeyLabel(scoped[1]);
          parsedMode = parsedMode ?? scoped[2];
        }
      }

      return {
        mode: parsedMode?.toLowerCase() ?? null,
        root: parsedRoot?.toLowerCase() ?? null,
      };
    };

    progressSummary?.lessons.forEach((lesson) => {
      if (!lesson.lessonId.startsWith('mode-lesson-flow')) return;
      if (lesson.lessonVersion !== 1) return;
      const parsedIdentity = parseSummaryLessonIdentity(lesson);
      if ((parsedIdentity.mode ?? '') !== mode.toLowerCase()) return;
      const lessonRoot = parsedIdentity.root ?? '';
      if (!lessonRoot) return;

      let activityDefId: string | null = null;
      const activityId = lesson.currentActivityInstanceId;
      if (activityId) {
        const parts = activityId.split('::');
        if (parts.length >= 5) {
          activityDefId = parts[2];
        }
      }

      if ((lesson.completedCount ?? 0) <= 0) return;

      const nextUpdatedAtMs = new Date(lesson.updatedAt).getTime() || 0;
      const existing = map.get(lessonRoot);
      if (existing && existing.updatedAtMs > nextUpdatedAtMs) {
        return;
      }

      map.set(lessonRoot, {
        activityDefId,
        completedCount: lesson.completedCount ?? 0,
        totalCount: lesson.totalCount ?? null,
        updatedAtMs: nextUpdatedAtMs,
      });
    });
    return map;
  }, [mode, progressSummary?.lessons]);

  const lessonRouteFor = (keyLabel: string, activityDefId?: string) =>
    LearnRoutes.lesson(
      {
        mode,
        key: keyLabelToUrlParam(keyLabel),
      },
      activityDefId ? { activity: activityDefId } : undefined,
    );

  return (
    <div
      className="learn-root flex flex-col gap-6"
      data-mode={mode}
      style={{ backgroundColor: 'var(--color-bg)' }}
    >
      <HeaderBar
        title={displayName}
        onBack={() => navigate(-1)}
        showProfile={false}
      />
      {videoId && (
        <div className="w-1/2 mx-auto">
          <YouTubePlayer videoId={videoId} />
        </div>
      )}
      <PianoKeyboard
        endC={6}
        startC={4}
        playingNotes={activeNotes}
        activeWhiteKeyColor={activeKeyColor}
        activeBlackKeyColor={activeKeyColor}
      />
      <section className="mb-6 flex flex-col items-center">
        <p
          className="text-base md:text-lg font-semibold mb-3 text-left self-start ml-[10%]"
          style={{ color: 'var(--color-text)' }}
        >
          Interval:{' '}
          {scaleSteps
            .map((i) => {
              return mode == 'lydian'
                ? chromaticSharpInterval[i]
                : chromaticFlatInterval[i];
            })
            .join(', ')}
        </p>

        {(() => {
          const cs = getChordScales(mode);
          if (!cs) return null;
          return (
            <div className="w-full max-w-3xl mb-4">
              <button
                type="button"
                onClick={() => setChordsOpen((o) => !o)}
                className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide cursor-pointer mb-2"
                style={{ color: 'var(--color-text-dim)' }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    transform: chordsOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                    transition: 'transform 150ms',
                  }}
                >
                  &#9654;
                </span>
                Chord Scales
              </button>
              {chordsOpen && (
                <div
                  className="p-4 rounded-lg glass-panel-sm"
                  style={{
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <ChordRow
                    label="Triads"
                    entries={cs.triads}
                    extra={cs.extraTriads}
                    color={activeKeyColor}
                  />
                  <ChordRow
                    label="7th Chords"
                    entries={cs.sevenths}
                    extra={cs.extraSevenths}
                    color={activeKeyColor}
                  />
                  <ChordRow
                    label="9th Chords"
                    entries={cs.ninths}
                    extra={cs.extraNinths}
                    color={activeKeyColor}
                  />
                </div>
              )}
            </div>
          );
        })()}

        <div className="grid grid-cols-1 gap-3 w-full max-w-3xl">
          {CHROMATIC_KEYS.map((tile) => {
            const resumeState = resumeByKey.get(tile.label.toLowerCase());
            const title = tile.label + ' ' + displayName;
            const tileColor = colorForKeyMode(tile.label, mode);

            const noteSpelling = getNoteSpelling(mode, tile.label);

            if (!resumeState) {
              return (
                <button
                  key={`${tile.label}-${mode}`}
                  onClick={() => navigate(lessonRouteFor(tile.label))}
                  className="p-3 rounded-lg text-sm font-bold text-left transition-colors duration-150 glass-panel-sm cursor-pointer"
                  style={{
                    color: tileColor,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid var(--color-border)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                  }}
                >
                  {title}
                  {noteSpelling && (
                    <span className="block mt-1 text-xs font-normal opacity-60">
                      {noteSpelling.join(', ')}
                    </span>
                  )}
                </button>
              );
            }

            return (
              <div
                key={`${tile.label}-${mode}`}
                className="p-3 rounded-lg text-sm text-left glass-panel-sm"
                style={{
                  color: tileColor,
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid var(--color-border)',
                }}
              >
                <div className="font-bold">{title}</div>
                {noteSpelling && (
                  <div className="mt-1 text-xs opacity-60">
                    {noteSpelling.join(', ')}
                  </div>
                )}
                <div className="mt-1 text-xs font-semibold uppercase tracking-wide opacity-90">
                  Continue lesson
                </div>
                <div className="mt-1 text-xs opacity-80">
                  {resumeState.activityDefId
                    ? `Current activity: ${formatActivityTitle(resumeState.activityDefId)}`
                    : 'Progress saved'}
                </div>
                {resumeState.totalCount != null &&
                  resumeState.completedCount > 0 && (
                    <div className="mt-1 text-xs opacity-70">
                      {resumeState.completedCount} / {resumeState.totalCount}{' '}
                      completed
                    </div>
                  )}
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      navigate(
                        lessonRouteFor(tile.label, START_OVER_ACTIVITY_DEF_ID),
                      )
                    }
                    className="rounded-md px-3 py-1.5 text-xs font-semibold transition-colors duration-150"
                    style={{
                      border: '1px solid var(--color-border)',
                      color: 'var(--color-text)',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background =
                        'rgba(255,255,255,0.06)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'transparent';
                    }}
                  >
                    Start Over
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate(lessonRouteFor(tile.label))}
                    className="rounded-md px-3 py-1.5 text-xs font-semibold transition-colors duration-150"
                    style={{
                      background: 'var(--color-accent)',
                      color: '#191919',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.opacity = '0.9';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.opacity = '1';
                    }}
                  >
                    Continue
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
