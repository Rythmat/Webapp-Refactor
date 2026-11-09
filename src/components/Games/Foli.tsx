/* eslint-disable react/jsx-sort-props */
// ── Foli ────────────────────────────────────────────────────────────────────
// Call and response on hand drums: Foli plays a rhythm, the player plays it
// back. Levels add 8th-note triplets, 16ths, a second bar, then 10 BPM a
// level up to 300; a streak clears a level, and conquering 300 BPM opens the
// same climb on four drums (curriculum/engine/foli).
//
// ONE CLOCK
// Everything runs on the audio clock from one downbeat: bar n starts at
// t0 + n bars. The metronome's clicks, the call's notes and the answer's
// window all hang off that grid, and every hit the player plays is kept
// with the moment it was played (the event's own timestamp, on the audio
// clock, less the latency to the player's ears), whatever the phase. So a
// downbeat played a little early is graded, not thrown away, and nothing
// drifts the way chained timers did. Timers only update the screen.

import { Pause, Play } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  NoteStyle,
  PlayheadSubscription,
} from '@/components/notation/StaffView';
import {
  defaultKeys,
  MODE_DRUMS,
  type FoliDrum,
} from '@/curriculum/engine/foli/drums';
import {
  gradeAnswer,
  toleranceFor,
  type FoliHit,
} from '@/curriculum/engine/foli/grade';
import {
  foliLevel,
  LAST_LEVEL,
  levelNews,
  type FoliMode,
} from '@/curriculum/engine/foli/levels';
import {
  buildCall,
  TICKS_PER_BEAT,
  type FoliNote,
} from '@/curriculum/engine/foli/rhythms';
import { useSettingsStore } from '@/features/settings/useSettingsStore';
import { useGameOptions } from '@/hooks/data/gameOptions/useGameOptions';
import { useSaveGameOptions } from '@/hooks/data/gameOptions/useSaveGameOptions';
import { ArcadeGameHeader } from './ArcadeGameHeader';
import { FoliAudio } from './FoliParts/FoliAudio';
import { FoliPads, type DrumGlow } from './FoliParts/FoliPads';
import { FoliStaff } from './FoliParts/FoliStaff';
import { FOLI_GAME_ID, useFoliProgress } from './FoliParts/useFoliProgress';
import { VolumeDial } from './VolumeDial';
import { useArcadeStreak, winXpLine } from './scoring/ArcadeStreak';

// ── Constants ─────────────────────────────────────────────────────────────────

const MAX_LIVES = 5;
/** Tries at each call: call, answer, call again, answer again. */
const CYCLES = 2;
/** The first downbeat, this far after Start. */
const START_LEAD_S = 0.15;
/** How far ahead the clicks are scheduled. */
const CLICK_LOOKAHEAD_S = 0.15;
const FLASH_HOLD_MS = 160;
/** The latency to the player's ears, at most. */
const MAX_DEVICE_LATENCY_S = 0.2;

/** Start/Play Again button height; Change Keys sits above it at exactly half. */
const START_BUTTON_HEIGHT = 38;

// ── Types ─────────────────────────────────────────────────────────────────────

type Phase = 'loading' | 'ready' | 'playing' | 'paused' | 'won' | 'over';
type Status = 'count' | 'listening' | 'input' | 'success' | 'fail';
type KeyBindings = Record<FoliDrum, string>;

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Keys that can't be bound to a drum — they'd trap the user in rebind mode. */
const UNBINDABLE_CODES = new Set([
  'Escape',
  'Tab',
  'ShiftLeft',
  'ShiftRight',
  'ControlLeft',
  'ControlRight',
  'AltLeft',
  'AltRight',
  'MetaLeft',
  'MetaRight',
  'CapsLock',
  'Space',
  'Enter',
]);

const KEY_LABEL_OVERRIDES: Record<string, string> = {
  ArrowLeft: '←',
  ArrowRight: '→',
  ArrowUp: '↑',
  ArrowDown: '↓',
  Comma: ',',
  Period: '.',
  Slash: '/',
  Semicolon: ';',
  Quote: "'",
  BracketLeft: '[',
  BracketRight: ']',
  Backslash: '\\',
  Minus: '-',
  Equal: '=',
  Backquote: '`',
  Backspace: 'BKSP',
};

