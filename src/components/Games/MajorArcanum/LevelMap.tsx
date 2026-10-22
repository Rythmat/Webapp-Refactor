// ── Major Arcanum's level map ───────────────────────────────────────────────
// Four modes, six levels each, every level's keys with their Melody and
// Chords marked as they're cleared (Peter, 2026-10-20). A level opens when
// the one before is cleared, a mode when the last one is; anything open can
// be played again. Expert and Maestro need a MIDI keyboard. The Circle (any
// key, free play) is for subscribers: "Upgrade to Access the Circle".

import { Check, Circle, Keyboard, Lock } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import {
  ARCANUM_LEVELS,
  ARCANUM_MODES,
  LEVEL_KEYS,
  MODES,
  levelBpm,
  type ArcanumLevel,
  type ArcanumMode,
  type ArcanumPart,
} from '@/curriculum/engine/majorArcanum/levels';
import {
  currentLevel,
  isCleared,
  levelCleared,
  levelOpen,
  modeOpen,
  nextTask,
  type ArcanumProgress,
  type ArcanumTask,
} from '@/curriculum/engine/majorArcanum/progress';
import { keyLook } from './keyMapping';

/** What a mode asks of the player, in a line. */
const MODE_LINES: Record<ArcanumMode, string> = {
  novice: 'Melodies on 1–5 in short phrases · root-position triads',
  pro: 'Melodies on 1–8 · 7th chords join the triads',
  expert: 'Melodies over two octaves · triads in every inversion',
  maestro: 'Melodies over three octaves · 7th chords in every inversion',
};

const PART_NAMES: Record<ArcanumPart, string> = {
  melody: 'Melody',
  chords: 'Chords',
};

export const taskTitle = (task: ArcanumTask) =>
  `${PART_NAMES[task.part]} in ${keyLook(task.keyPc).keyName.replace(' Major', '')}`;

interface LevelMapProps {
  progress: ArcanumProgress;
  loading: boolean;
  saveFailed: boolean;
  midiConnected: boolean;
  isPremium: boolean;
  /** The level to show first (after a run, the one just played). */
  focus?: { mode: ArcanumMode; level: ArcanumLevel } | null;
  /** The level the player has chosen: the Circle plays at its difficulty. */
  onChoose: (mode: ArcanumMode, level: ArcanumLevel) => void;
  onPlay: (task: ArcanumTask) => void;
  onOpenCircle: () => void;
  onUpgrade: () => void;
}

