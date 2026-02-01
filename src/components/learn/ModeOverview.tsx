import { useEffect, useMemo, useState } from 'react';
import { PianoKeyboard } from '@/components/PianoKeyboard';
import { YouTubePlayer } from '@/features/admin/chapters/components/YouTubePlayer';
import { usePrismMode, type PrismModeSlug } from '@/hooks/data/prism';
import { type PlaybackEvent } from '@/contexts/PlaybackContext';
import { LearnRoutes } from "@/constants/routes";
import { useNavigate } from 'react-router';

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

const CIRCLE_OF_FIFTHS: KeyStep[] = [
  { label: 'C', semitone: 0 },
  { label: 'G', semitone: 7 },
  { label: 'D', semitone: 2 },
  { label: 'A', semitone: 9 },
  { label: 'E', semitone: 4 },
  { label: 'B', semitone: 11 },
  { label: 'F#', semitone: 6 },
  { label: 'C#', semitone: 1 },
  { label: 'G#', semitone: 8 },
  { label: 'D#', semitone: 3 },
  { label: 'A#', semitone: 10 },
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




export function ModeOverview({ mode}: ModeOverviewProps) {
  const [keyIndex, setKeyIndex] = useState(0);
  const { data: modeDetail } = usePrismMode(mode);
  const navigate = useNavigate();

  useEffect(() => {
    setKeyIndex(0);
  }, [mode]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setKeyIndex((prev) => (prev + 1) % CIRCLE_OF_FIFTHS.length);
    }, 2000);
    return () => window.clearInterval(intervalId);
  }, []);

  const scaleSteps = modeDetail?.steps ?? DEFAULT_INTERVALS;
  const activeKey = CIRCLE_OF_FIFTHS[keyIndex];
  const rootMidi = BASE_C4 + activeKey.semitone;
  const activeNotes = useMemo(() => {
    const now = Date.now();
    return buildScaleMidis(rootMidi, scaleSteps).map<PlaybackEvent>(
      (midi, index) => ({
        id: `${mode}-${activeKey.label}-${midi}`,
        type: 'note',
        midi,
        time: now + index,
        duration: 0.8,
        velocity: 1,
      }),
    );
  }, [activeKey.label, mode, rootMidi, scaleSteps]);

  return (
    <div className="flex flex-col gap-6" data-mode={mode}>
      <YouTubePlayer videoId={''} />
      <PianoKeyboard playingNotes={activeNotes} />
      <section className="mb-6">
        <h2 className="text-lg font-semibold mb-3">Modes</h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {CIRCLE_OF_FIFTHS.map((tile) => {

            return (
              <button
                onClick={() => navigate(LearnRoutes.lesson({mode:mode, key:tile.label})) }
                className={`
                  p-3 rounded-lg border text-sm font-medium transition
                `}
              >
                {tile.label + mode}
              </button>
            );
          })}
        </div>
      </section>

    </div>
  );
}
