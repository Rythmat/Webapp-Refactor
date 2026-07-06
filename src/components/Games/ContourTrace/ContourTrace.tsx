import { ArrowLeft } from 'lucide-react';
import { useEffect, useRef, useState, useCallback } from 'react';
import {
  initJamSynth,
  jamNoteOn,
  jamNoteOff,
  jamProgramChange,
  getLocalChannel,
} from '@/components/JamRoom/jamSoundFont';
import { StarsCanvas } from '@/components/ui/stars-canvas';
import { usePrismMode } from '@/hooks/data/prism/usePrismMode';

// --- Constants ---

const NOTE_NAMES = [
  'C',
  'C#',
  'D',
  'Eb',
  'E',
  'F',
  'F#',
  'G',
  'Ab',
  'A',
  'Bb',
  'B',
];
// Pentatonic scale-step fallbacks (semitone offsets from the root), used if the
// backend `/prism/modes/{mode}` dictionary hasn't loaded. These mirror the
// backend `majorpentatonic` / `minorpentatonic` entries exactly.
const MAJOR_PENTATONIC_FALLBACK = [0, 2, 4, 7, 9];
const MINOR_PENTATONIC_FALLBACK = [0, 3, 5, 7, 10];
// Every star's note is played in one octave (C4–B4); we only display pitch
// class, so the octave choice affects audio pitch only.
const PLAY_OCTAVE_BASE = 60; // MIDI C4
const NOTE_DURATION = 0.5;
const NOTE_VELOCITY = 90; // MIDI velocity (0–127) for triggered notes
const SCIFI_FX_PROGRAM = 103;
// Core radii (px, before flight-scale growth) of a star's drawn circle.
const STAR_BASE_RADIUS = 10; // un-hit star
const STAR_HIT_BASE_RADIUS = 16; // already-hit star
const SPAWN_INTERVAL_MS = 250; // how often we re-check whether to launch a ring
const SCALE_SPEED = 0.003; // radial growth per frame

// Stars are released in "generations" — a ring of 2–4 stars launched together
// from the center. Up to two generations share the screen: an outer (older) ring
// and an inner (newer) one. Each ring appears right at the center (its stars
// briefly overlap there, which is fine) and fans out to distinct angles as it
// flies. When the outer ring is fully resolved (or flies off), the next launches.
// Exactly one star per generation carries a note from the active scale; the
// rest carry pitch classes drawn from outside the scale.
const MIN_STARS_PER_GEN = 2;
const MAX_STARS_PER_GEN = 4;
const RING_JITTER = 18; // per-star distance wobble so a ring isn't perfectly even
const MIN_ANGLE_GAP = (80 * Math.PI) / 180; // 80° → up to 4 stars fanned around a ring
// A new generation launches the moment the most-recently-spawned ring reaches
// this fraction of the way from center to the nearest screen edge — giving a
// steady, consistent cadence regardless of whether stars are hit.
const NEXT_GEN_TRIGGER_FRACTION = 0.5; // halfway to the edge
const RING_BASE_DIST_MIN = 180; // floor for a ring's target distance (small screens)

// Staff lines are drawn as ambient decoration only (stars are placed radially,
// not by pitch height). These indices/paddings position the faint lines.
const STAFF_LINE_INDICES = [2, 3, 7, 8];
const STAFF_PADDING_TOP = 80;
const STAFF_PADDING_BOTTOM = 80;

type Phase = 'loading' | 'ready' | 'playing';
type Difficulty = 'easy' | 'medium' | 'hard';

// The scale in play for the current round: a randomly chosen root + major/minor
// pentatonic quality, resolved to concrete pitch classes via the backend
// modes dictionary.
interface ActiveScale {
  rootPc: number; // 0–11
  quality: 'major' | 'minor';
  pcs: number[]; // pitch classes (0–11) that belong to the scale, in scale order
  title: string; // e.g. "C Major Pentatonic"
  noteNames: string[]; // e.g. ["C", "D", "E", "G", "A"]
}

