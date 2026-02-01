import { useEffect, useMemo, useState } from 'react';
import { PianoKeyboard } from '@/components/PianoKeyboard';
import { YouTubePlayer } from '@/features/admin/chapters/components/YouTubePlayer';
import { usePrismMode, type PrismModeSlug } from '@/hooks/data/prism';
import { type PlaybackEvent } from '@/contexts/PlaybackContext';
import { LearnRoutes } from "@/constants/routes";
import { useNavigate } from 'react-router';
import { KEY_OF_COLORS } from '@/constants/theme';

type ModeOverviewProps = {
  mode: PrismModeSlug;
  // type: string;
};

type KeyStep = {
  label: string;
  semitone: number;
};

const BASE_C4 = 60;
const DEFAULT_INTERVALS = [0, 2, 4, 5, 7, 9, 11, 12];

const CHROMATIC_KEYS: KeyStep[] = [
  { label: 'C', semitone: 0 },
  { label: 'Db', semitone: 1 },
  { label: 'D', semitone: 2 },
  { label: 'Eb', semitone: 3 },
  { label: 'E', semitone: 4 },
  { label: 'F', semitone: 5 },
  { label: 'F#', semitone: 6 },
  { label: 'G', semitone: 7 },
  { label: 'Ab', semitone: 8 },
  { label: 'A', semitone: 9 },
  { label: 'Bb', semitone: 10 },
  { label: 'B', semitone: 11 },
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




export function ModeOverview({ mode}: ModeOverviewProps) {
  const [keyIndex, setKeyIndex] = useState(0);
  const [noteIndex, setNoteIndex] = useState(0);
  const { data: modeDetail } = usePrismMode(mode);
  const navigate = useNavigate();
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
      <h2 className="text-2xl md:text-3xl font-semibold underline text-left">
        {`${mode.charAt(0).toUpperCase() + mode.slice(1)}: Overview`}
      </h2>
      {videoId && (
        <div className="w-1/2 mx-auto">
          <YouTubePlayer videoId={videoId} />
        </div>
      )}
      <PianoKeyboard
        endC={5}
        startC={3}
        playingNotes={activeNotes}
        activeWhiteKeyColor={activeKeyColor}
        activeBlackKeyColor={activeKeyColor}
      />
      <section className="mb-6 flex flex-col items-center">
        <p className="text-sm font-semibold mb-3">
          Interval: {scaleSteps.map((i)=>{return i+1}).join(',')}
        </p>

        <div className="grid grid-cols-1 gap-3 w-full max-w-3xl">
          {CHROMATIC_KEYS.map((tile) => {

            return (
              <button
                onClick={() => navigate(LearnRoutes.lesson({mode:mode, key:tile.label})) }
                className={`
                  p-3 rounded-lg border text-sm font-bold text-left transition bg-grey-darker
                `}
                style={{ color: getKeyColor(tile.label) }}
              >
                {tile.label + " " + mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            );
          })}
        </div>
      </section>

    </div>
  );
}
