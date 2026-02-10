import { useEffect, useMemo, useState } from 'react';
import { PianoKeyboard } from '@/components/PianoKeyboard';
import { YouTubePlayer } from '@/features/admin/chapters/components/YouTubePlayer';
import { usePrismMode, type PrismModeSlug } from '@/hooks/data/prism';
import { type PlaybackEvent } from '@/contexts/PlaybackContext';
import { useNoteByMidiMap } from '@/hooks/data/notes/useNotes';
import { ChordPressKeyboard } from '@/components/Games/ChordPressKeyboard';
// import { LearnRoutes } from "@/constants/routes";
// import { useNavigate } from 'react-router';
import { KEY_OF_COLORS } from '@/constants/theme';

type LessonOverviewProps = {
  mode: PrismModeSlug;
  rootMidi: number;
  onChordPressCompleteChange?: (complete: boolean) => void;
  onStartLesson?: () => void;
};

const DEFAULT_INTERVALS = [0, 2, 4, 5, 7, 9, 11, 12];
const DEFAULT_ROOT_MIDI = 60;

const PITCH_CLASS_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'] as const;
const KEY_LABEL_BY_PITCH_CLASS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'] as const;


const getKeyColor = (label: string) => {
  const mapped =(label as keyof typeof KEY_OF_COLORS);
  return KEY_OF_COLORS[mapped];
};

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
  const resolvedRootMidi = Number.isFinite(rootMidi) ? rootMidi : DEFAULT_ROOT_MIDI;
  const scaleMidis = useMemo(
    () => buildScaleMidis(resolvedRootMidi, scaleSteps),
    [resolvedRootMidi, scaleSteps],
  );
  const rootPitchClass = normalizePitchClass(resolvedRootMidi);
  const activeKeyLabel = KEY_LABEL_BY_PITCH_CLASS[rootPitchClass];
  const activeKeyColor = getKeyColor(activeKeyLabel);

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
      <h2 className="text-3xl md:text-4xl font-semibold underline text-left ml-[10%]">
        {`${mode.charAt(0).toUpperCase() + mode.slice(1)}`}
      </h2>
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
        enableClick={false}
        useContextNotes={false}
      />
      <section className="mb-6 flex flex-col items-center">
        <p className="text-base md:text-lg font-semibold mb-3 text-left self-start ml-[10%]">
          Notes: {scaleNoteLabels.join(', ')}
        </p>

        <div className="w-full max-w-4xl my-6">
          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-neutral-800" />
            <h3 className="text-sm font-semibold uppercase tracking-widest text-neutral-300">
              Identify
            </h3>
            <div className="h-px flex-1 bg-neutral-800" />
            <p> Select the notes of {PITCH_CLASS_NAMES[normalizePitchClass(rootMidi)]} {mode.charAt(0).toUpperCase() + mode.slice(1)}</p>
          </div>
        </div>

        <ChordPressKeyboard
          targetNotes={scaleMidis}
          onComplete={() => setChordPressComplete(true)}
        />
      </section>

      <div className="flex justify-center">
        <button
          type="button"
          onClick={onStartLesson}
          disabled={!chordPressComplete}
          className="rounded-full bg-emerald-500 px-6 py-2 text-sm font-semibold text-white transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Start Lesson
        </button>
      </div>

    </div>
  );
}