interface StarNode {
  x: number;
  y: number;
  targetX: number; // position at scale = 1 (center + dist along angle)
  targetY: number;
  angle: number; // fixed radial direction (radians)
  dist: number; // target distance from center — sets both speed and trajectory
  scale: number;
  midi: number;
  noteName: string;
  hit: boolean;
  visible: boolean; // shown from spawn; kept for hit/prune bookkeeping
  dismissed: boolean;
  pairId: number;
  genId: number; // which generation (ring) this star belongs to
  inScale: boolean; // whether this star's note belongs to the active scale
}

interface ConstellationsProps {
  onComplete?: (result: { accuracy: number }) => void;
  onRoundStart?: () => void;
  onExit?: () => void;
}

// Resolve a root pitch class + pentatonic quality (and the scale steps from the
// backend dictionary) into the concrete pitch classes and display strings.
function buildScale(
  rootPc: number,
  quality: 'major' | 'minor',
  steps: number[],
): ActiveScale {
  const pcs = steps.map((s) => (rootPc + s) % 12);
  return {
    rootPc,
    quality,
    pcs,
    title: `${NOTE_NAMES[rootPc]} ${quality === 'major' ? 'Major' : 'Minor'} Pentatonic`,
    noteNames: pcs.map((pc) => NOTE_NAMES[pc]),
  };
}

// Radius (px) of a star's drawn core circle at its current flight scale. The
// visual scale is capped at 1 (same cap the renderer uses) and offset by the
// base radius so a star starts legible and grows to 2× as it flies out.
function starVisualRadius(star: StarNode): number {
  const base = star.hit ? STAR_HIT_BASE_RADIUS : STAR_BASE_RADIUS;
  return base * (1 + Math.min(star.scale, 1));
}

function staffLineY(staffIdx: number, canvasHeight: number): number {
  const usableHeight = canvasHeight - STAFF_PADDING_TOP - STAFF_PADDING_BOTTOM;
  const step = usableHeight / 9;
  return canvasHeight - STAFF_PADDING_BOTTOM - staffIdx * step;
}

let nextPairId = 0;
let nextGenId = 0;