/** Short display label for a KeyboardEvent.code ('KeyA' → 'A'). */
function keyLabel(code: string): string {
  if (KEY_LABEL_OVERRIDES[code]) return KEY_LABEL_OVERRIDES[code];
  if (code.startsWith('Key')) return code.slice(3);
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return code.slice(6);
  return code;
}

/** Saved bindings, if they're whole: two drums are { left, right }. */
function readBindings(mode: FoliMode, raw: unknown): KeyBindings | null {
  if (!raw || typeof raw !== 'object') return null;
  const keys = defaultKeys(mode);
  const r = raw as Record<string, unknown>;
  const picks: Partial<Record<FoliDrum, unknown>> =
    mode === 'two'
      ? { bongoHigh: r.left, bongoLow: r.right }
      : Object.fromEntries(MODE_DRUMS.four.map((d) => [d, r[d]]));
  const drums = MODE_DRUMS[mode];
  if (!drums.every((d) => typeof picks[d] === 'string' && picks[d]))
    return null;
  const codes = drums.map((d) => picks[d] as string);
  if (new Set(codes).size !== codes.length) return null;
  drums.forEach((d, i) => (keys[d] = codes[i]));
  return keys;
}

/** The latency from the audio clock to the player's ears. */
function heardLatency(ctx: AudioContext): number {
  const device = Math.min(
    MAX_DEVICE_LATENCY_S,
    Math.max(0, (ctx.outputLatency ?? 0) + (ctx.baseLatency ?? 0)),
  );
  return device + useSettingsStore.getState().outputLatencyMs / 1000;
}

