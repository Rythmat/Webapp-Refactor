import { motion, useMotionValueEvent } from 'framer-motion';
import { BookOpen, Play } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { getScaleSpellings } from '@prism/engine';
import { CircleOfFifthsSvg } from '@/components/common/CircleOfFifthsSvg';
import { cn } from '@/components/utilities';
import { displayAccidentals } from '@/daw/utils/displayAccidentals';
import {
  diatonicTriads,
  keyCenterOf,
  parallelModes,
  stepPattern,
} from '../../music';
import { DemoKeys } from '../DemoKeys';
import type { SceneProps } from './sceneTypes';

type View = 'scale' | 'chords' | 'modes';

const VIEWS: { id: View; label: string }[] = [
  { id: 'scale', label: 'Scale' },
  { id: 'chords', label: 'Chords' },
  { id: 'modes', label: 'Modes' },
];

/** The view each tour step shows. */
const STEP_VIEW: View[] = ['scale', 'chords', 'modes'];

/** Step 1 walks down the circle by fifths and lands on C. */
const KEY_WALK = [9, 2, 7, 0];
/** Step 2's auto "pick": vi (Am in C). */
const AUTO_CHORD = 5;
/** Shown when the visitor takes over the Modes view without picking. */
const DEFAULT_MODE = 3; // Dorian — its parent key (B♭) isn't the root's.
/** `stepProgress` → 0…TICKS, the pace the auto script moves at. */
const TICKS = 8;
const NOTE_MS = 180;

/**
 * Theory scene — scales, chords and modes on the app's circle of fifths.
 * Pick a key (the circle), see its scale, its seven diatonic chords (all in
 * the key's color) and the seven parallel modes of its root, each in its
 * parent key's color, so the colors walk around the circle. Every color comes
 * from the Prism engine (`../../music`).
 */
