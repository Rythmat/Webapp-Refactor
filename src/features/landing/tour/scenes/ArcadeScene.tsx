import { Flame, Sparkles, Trophy } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/components/utilities';
import { keyCenterColor } from '../../music';
import { DemoKeys, keyCenterPct, whiteKeysBetween } from '../DemoKeys';
import type { SceneProps } from './sceneTypes';

/** The demo's key: F♯ major (teal). */
const KEY_PC = 6;
const COLOR = keyCenterColor(KEY_PC);
/** The keyboard, F4–G5: room for F♯4 up to its octave, mostly black keys. */
const KEYS_FROM = 65;
const KEYS_TO = 79;
const WHITES = whiteKeysBetween(KEYS_FROM, KEYS_TO);
/** One lane per scale note, F♯4–F♯5, each over its key. */
const LANE_MIDIS = [0, 2, 4, 5, 7, 9, 11, 12].map((i) => 66 + i);
const LANE_X = LANE_MIDIS.map((m) => keyCenterPct(m, WHITES));
/** Note width (% of the lanes): under half a white key, so A♯–B never touch. */
const NOTE_W = 48 / WHITES.length;
/** The scale, tinted on the keys as the lanes' targets. */
const HINT = new Map(LANE_MIDIS.map((m) => [m, COLOR]));
const LOOP_MS = 4800;
const FALL_MS = 1700;
const HIT_WINDOW_MS = 220;

/** The phrase by scale degree: lane (`LANE_MIDIS` index) + hit time in the loop. */
const PHRASE = [
  { lane: 0, t: 500 },
  { lane: 2, t: 1100 },
  { lane: 4, t: 1700 },
  { lane: 5, t: 2300 },
  { lane: 7, t: 2900 },
  { lane: 4, t: 3500 },
  { lane: 2, t: 4100 },
];

/** Signed ms until a note's next hit time, wrapped around the loop. */
const untilHit = (t: number, now: number) => {
  let d = t - now;
  if (d < -LOOP_MS / 2) d += LOOP_MS;
  if (d > LOOP_MS / 2) d -= LOOP_MS;
  return d;
};

/**
 * Arcade scene — falling notes of an F♯ major phrase (all in the key-center
 * color), hit on the keys, with streak + XP. In `user` mode it's playable:
 * press the key in a note's lane as it crosses the line.
 */
