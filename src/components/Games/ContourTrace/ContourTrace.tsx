import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  startPianoSampler,
  triggerPianoAttackRelease,
} from '@/audio/pianoSampler';
import { StarsCanvas } from '@/components/ui/stars-canvas';
import { usePrismStartContours } from '@/hooks/data/prism/usePrismStartContours';
import {
  extractContours,
  filterContoursByLength,
  pickRandomContour,
  contourToMidi,
} from '../content/contourSelector';

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
const DEFAULT_SCALE = [48, 50, 52, 55, 57, 60, 62, 64, 67, 69]; // C major pentatonic, 2 octaves (C3–A4)
const NOTE_DURATION = 0.5;
const NOTE_VELOCITY = 0.7;
const HIT_RADIUS = 30;
const REVEAL_INTERVAL_MS = 250;
const SCALE_SPEED = 0.02; // per frame, ~50 frames to reach full size
const TARGET_SPREAD = 0.4; // 0=all at center, 1=full spread

// Staff position mapping: MIDI → staff position (0 = C3 bottom, 9 = A4 top)
const MIDI_TO_STAFF_POS: Record<number, number> = {
  48: 0, // C3
  50: 1, // D3
  52: 2, // E3
  55: 3, // G3
  57: 4, // A3
  60: 5, // C4
  62: 6, // D4
  64: 7, // E4
  67: 8, // G4
  69: 9, // A4
};

const STAFF_LINE_INDICES = [2, 3, 7, 8]; // E3, G3, E4, G4
const STAFF_PADDING_TOP = 80;
const STAFF_PADDING_BOTTOM = 80;

type Phase = 'loading' | 'ready' | 'playing';

interface StarNode {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  scale: number;
  midi: number;
  noteName: string;
  hit: boolean;
  visible: boolean;
  dismissed: boolean;
  pairId: number;
}

interface ConstellationsProps {
  onComplete?: (result: { accuracy: number }) => void;
  onRoundStart?: () => void;
}

function midiToStaffY(midi: number, canvasHeight: number): number {
  const staffPos = MIDI_TO_STAFF_POS[midi] ?? 0;
  const usableHeight = canvasHeight - STAFF_PADDING_TOP - STAFF_PADDING_BOTTOM;
  const step = usableHeight / 9;
  return canvasHeight - STAFF_PADDING_BOTTOM - staffPos * step;
}

function staffLineY(staffIdx: number, canvasHeight: number): number {
  const usableHeight = canvasHeight - STAFF_PADDING_TOP - STAFF_PADDING_BOTTOM;
  const step = usableHeight / 9;
  return canvasHeight - STAFF_PADDING_BOTTOM - staffIdx * step;
}

function pickDecoyMidi(correctMidi: number): number {
  const options = DEFAULT_SCALE.filter((m) => m !== correctMidi);
  return options[Math.floor(Math.random() * options.length)];
}

let nextPairId = 0;

