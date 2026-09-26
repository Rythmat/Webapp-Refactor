import { BookOpen, Check, Play } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { getScaleSpellings } from '@prism/engine';
import { CircleOfFifthsSvg } from '@/components/common/CircleOfFifthsSvg';
import { cn } from '@/components/utilities';
import { displayAccidentals } from '@/daw/utils/displayAccidentals';
import { KEY_CENTERS, majorScale } from '../../music';
import { DemoKeys } from '../DemoKeys';
import type { SceneProps } from './sceneTypes';

/** The Learn scene's featured key: G major (vermillion). */
const G_INDEX = 1;
const START_MIDI = 55; // G3

const LESSON_STEPS = [
  'Find the key center',
  'Walk the scale: W W H W W W H',
  'Play it back by ear',
];

/**
 * Learn scene — the app's read-only CircleOfFifthsSvg cycling through major key
 * centers, then G major's scale on the keys in its key-center color (one color
 * for the whole scale), then a playable lesson card. In `user` mode the key
 * chips below the circle pick any major key center.
 */
export const LearnScene = ({
  stepIndex,
  mode,
  compact,
  onUserAction,
  playNotes,
}: SceneProps) => {
  const [cycleIdx, setCycleIdx] = useState(0);
  const [userKey, setUserKey] = useState<number | null>(null);
  const [runIdx, setRunIdx] = useState(-1);
  const [pressed, setPressed] = useState<number | null>(null);

  useEffect(() => {
    if (mode === 'auto') setUserKey(null);
  }, [mode]);

  // Step 0: step around the circle, landing on G.
  const cycling = stepIndex === 0 && mode === 'auto';
  useEffect(() => {
    setCycleIdx(0);
    if (!cycling) return;
    const id = window.setInterval(
      () => setCycleIdx((i) => Math.min(i + 1, 4)),
      700,
    );
    return () => window.clearInterval(id);
  }, [cycling]);
  // C → G → D → A → back to G.
  const cyclePath = [0, 1, 2, 3, G_INDEX];

  const keyIdx = userKey ?? (cycling ? cyclePath[cycleIdx] : G_INDEX);
  const key = KEY_CENTERS[keyIdx];

  // Scale notes (tonic → octave) starting at the nearest tonic above G3.
  const tonicMidi =
    START_MIDI + ((key.pitchClass - (START_MIDI % 12) + 12) % 12);
  const scale = useMemo(
    () => [...majorScale(0).map((i) => tonicMidi + i), tonicMidi + 12],
    [tonicMidi],
  );
  const spellings = useMemo(
    () => getScaleSpellings(key.pitchClass, 'ionian'),
    [key.pitchClass],
  );
  const showScale = stepIndex >= 1 || mode !== 'auto' || userKey !== null;
  const hint = useMemo(
    () => new Map(showScale ? scale.map((m) => [m, key.color]) : []),
    [showScale, scale, key.color],
  );

  // Step 2: run up the scale.
  const running = stepIndex === 2 && mode === 'auto';
  useEffect(() => {
    setRunIdx(-1);
    if (!running) return;
    const id = window.setInterval(
      () => setRunIdx((i) => (i + 1) % scale.length),
      380,
    );
    return () => window.clearInterval(id);
  }, [running, scale.length]);

  const lit = useMemo(() => {
    const m = new Map<number, string>();
    if (running && runIdx >= 0) m.set(scale[runIdx], key.color);
    if (pressed !== null) m.set(pressed, key.color);
    return m;
  }, [running, runIdx, pressed, scale, key.color]);

  const pressKey = (midi: number) => {
    onUserAction();
    setPressed(midi);
    window.setTimeout(() => setPressed(null), 280);
    playNotes([midi], 0.5);
  };

  const chooseKey = (i: number) => {
    onUserAction();
    setUserKey(i);
  };

  const playScale = () => {
    onUserAction();
    scale.forEach((m, i) =>
      window.setTimeout(() => {
        setPressed(m);
        playNotes([m], 0.35);
      }, i * 220),
    );
    window.setTimeout(() => setPressed(null), scale.length * 220 + 200);
  };

  const lessonProgress = stepIndex >= 2 || mode === 'static' ? 2 : stepIndex;

  return (
    <div
      className={cn(
        'grid h-full gap-4 p-4 text-white',
        compact ? 'grid-cols-1 grid-rows-[auto_1fr]' : 'grid-cols-[42%_1fr]',
      )}
    >
      {/* Circle + key chips */}
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
        <div data-tour-target="circle">
          <CircleOfFifthsSvg
            selectedPitch={key.pitchClass}
            selectedMode="major"
            size={compact ? 150 : 250}
            ariaLabel={`Key center: ${displayAccidentals(key.name)} major`}
          />
        </div>
        <div className="flex flex-wrap justify-center gap-1">
          {KEY_CENTERS.map((k, i) => (
            <button
              key={k.name}
              type="button"
              onClick={() => chooseKey(i)}
              aria-pressed={i === keyIdx}
              className={cn(
                'grid h-6 min-w-7 place-items-center rounded-md px-1 text-[11px] font-bold text-[#101012] transition-transform hover:-translate-y-0.5',
                i === keyIdx ? 'ring-2 ring-white' : 'opacity-60',
              )}
              style={{ background: k.color }}
            >
              {displayAccidentals(k.name)}
            </button>
          ))}
        </div>
      </div>

      {/* Lesson + keys */}
      <div className="flex min-h-0 flex-col gap-3">
        <div
          data-tour-target="lesson"
          className="flex flex-col gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4"
        >
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-white/10 text-white">
              <BookOpen className="size-4" />
            </span>
            <div className="flex flex-col">
              <span className="text-[11px] uppercase tracking-[0.12em] text-white/45">
                Lesson · Scales
              </span>
              <span className="text-sm font-semibold">
                The {displayAccidentals(key.name)} major scale
              </span>
            </div>
            <button
              type="button"
              onClick={playScale}
              className="ml-auto flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-[#101012] transition-[transform,background-color] duration-300 hover:scale-105"
              style={{ background: key.color }}
            >
              <Play className="size-3 fill-current" /> Play scale
            </button>
          </div>
          {!compact && (
            <ul className="flex flex-col gap-1.5">
              {LESSON_STEPS.map((s, i) => (
                <li key={s} className="flex items-center gap-2 text-xs">
                  <span
                    className={cn(
                      'grid size-4 place-items-center rounded-full border',
                      i <= lessonProgress
                        ? 'border-white bg-white text-[#101012]'
                        : 'border-white/20',
                    )}
                  >
                    {i <= lessonProgress && <Check className="size-2.5" />}
                  </span>
                  <span
                    className={
                      i <= lessonProgress ? 'text-white/85' : 'text-white/40'
                    }
                  >
                    {s}
                  </span>
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-1">
            {scale.map((m) => (
              <span
                key={m}
                className={cn(
                  'flex-1 rounded-md py-1 text-center text-[11px] font-semibold transition-colors duration-200',
                  lit.has(m)
                    ? 'text-[#101012]'
                    : 'bg-white/[0.05] text-white/60',
                )}
                style={lit.has(m) ? { background: key.color } : undefined}
              >
                {displayAccidentals(spellings.get(m % 12) ?? '')}
              </span>
            ))}
          </div>
        </div>
        <div data-tour-target="keys" className="min-h-24 flex-1">
          <DemoKeys
            startMidi={48}
            octaves={3}
            hint={hint}
            lit={lit}
            onPress={pressKey}
            label="Learn keyboard"
          />
        </div>
      </div>
    </div>
  );
};
