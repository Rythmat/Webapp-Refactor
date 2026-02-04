import { useEffect, useMemo, useState } from 'react';
import { PianoKeyboard } from '@/components/PianoKeyboard';
import { YouTubePlayer } from '@/features/admin/chapters/components/YouTubePlayer';
import { usePrismMode, type PrismModeSlug } from '@/hooks/data/prism';
import { type PlaybackEvent } from '@/contexts/PlaybackContext';
// import { LearnRoutes } from "@/constants/routes";
// import { useNavigate } from 'react-router';
import { KEY_OF_COLORS } from '@/constants/theme';

type LessonOverviewProps = {
  mode: PrismModeSlug;
  key: number;
};

type KeyStep = {
  label: string;
  semitone: number;
};


const BASE_C4 = 60;
const DEFAULT_INTERVALS = [0, 2, 4, 5, 7, 9, 11, 12];

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


const getKeyColor = (label: string) => {
  const mapped =(label as keyof typeof KEY_OF_COLORS);
  return KEY_OF_COLORS[mapped];
};

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




export function LessonOverview({ mode}: LessonOverviewProps) {
  const [keyIndex, setKeyIndex] = useState(0);
  const [noteIndex, setNoteIndex] = useState(0);
  const { data: modeDetail } = usePrismMode(mode);
  // const navigate = useNavigate();
  const videoId = '';

  useEffect(() => {
    setKeyIndex(0);
    setNoteIndex(0);
  }, [mode]);

  const scaleSteps = modeDetail?.steps ?? DEFAULT_INTERVALS;
  const activeKey = CHROMATIC_KEYS[keyIndex];
  const activeKeyColor = getKeyColor(activeKey.label);
  const rootMidi = BASE_C4 + activeKey.semitone;
  const scaleMidis = useMemo(() => buildScaleMidis(rootMidi, scaleSteps), [rootMidi, scaleSteps]);

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
    return scaleMidis.slice(0, cappedIndex + 1).map<PlaybackEvent>((midi, index) => ({
      id: `${mode}-${activeKey.label}-${midi}-${index}`,
      type: 'note',
      midi,
      time: now,
      duration: 0.6,
      velocity: 1,
    }));
  }, [activeKey.label, mode, noteIndex, scaleMidis]);

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
      />
      <section className="mb-6 flex flex-col items-center">
        <p className="text-base md:text-lg font-semibold mb-3 text-left self-start ml-[10%]">
          {/* Interval: {scaleSteps.map((i)=>{return mode=="lydian"? chromaticSharpInterval[i] : chromaticFlatInterval[i]}).join(', ')} */}
        </p>

      </section>

    </div>
  );
}