/** The staff's playhead, read from the audio clock each frame. */
function createPlayhead() {
  const listeners = new Set<(tick: number) => void>();
  let origin: { at: number; tickS: number; ctx: AudioContext } | null = null;
  let tick: number | null = null;
  let frame = 0;
  const loop = () => {
    if (origin) {
      const t = (origin.ctx.currentTime - origin.at) / origin.tickS;
      tick = t >= 0 ? t : null;
      if (tick !== null) listeners.forEach((l) => l(tick!));
    }
    frame = requestAnimationFrame(loop);
  };
  const source: PlayheadSubscription = {
    get: () => tick,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
  return {
    source,
    /** Run the playhead from an audio-clock time; null hides it. */
    from(at: number | null, tickS = 1, ctx?: AudioContext) {
      origin = at === null || !ctx ? null : { at, tickS, ctx };
      if (!origin) tick = null;
      if (!frame && origin) frame = requestAnimationFrame(loop);
    },
    stop() {
      cancelAnimationFrame(frame);
      frame = 0;
      origin = null;
      tick = null;
    },
  };
}

// ── Main Component ────────────────────────────────────────────────────────────

export type FoliProps = {
  onCorrect?: () => void;
  onWrong?: () => void;
  /** A level begins: the streak starts from nothing. */
  onRestart?: () => void;
};

export default function Foli({
  onCorrect,
  onWrong,
  onRestart,
}: FoliProps = {}) {
  const { progress, clearLevel, openFour } = useFoliProgress();
  const streak = useArcadeStreak();

  const [phase, setPhase] = useState<Phase>('loading');
  const phaseRef = useRef<Phase>('loading');
  const [status, setStatus] = useState<Status>('count');
  const [mode, setMode] = useState<FoliMode>('two');
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(MAX_LIVES);
  const [score, setScore] = useState(0);
  const [call, setCall] = useState<FoliNote[]>([]);
  const [noteStyles, setNoteStyles] = useState<Map<string, NoteStyle>>(
    new Map(),
  );
  const [glows, setGlows] = useState<Partial<Record<FoliDrum, DrumGlow>>>({});
  const [volume, setVolume] = useState(1);
  /** The level just cleared, and what clearing it meant. */
  const [cleared, setCleared] = useState<{
    level: number;
    mode: FoliMode;
  } | null>(null);

  const audioRef = useRef<FoliAudio | null>(null);
  const audio = useCallback(() => (audioRef.current ??= new FoliAudio()), []);
  const playhead = useMemo(() => createPlayhead(), []);
  /** Bumped by every start and stop: a run's timers check it's still theirs. */
  const runRef = useRef(0);
  const hitsRef = useRef<FoliHit[]>([]);
  const clickTimerRef = useRef<number>(0);
  const levelRef = useRef(1);
  const modeRef = useRef<FoliMode>('two');
  const livesRef = useRef(MAX_LIVES);

  const sp = useCallback((p: Phase) => {
    phaseRef.current = p;
    setPhase(p);
  }, []);

  // Open where the player left off: the highest level they've opened.
  const openedRef = useRef(false);
  useEffect(() => {
    if (openedRef.current) return;
    if (phaseRef.current !== 'loading' && phaseRef.current !== 'ready') return;
    if (progress.two > 1 || progress.four > 0) {
      openedRef.current = true;
      setLevel(progress.two);
    }
  }, [progress]);

  // ── Key bindings ────────────────────────────────────────────────────
  const savedOptions = useGameOptions<{
    keyBindings?: unknown;
    keyBindings4?: unknown;
  }>(FOLI_GAME_ID);
  const saveGameOptions = useSaveGameOptions(FOLI_GAME_ID);
  const [bindings, setBindings] = useState<Record<FoliMode, KeyBindings>>({
    two: defaultKeys('two'),
    four: defaultKeys('four'),
  });
  const bindingsRef = useRef(bindings);
  bindingsRef.current = bindings;
  const savedBindingsAppliedRef = useRef(false);
  useEffect(() => {
    if (savedBindingsAppliedRef.current || !savedOptions.data) return;
    savedBindingsAppliedRef.current = true;
    setBindings({
      two:
        readBindings('two', savedOptions.data.keyBindings) ??
        defaultKeys('two'),
      four:
        readBindings('four', savedOptions.data.keyBindings4) ??
        defaultKeys('four'),
    });
  }, [savedOptions.data]);
  const [bindingMode, setBindingMode] = useState(false);
  const [bindingDrum, setBindingDrum] = useState<FoliDrum | null>(null);
  const bindingRef = useRef<{ on: boolean; drum: FoliDrum | null }>({
    on: false,
    drum: null,
  });
  bindingRef.current = { on: bindingMode, drum: bindingDrum };
  const [keysSavedNote, setKeysSavedNote] = useState<string | null>(null);

  const drums = MODE_DRUMS[mode];

  // ── Sound ───────────────────────────────────────────────────────────
  // The drums load as the game opens; a run waits for its own (four drums
  // load the first time they're played).
  useEffect(() => {
    let gone = false;
    void audio()
      .load(MODE_DRUMS.two)
      .catch((err: unknown) => console.error('[Foli] sounds failed', err))
      .finally(() => {
        if (!gone && phaseRef.current === 'loading') sp('ready');
      });
    return () => {
      gone = true;
    };
  }, [audio, sp]);

  const handleVolumeChange = useCallback(
    (next: number) => {
      setVolume(next);
      audio().setVolume(next);
    },
    [audio],
  );

  const flash = useCallback((drum: FoliDrum, glow: DrumGlow = 'hit') => {
    setGlows((g) => ({ ...g, [drum]: glow }));
    window.setTimeout(
      () => setGlows((g) => (g[drum] === glow ? { ...g, [drum]: 'idle' } : g)),
      FLASH_HOLD_MS,
    );
  }, []);

  // ── Stopping ────────────────────────────────────────────────────────
  const stop = useCallback(() => {
    runRef.current += 1;
    window.clearInterval(clickTimerRef.current);
    playhead.stop();
    audioRef.current?.cancelScheduled();
    audioRef.current?.stopShaker();
  }, [playhead]);

  useEffect(
    () => () => {
      stop();
      audioRef.current?.close();
    },
    [stop],
  );

  // ── A run ───────────────────────────────────────────────────────────
  /** A run of a level; `resume` carries on after a pause, lives and score kept. */
  const start = useCallback(
    (atLevel: number, inMode: FoliMode, resume = false) => {
      stop();
      const run = runRef.current;
      const engine = audio();
      void engine
        .load(MODE_DRUMS[inMode])
        .catch((err: unknown) => console.error('[Foli] sounds failed', err))
        .then(() => {
          if (runRef.current === run)
            beginRef.current(run, engine, atLevel, inMode, resume);
        });
    },
    [audio, stop],
  );

  const begin = useCallback(
    (
      run: number,
      engine: FoliAudio,
      atLevel: number,
      inMode: FoliMode,
      resume: boolean,
    ) => {
      const ctx = engine.ctx;
      const spec = foliLevel(atLevel);
      const beatS = 60 / spec.bpm;
      const barS = 4 * beatS;
      const tickS = beatS / TICKS_PER_BEAT;
      const t0 = ctx.currentTime + START_LEAD_S;
      const barAt = (bar: number) => t0 + bar * barS;
      const live = () => runRef.current === run;
      /** Do `fn` at an audio-clock time (on screen, give or take a frame). */
      const at = (t: number, fn: () => void) =>
        window.setTimeout(
          () => live() && fn(),
          Math.max(0, (t - ctx.currentTime) * 1000),
        );
      const until = (t: number) =>
        new Promise<void>((resolve) => at(t, resolve));

      levelRef.current = spec.level;
      modeRef.current = inMode;
      hitsRef.current = [];
      setLevel(spec.level);
      setMode(inMode);
      setCleared(null);
      setCall([]);
      setNoteStyles(new Map());
      setStatus('count');
      sp('playing');
      // A new run starts the level over; a resumed one carries on.
      if (!resume) {
        livesRef.current = MAX_LIVES;
        setLives(MAX_LIVES);
        setScore(0);
        onRestart?.();
      }

      // The click: every beat of the grid, scheduled a little ahead.
      let nextBeat = 0;
      const scheduleClicks = () => {
        while (t0 + nextBeat * beatS < ctx.currentTime + CLICK_LOOKAHEAD_S) {
          engine.click(t0 + nextBeat * beatS, nextBeat % 4 === 0);
          nextBeat += 1;
        }
      };
      scheduleClicks();
      clickTimerRef.current = window.setInterval(scheduleClicks, 25);
      engine.startShaker(spec.bpm, t0);

      void (async () => {
        let bar = 1; // bar 0 is the count-in
        while (live() && livesRef.current > 0) {
          const notes = buildCall(spec, inMode, Math.random);
          const tolerance = toleranceFor(notes, spec.bpm);
          let passed = false;
          for (let cycle = 0; cycle < CYCLES && !passed; cycle++) {
            const callStart = barAt(bar);
            at(callStart - 0.05, () => {
              setCall(notes);
              setNoteStyles(new Map());
              setStatus('listening');
              setGlows({});
              playhead.from(callStart, tickS, ctx);
            });
            for (const note of notes) {
              const when = callStart + note.startTick * tickS;
              engine.play(note.drum, when);
              at(when, () => flash(note.drum));
            }
            bar += spec.bars;
            const answerStart = barAt(bar);
            // In development only: the answer to come, for a test to play.
            if (import.meta.env.DEV)
              (window as unknown as Record<string, unknown>).__foli = {
                notes,
                answerStart,
                tickS,
                latency: heardLatency(ctx),
                now: () => ctx.currentTime,
              };
            at(answerStart - tolerance, () => {
              setStatus('input');
              playhead.from(answerStart, tickS, ctx);
            });
            bar += spec.bars;
            await until(barAt(bar) + tolerance + 0.03);
            if (!live()) return;
            const grade = gradeAnswer(
              notes,
              hitsRef.current,
              answerStart,
              spec.bpm,
              spec.bars,
              tolerance,
            );
            passed = grade.passed;
            setNoteStyles(
              new Map(
                notes.map((_, i) => [
                  String(i),
                  { color: grade.matched.has(i) ? '#22c55e' : '#f87171' },
                ]),
              ),
            );
          }
          playhead.from(null);
          setGlows(
            Object.fromEntries(
              MODE_DRUMS[inMode].map((d) => [d, passed ? 'success' : 'fail']),
            ),
          );
          if (passed) {
            setStatus('success');
            setScore((s) => s + 1);
            onCorrect?.();
          } else {
            setStatus('fail');
            livesRef.current -= 1;
            setLives(livesRef.current);
            onWrong?.();
          }
          hitsRef.current = hitsRef.current.slice(-64);
          // A bar to see how it went, then the next call.
          bar += 1;
          await until(barAt(bar) - 0.1);
        }
        if (!live()) return;
        stop();
        sp('over');
      })();
    },
    [flash, onCorrect, onRestart, onWrong, playhead, sp, stop],
  );
  const beginRef = useRef(begin);
  beginRef.current = begin;

  // A streak won: the level is cleared. Congratulations, and what's next.
  const lastWinRef = useRef(streak?.win?.id ?? 0);
  useEffect(() => {
    const win = streak?.win;
    if (!win || win.id <= lastWinRef.current) return;
    lastWinRef.current = win.id;
    if (phaseRef.current !== 'playing') return;
    stop();
    clearLevel(modeRef.current, levelRef.current);
    setCleared({ level: levelRef.current, mode: modeRef.current });
    sp('won');
  }, [streak?.win, stop, clearLevel, sp]);

  // In development only: start any level, for a test to look at.
  useEffect(() => {
    if (!import.meta.env.DEV) return;
    const w = window as unknown as Record<string, unknown>;
    w.__foliStart = (atLevel: number, inMode: FoliMode) =>
      start(atLevel, inMode);
    return () => {
      delete w.__foliStart;
    };
  }, [start]);

  // ── Pause ───────────────────────────────────────────────────────────
  // A pause stops the clock where it is and drops the round under way, which
  // counts neither way; resuming counts in again and plays a fresh call,
  // lives, score and streak as they were.
  const pause = useCallback(() => {
    if (phaseRef.current !== 'playing') return;
    stop();
    setGlows({});
    setCall([]);
    setNoteStyles(new Map());
    sp('paused');
  }, [stop, sp]);

  const resume = useCallback(() => {
    if (phaseRef.current !== 'paused') return;
    start(levelRef.current, modeRef.current, true);
  }, [start]);

  // ── A hit ───────────────────────────────────────────────────────────
  const hit = useCallback(
    (drum: FoliDrum, timeStamp: number) => {
      const engine = audio();
      engine.play(drum);
      flash(drum);
      if (phaseRef.current !== 'playing') return;
      const ctx = engine.ctx;
      // When it was played, on the audio clock, as the player heard the beat.
      const since = Math.max(0, performance.now() - timeStamp) / 1000;
      hitsRef.current.push({
        t: ctx.currentTime - since - heardLatency(ctx),
        drum,
      });
    },
    [audio, flash],
  );

  // ── Rebinding drum keys ─────────────────────────────────────────────
  const assignKey = useCallback(
    (drum: FoliDrum, code: string) => {
      setBindings((all) => {
        const now = { ...all[mode] };
        const holder = MODE_DRUMS[mode].find((d) => now[d] === code);
        if (holder && holder !== drum) now[holder] = now[drum];
        now[drum] = code;
        return { ...all, [mode]: now };
      });
      setBindingDrum(null);
    },
    [mode],
  );

  const saveKeys = useCallback(async () => {
    setBindingMode(false);
    setBindingDrum(null);
    const keys = bindingsRef.current;
    try {
      await saveGameOptions.mutateAsync({
        keyBindings: { left: keys.two.bongoHigh, right: keys.two.bongoLow },
        keyBindings4: Object.fromEntries(
          MODE_DRUMS.four.map((d) => [d, keys.four[d]]),
        ),
      });
      setKeysSavedNote('Keys saved to your profile');
    } catch (error) {
      console.error('Failed to save Foli key bindings', error);
      setKeysSavedNote('Keys saved for this session only');
    }
  }, [saveGameOptions]);

  // ── The keyboard: drum keys, Space/Enter to start ───────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const binding = bindingRef.current;
      if (binding.on) {
        if (e.code === 'Escape') {
          setBindingDrum(null);
          return;
        }
        if (!binding.drum || UNBINDABLE_CODES.has(e.code)) return;
        e.preventDefault();
        assignKey(binding.drum, e.code);
        return;
      }
      if (e.code === 'Escape') {
        if (phaseRef.current === 'playing') pause();
        else if (phaseRef.current === 'paused') resume();
        return;
      }
      const keys = bindingsRef.current[modeRef.current];
      const drum = MODE_DRUMS[modeRef.current].find((d) => keys[d] === e.code);
      if (drum) {
        e.preventDefault();
        hit(drum, e.timeStamp);
      } else if (e.code === 'Space' || e.code === 'Enter') {
        if (phaseRef.current === 'paused') {
          e.preventDefault();
          resume();
        } else if (
          phaseRef.current === 'ready' ||
          phaseRef.current === 'over'
        ) {
          e.preventDefault();
          start(levelRef.current, modeRef.current);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hit, start, assignKey, pause, resume]);

  // Keep the chosen level and mode in reach of the keyboard handler.
  useEffect(() => {
    levelRef.current = level;
    modeRef.current = mode;
  }, [level, mode]);

  // ── Display ─────────────────────────────────────────────────────────
  const opened = mode === 'two' ? progress.two : progress.four;
  const spec = foliLevel(level);
  const statusLabel: Record<Status, string> = {
    count: 'Count in…',
    listening: 'Listen to the rhythm…',
    input: 'Your turn — play it back!',
    success: 'Rhythm matched!',
    fail: 'Not quite…',
  };
  const keyLabels = Object.fromEntries(
    drums.map((d) => [d, keyLabel(bindings[mode][d])]),
  ) as Partial<Record<FoliDrum, string>>;
  const hexPts = '0,-6 5.2,-3 5.2,3 0,6 -5.2,3 -5.2,-3';
  const conquering =
    cleared !== null && cleared.level >= LAST_LEVEL && cleared.mode === 'two';

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        position: 'relative',
      }}
    >
      <ArcadeGameHeader
        title="Foli"
        stats={[
          {
            label: 'Level',
            value: `${mode === 'four' ? '4 drums · ' : ''}${level}`,
          },
          {
            label: 'Lives',
            value: (
              <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                {Array.from({ length: MAX_LIVES }).map((_, i) => (
                  <svg key={i} width={14} height={14} viewBox="-7 -7 14 14">
                    <polygon
                      points={hexPts}
                      fill={i < lives ? '#a78bfa' : 'rgba(255,255,255,0.08)'}
                      stroke={i < lives ? '#c4b5fd' : 'rgba(255,255,255,0.06)'}
                      strokeWidth={1}
                      style={{ transition: 'fill 0.3s, stroke 0.3s' }}
                    />
                  </svg>
                ))}
              </div>
            ),
          },
          { label: 'Score', value: score },
        ]}
      />

      <div
        style={{
          position: 'relative',
          flex: '1 1 0%',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 18,
          padding: '20px 16px',
        }}
      >
        {/* Volume — tucked inside the left edge of the play area */}
        <div
          style={{
            position: 'absolute',
            left: 16,
            top: '50%',
            transform: 'translateY(-50%)',
            zIndex: 2,
          }}
        >
          <div className="rounded-xl border border-white/5 bg-black/20 px-3 py-2 backdrop-blur-sm">
            <VolumeDial value={volume} onChange={handleVolumeChange} />
          </div>
        </div>

        {/* Pause — tucked inside the right edge of the play area */}
        {(phase === 'playing' || phase === 'paused') && (
          <div
            style={{
              position: 'absolute',
              right: 16,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 2,
            }}
          >
            <button
              type="button"
              onClick={phase === 'playing' ? pause : resume}
              aria-label={phase === 'playing' ? 'Pause' : 'Resume'}
              title={`${phase === 'playing' ? 'Pause' : 'Resume'} (Esc)`}
              className="flex flex-col items-center gap-1 rounded-xl border border-white/5 bg-black/20 px-4 py-3 text-zinc-300 backdrop-blur-sm transition-colors hover:text-white"
            >
              {phase === 'playing' ? <Pause size={22} /> : <Play size={22} />}
              <span className="text-[10px] uppercase tracking-wider">
                {phase === 'playing' ? 'Pause' : 'Resume'}
              </span>
            </button>
          </div>
        )}

        <FoliPads
          drums={drums}
          glows={glows}
          keyLabels={keyLabels}
          disabled={phase === 'loading'}
          onPress={hit}
          bindingMode={bindingMode}
          selected={bindingMode ? bindingDrum : null}
          onSelect={setBindingDrum}
        />

        {phase === 'playing' && (
          <>
            <div
              style={{
                fontSize: 12,
                fontWeight: 500,
                minHeight: 16,
                textAlign: 'center',
                color:
                  status === 'success'
                    ? '#22c55e'
                    : status === 'fail'
                      ? '#f87171'
                      : status === 'input'
                        ? '#ddd6fe'
                        : 'var(--color-text-dim, #6b7280)',
              }}
            >
              {statusLabel[status]}
            </div>
            {call.length > 0 && (
              <FoliStaff
                notes={call}
                bars={spec.bars}
                noteStyles={noteStyles}
                playhead={playhead.source}
              />
            )}
          </>
        )}

        {phase === 'paused' && (
          <div
            data-foli-paused
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
              textAlign: 'center',
            }}
          >
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                letterSpacing: 3,
                color: '#ddd6fe',
                textTransform: 'uppercase',
              }}
            >
              Paused
            </div>
            <div
              style={{ fontSize: 11, color: 'var(--color-text-dim, #6b7280)' }}
            >
              Resume counts you back in with a new rhythm.
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <ActionButton primary onClick={resume}>
                Resume
              </ActionButton>
              <ActionButton
                onClick={() => {
                  stop();
                  sp('ready');
                }}
              >
                Levels
              </ActionButton>
            </div>
          </div>
        )}

        {/* A streak won: the level is cleared */}
        {phase === 'won' && cleared && (
          <div
            data-foli-won
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 22, fontWeight: 800, color: '#f5f3ff' }}>
              {conquering
                ? 'You have conquered the game!'
                : cleared.level >= LAST_LEVEL
                  ? 'You’ve conquered Foli on four drums!'
                  : 'Congratulations! Streak complete!'}
            </div>
            <div style={{ fontSize: 13, color: '#c4b5fd' }}>
              {cleared.mode === 'four' ? 'Four drums · ' : ''}Level{' '}
              {cleared.level} cleared
              {cleared.level < LAST_LEVEL
                ? ` · Level ${cleared.level + 1} is open: ${levelNews(cleared.level + 1)}`
                : ''}
            </div>
            {streak?.win && (
              <div
                style={{
                  fontSize: streak.win.status === 'granted' ? 26 : 12,
                  fontWeight: 800,
                  color:
                    streak.win.status === 'granted' ? '#f5f3ff' : '#ddd6fe',
                }}
              >
                {winXpLine(streak.win)}
              </div>
            )}
            {conquering ? (
              <>
                <div style={{ fontSize: 13, color: '#e4e4e7' }}>
                  Want to try something even harder?
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <ActionButton
                    primary
                    onClick={() => {
                      openFour();
                      start(1, 'four');
                    }}
                  >
                    Yes! Four drums
                  </ActionButton>
                  <ActionButton onClick={() => sp('ready')}>
                    Not now
                  </ActionButton>
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', gap: 10 }}>
                {cleared.level < LAST_LEVEL && (
                  <ActionButton
                    primary
                    onClick={() => start(cleared.level + 1, cleared.mode)}
                  >
                    Next level: {cleared.level + 1}
                  </ActionButton>
                )}
                <ActionButton
                  onClick={() => start(cleared.level, cleared.mode)}
                >
                  Replay Level {cleared.level}
                </ActionButton>
              </div>
            )}
          </div>
        )}

        {/* Game over */}
        {phase === 'over' && (
          <div
            style={{
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              alignItems: 'center',
            }}
          >
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                letterSpacing: 3,
                color: '#f87171',
                textTransform: 'uppercase',
              }}
            >
              Game Over
            </div>
            <div
              style={{ fontSize: 11, color: 'var(--color-text-dim, #6b7280)' }}
            >
              Level {level} · {score} matched
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <ActionButton primary onClick={() => start(level, mode)}>
                Try again
              </ActionButton>
              <ActionButton onClick={() => sp('ready')}>Levels</ActionButton>
            </div>
          </div>
        )}

        {/* Start: the level, the drums, the keys */}
        {phase === 'ready' && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 10,
            }}
          >
            {progress.four > 0 && !bindingMode && (
              <div style={{ display: 'flex', gap: 6 }}>
                {(['two', 'four'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    aria-pressed={mode === m}
                    onClick={() => {
                      setMode(m);
                      setLevel(m === 'two' ? progress.two : progress.four);
                    }}
                    style={{
                      padding: '4px 12px',
                      borderRadius: 999,
                      border: `1px solid ${mode === m ? '#a78bfa' : 'rgba(255,255,255,0.12)'}`,
                      background:
                        mode === m ? 'rgba(167,139,250,0.14)' : 'transparent',
                      color: mode === m ? '#ddd6fe' : 'rgba(255,255,255,0.5)',
                      fontSize: 11,
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    {m === 'two' ? 'Two drums' : 'Four drums'}
                  </button>
                ))}
              </div>
            )}
            {!bindingMode && (
              <div
                role="group"
                aria-label="Level"
                style={{ display: 'flex', alignItems: 'center', gap: 10 }}
              >
                <StepButton
                  label="Easier level"
                  disabled={level <= 1}
                  onClick={() => setLevel((l) => Math.max(1, l - 1))}
                >
                  ‹
                </StepButton>
                <div style={{ textAlign: 'center', minWidth: 170 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 800,
                      color: '#ddd6fe',
                      letterSpacing: 1,
                    }}
                  >
                    Level {level}
                  </div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>
                    {levelNews(level)}
                    {levelNews(level).endsWith('BPM')
                      ? ''
                      : ` · ${spec.bpm} BPM`}
                  </div>
                </div>
                <StepButton
                  label="Harder level"
                  disabled={level >= opened}
                  onClick={() => setLevel((l) => Math.min(opened, l + 1))}
                >
                  ›
                </StepButton>
              </div>
            )}

            <div
              style={{
                fontSize: 11,
                maxWidth: 320,
                textAlign: 'center',
                lineHeight: 1.5,
                color: bindingMode
                  ? '#ddd6fe'
                  : 'var(--color-text-dim, #6b7280)',
              }}
            >
              {bindingMode
                ? 'Click a drum and then press the key you would like to use'
                : `Listen, then play it back on ${mode === 'two' ? 'two' : 'four'} drums. ${streak?.target ?? 5} in a row clears the level.`}
            </div>

            {keysSavedNote && !bindingMode && (
              <div style={{ fontSize: 10, color: '#22c55e' }}>
                {keysSavedNote}
              </div>
            )}

            <button
              onClick={
                bindingMode
                  ? saveKeys
                  : () => {
                      (document.activeElement as HTMLElement | null)?.blur?.();
                      setKeysSavedNote(null);
                      setBindingMode(true);
                      setBindingDrum(null);
                    }
              }
              style={{
                height: START_BUTTON_HEIGHT / 2,
                padding: '0 18px',
                borderRadius: 6,
                border: '1px solid rgba(167,139,250,0.5)',
                backgroundColor: bindingMode
                  ? 'rgba(167,139,250,0.22)'
                  : 'rgba(167,139,250,0.06)',
                color: '#ddd6fe',
                fontSize: 9,
                fontWeight: 700,
                lineHeight: 1,
                cursor: 'pointer',
                letterSpacing: 1.5,
                textTransform: 'uppercase',
              }}
            >
              {bindingMode ? 'Save Keys' : 'Change Keys'}
            </button>

            {!bindingMode && (
              <button
                onClick={() => start(level, mode)}
                style={{
                  height: START_BUTTON_HEIGHT,
                  padding: '0 36px',
                  borderRadius: 10,
                  border: '1.5px solid #a78bfa',
                  backgroundColor: 'rgba(167,139,250,0.14)',
                  color: '#ddd6fe',
                  fontSize: 13,
                  fontWeight: 700,
                  cursor: 'pointer',
                  letterSpacing: 2,
                  textTransform: 'uppercase',
                }}
              >
                Start
              </button>
            )}
          </div>
        )}

        {phase === 'loading' && (
          <div
            style={{
              fontSize: 11,
              color: 'var(--color-text-dim, #6b7280)',
              letterSpacing: 1,
            }}
          >
            Loading drums…
          </div>
        )}
      </div>
    </div>
  );
}

function ActionButton({
  children,
  onClick,
  primary = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        height: START_BUTTON_HEIGHT,
        padding: '0 22px',
        borderRadius: 10,
        border: `1.5px solid ${primary ? '#a78bfa' : 'rgba(255,255,255,0.15)'}`,
        backgroundColor: primary ? 'rgba(167,139,250,0.18)' : 'transparent',
        color: primary ? '#ede9fe' : 'rgba(255,255,255,0.75)',
        fontSize: 12,
        fontWeight: 700,
        cursor: 'pointer',
        letterSpacing: 1.5,
        textTransform: 'uppercase',
      }}
    >
      {children}
    </button>
  );
}

function StepButton({
  children,
  onClick,
  disabled,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 28,
        height: 28,
        borderRadius: 999,
        border: '1px solid rgba(255,255,255,0.12)',
        background: 'transparent',
        color: disabled ? 'rgba(255,255,255,0.2)' : '#ddd6fe',
        fontSize: 16,
        cursor: disabled ? 'default' : 'pointer',
      }}
    >
      {children}
    </button>
  );
}
