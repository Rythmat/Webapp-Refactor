import {
  AnimatePresence,
  animate,
  motion,
  useMotionValue,
  useMotionValueEvent,
  type MotionValue,
} from 'framer-motion';
import {
  BookOpen,
  Calendar,
  ChevronRight,
  Lightbulb,
  MapPin,
  Play,
} from 'lucide-react';
import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { cn } from '@/components/utilities';
import { useNearViewport } from '../../motion/useInView';
import { useSoundOff } from '../useSoundOff';
import { useStepFrame } from '../useStepFrame';
import {
  BACK_LABEL,
  BORROWED,
  CHART,
  INFLUENCES,
  INSIGHT,
  KEY_COLOR,
  KEY_PC,
  LESSON,
  LOOP,
  LOOP_SONG,
  PAYOFF,
  SONG,
  SONG_EVENT,
} from './connections/connectionsData';
import {
  autoFrame,
  BAR_MS,
  LOOP_MS,
  NOTE_MS,
  PLAY_AT,
  STEP_MS,
  HALF_MS,
  HALF_S,
} from './connections/connectionsScript';
import type { SceneProps } from './sceneTypes';
import { MiniPianoRoll } from './studio/MiniPianoRoll';
import { StudioTransport } from './studio/StudioTransport';
import { useAutoEpoch, useScopedState } from './studio/studioHooks';
import { BAR, CLIP_TICKS, rollRange } from './studio/studioSong';
import { STUDIO, studioLayout, type StudioLayout } from './studio/studioTokens';

// Code-split: the globe pulls in cobe.
const LovelyGlobe = lazy(() => import('./connections/LovelyGlobe'));

/** Each step's `data-tour-target` (as in `CONNECTED_TOUR`). */
const TARGET = ['song', 'globe', 'studio', 'lesson'] as const;

const EASE = [0.2, 0.8, 0.2, 1] as const;
const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70';
/** The scene-drawn press where the demo's cursor clicks. */
const PRESSED = 'scale-[0.94] bg-white/15 ring-2 ring-white/60';

/** Faint five-line staff behind a bar's beat slashes (as the Songs demo). */
const STAFF = {
  backgroundImage:
    'repeating-linear-gradient(to bottom, rgba(255,255,255,0.13) 0 1px, transparent 1px 5px)',
};

const mix = (color: string, pct: number) =>
  `color-mix(in srgb, ${color} ${pct}%, transparent)`;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Phones: the scene is laid out this much smaller, then scaled back up. */
const COMPACT_ZOOM = 1.4;

/** The trail the header grows as the song moves through the app. */
const TRAIL: { icon: string; label: string }[] = [
  { icon: '/icons/globe-icon.svg', label: SONG_EVENT.location.city },
  {
    icon: '/icons/studio-icon.svg',
    label: LOOP.map((c) => c.name).join(' '),
  },
  { icon: '/icons/learn-icon.svg', label: LESSON.name },
];

/**
 * "Connected" scene — one song through the app. A song header stays on top as
 * the thread (with the song's real actions, and a trail of where it has been)
 * while the surface under it changes: the song's chart; the Globe, flown to
 * where it began, with its story and influences; the Studio playing its loop,
 * with the Insight card for each chord; and the lesson for its key. Every color
 * is Prism's: E's green for the chords of E, B's for the one borrowed chord.
 */