export const ArcadeScene = ({
  stepIndex,
  mode,
  compact,
  visible,
  onUserAction,
  playNotes,
}: SceneProps) => {
  const color = COLOR;
  const [now, setNow] = useState(0);
  const [xp, setXp] = useState(120);
  const [streak, setStreak] = useState(0);
  const [feedback, setFeedback] = useState<{ id: number; text: string } | null>(
    null,
  );
  const [pressed, setPressed] = useState<number | null>(null);
  const lastHitRef = useRef<Set<number>>(new Set());
  const nowRef = useRef(0);

  const running = mode !== 'static' && visible;
  const autoHits = mode === 'auto' && stepIndex >= 1;

  useEffect(() => {
    if (mode === 'static') {
      setNow(PHRASE[2].t - 400);
      return;
    }
    if (!running) return;
    let raf = 0;
    const start = performance.now();
    const loop = (t: number) => {
      const n = (t - start) % LOOP_MS;
      nowRef.current = n;
      setNow(n);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [running, mode]);

  // Auto-play: register each note as a hit when it crosses the line.
  useEffect(() => {
    if (!autoHits) return;
    PHRASE.forEach((n, i) => {
      const d = untilHit(n.t, now);
      if (d <= 0 && d > -120 && !lastHitRef.current.has(i)) {
        lastHitRef.current.add(i);
        setStreak((s) => s + 1);
        if (stepIndex >= 2) setXp((x) => x + 10);
        setFeedback({ id: Date.now(), text: 'Perfect' });
      }
      if (d > 200) lastHitRef.current.delete(i);
    });
  }, [now, autoHits, stepIndex]);

  useEffect(() => {
    if (mode === 'auto' && stepIndex === 0) {
      setStreak(0);
      setXp(120);
    }
  }, [mode, stepIndex]);

  const lit = useMemo(() => {
    const m = new Map<number, string>();
    if (autoHits || mode === 'static')
      PHRASE.forEach((n) => {
        const d = untilHit(n.t, now);
        if (d <= 0 && d > -160) m.set(LANE_MIDIS[n.lane], color);
      });
    if (pressed !== null) m.set(pressed, color);
    return m;
  }, [now, autoHits, mode, pressed, color]);

  const pressKey = (midi: number) => {
    onUserAction();
    setPressed(midi);
    window.setTimeout(() => setPressed(null), 180);
    playNotes([midi], 0.4);
    const lane = LANE_MIDIS.indexOf(midi);
    const hit = PHRASE.some(
      (n) =>
        n.lane === lane &&
        Math.abs(untilHit(n.t, nowRef.current)) <= HIT_WINDOW_MS,
    );
    if (hit) {
      setStreak((s) => s + 1);
      setXp((x) => x + 10);
      setFeedback({ id: Date.now(), text: 'Perfect' });
    } else {
      setStreak(0);
      setFeedback({ id: Date.now(), text: 'Miss' });
    }
  };

  const showScore = stepIndex >= 2 || mode !== 'auto';

  return (
    <div className="flex h-full flex-col gap-3 p-4 text-white">
      <div className="flex items-center gap-2 text-xs">
        <span className="flex items-center gap-1.5 rounded-md bg-white/[0.06] px-2.5 py-1.5">
          <Sparkles className="size-3.5 text-white/70" />
          Ear training · F♯ major
        </span>
        <div
          data-tour-target="score"
          className={cn(
            'ml-auto flex items-center gap-2 rounded-full border px-1 py-1 transition-all duration-500',
            showScore
              ? 'border-white/40 shadow-[0_0_24px_-6px_rgba(255,255,255,0.5)]'
              : 'border-white/10',
          )}
        >
          <span className="flex items-center gap-1 rounded-full bg-white/[0.06] px-2 py-0.5">
            <Flame className="size-3.5 text-white/80" />
            {streak}
          </span>
          <span className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 text-white">
            <Trophy className="size-3.5" />
            {xp} XP
          </span>
        </div>
      </div>

      <div
        data-tour-target="lanes"
        className="relative min-h-0 flex-1 overflow-hidden rounded-xl border border-white/[0.08] bg-black/30"
      >
        {LANE_X.map((x) => (
          <div
            key={x}
            className="absolute inset-y-0 bg-white/[0.03]"
            style={{ left: `${x - NOTE_W / 2}%`, width: `${NOTE_W}%` }}
          />
        ))}
        {PHRASE.map((n, i) => {
          const d = untilHit(n.t, now);
          if (d > FALL_MS || d < -260) return null;
          const progress = 1 - d / FALL_MS; // 0 at top → 1 at the hit line
          return (
            <span
              key={i}
              className="absolute h-[16%] rounded-md"
              style={{
                left: `${LANE_X[n.lane] - NOTE_W / 2}%`,
                width: `${NOTE_W}%`,
                top: `${progress * 82 - 16}%`,
                background: `linear-gradient(to bottom, color-mix(in srgb, ${color} 30%, transparent), ${color})`,
                boxShadow: d <= 0 ? `0 0 24px ${color}` : undefined,
                opacity: d < 0 ? 1 + d / 260 : 1,
              }}
            />
          );
        })}
        <div className="absolute inset-x-0 top-[82%] h-0.5 bg-white/40" />
        {feedback && (
          <span
            key={feedback.id}
            className="absolute left-1/2 top-[40%] -translate-x-1/2 animate-fade-in-bottom text-2xl"
            style={{ color: feedback.text === 'Miss' ? '#a1a1aa' : '#fff' }}
          >
            {feedback.text}
          </span>
        )}
      </div>

      <div data-tour-target="keys" className={compact ? 'h-28' : 'h-[180px]'}>
        <DemoKeys
          startMidi={KEYS_FROM}
          endMidi={KEYS_TO}
          hint={HINT}
          lit={lit}
          onPress={pressKey}
          label="Arcade keyboard"
        />
      </div>
    </div>
  );
};
