import { useEffect, useMemo, useState } from 'react';
import { ChordPressKeyboard } from '@/components/Games/ChordPressKeyboard';
import { PianoKeyboard } from '@/components/PianoKeyboard';
import { type PlaybackEvent } from '@/contexts/PlaybackContext';
import { YouTubePlayer } from '@/features/admin/chapters/components/YouTubePlayer';
import { useNoteByMidiMap } from '@/hooks/data/notes/useNotes';
import { usePrismMode, type PrismModeSlug } from '@/hooks/data/prism';
// import { LearnRoutes } from "@/constants/routes";
// import { useNavigate } from 'react-router';
import { colorForKeyMode } from '@/lib/modeColorShift';

type LessonOverviewProps = {
  mode: PrismModeSlug;
  rootMidi: number;
  onChordPressCompleteChange?: (complete: boolean) => void;
  onStartLesson?: () => void;
};

const DEFAULT_INTERVALS = [0, 2, 4, 5, 7, 9, 11, 12];
const DEFAULT_ROOT_MIDI = 60;

const PITCH_CLASS_NAMES = [
  'C',
  'D♭',
  'D',
  'E♭',
  'E',
  'F',
  'F♯',
  'G',
  'A♭',
  'A',
  'B♭',
  'B',
] as const;
const KEY_LABEL_BY_PITCH_CLASS = [
  'C',
  'D♭',
  'D',
  'E♭',
  'E',
  'F',
  'F♯',
  'G',
  'A♭',
  'A',
  'B♭',
  'B',
] as const;
const normalizePitchClass = (midi: number) => ((midi % 12) + 12) % 12;

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

export function LessonOverview({
  mode,
  rootMidi,
  onChordPressCompleteChange,
  onStartLesson,
}: LessonOverviewProps) {
  const { data: modeDetail } = usePrismMode(mode);
  const { data: noteByMidiMap } = useNoteByMidiMap();
  // const navigate = useNavigate();
  const videoId = '';
  const [chordPressComplete, setChordPressComplete] = useState(false);

  const scaleSteps = modeDetail?.steps ?? DEFAULT_INTERVALS;
  const resolvedRootMidi = Number.isFinite(rootMidi)
    ? rootMidi
    : DEFAULT_ROOT_MIDI;
  const scaleMidis = useMemo(
    () => buildScaleMidis(resolvedRootMidi, scaleSteps),
    [resolvedRootMidi, scaleSteps],
  );
  const rootPitchClass = normalizePitchClass(resolvedRootMidi);
  const activeKeyLabel = KEY_LABEL_BY_PITCH_CLASS[rootPitchClass];
  const activeKeyColor = colorForKeyMode(activeKeyLabel, mode);

  const scaleNoteLabels = useMemo(
    () =>
      scaleMidis.map((midi) => {
        const note = noteByMidiMap?.get(midi);
        if (note?.noteName) return note.noteName;
        return PITCH_CLASS_NAMES[normalizePitchClass(midi)];
      }),
    [noteByMidiMap, scaleMidis],
  );

  const activeNotes = useMemo(() => {
    return scaleMidis.map<PlaybackEvent>((midi, index) => ({
      id: `${mode}-${activeKeyLabel}-${midi}-${index}`,
      type: 'note',
      midi,
      time: Date.now(),
      duration: 0,
      velocity: 1,
    }));
  }, [activeKeyLabel, mode, scaleMidis]);

  useEffect(() => {
    setChordPressComplete(false);
  }, [scaleMidis]);

  useEffect(() => {
    onChordPressCompleteChange?.(chordPressComplete);
  }, [chordPressComplete, onChordPressCompleteChange]);

  return (
    <div className="flex flex-col gap-6" data-mode={mode}>
      <h2
        className="ml-[10%] text-left text-2xl font-semibold md:text-3xl"
        style={{ color: 'var(--color-text)' }}
      >
        {`${PITCH_CLASS_NAMES[normalizePitchClass(rootMidi)]} ${mode.charAt(0).toUpperCase() + mode.slice(1)}`}
      </h2>
      {videoId && (
        <div className="mx-auto w-1/2">
          <YouTubePlayer videoId={videoId} />
        </div>
      )}
      <PianoKeyboard
        activeBlackKeyColor={activeKeyColor}
        activeWhiteKeyColor={activeKeyColor}
        enableClick={false}
        endC={6}
        playingNotes={activeNotes}
        startC={4}
        useContextNotes={false}
      />
      <section className="mb-6 flex flex-col items-center">
        <p
          className="mb-3 ml-[10%] self-start text-left text-base font-semibold md:text-lg"
          style={{ color: 'var(--color-text)' }}
        >
          Notes: {scaleNoteLabels.join(', ')}
        </p>

        <div className="my-6 w-full max-w-4xl">
          <div className="flex items-center gap-4">
            <div
              className="h-px flex-1"
              style={{ background: 'var(--color-border)' }}
            />
            <h3
              className="text-xs font-semibold uppercase"
              style={{ color: 'var(--color-text-dim)', letterSpacing: '1px' }}
            >
              Identify
            </h3>
            <div
              className="h-px flex-1"
              style={{ background: 'var(--color-border)' }}
            />
            <p style={{ color: 'var(--color-text-dim)' }}>
              {' '}
              Select the notes of{' '}
              {PITCH_CLASS_NAMES[normalizePitchClass(rootMidi)]}{' '}
              {mode.charAt(0).toUpperCase() + mode.slice(1)}
            </p>
          </div>
        </div>

        <ChordPressKeyboard
          requireTargetIntervalsFromRoot
          activeKeyColor={activeKeyColor}
          targetNotes={scaleMidis}
          onComplete={() => setChordPressComplete(true)}
        />
      </section>

      <div className="flex justify-center">
        <button
          className="rounded-full px-6 py-2 text-sm font-semibold transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!chordPressComplete}
          style={{ background: 'var(--color-accent)', color: '#191919' }}
          type="button"
          onClick={onStartLesson}
        >
          Start Lesson
        </button>
      </div>
    </div>
  );
}
