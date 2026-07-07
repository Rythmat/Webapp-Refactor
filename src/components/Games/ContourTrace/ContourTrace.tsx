import { ArrowLeft } from 'lucide-react';
import { useEffect, useRef, useState, useCallback } from 'react';
import {
  initJamSynth,
  jamNoteOn,
  jamNoteOff,
  jamProgramChange,
  jamControllerChange,
  getLocalChannel,
  getDroneChannel,
} from '@/components/JamRoom/jamSoundFont';
import { StarsCanvas } from '@/components/ui/stars-canvas';

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
// Pentatonic scale steps (semitone offsets from the root). These mirror the
// backend `majorpentatonic` / `minorpentatonic` modes-dictionary entries.
const MAJOR_PENTATONIC_STEPS = [0, 2, 4, 7, 9];
const MINOR_PENTATONIC_STEPS = [0, 3, 5, 7, 10];
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

// --- Streak reactivity (rainbow vortex + root-note drone) ---
// A correct (in-scale) note grows the streak; a wrong note resets it. The
// vortex and drone intensity both peak once the streak reaches STREAK_MAX.
const STREAK_MAX = 7;
// The drone is a sustained soundfont note (same instrument as star hits) whose
// loudness is driven by CC7 channel volume; it peaks at MAX_DRONE_CC.
const DRONE_VELOCITY = 100; // note-on velocity for the sustained drone note
const MAX_DRONE_CC = 63; // peak CC7 channel volume (0–127) at full streak
const VORTEX_LERP = 0.06; // how fast the vortex eases toward its target
const VORTEX_SPIN = 0.0009; // base rotation (turns/frame), faster with intensity
const RED_FLASH_DECAY = 0.88; // per-frame falloff of the wrong-note red flash
const HIT_PULSE_DECAY = 0.9; // per-frame falloff of the per-hit brightness pop

// Staff lines are drawn as ambient decoration only (stars are placed radially,
// not by pitch height). These indices/paddings position the faint lines.
const STAFF_LINE_INDICES = [2, 3, 7, 8];
const STAFF_PADDING_TOP = 80;
const STAFF_PADDING_BOTTOM = 80;

type Phase = 'ready' | 'playing';
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