export const TheoryScene = ({
  stepIndex,
  mode,
  visible,
  compact,
  onUserAction,
  playNotes,
  stepProgress,
  audio,
  resetKey,
}: SceneProps) => {
  const auto = mode === 'auto';
  const [userKey, setUserKey] = useState<number | null>(null);
  const [userView, setUserView] = useState<View | null>(null);
  const [userChord, setUserChord] = useState<number | null>(null);
  const [userMode, setUserMode] = useState<number | null>(null);
  const [runMidi, setRunMidi] = useState<number | null>(null);
  const [pressed, setPressed] = useState<number | null>(null);

  // The auto script follows the step's progress; it holds its last value
  // once the visitor takes over (progress jumps to 1 then).
  const [tick, setTick] = useState(auto ? 0 : TICKS);
  useMotionValueEvent(stepProgress, 'change', (p) => {
    if (auto) setTick(Math.min(TICKS, Math.floor(p * TICKS)));
  });

  // Timers for note runs (one array, mutated in place); cleared when hidden
  // or unmounted.
  const timers = useRef<number[]>([]);
  const clearTimers = () => {
    timers.current.splice(0).forEach(clearTimeout);
    setRunMidi(null);
  };
  useEffect(() => {
    if (visible) return;
    timers.current.splice(0).forEach(clearTimeout);
    setRunMidi(null);
  }, [visible]);
  useEffect(() => {
    const list = timers.current;
    return () => list.forEach(clearTimeout);
  }, []);

  // A new auto run discards what the visitor chose.
  useEffect(() => {
    if (!auto) return;
    setUserKey(null);
    setUserView(null);
    setUserChord(null);
    setUserMode(null);
    setTick(0);
  }, [auto]);
  // A step pill (even the current step's) shows that step as scripted; the
  // visitor's key stays.
  useEffect(() => {
    setUserView(null);
    setUserChord(null);
    setUserMode(null);
  }, [stepIndex, resetKey]);
  useEffect(() => {
    if (mode === 'static') setTick(TICKS);
  }, [mode]);

  const view = (!auto && userView) || STEP_VIEW[stepIndex] || 'scale';
  const walking = auto && stepIndex === 0;
  const keyPc =
    userKey ??
    (walking
      ? KEY_WALK[Math.min(KEY_WALK.length - 1, Math.floor(tick / 1.5))]
      : 0);
  const key = keyCenterOf(keyPc);
  const keyName = displayAccidentals(key.name);

  const modes = useMemo(() => parallelModes(keyPc), [keyPc]);
  const chords = useMemo(() => diatonicTriads(keyPc), [keyPc]);
  const major = modes[1];
  const spellings = useMemo(() => getScaleSpellings(keyPc, 'ionian'), [keyPc]);

  const chordIdx =
    userChord ?? (auto && stepIndex === 1 && tick < 4 ? null : AUTO_CHORD);
  // Auto: walk the modes; a visitor who takes over mid-walk keeps its place.
  const modeIdx =
    userMode ??
    (mode !== 'static' && stepIndex === 2 ? Math.min(6, tick) : DEFAULT_MODE);
  const shownMode = view === 'modes' ? modes[modeIdx] : major;
  const color = shownMode.parent.color;

  const hint = useMemo(
    () => new Map(shownMode.midis.map((m) => [m, color])),
    [shownMode, color],
  );
  const lit = useMemo(() => {
    const m = new Map<number, string>();
    if (view === 'chords' && chordIdx !== null)
      chords[chordIdx].midis.forEach((n) => m.set(n, chords[chordIdx].color));
    if (runMidi !== null) m.set(runMidi, color);
    if (pressed !== null) m.set(pressed, color);
    return m;
  }, [view, chordIdx, chords, runMidi, pressed, color]);

  /** Play a scale up: the first note from the click, the rest sound-gated. */
  const runScale = (midis: number[]) => {
    clearTimers();
    setRunMidi(midis[0]);
    playNotes([midis[0]], 0.3);
    midis.slice(1).forEach((m, i) =>
      timers.current.push(
        window.setTimeout(
          () => {
            setRunMidi(m);
            audio.notes([m], 0.3);
          },
          (i + 1) * NOTE_MS,
        ),
      ),
    );
    timers.current.push(
      window.setTimeout(() => setRunMidi(null), midis.length * NOTE_MS + 150),
    );
  };

  const pickView = (v: View) => {
    onUserAction();
    setUserView(v);
  };
  const pickKey = (pc: number) => {
    onUserAction();
    clearTimers();
    setUserKey(pc);
  };
  const pickChord = (i: number) => {
    onUserAction();
    setUserChord(i);
    playNotes(chords[i].midis, 0.9);
  };
  const pickMode = (i: number) => {
    onUserAction();
    setUserMode(i);
    runScale(modes[i].midis);
  };
  const pressKey = (midi: number) => {
    onUserAction();
    setPressed(midi);
    window.setTimeout(() => setPressed(null), 280);
    playNotes([midi], 0.5);
  };

  const title =
    view === 'scale'
      ? `The ${keyName} major scale`
      : view === 'chords'
        ? `The chords of ${keyName} major`
        : `Seven modes of ${keyName}`;

  const caption =
    view === 'modes'
      ? `${keyName} ${shownMode.name} uses the notes of ${displayAccidentals(
          shownMode.parent.name,
        )} major, so it takes ${displayAccidentals(shownMode.parent.name)}’s color.`
      : view === 'chords'
        ? `All seven chords come from ${keyName} major, so they share its color.`
        : stepPattern(major.intervals).join(' · ');

  return (
    <div
      className={cn(
        'grid h-full gap-4 p-4 text-white',
        compact ? 'grid-cols-1 grid-rows-[auto_1fr]' : 'grid-cols-[40%_1fr]',
      )}
    >
      {/* Circle of fifths: pick the key; in Modes it shows the parent key. */}
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-3">
        <div data-tour-target="circle">
          <CircleOfFifthsSvg
            selectedPitch={shownMode.parent.pitchClass}
            selectedMode="major"
            size={compact ? 160 : 270}
            ariaLabel={`Key center: ${keyName} major`}
            onSelectPitch={pickKey}
          />
        </div>
        <span className="text-center text-xs text-white/60">
          {view === 'modes' ? (
            <>
              <span className="font-semibold text-white">
                {keyName} {shownMode.name}
              </span>{' '}
              · parent key {displayAccidentals(shownMode.parent.name)}
            </>
          ) : (
            <span className="font-semibold text-white">{keyName} major</span>
          )}
        </span>
      </div>

      {/* Lesson panel */}
      <div className="flex min-h-0 flex-col gap-3">
        <div className="flex flex-col gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
          <div className="flex items-center gap-2">
            <span className="grid size-8 place-items-center rounded-lg bg-white/10">
              <BookOpen className="size-4" />
            </span>
            <div className="flex min-w-0 flex-col">
              <span className="text-[11px] uppercase tracking-[0.12em] text-white/45">
                Lesson · Theory
              </span>
              <span className="truncate text-sm font-semibold">{title}</span>
            </div>
            <div
              role="group"
              aria-label="Theory views"
              className="ml-auto flex shrink-0 rounded-full bg-black/30 p-0.5"
            >
              {VIEWS.map((v) => (
                <button
                  key={v.id}
                  type="button"
                  aria-pressed={view === v.id}
                  data-tour-target={v.id === 'scale' ? undefined : v.id}
                  onClick={() => pickView(v.id)}
                  className={cn(
                    'rounded-full px-3 py-1 text-xs font-semibold transition-colors',
                    view === v.id
                      ? 'bg-white text-[#101012]'
                      : 'text-white/55 hover:text-white',
                  )}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          {view === 'scale' && (
            <div className="flex items-center gap-2">
              <div className="flex flex-1 gap-1">
                {major.midis.map((m) => (
                  <span
                    key={m}
                    className={cn(
                      'flex-1 rounded-md py-1.5 text-center text-xs font-semibold transition-colors duration-200',
                      runMidi === m || pressed === m
                        ? 'text-[#101012]'
                        : 'bg-white/[0.05] text-white/70',
                    )}
                    style={
                      runMidi === m || pressed === m
                        ? { background: color }
                        : undefined
                    }
                  >
                    {displayAccidentals(spellings.get(m % 12) ?? '')}
                  </span>
                ))}
              </div>
              <button
                type="button"
                onClick={() => {
                  onUserAction();
                  runScale(major.midis);
                }}
                className="flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-[#101012] transition-transform duration-300 hover:scale-105"
                style={{ background: color }}
              >
                <Play className="size-3 fill-current" /> Play
              </button>
            </div>
          )}

          {view === 'chords' && (
            <div
              className={cn(
                'grid gap-1.5',
                compact ? 'grid-cols-4' : 'grid-cols-7',
              )}
            >
              {chords.map((c, i) => (
                <motion.button
                  key={`${keyPc}-${c.token}`}
                  type="button"
                  initial={mode === 'static' ? false : { opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.05 }}
                  onClick={() => pickChord(i)}
                  className={cn(
                    'flex flex-col items-start rounded-md px-2 py-1.5 text-left text-[#101012] transition-shadow',
                    chordIdx === i && 'ring-2 ring-white',
                  )}
                  style={{ background: c.color }}
                >
                  <span className="text-sm font-bold leading-none">
                    {displayAccidentals(c.name)}
                  </span>
                  <span className="mt-1 text-[10px] font-semibold opacity-70">
                    {c.roman}
                  </span>
                </motion.button>
              ))}
            </div>
          )}

          {view === 'modes' && (
            <div
              className={cn(
                'grid gap-1.5',
                compact ? 'grid-cols-4' : 'grid-cols-7',
              )}
            >
              {modes.map((m, i) => (
                <button
                  key={m.mode}
                  type="button"
                  onClick={() => pickMode(i)}
                  className={cn(
                    'flex flex-col items-start rounded-md px-2 py-1.5 text-left text-[#101012] transition-[box-shadow,opacity] duration-200',
                    modeIdx === i ? 'ring-2 ring-white' : 'opacity-80',
                  )}
                  style={{ background: m.parent.color }}
                >
                  <span className="text-[11px] font-bold leading-none">
                    {m.name}
                  </span>
                  <span className="mt-1 text-[10px] font-semibold opacity-70">
                    from {displayAccidentals(m.parent.name)}
                  </span>
                </button>
              ))}
            </div>
          )}

          <p className="min-h-4 text-xs text-white/55">{caption}</p>
        </div>

        <div
          data-tour-target="keys"
          className={cn('min-h-24', compact ? 'h-28 flex-none' : 'flex-1')}
        >
          <DemoKeys
            startMidi={48}
            octaves={3}
            hint={hint}
            lit={lit}
            onPress={pressKey}
            label="Theory keyboard"
          />
        </div>
      </div>
    </div>
  );
};