export default function Constellations({
  onComplete: _onComplete,
  onRoundStart,
  onExit,
}: ConstellationsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>('loading');
  const [score, setScore] = useState(0);
  const [difficulty, setDifficulty] = useState<Difficulty>('easy');
  // The scale is mirrored in a ref so the animation/spawn callbacks can read it
  // without being re-created; `activeScale` state drives the on-screen display.
  const [activeScale, setActiveScale] = useState<ActiveScale | null>(null);
  const scaleRef = useRef<ActiveScale | null>(null);
  const difficultyRef = useRef<Difficulty>('easy');

  const starsRef = useRef<StarNode[]>([]);
  const hitOrderRef = useRef<number[]>([]);
  const canvasSize = useRef({ w: 0, h: 0 });
  const spawnTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const playingRef = useRef(false);

  // Pentatonic scale steps from the backend modes dictionary. Both are fetched
  // up front so a round can pick major or minor at random with no extra latency.
  const { data: majorPenta, isPending: majorPending } =
    usePrismMode('majorpentatonic');
  const { data: minorPenta, isPending: minorPending } =
    usePrismMode('minorpentatonic');
  const majorSteps = majorPenta?.steps ?? MAJOR_PENTATONIC_FALLBACK;
  const minorSteps = minorPenta?.steps ?? MINOR_PENTATONIC_FALLBACK;

  // --- Canvas resize ---
  useEffect(() => {
    const resize = () => {
      if (containerRef.current && canvasRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        canvasRef.current.width = width;
        canvasRef.current.height = height;
        canvasSize.current = { w: width, h: height };
      }
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // Mark ready once the scale dictionaries have settled (fallbacks cover errors)
  useEffect(() => {
    if (!majorPending && !minorPending && phase === 'loading') {
      setPhase('ready');
    }
  }, [majorPending, minorPending, phase]);

  // --- Draw staff lines and stars ---
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const { width, height } = canvas;

    ctx.clearRect(0, 0, width, height);

    // Draw staff lines (E4, G4, B4)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;
    for (const idx of STAFF_LINE_INDICES) {
      const y = staffLineY(idx, height);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    const stars = starsRef.current;
    const hitOrder = hitOrderRef.current;

    // Draw connection lines between consecutively hit (non-dismissed) stars
    const connectedStars = hitOrder.filter(
      (i) => stars[i] && !stars[i].dismissed,
    );
    if (connectedStars.length > 1) {
      ctx.strokeStyle = '#a78bfa';
      ctx.lineWidth = 3;
      ctx.shadowColor = '#a78bfa';
      ctx.shadowBlur = 8;
      ctx.beginPath();
      for (let i = 0; i < connectedStars.length; i++) {
        const star = stars[connectedStars[i]];
        if (i === 0) ctx.moveTo(star.x, star.y);
        else ctx.lineTo(star.x, star.y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Draw each visible star
    stars.forEach((star) => {
      if (!star.visible || star.dismissed) return;

      const isHit = star.hit;
      // Offset by baseRadius so a star starts at the old maximum size and
      // keeps the same growth factor, staying legible from the start.
      const radius = starVisualRadius(star);
      // Brightness is decoupled from the (slow) flight scale so stars are fully
      // visible the moment they appear at the center, rather than fading in.
      const brightness = Math.min(1, 0.45 + star.scale * 5);

      // Outer glow
      const glow = ctx.createRadialGradient(
        star.x,
        star.y,
        0,
        star.x,
        star.y,
        radius * 2.5,
      );
      if (isHit) {
        glow.addColorStop(0, `rgba(255, 255, 255, ${0.6 * brightness})`);
        glow.addColorStop(0.4, `rgba(167, 139, 250, ${0.3 * brightness})`);
        glow.addColorStop(1, 'rgba(167, 139, 250, 0)');
      } else {
        glow.addColorStop(0, `rgba(255, 255, 255, ${0.2 * brightness})`);
        glow.addColorStop(0.4, `rgba(200, 200, 255, ${0.08 * brightness})`);
        glow.addColorStop(1, 'rgba(200, 200, 255, 0)');
      }
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(star.x, star.y, radius * 2.5, 0, Math.PI * 2);
      ctx.fill();

      // Inner core
      const core = ctx.createRadialGradient(
        star.x,
        star.y,
        0,
        star.x,
        star.y,
        radius,
      );
      if (isHit) {
        core.addColorStop(0, '#ffffff');
        core.addColorStop(0.3, '#c4b5fd');
        core.addColorStop(1, 'rgba(167, 139, 250, 0)');
      } else {
        core.addColorStop(0, `rgba(255, 255, 255, ${0.7 * brightness})`);
        core.addColorStop(0.4, `rgba(200, 200, 255, ${0.3 * brightness})`);
        core.addColorStop(1, 'rgba(200, 200, 255, 0)');
      }
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(star.x, star.y, radius, 0, Math.PI * 2);
      ctx.fill();

      // On easy, light up the perimeter of every in-scale star with a bright
      // white ring so the player can see which notes to play.
      if (difficultyRef.current === 'easy' && star.inScale && !isHit) {
        ctx.save();
        ctx.strokeStyle = `rgba(255, 255, 255, ${Math.min(1, 0.85 * brightness + 0.15)})`;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = 'rgba(255, 255, 255, 0.9)';
        ctx.shadowBlur = 12;
        ctx.beginPath();
        ctx.arc(star.x, star.y, radius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Note label — always shown at the center of the star so players
      // can see which note it represents before hitting it.
      const fontSize = Math.max(8, radius * 1.1);
      ctx.font = `bold ${fontSize}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      // White text at near-full alpha — always brighter than the star's
      // faded perimeter glow so the note stays easily readable.
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, 0.9 * brightness + 0.1)})`;
      // Show only the pitch class (e.g. "C", "Eb") — drop the octave number.
      ctx.fillText(star.noteName.replace(/\d+$/, ''), star.x, star.y);
      ctx.textBaseline = 'alphabetic';
    });
  }, []);

  // --- Animation loop: fly stars forward continuously from center ---
  const startAnimLoop = useCallback(() => {
    const tick = () => {
      if (!playingRef.current) return;

      const { w, h } = canvasSize.current;
      const centerX = w / 2;
      const centerY = h / 2;

      const stars = starsRef.current;
      for (const star of stars) {
        if (star.dismissed) continue;
        star.scale += SCALE_SPEED;
        star.x = centerX + (star.targetX - centerX) * star.scale;
        star.y = centerY + (star.targetY - centerY) * star.scale;
      }

      // Prune stars that flew off-screen
      const before = stars.length;
      starsRef.current = stars.filter(
        (s) => s.x > -50 && s.x < w + 50 && s.y > -50 && s.y < h + 50,
      );
      if (before !== starsRef.current.length) {
        const indexMap = new Map<number, number>();
        let newIdx = 0;
        for (let oldIdx = 0; oldIdx < before; oldIdx++) {
          const s = stars[oldIdx];
          if (s.x > -50 && s.x < w + 50 && s.y > -50 && s.y < h + 50) {
            indexMap.set(oldIdx, newIdx);
            newIdx++;
          }
        }
        hitOrderRef.current = hitOrderRef.current
          .map((i) => indexMap.get(i))
          .filter((i): i is number => i !== undefined);
      }

      drawCanvas();
      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
  }, [drawCanvas]);

  // --- Launch one generation: a ring of 2–4 stars at ~the same distance.
  //     Exactly one carries a note from the active scale; the rest carry pitch
  //     classes chosen at random from outside the scale. ---
  const spawnGeneration = useCallback(() => {
    const { w, h } = canvasSize.current;
    if (w === 0 || h === 0) return;
    const scale = scaleRef.current;
    if (!scale) return;
    const centerX = w / 2;
    const centerY = h / 2;
    const half = Math.min(w, h) / 2;
    // Every generation uses the same base distance (so the two rings keep a
    // constant radial gap as they fly out); per-star RING_JITTER gives a ring
    // "near the same" — but not identical — distances.
    const baseDist = Math.max(RING_BASE_DIST_MIN, half * 0.8);
    const genId = nextGenId++;

    const starsThisGen =
      MIN_STARS_PER_GEN +
      Math.floor(Math.random() * (MAX_STARS_PER_GEN - MIN_STARS_PER_GEN + 1));

    // Pitch classes outside the scale, shuffled — the pool for decoy notes.
    const scaleSet = new Set(scale.pcs);
    const outOfScale: number[] = [];
    for (let pc = 0; pc < 12; pc++) {
      if (!scaleSet.has(pc)) outOfScale.push(pc);
    }
    for (let i = outOfScale.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [outOfScale[i], outOfScale[j]] = [outOfScale[j], outOfScale[i]];
    }

    // The note plan: one in-scale pitch class + unique out-of-scale decoys.
    const plan: { pc: number; inScale: boolean }[] = [
      {
        pc: scale.pcs[Math.floor(Math.random() * scale.pcs.length)],
        inScale: true,
      },
    ];
    for (let i = 0; i < starsThisGen - 1 && i < outOfScale.length; i++) {
      plan.push({ pc: outOfScale[i], inScale: false });
    }
    // Shuffle so the in-scale note doesn't always take the first angle/distance.
    for (let i = plan.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [plan[i], plan[j]] = [plan[j], plan[i]];
    }

    const angularGapOk = (angle: number, others: number[]) =>
      others.every((o) => {
        const d = Math.abs(angle - o) % (Math.PI * 2);
        return Math.min(d, Math.PI * 2 - d) >= MIN_ANGLE_GAP;
      });

    const placed: StarNode[] = [];
    const genAngles: number[] = []; // angular slots used within THIS ring

    for (const spec of plan) {
      // Angle: spaced from other stars in this ring (cross-ring overlap is
      // prevented by the radial gap between generations instead).
      let angle: number | null = null;
      for (let attempt = 0; attempt < 60; attempt++) {
        const candidate = Math.random() * Math.PI * 2;
        if (angularGapOk(candidate, genAngles)) {
          angle = candidate;
          break;
        }
      }
      if (angle === null) continue; // ring full — skip this star

      const dist = baseDist + (Math.random() * 2 - 1) * RING_JITTER;
      genAngles.push(angle);
      const midi = PLAY_OCTAVE_BASE + spec.pc;
      const octave = Math.floor(midi / 12) - 1;
      placed.push({
        x: centerX,
        y: centerY,
        targetX: centerX + Math.cos(angle) * dist,
        targetY: centerY + Math.sin(angle) * dist,
        angle,
        dist,
        scale: 0,
        midi,
        noteName: `${NOTE_NAMES[spec.pc]}${octave}`,
        hit: false,
        visible: true, // shown from the center immediately
        dismissed: false,
        pairId: nextPairId++,
        genId,
        inScale: spec.inScale,
      });
    }

    if (placed.length > 0) {
      starsRef.current = [...starsRef.current, ...placed];
    }
  }, []);

  // --- Spawn timer: launch the next ring the moment the most-recently-spawned
  //     ring reaches halfway to the edge — a steady, consistent cadence. ---
  const startSpawnTimer = useCallback(() => {
    if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);

    spawnTimerRef.current = setInterval(() => {
      if (!playingRef.current) return;
      const { w, h } = canvasSize.current;
      if (!w || !h) return;

      const stars = starsRef.current;
      if (stars.length === 0) {
        spawnGeneration(); // nothing on screen — start the flow
        return;
      }

      // Find the newest ring on screen and its average distance from center.
      let newestGen = -1;
      for (const s of stars) if (s.genId > newestGen) newestGen = s.genId;
      let sum = 0;
      let count = 0;
      for (const s of stars) {
        if (s.genId !== newestGen) continue;
        sum += s.dist * s.scale;
        count++;
      }
      const newestDist = count > 0 ? sum / count : Infinity;

      // Trigger once that ring is halfway from center to the nearest edge.
      const triggerDist = (Math.min(w, h) / 2) * NEXT_GEN_TRIGGER_FRACTION;
      if (newestDist >= triggerDist) spawnGeneration();
    }, SPAWN_INTERVAL_MS);
  }, [spawnGeneration]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (spawnTimerRef.current) clearInterval(spawnTimerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      playingRef.current = false;
    };
  }, []);

  // --- Start playing ---
  const startRound = useCallback(async () => {
    onRoundStart?.();
    await initJamSynth();
    jamProgramChange(getLocalChannel(), SCIFI_FX_PROGRAM);

    nextPairId = 0;
    nextGenId = 0;
    starsRef.current = [];
    hitOrderRef.current = [];
    setScore(0);

    // Randomly pick a root and major/minor pentatonic quality, then resolve it
    // to concrete pitch classes via the backend modes dictionary.
    const rootPc = Math.floor(Math.random() * 12);
    const quality: 'major' | 'minor' = Math.random() < 0.5 ? 'major' : 'minor';
    const steps = quality === 'major' ? majorSteps : minorSteps;
    const scale = buildScale(rootPc, quality, steps);
    scaleRef.current = scale;
    setActiveScale(scale);
    difficultyRef.current = difficulty;

    spawnGeneration();

    playingRef.current = true;
    setPhase('playing');
    startSpawnTimer();
    startAnimLoop();
  }, [
    spawnGeneration,
    startSpawnTimer,
    startAnimLoop,
    onRoundStart,
    majorSteps,
    minorSteps,
    difficulty,
  ]);

  // --- Handle star hit — all stars stay put ---
  const handleStarHit = useCallback((starIndex: number) => {
    const stars = starsRef.current;
    const star = stars[starIndex];
    if (star.hit || !star.visible || star.dismissed) return;

    star.hit = true;
    hitOrderRef.current.push(starIndex);

    const channel = getLocalChannel();
    jamNoteOn(channel, star.midi, NOTE_VELOCITY);
    window.setTimeout(
      () => jamNoteOff(channel, star.midi),
      NOTE_DURATION * 1000,
    );

    // No partner is dismissed — every star in the ring remains after one is
    // chosen. A generation resolves only once all its stars are hit (or have
    // flown off-screen), at which point the spawn timer launches the next ring.
    setScore((s) => s + 1);
  }, []);

  // --- Mouse/Touch hover detection ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const getPos = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      if ('touches' in e && e.touches.length > 0) {
        return {
          x: e.touches[0].clientX - rect.left,
          y: e.touches[0].clientY - rect.top,
        };
      }
      if ('clientX' in e) {
        return { x: e.clientX - rect.left, y: e.clientY - rect.top };
      }
      return null;
    };

    const checkHit = (e: MouseEvent | TouchEvent) => {
      if (phase !== 'playing') return;
      const pos = getPos(e);
      if (!pos) return;

      const stars = starsRef.current;
      for (let i = 0; i < stars.length; i++) {
        if (stars[i].hit || !stars[i].visible || stars[i].dismissed) continue;
        const dist = Math.hypot(pos.x - stars[i].x, pos.y - stars[i].y);
        // Model the cursor as a circle the same size as the star. The two
        // circles touch — activating the star — once the gap between their
        // centers closes to the sum of the radii (2× the star's radius).
        const starRadius = starVisualRadius(stars[i]);
        if (dist < 2 * starRadius) {
          handleStarHit(i);
          break;
        }
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      checkHit(e);
    };

    canvas.addEventListener('mousemove', checkHit);
    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('touchstart', onTouchMove, { passive: false });

    return () => {
      canvas.removeEventListener('mousemove', checkHit);
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('touchstart', onTouchMove);
    };
  }, [phase, handleStarHit]);

  return (
    <div className="relative h-full w-full min-h-0 overflow-hidden">
      {/* Helper bar — floats over the canvas so it doesn't shift the play
          field's center away from the true window center. */}
      <div className="absolute inset-x-0 top-0 h-14 bg-[#121214]/80 backdrop-blur-sm border-b border-zinc-800 flex items-center justify-between px-6 z-10">
        <div className="flex items-center gap-3">
          {onExit && (
            <button
              onClick={onExit}
              className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white transition-colors"
            >
              <ArrowLeft size={16} />
              Back to Arcade
            </button>
          )}
          <h2
            className="text-lg font-semibold text-white"
            style={{ fontFamily: '"Playfair Display", serif' }}
          >
            Constellations
          </h2>
          <span className="text-xs text-zinc-500 uppercase tracking-wider">
            Ear Training
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm text-zinc-400">
          {phase === 'playing' && (
            <>
              <span className="text-purple-300 font-medium">
                Stars: {score}
              </span>
              <span className="text-purple-400 animate-pulse">
                Hover over the stars...
              </span>
            </>
          )}
        </div>
      </div>

      {/* Canvas area with star background — fills the whole window so its
          center (where stars spawn) is the true window center. */}
      <div ref={containerRef} className="absolute inset-0">
        <StarsCanvas
          transparent={false}
          maxStars={400}
          hue={250}
          brightness={0.8}
          speedMultiplier={0.3}
          twinkleIntensity={30}
          className="!absolute inset-0 w-full h-full"
          paused={false}
        />
        <canvas
          ref={canvasRef}
          className="block w-full h-full relative z-[1]"
        />

        {/* Scale display — sits just below the helper bar, centered. */}
        {phase === 'playing' && activeScale && (
          <div className="pointer-events-none absolute inset-x-0 top-14 z-[2] flex flex-col items-center pt-4 text-center">
            <div
              className="text-xl font-semibold text-white"
              style={{ fontFamily: '"Playfair Display", serif' }}
            >
              {activeScale.title}
            </div>
            {(difficulty === 'easy' || difficulty === 'medium') && (
              <div className="mt-1 text-sm font-medium tracking-[0.3em] text-purple-200">
                {activeScale.noteNames.join('  ')}
              </div>
            )}
            {difficulty === 'easy' && (
              <div className="mt-1 text-xs text-zinc-400">
                Play the highlighted notes
              </div>
            )}
          </div>
        )}

        {phase === 'ready' && (
          <div className="absolute inset-0 z-[2] bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center">
            <h3 className="text-3xl font-serif italic text-white mb-2">
              Connect the Stars
            </h3>
            <p className="text-zinc-400 mb-6 max-w-sm text-center">
              Stars fly toward you from the void. Hover over each star to play
              its note and connect the constellation — choose wisely!
            </p>
            <div className="mb-6 flex items-center gap-2">
              {(['easy', 'medium', 'hard'] as Difficulty[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setDifficulty(d)}
                  className={`rounded-full px-5 py-1.5 text-sm font-medium capitalize transition-colors ${
                    difficulty === d
                      ? 'bg-purple-600 text-white'
                      : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                  }`}
                >
                  {d}
                </button>
              ))}
            </div>
            <button
              onClick={startRound}
              className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded transition-colors"
            >
              Start
            </button>
          </div>
        )}

        {phase === 'loading' && (
          <div className="absolute inset-0 z-[2] bg-black/70 flex items-center justify-center">
            <span className="text-zinc-400">Loading constellations...</span>
          </div>
        )}
      </div>
    </div>
  );
}