export function LevelMap({
  progress,
  loading,
  saveFailed,
  midiConnected,
  isPremium,
  focus,
  onChoose,
  onPlay,
  onOpenCircle,
  onUpgrade,
}: LevelMapProps) {
  const [mode, setMode] = useState<ArcanumMode>(
    focus?.mode ?? currentLevel(progress).mode,
  );
  const [level, setLevel] = useState<ArcanumLevel>(
    focus?.level ?? currentLevel(progress).level,
  );
  // The account's progress arrives after the map opens: start where it says.
  useEffect(() => {
    if (focus || loading) return;
    const at = currentLevel(progress);
    setMode(at.mode);
    setLevel(at.level);
    // Once, when the progress has loaded.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const onChooseRef = useRef(onChoose);
  onChooseRef.current = onChoose;
  useEffect(() => {
    onChooseRef.current(mode, level);
  }, [mode, level]);

  const config = MODES[mode];
  const needsMidi = config.midiRequired && !midiConnected;
  const open = levelOpen(progress, mode, level);
  const next = nextTask(progress, mode, level);
  const main: ArcanumTask = next ?? {
    mode,
    level,
    keyPc: LEVEL_KEYS[level][0],
    part: 'melody',
  };

  return (
    <div className="absolute inset-0 z-20 overflow-y-auto bg-black/85 backdrop-blur-sm">
      <div className="mx-auto flex max-w-3xl flex-col gap-5 px-6 py-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-3xl text-white">Choose your level</h2>
            <p className="mt-1 text-sm text-zinc-400">
              Clear a key with a streak in Melody and a streak in Chords:
              phrases in a row without a miss.
            </p>
          </div>
          {isPremium ? (
            <button
              type="button"
              onClick={onOpenCircle}
              className="flex items-center gap-2 rounded-full border border-white/15 px-4 py-2 text-sm text-zinc-200 transition-colors hover:border-white/40 hover:text-white"
            >
              <Circle size={14} /> The Circle: any key
            </button>
          ) : (
            <button
              type="button"
              onClick={onUpgrade}
              className="flex items-center gap-2 rounded-full border border-amber-400/40 bg-amber-400/10 px-4 py-2 text-sm text-amber-200 transition-colors hover:bg-amber-400/20"
            >
              <Lock size={14} /> Upgrade to Access the Circle
            </button>
          )}
        </div>

        {/* Modes */}
        <div className="flex flex-wrap gap-2" role="tablist">
          {ARCANUM_MODES.map((m) => {
            const isOpen = modeOpen(progress, m);
            const before = ARCANUM_MODES[ARCANUM_MODES.indexOf(m) - 1];
            return (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={m === mode}
                disabled={!isOpen}
                title={
                  isOpen
                    ? undefined
                    : `Clear all six ${MODES[before].label} levels to open ${MODES[m].label}`
                }
                onClick={() => {
                  setMode(m);
                  setLevel(currentLevelIn(progress, m));
                }}
                className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm transition-colors ${
                  m === mode
                    ? 'bg-white text-black'
                    : isOpen
                      ? 'border border-white/15 text-zinc-300 hover:text-white'
                      : 'cursor-not-allowed border border-white/5 text-zinc-600'
                }`}
              >
                {!isOpen && <Lock size={12} />}
                {MODES[m].label}
              </button>
            );
          })}
        </div>
        <div className="-mt-2 flex flex-wrap items-center gap-3 text-xs text-zinc-400">
          <span>{MODE_LINES[mode]}</span>
          {config.midiRequired && (
            <span
              className={`flex items-center gap-1 rounded-full px-2 py-0.5 ${
                midiConnected
                  ? 'bg-emerald-500/15 text-emerald-300'
                  : 'bg-amber-400/15 text-amber-200'
              }`}
            >
              <Keyboard size={12} />
              {midiConnected
                ? 'MIDI keyboard connected'
                : 'Needs a MIDI keyboard: connect one to play'}
            </span>
          )}
        </div>

        {/* Levels */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {ARCANUM_LEVELS.map((l) => {
            const isOpen = levelOpen(progress, mode, l);
            const done = levelCleared(progress, mode, l);
            return (
              <button
                key={l}
                type="button"
                disabled={!isOpen}
                aria-pressed={l === level}
                onClick={() => setLevel(l)}
                className={`flex flex-col gap-2 rounded-xl border p-3 text-left transition-colors ${
                  l === level
                    ? 'border-white/60 bg-white/[0.08]'
                    : isOpen
                      ? 'border-white/10 bg-white/[0.03] hover:border-white/30'
                      : 'cursor-not-allowed border-white/5 bg-white/[0.01] opacity-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-white">
                    Level {l}
                  </span>
                  {done ? (
                    <Check size={16} className="text-emerald-400" />
                  ) : !isOpen ? (
                    <Lock size={14} className="text-zinc-500" />
                  ) : null}
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {LEVEL_KEYS[l].map((keyPc) => {
                    const look = keyLook(keyPc);
                    return (
                      <span
                        key={keyPc}
                        className="flex items-center gap-1 rounded-full bg-black/40 px-2 py-0.5 text-xs text-zinc-200"
                      >
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{ background: look.keyColor }}
                        />
                        {look.keyName.replace(' Major', '')}
                        {(['melody', 'chords'] as const).map((part) => (
                          <span
                            key={part}
                            title={PART_NAMES[part]}
                            className={
                              isCleared(progress, {
                                mode,
                                level: l,
                                keyPc,
                                part,
                              })
                                ? 'text-emerald-400'
                                : 'text-zinc-600'
                            }
                          >
                            {part === 'melody' ? '♪' : '♫'}
                          </span>
                        ))}
                      </span>
                    );
                  })}
                </div>
                <span className="text-[11px] text-zinc-500">
                  {levelBpm(mode, l)} BPM
                </span>
              </button>
            );
          })}
        </div>

        {/* The level chosen: its parts */}
        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <span className="text-sm font-semibold text-white">
              {config.label} · Level {level}
            </span>
            <span className="text-xs text-zinc-400">
              A streak: {config.streakPhrases.melody} Melody phrases or{' '}
              {config.streakPhrases.chords} Chords phrases in a row
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {LEVEL_KEYS[level].map((keyPc) => (
              <div key={keyPc} className="flex flex-wrap items-center gap-2">
                <span className="w-24 text-sm text-zinc-300">
                  {keyLook(keyPc).keyName}
                </span>
                {(['melody', 'chords'] as const).map((part) => {
                  const task = { mode, level, keyPc, part };
                  const done = isCleared(progress, task);
                  return (
                    <button
                      key={part}
                      type="button"
                      disabled={!open || needsMidi}
                      onClick={() => onPlay(task)}
                      className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                        done
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20'
                          : 'border-white/10 text-zinc-300 hover:border-white/30 hover:text-white'
                      }`}
                    >
                      {done && <Check size={12} />}
                      {done ? `Replay ${PART_NAMES[part]}` : PART_NAMES[part]}
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
          <button
            type="button"
            disabled={!open || needsMidi}
            onClick={() => onPlay(main)}
            className="mt-4 w-full rounded-lg bg-[#d2404a] px-6 py-3 font-medium text-white shadow-lg shadow-red-900/20 transition-colors hover:bg-[#b9363f] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {next ? `Play ${taskTitle(next)}` : `Replay Level ${level}`}
          </button>
          {saveFailed && (
            <p className="mt-2 text-xs text-amber-300">
              Your progress couldn’t be saved just now. It will be saved with
              your next cleared part.
            </p>
          )}
          {!config.midiRequired && (
            <p className="mt-2 text-xs text-zinc-500">
              Play on a MIDI keyboard, or the computer keyboard: the letters
              show on the keys.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

/** The furthest open level of a mode. */
function currentLevelIn(
  progress: ArcanumProgress,
  mode: ArcanumMode,
): ArcanumLevel {
  let at: ArcanumLevel = 1;
  for (const l of ARCANUM_LEVELS) if (levelOpen(progress, mode, l)) at = l;
  return at;
}