export const ConnectionsScene = ({
  stepIndex,
  mode,
  visible,
  compact,
  onUserAction,
  playNotes,
  stepProgress,
  audio,
  soundOn,
  resetKey,
  goToStep,
}: SceneProps) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const near = useNearViewport(rootRef, '600px');
  const auto = mode === 'auto';
  const still = mode === 'static';
  const frame = useStepFrame(
    stepProgress,
    stepIndex,
    mode,
    STEP_MS[stepIndex] ?? 0,
    autoFrame,
  );
  const epoch = useAutoEpoch(mode);
  const scope = `${stepIndex}:${epoch}:${resetKey ?? 0}`;

  // ── Visitor state (one visit of a step) ────────────────────────────────
  const [userLit, setUserLit] = useScopedState<number>(scope);
  const [userPlaying, setUserPlaying] = useScopedState<boolean>(scope);
  const [userBar, setUserBar] = useScopedState<number>(scope);
  const [runNote, setRunNote] = useState<number | null>(null);

  // ── Auto sound cues: once per cue of an auto run ───────────────────────
  const lastCue = useRef<string | null>(null);
  // When a cue last sounded: a take-over of the guided loop within that half
  // note leaves its chord ringing (see `takeOver`).
  const cueHeardAt = useRef(-Infinity);
  const cue = `${epoch}:${stepIndex}:${frame.soundKey}`;
  useEffect(() => {
    if (!auto || !frame.sound || lastCue.current === cue) return;
    lastCue.current = cue;
    audio.notes(frame.sound.midis, frame.sound.seconds, 0, 0.6);
    if (audio.isEnabled()) cueHeardAt.current = performance.now();
  }, [cue, auto]);

  // ── Studio playback ────────────────────────────────────────────────────
  const playing = auto ? frame.playing : !!userPlaying;
  const bar = auto ? frame.bar : (userBar ?? frame.bar);
  // One playhead, in ticks (what the Studio's transport and piano roll read):
  // the tour's clock drives it in auto, the visitor's own pass otherwise. A
  // stopped playhead stays where it stopped (Pause, the pass's end) while it's
  // on its bar, else it parks at the bar's start — set while rendering, so the
  // transport and roll read it as they mount.
  const ticks = useMotionValue(0);
  const onBar = (t: number) => t >= bar * BAR && t <= (bar + 1) * BAR;
  if (!playing && !onBar(ticks.get())) ticks.set(bar * BAR);
  useMotionValueEvent(stepProgress, 'change', (p) => {
    // 1 is the hand-over (the tour's clock never gets there): the playhead
    // stays where the visitor took it.
    if (!auto || stepIndex !== 2 || !frame.playing || p >= 1) return;
    ticks.set(clamp01((p * STEP_MS[2] - PLAY_AT) / LOOP_MS) * CLIP_TICKS);
  });
  // A ruler pick restarts its bar, even the bar that's playing.
  const [picks, setPicks] = useState(0);
  // The pass's playhead glide: Pause, Stop and a pick halt it at once, so it
  // can't overwrite where they put the playhead before the effect cleans up.
  const glide = useRef<{ stop: () => void } | null>(null);
  const halt = () => glide.current?.stop();
  // Set by a take-over from the guided loop while its half note still
  // sounds: the pass doesn't strike it again.
  const heard = useRef(false);
  // A hit came due before the audio was up (the click turning Sound on is
  // still starting it): the pass restarts once it is (see `takeOver`).
  const missed = useRef(false);
  useEffect(() => {
    const carried = heard.current;
    heard.current = false;
    missed.current = false;
    if (auto || !userPlaying || !visible) return;
    onUserAction();
    // Resume where the playhead is (after Pause), else from the bar's start.
    const from = ticks.get();
    const start =
      from >= bar * BAR && from < (bar + 1) * BAR ? from : bar * BAR;
    const elapsed = ((start - bar * BAR) / BAR) * BAR_MS;
    ticks.set(start);
    const move = (glide.current = animate(ticks, (bar + 1) * BAR, {
      duration: (BAR_MS - elapsed) / 1000,
      ease: 'linear',
    }));
    // The bar's chord in half notes, as the roll draws it: each hit fires
    // when it's due (not scheduled ahead in the synth), so Pause, Stop, a
    // pick or leaving the step cancel what hasn't sounded.
    const ids = [0, HALF_MS]
      .filter((at) => at + HALF_MS > elapsed && !(carried && at < elapsed))
      .map((at) =>
        window.setTimeout(
          () => {
            if (!audio.isEnabled()) missed.current = true;
            audio.notes(
              LOOP[bar].midis,
              (HALF_S * (at + HALF_MS - Math.max(at, elapsed))) / HALF_MS,
              0,
              0.6,
            );
          },
          Math.max(0, at - elapsed),
        ),
      );
    ids.push(
      window.setTimeout(
        () => setUserBar((b) => ((b ?? bar) + 1) % LOOP.length),
        BAR_MS - elapsed,
      ),
    );
    return () => {
      move.stop();
      ids.forEach((id) => window.clearTimeout(id));
    };
  }, [auto, userPlaying, bar, visible, picks]);

  // Taking over mid-loop keeps it playing on its bar (as the Studio demo's
  // `take`): only Pause and Stop stop it. The loop's chord still rings if it
  // sounded less than a half note ago (not after a focus pause). A take-over
  // is a note gesture: it turns Sound on, and a pass that missed its hit
  // meanwhile restarts once it's on, so the click that turned it on is heard.
  const takeOver = () => {
    if (auto && frame.playing) {
      heard.current =
        audio.isEnabled() && performance.now() - cueHeardAt.current < HALF_MS;
      setUserPlaying(true);
      setUserBar(frame.bar);
    }
    onUserAction();
    if (playing && !audio.isEnabled())
      void audio.enableFromGesture().then((on) => {
        if (on && missed.current) setPicks((n) => n + 1);
      });
  };
  const togglePlay = () => {
    onUserAction();
    if (playing) {
      halt();
      setUserBar(bar);
      setUserPlaying(false);
      audio.disable();
      return;
    }
    const start = () => {
      setUserBar((b) => b ?? 0);
      setUserPlaying(true);
    };
    // Play is a gesture: it turns Sound on, like the other demos' keys, and
    // starts once it's on (Sound going off meanwhile drops it).
    if (audio.isEnabled()) start();
    else
      void audio.enableFromGesture().then((on) => {
        if (on) start();
      });
  };
  const stop = () => {
    onUserAction();
    setUserPlaying(false);
    halt();
    setUserBar(0);
    ticks.set(0);
    audio.disable();
  };
  const pickBar = (i: number) => {
    takeOver();
    halt();
    setUserBar(i);
    ticks.set(i * BAR);
    // While playing, the pass strikes the picked bar itself.
    if (playing) setPicks((n) => n + 1);
    else playNotes(LOOP[i].midis, 0.9);
  };
  // Sound off (the mute, the demo leaving the screen, a hidden tab) pauses
  // the visitor's pass as Pause does.
  useSoundOff(!auto && playing, soundOn, () => {
    halt();
    setUserBar(bar);
    setUserPlaying(false);
  });

  // ── Theory: the visitor's scale run ────────────────────────────────────
  const timers = useRef<number[]>([]);
  const clearRun = () => {
    timers.current.splice(0).forEach(clearTimeout);
    setRunNote(null);
  };
  useEffect(clearRun, [stepIndex, visible]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const runScale = () => {
    onUserAction();
    clearRun();
    LESSON.notes.forEach((n, i) =>
      timers.current.push(
        window.setTimeout(() => {
          setRunNote(i);
          // Only the first note is the gesture; the rest are sound-gated.
          if (i === 0) playNotes([n.midi], 0.3);
          else audio.notes([n.midi], 0.3);
        }, i * NOTE_MS),
      ),
    );
    timers.current.push(
      window.setTimeout(
        () => setRunNote(null),
        LESSON.notes.length * NOTE_MS + 200,
      ),
    );
  };

  // ── Shared bits ────────────────────────────────────────────────────────
  /** `data-tour-target` for this step's first / action element. */
  const tt = (step: number, role: 'first' | 'action') =>
    stepIndex === step && frame.target === role ? TARGET[step] : undefined;
  const pressed = (step: number, role: 'first' | 'action') =>
    stepIndex === step && frame.press === role;
  const go = (step: number) => {
    onUserAction();
    goToStep?.(step);
  };

  const lit = auto ? frame.lit : userLit;
  const note = auto ? frame.note : runNote;

  const fade = still
    ? { initial: false as const, transition: { duration: 0 } }
    : {
        initial: { opacity: 0, x: 16 },
        transition: { duration: 0.32, ease: EASE },
      };

  let surface: ReactNode = null;
  if (stepIndex === 0) {
    surface = (
      <SongSurface
        lit={lit}
        still={still}
        target={tt(0, 'first')}
        pressed={pressed(0, 'first')}
        onPick={(i) => {
          onUserAction();
          setUserLit(i);
          playNotes(LOOP[i % LOOP.length].midis, 0.9);
        }}
      />
    );
  } else if (stepIndex === 2) {
    surface = (
      <StudioSurface
        compact={compact}
        still={still}
        playing={playing}
        bar={bar}
        ticks={ticks}
        playTarget={tt(2, 'first')}
        playPressed={pressed(2, 'first')}
        keyTarget={tt(2, 'action')}
        keyPressed={pressed(2, 'action')}
        onPlay={togglePlay}
        onStop={stop}
        onPick={pickBar}
        onKeyPill={() => {
          takeOver();
          playNotes(LOOP[LOOP.length - 1].midis, 0.9);
        }}
        onRollKey={(midi) => {
          takeOver();
          playNotes([midi], 0.5);
        }}
        onKey={() => go(3)}
      />
    );
  } else if (stepIndex === 3) {
    surface = (
      <TheorySurface
        compact={compact}
        still={still}
        note={note}
        chords={frame.chords}
        payoff={frame.payoff}
        playTarget={tt(3, 'first')}
        playPressed={pressed(3, 'first')}
        backTarget={tt(3, 'action')}
        backPressed={pressed(3, 'action')}
        onPlay={runScale}
        onChord={(midis) => {
          onUserAction();
          playNotes(midis, 0.9);
        }}
        onBack={() => go(0)}
      />
    );
  }

  return (
    <div
      ref={rootRef}
      className="relative flex select-none flex-col overflow-hidden bg-[#101012] text-white"
      // Phones lay the scene out in a smaller box and scale it back up to
      // fill the window, so every label reads at a phone-friendly size.
      style={
        compact
          ? {
              width: `${100 / COMPACT_ZOOM}%`,
              height: `${100 / COMPACT_ZOOM}%`,
              transform: `scale(${COMPACT_ZOOM})`,
              transformOrigin: 'top left',
            }
          : { width: '100%', height: '100%' }
      }
    >
      <SongHeader
        compact={compact}
        still={still}
        trail={stepIndex}
        globeTarget={tt(0, 'action')}
        globePressed={pressed(0, 'action')}
        studioTarget={tt(1, 'action')}
        studioPressed={pressed(1, 'action')}
        onGlobe={() => go(1)}
        onStudio={() => go(2)}
        onLesson={() => go(3)}
      />

      <div className="relative min-h-0 flex-1">
        {/* The Globe stays mounted once near (cobe keeps its canvas warm),
            hidden unless it's the step's surface. */}
        <GlobeSurface
          active={stepIndex === 1}
          compact={compact}
          still={still}
          near={near}
          visible={visible}
          story={stepIndex === 1 && frame.story}
          arcs={stepIndex === 1 && frame.arcs}
          target={tt(1, 'first')}
          pressed={pressed(1, 'first')}
        />
        <AnimatePresence initial={false}>
          {surface && (
            <motion.div
              key={stepIndex}
              className="absolute inset-0"
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, transition: { duration: still ? 0 : 0.16 } }}
              {...fade}
            >
              {surface}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// ── Header: the thread ────────────────────────────────────────────────────

const ActionButton = ({
  icon,
  label,
  target,
  isPressed,
  onClick,
}: {
  icon: string;
  label: string;
  target?: string;
  isPressed: boolean;
  onClick: () => void;
}) => (
  <button
    type="button"
    data-tour-target={target}
    onClick={onClick}
    aria-label={label}
    title={label}
    className={cn(
      'grid size-9 place-items-center rounded-lg transition-[transform,background-color] duration-150 hover:bg-white/[0.08]',
      isPressed && PRESSED,
      FOCUS,
    )}
  >
    <img src={icon} alt="" draggable={false} className="size-5" />
  </button>
);

const SongHeader = ({
  compact,
  still,
  trail,
  globeTarget,
  globePressed,
  studioTarget,
  studioPressed,
  onGlobe,
  onStudio,
  onLesson,
}: {
  compact: boolean;
  still: boolean;
  trail: number;
  globeTarget?: string;
  globePressed: boolean;
  studioTarget?: string;
  studioPressed: boolean;
  onGlobe: () => void;
  onStudio: () => void;
  /** The song's "Open in Lesson": the lesson for its key (E Ionian). */
  onLesson: () => void;
}) => {
  const crumbs = (
    <ol
      aria-label="Where the song has been"
      className="flex min-w-0 items-center gap-1.5 text-xs text-white/50"
    >
      <AnimatePresence initial={false}>
        {TRAIL.slice(0, trail).map((c, i) => (
          <motion.li
            key={c.label}
            className={cn(
              'flex shrink-0 items-center gap-1.5',
              i === trail - 1 && 'text-white',
            )}
            initial={still ? false : { opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: still ? 0 : 0.3 }}
          >
            <ChevronRight aria-hidden className="size-3.5 text-white/25" />
            <img src={c.icon} alt="" className="size-3.5" />
            {c.label}
          </motion.li>
        ))}
      </AnimatePresence>
    </ol>
  );
  return (
    <header
      className={cn(
        'flex shrink-0 flex-col justify-center gap-2 border-b border-white/[0.08] px-5',
        compact ? 'h-[76px]' : 'h-14',
      )}
    >
      <div className="flex items-center gap-3">
        <img
          src={SONG.artistImageRef}
          alt=""
          className="size-8 shrink-0 rounded-md object-cover"
        />
        <p className="shrink-0 text-sm">
          <span className="font-semibold">{SONG.title}</span>
          <span className="text-white/45"> · {SONG.artist}</span>
        </p>
        <span className="flex shrink-0 items-center gap-1.5 text-xs text-white/60">
          <span
            className="size-1.5 rounded-full"
            style={{ background: KEY_COLOR }}
          />
          {SONG.key}
        </span>
        {!compact && crumbs}
        <div className="ml-auto flex shrink-0 items-center gap-1">
          <ActionButton
            icon="/icons/learn-icon.svg"
            label="Open in Lesson"
            isPressed={false}
            onClick={onLesson}
          />
          <ActionButton
            icon="/icons/studio-icon.svg"
            label="Open in Studio"
            target={studioTarget}
            isPressed={studioPressed}
            onClick={onStudio}
          />
          <ActionButton
            icon="/icons/globe-icon.svg"
            label="Open in Globe"
            target={globeTarget}
            isPressed={globePressed}
            onClick={onGlobe}
          />
        </div>
      </div>
      {compact && <div className="h-4">{crumbs}</div>}
    </header>
  );
};

// ── 1 · Song: its chart ───────────────────────────────────────────────────

const SongSurface = ({
  lit,
  still,
  target,
  pressed: isPressed,
  onPick,
}: {
  lit: number | null;
  still: boolean;
  target?: string;
  pressed: boolean;
  onPick: (bar: number) => void;
}) => (
  <div className="flex size-full flex-col p-5">
    <div className="flex min-h-0 flex-1 flex-col gap-2 rounded-xl border border-white/[0.08] bg-white/[0.03] p-4">
      <span className="w-fit rounded-sm border border-white/25 px-1.5 font-serif text-[11px] font-bold text-white/60">
        {CHART.label}
      </span>
      <div className="grid flex-1 auto-rows-fr grid-cols-4">
        {CHART.bars.map((hits, b) => {
          const chord = LOOP[b % LOOP.length];
          const hit = hits[0];
          const isLit = lit === b;
          return (
            <button
              key={b}
              type="button"
              data-tour-target={b === BORROWED ? target : undefined}
              onClick={() => onPick(b)}
              className={cn(
                'flex flex-col justify-end border-l border-white/25 px-3 pb-3 text-left transition-[background-color,transform] duration-150',
                isLit && 'bg-white/[0.06]',
                b === BORROWED && isPressed && PRESSED,
                FOCUS,
              )}
            >
              <span
                className="font-serif text-[22px] font-bold leading-none transition-colors"
                style={{ color: isLit ? chord.color : undefined }}
              >
                {hit.name}
              </span>
              <span className="mt-1 text-[11px] font-semibold text-white/40">
                {hit.degree}
              </span>
              <span className="relative mt-2 h-[21px]" style={STAFF}>
                {[0, 1, 2, 3].map((beat) => (
                  <span
                    key={beat}
                    className="absolute top-1/2 h-3 w-0.5 -translate-y-1/2 rotate-[30deg] bg-white/30"
                    style={{ left: `${(beat + 0.5) * 25}%` }}
                  />
                ))}
              </span>
              <motion.span
                className="mt-2 block h-1 origin-left rounded-full"
                style={{ background: chord.color }}
                initial={still ? false : { scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: 0.4, delay: still ? 0 : b * 0.07 }}
              />
            </button>
          );
        })}
      </div>
    </div>
  </div>
);

// ── 2 · Globe: where it began ─────────────────────────────────────────────

const GlobeSurface = ({
  active,
  compact,
  still,
  near,
  visible,
  story,
  arcs,
  target,
  pressed: isPressed,
}: {
  active: boolean;
  compact: boolean;
  still: boolean;
  near: boolean;
  visible: boolean;
  story: boolean;
  arcs: boolean;
  target?: string;
  pressed: boolean;
}) => (
  <div
    aria-hidden={!active}
    className={cn(
      'absolute inset-0 flex transition-opacity',
      compact ? 'flex-col' : 'flex-row',
      active ? 'opacity-100' : 'pointer-events-none invisible opacity-0',
    )}
    style={{ transitionDuration: still ? '0ms' : active ? '320ms' : '160ms' }}
  >
    <div
      className={cn(
        'relative grid shrink-0 place-items-center',
        compact ? 'h-[148px] w-full' : 'h-full w-[56%]',
      )}
    >
      <div
        className="relative"
        style={{ width: compact ? 140 : 440, height: compact ? 140 : 440 }}
      >
        {near && (
          <Suspense fallback={null}>
            <LovelyGlobe
              focused={active}
              arcs={arcs}
              paused={!active || !visible}
              still={still}
            />
          </Suspense>
        )}
        {/* The flight ends with the song's city at the globe's center. */}
        <span
          data-tour-target={target}
          className={cn(
            'pointer-events-none absolute left-1/2 top-1/2 size-10 -translate-x-1/2 -translate-y-1/2 rounded-full transition-[box-shadow] duration-300',
            isPressed && 'shadow-[0_0_0_10px_rgba(255,255,255,0.18)]',
          )}
        />
      </div>
    </div>

    <motion.div
      className={cn(
        'flex min-w-0 flex-1 flex-col justify-center gap-3',
        compact ? 'gap-1.5 px-5 pb-3' : 'border-l border-white/[0.08] px-7',
      )}
      initial={false}
      animate={story ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
      transition={{ duration: still ? 0 : 0.45, ease: EASE }}
    >
      <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-white/50">
        {SONG_EVENT.location.city}, {SONG_EVENT.location.country}
      </span>
      <h4 className="text-lg font-bold leading-snug">{SONG_EVENT.title}</h4>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-white/60">
        <span className="flex items-center gap-1">
          <Calendar className="size-3.5" /> {SONG_EVENT.year}
        </span>
        <span className="flex items-center gap-1">
          <MapPin className="size-3.5" /> {SONG_EVENT.location.city}
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {SONG_EVENT.genre.map((g) => (
          <span
            key={g}
            className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-xs text-white/75"
          >
            {g}
          </span>
        ))}
      </div>
      <p
        className={cn(
          'text-[13px] leading-relaxed text-white/70',
          compact ? 'line-clamp-2' : 'line-clamp-4',
        )}
      >
        {SONG_EVENT.description}
      </p>
      <div className="flex flex-col gap-2 border-t border-white/[0.08] pt-3">
        <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-white/40">
          Influenced by
        </span>
        {INFLUENCES.map((e) => (
          <motion.div
            key={e.id}
            initial={false}
            animate={{ opacity: arcs ? 1 : 0 }}
            transition={{ duration: still ? 0 : 0.4 }}
          >
            <p className="truncate text-[13px] text-white/85">
              {e.title}
              {compact && <span className="text-white/45"> · {e.year}</span>}
            </p>
            {!compact && (
              <p className="text-[11px] text-white/45">
                {e.year} · {e.location.city}
              </p>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  </div>
);

// ── 3 · Studio: the loop in the piano roll, and Insight on each chord ─────

/** The roll's rows: the loop's voicings (C♯5–A6), padded as the Studio does. */
const ROLL_ROWS = (({ lo, hi }) => hi - lo + 1)(
  rollRange(LOOP_SONG.chordNotes, 0),
);
/** Phones: the one-row Insight under the roll. */
const COMPACT_INSIGHT_H = 48;
/** Stage-space room for the piano roll under the transport and chord ruler. */
const ROLL = {
  desktop: { w: 680, gridH: 422 },
  // Phones: the scene's box (680 × 660 over COMPACT_ZOOM), less the header,
  // transport, rulers and Insight.
  compact: { w: 486, gridH: 257 },
};
const ROLL_KEY_W = 44;
const RULER_H = 18;
const CHORD_RULER_H = 28;

/** The Studio demo's layout, with its piano roll re-measured to fit here. */
const rollLayout = (compact: boolean): StudioLayout => {
  const base = studioLayout(compact);
  const { w, gridH } = compact ? ROLL.compact : ROLL.desktop;
  return {
    ...base,
    w,
    roll: {
      ...base.roll,
      keyW: ROLL_KEY_W,
      ruler: { top: 0, h: RULER_H },
      rows: ROLL_ROWS,
      rowH: gridH / ROLL_ROWS,
      barW: (w - ROLL_KEY_W) / LOOP.length,
    },
  };
};

const StudioSurface = ({
  compact,
  still,
  playing,
  bar,
  ticks,
  playTarget,
  playPressed,
  keyTarget,
  keyPressed,
  onPlay,
  onStop,
  onPick,
  onKeyPill,
  onRollKey,
  onKey,
}: {
  compact: boolean;
  still: boolean;
  playing: boolean;
  bar: number;
  ticks: MotionValue<number>;
  playTarget?: string;
  playPressed: boolean;
  keyTarget?: string;
  keyPressed: boolean;
  onPlay: () => void;
  onStop: () => void;
  onPick: (bar: number) => void;
  onKeyPill: () => void;
  onRollKey: (midi: number) => void;
  onKey: () => void;
}) => {
  const layout = rollLayout(compact);
  const { keyW, barW } = layout.roll;
  return (
    <div
      className="flex size-full flex-col"
      style={{ background: STUDIO.bg, color: STUDIO.text }}
    >
      {/* The Studio's transport: KEY, tempo, ■ ▶ ● and the position. */}
      <div className="relative shrink-0" style={{ height: layout.transportH }}>
        <StudioTransport
          layout={layout}
          compact={compact}
          keyPc={KEY_PC}
          keyColor={KEY_COLOR}
          playing={playing}
          pressPlay={playPressed}
          position={ticks}
          playTarget={playTarget}
          keyLabel="Play the E chord"
          onKey={onKeyPill}
          onPlay={onPlay}
          onStop={onStop}
        />
      </div>

      <div
        className={cn('flex min-h-0 flex-1', compact ? 'flex-col' : 'flex-row')}
      >
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          {/* Chord ruler: one region per bar, over the roll's bars */}
          <div
            className="flex shrink-0 border-b"
            style={{
              height: CHORD_RULER_H,
              paddingLeft: keyW,
              borderColor: STUDIO.border,
            }}
          >
            {LOOP.map((c, i) => (
              <button
                key={c.token}
                type="button"
                onClick={() => onPick(i)}
                className={cn(
                  'flex items-center truncate border-l px-2 text-[11px] font-semibold transition-colors',
                  FOCUS,
                )}
                style={{
                  width: barW,
                  borderColor: STUDIO.border,
                  background: mix(c.color, i === bar ? 45 : 18),
                  color: i === bar ? '#ffffff' : STUDIO.text,
                }}
              >
                {c.label}
              </button>
            ))}
          </div>
          {/* The Studio's piano roll: the loop's MIDI notes in their colors */}
          <div
            className="relative shrink-0 overflow-hidden"
            style={{
              height: RULER_H + (compact ? ROLL.compact : ROLL.desktop).gridH,
            }}
          >
            <MiniPianoRoll
              layout={layout}
              compact={compact}
              staticMode={still}
              notes={LOOP_SONG.chordNotes}
              regions={LOOP_SONG.regions}
              keyPc={KEY_PC}
              position={ticks}
              glow={{ bar, color: LOOP[bar].color }}
              onKey={onRollKey}
            />
          </div>
        </div>

        {/* Insight: the chord under the playhead (phones: one row) */}
        <aside
          className={cn(
            'flex shrink-0',
            compact
              ? 'items-center gap-3 border-t px-4'
              : 'w-[320px] flex-col gap-3 border-l px-5 py-4',
          )}
          style={{
            borderColor: STUDIO.border,
            height: compact ? COMPACT_INSIGHT_H : undefined,
          }}
        >
          {compact ? (
            <Lightbulb
              aria-label="Insight"
              className="size-3.5 shrink-0 text-white/60"
            />
          ) : (
            <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/60">
              <Lightbulb className="size-3.5" /> Insight
              <span className="ml-1 flex items-center gap-1.5 text-xs font-normal normal-case tracking-normal text-white/80">
                <span
                  className="size-1.5 rounded-full"
                  style={{ background: KEY_COLOR }}
                />
                Key of {SONG.key.split(' ')[0]}
                <span className="text-white/45">· Ionian</span>
              </span>
            </span>
          )}
          <InsightCard
            index={bar}
            compact={compact}
            keyTarget={keyTarget}
            keyPressed={keyPressed}
            onKey={onKey}
          />
        </aside>
      </div>
    </div>
  );
};

const InsightCard = ({
  index,
  compact,
  keyTarget,
  keyPressed,
  onKey,
}: {
  index: number;
  compact: boolean;
  keyTarget?: string;
  keyPressed: boolean;
  onKey: () => void;
}) => {
  const card = INSIGHT[index];
  const songKey = card.isSessionParent && card.sessionMode === 'ionian';
  const chord = (
    <div className="flex min-w-0 items-baseline gap-2">
      <span
        className="size-1.5 shrink-0 self-center rounded-full"
        style={{ background: LOOP[index].color }}
      />
      <span className="text-sm font-semibold">{card.hybrid}</span>
      <span className="truncate text-xs text-white/45">{card.chordLabel}</span>
    </div>
  );
  const link = songKey ? (
    <button
      type="button"
      data-tour-target={keyTarget}
      onClick={onKey}
      className={cn(
        'flex shrink-0 items-center justify-between gap-3 rounded-md border border-white/20 bg-white/[0.04] px-2.5 py-1.5 text-xs transition-[transform,background-color] duration-150 hover:bg-white/[0.1]',
        !compact && 'mt-1',
        keyPressed && PRESSED,
        FOCUS,
      )}
    >
      <span className="text-white/55">Song’s key</span>
      <span className="flex items-center gap-1 font-semibold">
        {LESSON.name} <ChevronRight className="size-3.5" />
      </span>
    </button>
  ) : (
    <p
      className={cn(
        'flex shrink-0 items-center justify-between gap-3 rounded-md border border-white/[0.08] px-2.5 py-1.5 text-xs',
        !compact && 'mt-1',
      )}
    >
      <span className="text-white/55">Parent scale</span>
      <span
        className="flex items-center gap-1.5 font-semibold"
        style={{ color: LOOP[index].color }}
      >
        {card.parentKeyLetter} Ionian
      </span>
    </p>
  );
  // Phones: one row under the roll, which already shows the notes.
  if (compact)
    return (
      <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
        {chord}
        {link}
      </div>
    );
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-white/[0.08] bg-white/[0.03] p-3">
      {chord}
      <div className="flex flex-wrap gap-1">
        {card.intervals.split(' ').map((iv, i) => (
          <span
            key={i}
            className="rounded bg-white/[0.06] px-1 py-0.5 font-mono text-[10px] text-white/60"
          >
            {iv}
          </span>
        ))}
      </div>
      <p className="text-[11px] text-white/50">
        Notes: {card.noteNames.join(' – ')}
      </p>
      {link}
    </div>
  );
};

// ── 4 · Theory: the lesson for its key ────────────────────────────────────

const TheorySurface = ({
  compact,
  still,
  note,
  chords,
  payoff,
  playTarget,
  playPressed,
  backTarget,
  backPressed,
  onPlay,
  onChord,
  onBack,
}: {
  compact: boolean;
  still: boolean;
  note: number | null;
  chords: number;
  payoff: boolean;
  playTarget?: string;
  playPressed: boolean;
  backTarget?: string;
  backPressed: boolean;
  onPlay: () => void;
  onChord: (midis: number[]) => void;
  onBack: () => void;
}) => {
  // The loop's chords light in order: C♯m7 (vi), F♯7, B7sus (V), E (I).
  const litRoman = ['vi', null, 'V', 'I'].slice(0, chords);
  const borrowedLit = chords > BORROWED;
  const borrowed = LOOP[BORROWED];
  return (
    <div className={cn('flex size-full', compact ? 'flex-col' : 'flex-row')}>
      <div
        className={cn(
          'flex min-w-0 flex-1 flex-col gap-4',
          compact ? 'gap-3 p-4' : 'justify-center px-6',
        )}
      >
        <div className="flex items-center gap-2">
          <span className="grid size-8 place-items-center rounded-lg bg-white/10">
            <BookOpen className="size-4" />
          </span>
          <div className="flex flex-col">
            <span className="text-[11px] uppercase tracking-[0.12em] text-white/45">
              Lesson · Theory
            </span>
            <span className="text-base font-semibold">{LESSON.name}</span>
          </div>
          <button
            type="button"
            data-tour-target={playTarget}
            onClick={onPlay}
            className={cn(
              'ml-auto flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-[#101012] transition-transform duration-150',
              playPressed && 'scale-[0.94] ring-2 ring-white/60',
              FOCUS,
            )}
            style={{ background: LESSON.color }}
          >
            <Play className="size-3 fill-current" /> Play
          </button>
        </div>

        <div className="flex gap-1">
          {LESSON.notes.map((n, i) => (
            <span
              key={n.midi}
              className={cn(
                'flex flex-1 flex-col items-center rounded-md py-1.5 text-xs font-semibold transition-colors duration-150',
                note === i ? 'text-[#101012]' : 'text-white/80',
              )}
              style={{
                background: note === i ? LESSON.color : mix(LESSON.color, 14),
              }}
            >
              {n.name}
              <span className="text-[10px] font-medium opacity-60">
                {n.degree}
              </span>
            </span>
          ))}
        </div>

        <div className="flex flex-col gap-2">
          <span className="text-[11px] uppercase tracking-[0.12em] text-white/45">
            Chords of {LESSON.name} · and the loop’s borrowed one
          </span>
          <div className="flex items-stretch gap-1.5">
            {LESSON.chords.map((c) => {
              const on = litRoman.includes(c.roman);
              return (
                <button
                  key={c.token}
                  type="button"
                  onClick={() => onChord(c.midis)}
                  className={cn(
                    'flex flex-1 flex-col items-start rounded-md px-2 py-1.5 text-left transition-[background-color,box-shadow] duration-200',
                    on ? 'text-[#101012] ring-2 ring-white' : 'text-white/75',
                    FOCUS,
                  )}
                  style={{ background: on ? c.color : mix(c.color, 14) }}
                >
                  <span className="text-sm font-bold leading-none">
                    {c.name}
                  </span>
                  <span className="mt-1 text-[10px] font-semibold opacity-70">
                    {c.roman}
                  </span>
                </button>
              );
            })}
            <span aria-hidden className="mx-1 w-px bg-white/15" />
            <button
              type="button"
              onClick={() => onChord(borrowed.midis)}
              className={cn(
                'flex flex-col items-start rounded-md px-2 py-1.5 text-left transition-[background-color,box-shadow] duration-200',
                borrowedLit
                  ? 'text-[#101012] ring-2 ring-white'
                  : 'text-white/75',
                FOCUS,
              )}
              style={{
                background: borrowedLit
                  ? borrowed.color
                  : mix(borrowed.color, 14),
              }}
            >
              <span className="text-sm font-bold leading-none">
                {borrowed.name}
              </span>
              <span className="mt-1 text-[10px] font-semibold opacity-70">
                II7 · from B
              </span>
            </button>
          </div>
        </div>

        <p className="text-xs leading-relaxed text-white/55">
          C♯m7, B7sus and E are chords of {LESSON.name}, so they share its
          color. F♯7’s A♯ comes from B major, so it takes B’s.
        </p>
      </div>

      {/* The lesson's payoff */}
      <motion.aside
        className={cn(
          'flex shrink-0 flex-col justify-center gap-2 px-6',
          compact
            ? 'border-t border-white/[0.08] py-3'
            : 'w-[300px] border-l border-white/[0.08]',
        )}
        initial={false}
        animate={payoff ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
        transition={{ duration: still ? 0 : 0.45, ease: EASE }}
      >
        <p className="text-base font-semibold leading-snug">
          {PAYOFF.headline}
        </p>
        {PAYOFF.detail && !compact && (
          <p className="text-xs text-white/55">{PAYOFF.detail}</p>
        )}
        {PAYOFF.fromSong && (
          <p className="text-sm text-white/85">{PAYOFF.fromSong}</p>
        )}
        <button
          type="button"
          data-tour-target={backTarget}
          onClick={onBack}
          className={cn(
            'mt-2 w-fit rounded-full border border-white/20 px-3.5 py-1.5 text-xs font-medium transition-[transform,background-color] duration-150 hover:bg-white/[0.08]',
            backPressed && PRESSED,
            FOCUS,
          )}
        >
          {BACK_LABEL}
        </button>
      </motion.aside>
    </div>
  );
};