// Paint the rainbow vortex behind the stars. Intensity (0–1) scales the whole
// effect's opacity; phase (0–1) drives rotation and the outward growth of the
// rings; pulse (0–1) brightens the core briefly on each hit.
function drawVortex(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  intensity: number,
  phase: number,
  pulse: number,
): void {
  if (intensity <= 0.01) return;
  const cx = w / 2;
  const cy = h / 2;
  const maxR = Math.hypot(w, h) / 2;
  const supportsConic = typeof ctx.createConicGradient === 'function';

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  // Rotating rainbow swirl across the whole field (subtle background wash).
  if (supportsConic) {
    const conic = ctx.createConicGradient(phase * Math.PI * 2, cx, cy);
    for (let i = 0; i <= 6; i++) {
      conic.addColorStop(i / 6, `hsl(${(i / 6) * 360}, 90%, 55%)`);
    }
    ctx.globalAlpha = intensity * 0.18;
    ctx.fillStyle = conic;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
  }

  // Concentric rings emanating OUTWARD from the centre — as if the viewer is
  // flying toward them. Each ring is born small at the centre and grows; the
  // p*p mapping accelerates that growth so both the ring size and the gap
  // between rings increase as they approach the screen. Rather than one solid
  // ring, each is built from many short, tightly-rippling streams — echoing the
  // multi-stream tubes that follow the cursor.
  const rings = 9;
  const streams = 16; // short arcs that together trace each ring
  const subSegs = 5; // points per stream (enough for the tight ripple)
  const streamFill = 0.6; // fraction of each angular slot drawn (rest is a gap)
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let i = 0; i < rings; i++) {
    const p = (((i / rings + phase) % 1) + 1) % 1; // 0 (centre) → 1 (off-screen)
    const r = maxR * 1.5 * (p * p) + 2; // accelerating outward growth
    const fade = Math.sin(p * Math.PI); // fade in at centre, out at the edge
    const alpha = intensity * 0.6 * fade;
    if (alpha <= 0.01) continue;

    const hueBase = (p * 320 + phase * 720) % 360;
    const wobbleAmp = r * 0.018; // small, tight ripple
    const lineWidth = Math.max(2, maxR * 0.01 + p * maxR * 0.04); // thicker as it nears
    // Streams flow around the ring; alternate direction per ring for variety.
    const flow = phase * Math.PI * 2 * (i % 2 === 0 ? 1 : -1) * 0.6;
    const slot = (Math.PI * 2) / streams;
    const arcLen = slot * streamFill;

    ctx.lineWidth = lineWidth;
    ctx.shadowBlur = lineWidth * 1.4;

    for (let s = 0; s < streams; s++) {
      const a0 = s * slot + flow;
      // Each stream rides at a slightly different radius so they shimmer like
      // separate tubes rather than a single band.
      const radialOffset =
        Math.sin(s * 2.3 + i * 1.7 + phase * 6.283) * r * 0.03;
      const hue = (hueBase + (s / streams) * 360) % 360;
      const color = `hsla(${hue}, 95%, 63%, ${alpha})`;

      ctx.strokeStyle = color;
      ctx.shadowColor = color;
      ctx.beginPath();
      for (let k = 0; k <= subSegs; k++) {
        const a = a0 + (k / subSegs) * arcLen;
        // High angular frequencies → many small, tight fluctuations.
        const wob =
          Math.sin(a * 13 + phase * 10 + i * 2) * wobbleAmp +
          Math.sin(a * 23 - phase * 14 + s) * wobbleAmp * 0.4;
        const rr = r + radialOffset + wob;
        const x = cx + Math.cos(a) * rr;
        const y = cy + Math.sin(a) * rr;
        if (k === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }
  ctx.shadowBlur = 0;

  // Bright core — the light at the end of the tunnel; pops on each hit.
  const coreAlpha = Math.min(1, intensity * 0.5 + pulse * 0.4);
  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 0.55);
  core.addColorStop(0, `rgba(255, 255, 255, ${coreAlpha})`);
  core.addColorStop(0.35, `rgba(190, 170, 255, ${coreAlpha * 0.35})`);
  core.addColorStop(1, 'rgba(120, 90, 255, 0)');
  ctx.fillStyle = core;
  ctx.fillRect(0, 0, w, h);

  ctx.restore();
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
  // Scales are computed locally, so the game is ready to play immediately.
  const [phase, setPhase] = useState<Phase>('ready');
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

  // Streak reactivity: current run of correct notes, the eased vortex intensity
  // and its target, the rotation phase, and the decaying red-flash / hit pulse.
  const streakRef = useRef(0);
  const vortexIntensityRef = useRef(0);
  const vortexTargetRef = useRef(0);
  const vortexPhaseRef = useRef(0);
  const redFlashRef = useRef(0);
  const hitPulseRef = useRef(0);
  // MIDI note of the currently-sounding drone (null when silent), so it can be
  // released on the next round or on unmount.
  const droneNoteRef = useRef<number | null>(null);

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

  // --- Draw staff lines and stars ---
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const { width, height } = canvas;

    ctx.clearRect(0, 0, width, height);

    // Rainbow streak vortex, painted behind the staff/stars.
    drawVortex(
      ctx,
      width,
      height,
      vortexIntensityRef.current,
      vortexPhaseRef.current,
      hitPulseRef.current,
    );

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

    // Wrong-note flash — a muted red wash over everything, fading fast.
    if (redFlashRef.current > 0.01) {
      ctx.save();
      ctx.fillStyle = `rgba(150, 40, 40, ${Math.min(0.45, redFlashRef.current * 0.45)})`;
      ctx.fillRect(0, 0, width, height);
      ctx.restore();
    }
  }, []);

  // --- Animation loop: fly stars forward continuously from center ---
  const startAnimLoop = useCallback(() => {
    let lastTime = 0;
    const tick = (now: number) => {
      if (!playingRef.current) return;

      // Frame-rate-independent step: scale per-frame motion by how long this
      // frame actually took (relative to 60fps). This keeps the stars moving at
      // a constant real-world speed even when the success animation lowers the
      // frame rate. Clamped so a long pause (e.g. tab switch) can't teleport
      // stars across the screen.
      const dt = lastTime ? now - lastTime : 1000 / 60;
      lastTime = now;
      const frameScale = Math.min(4, dt / (1000 / 60));

      const { w, h } = canvasSize.current;
      const centerX = w / 2;
      const centerY = h / 2;

      // Ease the vortex toward its streak-driven target, spin it (faster the
      // more intense it is), and decay the transient flash/pulse effects.
      vortexIntensityRef.current +=
        (vortexTargetRef.current - vortexIntensityRef.current) *
        VORTEX_LERP *
        frameScale;
      vortexPhaseRef.current =
        (vortexPhaseRef.current +
          VORTEX_SPIN * (0.4 + vortexIntensityRef.current) * frameScale) %
        1;
      redFlashRef.current *= Math.pow(RED_FLASH_DECAY, frameScale);
      hitPulseRef.current *= Math.pow(HIT_PULSE_DECAY, frameScale);

      const stars = starsRef.current;
      for (const star of stars) {
        if (star.dismissed) continue;
        star.scale += SCALE_SPEED * frameScale;
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
      if (droneNoteRef.current !== null) {
        const droneChannel = getDroneChannel();
        jamNoteOff(droneChannel, droneNoteRef.current);
        jamControllerChange(droneChannel, 7, 0);
        droneNoteRef.current = null;
      }
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
    const steps =
      quality === 'major' ? MAJOR_PENTATONIC_STEPS : MINOR_PENTATONIC_STEPS;
    const scale = buildScale(rootPc, quality, steps);
    scaleRef.current = scale;
    setActiveScale(scale);
    difficultyRef.current = difficulty;

    // Reset streak reactivity for the new round.
    streakRef.current = 0;
    vortexIntensityRef.current = 0;
    vortexTargetRef.current = 0;
    vortexPhaseRef.current = 0;
    redFlashRef.current = 0;
    hitPulseRef.current = 0;

    // Prepare the root-note drone, two octaves below the play octave. It's a
    // sustained note on the same soundfont instrument as star hits, held on a
    // dedicated channel and left silent (CC7 volume 0) until the streak grows.
    const droneChannel = getDroneChannel();
    const rootDownMidi = PLAY_OCTAVE_BASE + rootPc - 24;
    if (droneNoteRef.current !== null) {
      jamNoteOff(droneChannel, droneNoteRef.current);
    }
    jamProgramChange(droneChannel, SCIFI_FX_PROGRAM);
    jamControllerChange(droneChannel, 7, 0); // CC7 channel volume → silent
    jamNoteOn(droneChannel, rootDownMidi, DRONE_VELOCITY);
    droneNoteRef.current = rootDownMidi;

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

    const droneChannel = getDroneChannel();
    if (star.inScale) {
      // Correct note: grow the streak, swell the vortex and root-note drone.
      streakRef.current += 1;
      const intensity = Math.min(streakRef.current, STREAK_MAX) / STREAK_MAX;
      vortexTargetRef.current = intensity;
      hitPulseRef.current = 1;
      jamControllerChange(
        droneChannel,
        7,
        Math.round(intensity * MAX_DRONE_CC),
      );
      setScore((s) => s + 1);
    } else {
      // Wrong note: break the streak, flash red, and silence the drone/vortex.
      streakRef.current = 0;
      vortexTargetRef.current = 0;
      redFlashRef.current = 1;
      jamControllerChange(droneChannel, 7, 0);
    }
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
      </div>
    </div>
  );
}