export default function Constellations({
  onComplete: _onComplete,
  onRoundStart,
}: ConstellationsProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>('loading');
  const [score, setScore] = useState(0);

  const starsRef = useRef<StarNode[]>([]);
  const hitOrderRef = useRef<number[]>([]);
  const canvasSize = useRef({ w: 0, h: 0 });
  const revealTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const nextRevealIdx = useRef(0);
  const playingRef = useRef(false);

  // Load contours from Prism
  const { data: contourData, isPending } = usePrismStartContours();
  const allContours = useMemo(
    () => extractContours(contourData?.contours),
    [contourData],
  );

  const gameContours = useMemo(
    () => filterContoursByLength(allContours, 4, 8),
    [allContours],
  );

  const FALLBACK_CONTOURS = useMemo(
    () => [
      [0, 2, 4, 2, 0],
      [0, 1, 2, 3, 4],
      [4, 3, 2, 1, 0],
      [0, 2, 1, 3, 2, 4],
      [0, 4, 2, 4, 0],
      [2, 0, 4, 2, 0],
    ],
    [],
  );

  const availableContours =
    gameContours.length > 0 ? gameContours : FALLBACK_CONTOURS;

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

  // Mark ready when contours are available
  useEffect(() => {
    if (!isPending && phase === 'loading') {
      setPhase('ready');
    }
  }, [isPending, phase]);

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
      if (star.scale < 0.05) return;

      const isHit = star.hit;
      const vs = Math.min(star.scale, 1); // cap visual scale at 1
      const baseRadius = isHit ? 16 : 10;
      const radius = baseRadius * vs;

      // Ledger line for C4 (below staff)
      if (star.midi === 60 && vs > 0.5) {
        ctx.strokeStyle = `rgba(255, 255, 255, ${0.15 * vs})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(star.x - 20 * vs, star.y);
        ctx.lineTo(star.x + 20 * vs, star.y);
        ctx.stroke();
      }

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
        glow.addColorStop(0, `rgba(255, 255, 255, ${0.6 * vs})`);
        glow.addColorStop(0.4, `rgba(167, 139, 250, ${0.3 * vs})`);
        glow.addColorStop(1, 'rgba(167, 139, 250, 0)');
      } else {
        glow.addColorStop(0, `rgba(255, 255, 255, ${0.2 * vs})`);
        glow.addColorStop(0.4, `rgba(200, 200, 255, ${0.08 * vs})`);
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
        core.addColorStop(0, `rgba(255, 255, 255, ${0.7 * vs})`);
        core.addColorStop(0.4, `rgba(200, 200, 255, ${0.3 * vs})`);
        core.addColorStop(1, 'rgba(200, 200, 255, 0)');
      }
      ctx.fillStyle = core;
      ctx.beginPath();
      ctx.arc(star.x, star.y, radius, 0, Math.PI * 2);
      ctx.fill();

      // Note label (show on hit stars at sufficient scale)
      if (isHit && star.scale > 0.5) {
        ctx.fillStyle = '#fff';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(star.noteName, star.x, star.y + radius + 14);
      }
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
        if (!star.visible || star.dismissed) continue;
        star.scale += SCALE_SPEED;
        star.x = centerX + (star.targetX - centerX) * star.scale;
        star.y = centerY + (star.targetY - centerY) * star.scale;
      }

      // Prune stars that flew off-screen
      const before = stars.length;
      starsRef.current = stars.filter(
        (s) => s.x > -50 && s.x < w + 50 && s.y > -50 && s.y < h + 50,
      );
      const pruned = before - starsRef.current.length;
      if (pruned > 0) {
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
        nextRevealIdx.current = Math.max(0, nextRevealIdx.current - pruned);
      }

      drawCanvas();
      animFrameRef.current = requestAnimationFrame(tick);
    };

    animFrameRef.current = requestAnimationFrame(tick);
  }, [drawCanvas]);

  // --- Spawn a new batch of star pairs from a new contour ---
  const spawnBatch = useCallback(() => {
    const { w, h } = canvasSize.current;
    const contour = pickRandomContour(availableContours) ?? [0, 2, 4, 2, 0];
    const midi = contourToMidi(contour, DEFAULT_SCALE);

    const centerX = w / 2;
    const centerY = h / 2;
    const newStars: StarNode[] = [];

    for (let i = 0; i < midi.length; i++) {
      const m = midi[i];
      const pairId = nextPairId++;
      const noteName = NOTE_NAMES[m % 12];
      const octave = Math.floor(m / 12) - 1;

      const rawX = Math.random() * w;
      const rawY = midiToStaffY(m, h);
      const targetX = centerX + (rawX - centerX) * TARGET_SPREAD;
      const targetY = centerY + (rawY - centerY) * TARGET_SPREAD;

      newStars.push({
        x: centerX,
        y: centerY,
        targetX,
        targetY,
        scale: 0,
        midi: m,
        noteName: `${noteName}${octave}`,
        hit: false,
        visible: false,
        dismissed: false,
        pairId,
      });

      // Decoy star at a different staff position, nearby X
      const decoyMidi = pickDecoyMidi(m);
      const decoyNoteName = NOTE_NAMES[decoyMidi % 12];
      const decoyOctave = Math.floor(decoyMidi / 12) - 1;
      const decoyRawX = Math.random() * w;
      const decoyRawY = midiToStaffY(decoyMidi, h);
      const decoyTargetX = centerX + (decoyRawX - centerX) * TARGET_SPREAD;
      const decoyTargetY = centerY + (decoyRawY - centerY) * TARGET_SPREAD;

      newStars.push({
        x: centerX,
        y: centerY,
        targetX: decoyTargetX,
        targetY: decoyTargetY,
        scale: 0,
        midi: decoyMidi,
        noteName: `${decoyNoteName}${decoyOctave}`,
        hit: false,
        visible: false,
        dismissed: false,
        pairId,
      });
    }

    const startIdx = starsRef.current.length;
    starsRef.current = [...starsRef.current, ...newStars];
    nextRevealIdx.current = startIdx;
  }, [availableContours]);

  // --- Reveal next pair via interval ---
  const startRevealTimer = useCallback(() => {
    if (revealTimerRef.current) clearInterval(revealTimerRef.current);

    revealTimerRef.current = setInterval(() => {
      const stars = starsRef.current;
      const idx = nextRevealIdx.current;

      if (idx < stars.length) {
        stars[idx].visible = true;
        if (idx + 1 < stars.length) {
          stars[idx + 1].visible = true;
        }
        nextRevealIdx.current = idx + 2;
      } else {
        // All revealed — immediately spawn next batch for continuous flow
        spawnBatch();
      }
    }, REVEAL_INTERVAL_MS);
  }, [spawnBatch]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (revealTimerRef.current) clearInterval(revealTimerRef.current);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      playingRef.current = false;
    };
  }, []);

  // --- Start playing ---
  const startRound = useCallback(async () => {
    onRoundStart?.();
    await startPianoSampler();

    nextPairId = 0;
    starsRef.current = [];
    hitOrderRef.current = [];
    nextRevealIdx.current = 0;
    setScore(0);

    spawnBatch();

    playingRef.current = true;
    setPhase('playing');
    startRevealTimer();
    startAnimLoop();
  }, [spawnBatch, startRevealTimer, startAnimLoop, onRoundStart]);

  // --- Handle star hit — dismiss partner ---
  const handleStarHit = useCallback(
    (starIndex: number) => {
      const stars = starsRef.current;
      const star = stars[starIndex];
      if (star.hit || !star.visible || star.dismissed) return;
      if (star.scale < 0.5 || star.scale > 2.5) return; // only hittable mid-flight

      star.hit = true;
      hitOrderRef.current.push(starIndex);

      triggerPianoAttackRelease(star.noteName, NOTE_DURATION, NOTE_VELOCITY);

      // Dismiss the partner star in the same pair
      for (let i = 0; i < stars.length; i++) {
        if (
          i !== starIndex &&
          stars[i].pairId === star.pairId &&
          !stars[i].hit
        ) {
          stars[i].dismissed = true;
        }
      }

      setScore((s) => s + 1);

      const allRevealed = nextRevealIdx.current >= stars.length;
      const allDone = stars.every((s) => !s.visible || s.hit || s.dismissed);
      if (allRevealed && allDone) {
        spawnBatch();
      }
    },
    [spawnBatch],
  );

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
        if (stars[i].scale < 0.5 || stars[i].scale > 2.5) continue;
        const dist = Math.hypot(pos.x - stars[i].x, pos.y - stars[i].y);
        if (dist < HIT_RADIUS * stars[i].scale) {
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
    <div className="flex flex-col h-[600px] rounded-2xl overflow-hidden border border-zinc-800 relative">
      {/* Header */}
      <div className="h-14 bg-[#121214]/80 backdrop-blur-sm border-b border-zinc-800 flex items-center justify-between px-6 relative z-10">
        <div className="flex items-center gap-3">
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

      {/* Canvas area with star background */}
      <div ref={containerRef} className="flex-1 relative">
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

        {phase === 'ready' && (
          <div className="absolute inset-0 z-[2] bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center">
            <h3 className="text-3xl font-serif italic text-white mb-2">
              Connect the Stars
            </h3>
            <p className="text-zinc-400 mb-6 max-w-sm text-center">
              Stars fly toward you from the void. Hover over each star to play
              its note and connect the constellation — choose wisely!
            </p>
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
