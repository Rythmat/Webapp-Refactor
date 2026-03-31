import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  startPianoSampler,
  triggerPianoAttackRelease,
} from '@/audio/pianoSampler';
import { usePrismStartContours } from '@/hooks/data/prism/usePrismStartContours';
import {
  extractContours,
  filterContoursByLength,
  pickRandomContour,
  contourToMidi,
} from '../content/contourSelector';

// --- Constants ---

const NOTE_NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const DEFAULT_SCALE = [60, 62, 64, 65, 67, 69, 71, 72]; // C major, octave 4-5
const NOTE_DURATION = 0.5; // seconds per note
const NOTE_VELOCITY = 0.7;

type Phase = 'loading' | 'ready' | 'listening' | 'drawing' | 'result';

interface ContourTraceProps {
  onComplete?: (result: { accuracy: number }) => void;
}

/**
 * Contour Trace — "Follow the melody. Draw the line."
 *
 * A melody contour plays; the player draws its shape on a pitch×time grid.
 * Scored on directional accuracy (did you go up when the melody went up?).
 */
export default function ContourTrace({ onComplete }: ContourTraceProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<Phase>('loading');
  const [accuracy, setAccuracy] = useState(0);
  const [roundNum, setRoundNum] = useState(0);

  const currentContour = useRef<number[]>([]);
  const currentMidi = useRef<number[]>([]);
  const drawnPoints = useRef<{ x: number; y: number }[]>([]);
  const isDrawing = useRef(false);
  const canvasSize = useRef({ w: 0, h: 0 });

  // Load contours from Prism
  const { data: contourData, isPending } = usePrismStartContours();
  const allContours = useMemo(
    () => extractContours(contourData?.contours),
    [contourData],
  );

  // Filter to 4–8 note contours for playability
  const gameContours = useMemo(
    () => filterContoursByLength(allContours, 4, 8),
    [allContours],
  );

  // Fallback contours if API hasn't loaded
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

  const availableContours = gameContours.length > 0 ? gameContours : FALLBACK_CONTOURS;

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

  // --- Draw the grid and contour ---
  const drawCanvas = useCallback(
    (
      showActual: boolean,
      playProgress = -1,
    ) => {
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;
      const { width, height } = canvas;

      ctx.clearRect(0, 0, width, height);

      const contour = currentContour.current;
      if (contour.length === 0) return;

      const padding = 40;
      const gridW = width - padding * 2;
      const gridH = height - padding * 2;
      const minVal = Math.min(...contour);
      const maxVal = Math.max(...contour);
      const range = Math.max(maxVal - minVal, 1);

      // Grid lines
      ctx.strokeStyle = '#27272a';
      ctx.lineWidth = 1;
      for (let i = 0; i <= contour.length; i++) {
        const x = padding + (i / contour.length) * gridW;
        ctx.beginPath();
        ctx.moveTo(x, padding);
        ctx.lineTo(x, padding + gridH);
        ctx.stroke();
      }
      for (let i = 0; i <= range; i++) {
        const y = padding + gridH - (i / range) * gridH;
        ctx.beginPath();
        ctx.moveTo(padding, y);
        ctx.lineTo(padding + gridW, y);
        ctx.stroke();
      }

      // Playback progress indicator
      if (playProgress >= 0 && playProgress < contour.length) {
        const x =
          padding + ((playProgress + 0.5) / contour.length) * gridW;
        ctx.strokeStyle = 'rgba(167, 139, 250, 0.3)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, padding);
        ctx.lineTo(x, padding + gridH);
        ctx.stroke();
      }

      // Player's drawn line
      if (drawnPoints.current.length > 1) {
        ctx.strokeStyle = '#a78bfa';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#a78bfa';
        ctx.beginPath();
        drawnPoints.current.forEach((p, i) => {
          if (i === 0) ctx.moveTo(p.x, p.y);
          else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      // Actual contour (shown after drawing)
      if (showActual) {
        ctx.strokeStyle = '#34d399';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#34d399';
        ctx.beginPath();
        contour.forEach((val, i) => {
          const x = padding + ((i + 0.5) / contour.length) * gridW;
          const y = padding + gridH - ((val - minVal) / range) * gridH;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Note labels on actual
        ctx.fillStyle = '#34d399';
        ctx.font = '600 11px Inter, sans-serif';
        ctx.textAlign = 'center';
        contour.forEach((val, i) => {
          const x = padding + ((i + 0.5) / contour.length) * gridW;
          const y = padding + gridH - ((val - minVal) / range) * gridH;
          const midi = currentMidi.current[i];
          if (midi !== undefined) {
            ctx.fillText(NOTE_NAMES[midi % 12], x, y - 12);
          }
        });
      }
    },
    [],
  );

  // --- Start a new round ---
  const startRound = useCallback(async () => {
    await startPianoSampler();
    const contour = pickRandomContour(availableContours) ?? [0, 2, 4, 2, 0];
    const midi = contourToMidi(contour, DEFAULT_SCALE);
    currentContour.current = contour;
    currentMidi.current = midi;
    drawnPoints.current = [];

    setPhase('listening');
    drawCanvas(false);

    // Play the melody with visual progress
    for (let i = 0; i < midi.length; i++) {
      const noteName = NOTE_NAMES[midi[i] % 12];
      const octave = Math.floor(midi[i] / 12) - 1;
      triggerPianoAttackRelease(
        `${noteName}${octave}`,
        NOTE_DURATION,
        NOTE_VELOCITY,
      );
      drawCanvas(false, i);
      await new Promise((r) => setTimeout(r, NOTE_DURATION * 1000 + 100));
    }

    // Switch to drawing phase
    setPhase('drawing');
    drawnPoints.current = [];
    drawCanvas(false);
  }, [availableContours, drawCanvas]);

  // --- Compute directional accuracy ---
  const computeAccuracy = useCallback(() => {
    const contour = currentContour.current;
    const points = drawnPoints.current;
    if (contour.length < 2 || points.length < 2) return 0;

    // Sample the drawn line at contour.length evenly spaced points
    const sampledY: number[] = [];
    for (let i = 0; i < contour.length; i++) {
      const t = i / (contour.length - 1);
      const idx = Math.min(
        Math.floor(t * (points.length - 1)),
        points.length - 1,
      );
      sampledY.push(points[idx].y);
    }

    // Compare directions (lower Y = higher pitch on screen)
    let correctDirections = 0;
    for (let i = 1; i < contour.length; i++) {
      const actualDir = Math.sign(contour[i] - contour[i - 1]);
      const drawnDir = Math.sign(sampledY[i - 1] - sampledY[i]); // inverted Y
      if (actualDir === drawnDir) {
        correctDirections++;
      } else if (actualDir === 0 && Math.abs(sampledY[i] - sampledY[i - 1]) < 20) {
        correctDirections += 0.5; // Flat tolerance — partial credit for near-flat when expected flat
      }
    }

    return correctDirections / (contour.length - 1);
  }, []);

  const finishDrawing = useCallback(() => {
    const acc = computeAccuracy();
    setAccuracy(acc);
    setPhase('result');
    drawCanvas(true);
    onComplete?.({ accuracy: acc });
  }, [computeAccuracy, drawCanvas, onComplete]);

  // --- Mouse/Touch drawing handlers ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const getPos = (e: MouseEvent | TouchEvent) => {
      const rect = canvas.getBoundingClientRect();
      if ('touches' in e) {
        return {
          x: e.touches[0].clientX - rect.left,
          y: e.touches[0].clientY - rect.top,
        };
      }
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const onDown = (e: MouseEvent | TouchEvent) => {
      if (phase !== 'drawing') return;
      isDrawing.current = true;
      drawnPoints.current = [getPos(e)];
    };
    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!isDrawing.current || phase !== 'drawing') return;
      e.preventDefault();
      drawnPoints.current.push(getPos(e));
      drawCanvas(false);
    };
    const onUp = () => {
      if (!isDrawing.current || phase !== 'drawing') return;
      isDrawing.current = false;
      if (drawnPoints.current.length > 5) {
        finishDrawing();
      }
    };

    canvas.addEventListener('mousedown', onDown);
    canvas.addEventListener('mousemove', onMove);
    canvas.addEventListener('mouseup', onUp);
    canvas.addEventListener('mouseleave', onUp);
    canvas.addEventListener('touchstart', onDown, { passive: false });
    canvas.addEventListener('touchmove', onMove, { passive: false });
    canvas.addEventListener('touchend', onUp);

    return () => {
      canvas.removeEventListener('mousedown', onDown);
      canvas.removeEventListener('mousemove', onMove);
      canvas.removeEventListener('mouseup', onUp);
      canvas.removeEventListener('mouseleave', onUp);
      canvas.removeEventListener('touchstart', onDown);
      canvas.removeEventListener('touchmove', onMove);
      canvas.removeEventListener('touchend', onUp);
    };
  }, [phase, drawCanvas, finishDrawing]);

  const nextRound = useCallback(() => {
    setRoundNum((n) => n + 1);
    startRound();
  }, [startRound]);

  const accuracyPct = Math.round(accuracy * 100);
  const accuracyColor =
    accuracyPct >= 80 ? '#34d399' : accuracyPct >= 50 ? '#fbbf24' : '#ef4444';

  return (
    <div className="flex flex-col h-[600px] bg-[#09090b] rounded-2xl overflow-hidden border border-zinc-800">
      {/* Header */}
      <div className="h-14 bg-[#121214] border-b border-zinc-800 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <h2
            className="text-lg font-semibold text-white"
            style={{ fontFamily: '"Playfair Display", serif' }}
          >
            Contour Trace
          </h2>
          <span className="text-xs text-zinc-500 uppercase tracking-wider">
            Ear Training
          </span>
        </div>
        <div className="flex items-center gap-4 text-sm text-zinc-400">
          <span>Round {roundNum + 1}</span>
          {phase === 'drawing' && (
            <span className="text-purple-400 animate-pulse">
              Draw the melody shape...
            </span>
          )}
          {phase === 'listening' && (
            <span className="text-cyan-400 animate-pulse">
              Listen carefully...
            </span>
          )}
        </div>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="flex-1 relative">
        <canvas ref={canvasRef} className="block w-full h-full" />

        {/* Ready overlay */}
        {phase === 'ready' && (
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center">
            <h3 className="text-3xl font-serif italic text-white mb-2">
              Follow the melody
            </h3>
            <p className="text-zinc-400 mb-6 max-w-sm text-center">
              Listen to a melody, then draw its shape on the grid.
              Your directional accuracy will be scored.
            </p>
            <button
              onClick={startRound}
              className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded transition-colors"
            >
              Play Melody
            </button>
          </div>
        )}

        {/* Loading overlay */}
        {phase === 'loading' && (
          <div className="absolute inset-0 bg-black/70 flex items-center justify-center">
            <span className="text-zinc-400">Loading contours...</span>
          </div>
        )}

        {/* Result overlay */}
        {phase === 'result' && (
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center">
            <div className="text-center">
              <div className="text-xs text-zinc-500 uppercase tracking-wider mb-2">
                Directional Accuracy
              </div>
              <div
                className="text-6xl font-light mb-1"
                style={{ color: accuracyColor }}
              >
                {accuracyPct}%
              </div>
              <div className="text-sm text-zinc-400 mb-8">
                {accuracyPct >= 80
                  ? 'Excellent ear!'
                  : accuracyPct >= 50
                    ? 'Getting there!'
                    : 'Keep listening!'}
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={nextRound}
                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-medium rounded transition-colors"
              >
                Next Contour
              </button>
            </div>
            <div className="mt-4 flex items-center gap-4 text-xs text-zinc-500">
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-purple-400" />
                Your drawing
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-0.5 bg-emerald-400" />
                Actual contour
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
