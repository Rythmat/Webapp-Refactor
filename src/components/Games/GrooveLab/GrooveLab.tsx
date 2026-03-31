import { useEffect, useRef, useState, useCallback } from 'react';
import { DrumEngine } from './DrumEngine';

// --- Constants ---

const INSTRUMENTS = ['kick', 'snare', 'hihat', 'rim'] as const;
type Instrument = (typeof INSTRUMENTS)[number];

const INSTRUMENT_COLORS: Record<Instrument, string> = {
  kick: '#E5585C',
  snare: '#F2AA3C',
  hihat: '#38bdf8',
  rim: '#a78bfa',
};

const INSTRUMENT_LABELS: Record<Instrument, string> = {
  kick: 'Kick',
  snare: 'Snare',
  hihat: 'Hi-Hat',
  rim: 'Rim',
};

const STEPS = 16;
const DEFAULT_BPM = 100;

// Preset grooves for match mode
const PRESET_GROOVES: Record<string, Record<Instrument, boolean[]>> = {
  'Basic Rock': {
    kick: [
      true,
      false,
      false,
      false,
      true,
      false,
      false,
      false,
      true,
      false,
      false,
      false,
      true,
      false,
      false,
      false,
    ],
    snare: [
      false,
      false,
      false,
      false,
      true,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      true,
      false,
      false,
      false,
    ],
    hihat: [
      true,
      false,
      true,
      false,
      true,
      false,
      true,
      false,
      true,
      false,
      true,
      false,
      true,
      false,
      true,
      false,
    ],
    rim: new Array(STEPS).fill(false),
  },
  Funk: {
    kick: [
      true,
      false,
      false,
      true,
      false,
      false,
      true,
      false,
      false,
      false,
      true,
      false,
      false,
      true,
      false,
      false,
    ],
    snare: [
      false,
      false,
      false,
      false,
      true,
      false,
      false,
      true,
      false,
      false,
      false,
      false,
      true,
      false,
      false,
      false,
    ],
    hihat: [
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
    ],
    rim: [
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      true,
      false,
      false,
      false,
      true,
      false,
    ],
  },
  'Hip-Hop': {
    kick: [
      true,
      false,
      false,
      false,
      false,
      false,
      true,
      false,
      false,
      false,
      true,
      false,
      false,
      false,
      false,
      false,
    ],
    snare: [
      false,
      false,
      false,
      false,
      true,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      true,
      false,
      false,
      true,
    ],
    hihat: [
      true,
      false,
      true,
      false,
      true,
      false,
      true,
      false,
      true,
      false,
      true,
      false,
      true,
      false,
      true,
      false,
    ],
    rim: [
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      true,
      false,
      false,
      false,
      false,
      false,
      false,
    ],
  },
  'Bossa Nova': {
    kick: [
      true,
      false,
      false,
      true,
      false,
      false,
      true,
      false,
      false,
      false,
      true,
      false,
      true,
      false,
      false,
      false,
    ],
    snare: [
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
      false,
    ],
    hihat: [
      true,
      false,
      true,
      false,
      true,
      false,
      true,
      false,
      true,
      false,
      true,
      false,
      true,
      false,
      true,
      false,
    ],
    rim: [
      false,
      false,
      false,
      true,
      false,
      false,
      false,
      false,
      false,
      true,
      false,
      false,
      false,
      true,
      false,
      false,
    ],
  },
};

type GameMode = 'creative' | 'match';

interface GrooveLabProps {
  onComplete?: (result: { accuracy: number }) => void;
}

/**
 * Groove Lab — "Program the beat. Feel the pocket."
 *
 * Drum machine step sequencer. Match a target groove or freestyle your own.
 */
export default function GrooveLab({ onComplete }: GrooveLabProps) {
  const drumRef = useRef<DrumEngine | null>(null);
  const playbackRef = useRef<number | null>(null);
  const stepRef = useRef(0);

  const [grid, setGrid] = useState<Record<Instrument, boolean[]>>(() => {
    const empty: Record<string, boolean[]> = {};
    INSTRUMENTS.forEach((inst) => (empty[inst] = new Array(STEPS).fill(false)));
    return empty as Record<Instrument, boolean[]>;
  });

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [bpm, setBpm] = useState(DEFAULT_BPM);
  const [mode, setMode] = useState<GameMode>('creative');
  const [targetGroove, setTargetGroove] = useState<string>('Basic Rock');
  const [showResult, setShowResult] = useState(false);
  const [matchAccuracy, setMatchAccuracy] = useState(0);

  // Grid ref for playback loop (avoids stale closure)
  const gridRef = useRef(grid);
  gridRef.current = grid;

  const initAudio = useCallback(() => {
    if (!drumRef.current) drumRef.current = new DrumEngine();
    drumRef.current.resume();
  }, []);

  const toggleCell = useCallback((instrument: Instrument, step: number) => {
    setGrid((prev) => {
      const next = { ...prev };
      next[instrument] = [...prev[instrument]];
      next[instrument][step] = !next[instrument][step];
      return next;
    });
  }, []);

  const clearGrid = useCallback(() => {
    const empty: Record<string, boolean[]> = {};
    INSTRUMENTS.forEach((inst) => (empty[inst] = new Array(STEPS).fill(false)));
    setGrid(empty as Record<Instrument, boolean[]>);
  }, []);

  const stopPlayback = useCallback(() => {
    if (playbackRef.current !== null) {
      clearInterval(playbackRef.current);
      playbackRef.current = null;
    }
    setIsPlaying(false);
    setCurrentStep(-1);
    stepRef.current = 0;
  }, []);

  const startPlayback = useCallback(() => {
    initAudio();
    if (isPlaying) {
      stopPlayback();
      return;
    }

    stepRef.current = 0;
    setIsPlaying(true);

    const intervalMs = (60 / bpm / 4) * 1000; // 16th note interval

    const tick = () => {
      const step = stepRef.current;
      const g = gridRef.current;
      const drum = drumRef.current;
      if (!drum) return;

      const time = drum.currentTime;
      INSTRUMENTS.forEach((inst) => {
        if (g[inst][step]) drum.playSound(inst, time);
      });

      setCurrentStep(step);
      stepRef.current = (step + 1) % STEPS;
    };

    tick(); // Play first step immediately
    playbackRef.current = window.setInterval(tick, intervalMs);
  }, [bpm, initAudio, isPlaying, stopPlayback]);

  // Play target groove for match mode
  const playTarget = useCallback(() => {
    initAudio();
    const target = PRESET_GROOVES[targetGroove];
    if (!target || !drumRef.current) return;

    let step = 0;
    const intervalMs = (60 / bpm / 4) * 1000;

    const tick = () => {
      const drum = drumRef.current;
      if (!drum) return;
      const time = drum.currentTime;
      INSTRUMENTS.forEach((inst) => {
        if (target[inst][step]) drum.playSound(inst, time);
      });
      step++;
      if (step >= STEPS) clearInterval(id);
    };

    tick();
    const id = window.setInterval(tick, intervalMs);
  }, [bpm, initAudio, targetGroove]);

  // Compute match accuracy
  const checkMatch = useCallback(() => {
    const target = PRESET_GROOVES[targetGroove];
    if (!target) return;

    let correct = 0;
    let total = 0;
    INSTRUMENTS.forEach((inst) => {
      for (let i = 0; i < STEPS; i++) {
        total++;
        if (grid[inst][i] === target[inst][i]) correct++;
      }
    });

    const acc = correct / total;
    setMatchAccuracy(acc);
    setShowResult(true);
    onComplete?.({ accuracy: acc });
  }, [grid, targetGroove, onComplete]);

  const newTarget = useCallback(() => {
    const names = Object.keys(PRESET_GROOVES);
    const next = names[Math.floor(Math.random() * names.length)];
    setTargetGroove(next);
    clearGrid();
    setShowResult(false);
  }, [clearGrid]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (playbackRef.current !== null) clearInterval(playbackRef.current);
      drumRef.current?.close();
    };
  }, []);

  const accuracyPct = Math.round(matchAccuracy * 100);

  return (
    <div className="flex flex-col bg-[#09090b] rounded-2xl overflow-hidden border border-zinc-800">
      {/* Header */}
      <div className="h-14 bg-[#121214] border-b border-zinc-800 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <h2
            className="text-lg font-semibold text-white"
            style={{ fontFamily: '"Playfair Display", serif' }}
          >
            Groove Lab
          </h2>
          <div className="flex gap-1">
            <button
              onClick={() => {
                setMode('creative');
                setShowResult(false);
              }}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                mode === 'creative'
                  ? 'bg-white text-black'
                  : 'text-zinc-500 hover:text-white'
              }`}
            >
              Creative
            </button>
            <button
              onClick={() => {
                setMode('match');
                setShowResult(false);
              }}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                mode === 'match'
                  ? 'bg-white text-black'
                  : 'text-zinc-500 hover:text-white'
              }`}
            >
              Match
            </button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1 bg-zinc-900 rounded border border-zinc-800">
            <button
              onClick={() => setBpm((b) => Math.max(60, b - 5))}
              className="text-zinc-400 hover:text-white px-1"
            >
              -
            </button>
            <span className="text-xs text-zinc-500 font-mono">BPM</span>
            <span className="text-sm text-zinc-200 font-mono w-8 text-center">
              {bpm}
            </span>
            <button
              onClick={() => setBpm((b) => Math.min(200, b + 5))}
              className="text-zinc-400 hover:text-white px-1"
            >
              +
            </button>
          </div>
        </div>
      </div>

      {/* Match mode target info */}
      {mode === 'match' && (
        <div className="h-10 bg-[#0f0f11] border-b border-zinc-800 flex items-center px-6 gap-4">
          <span className="text-xs text-zinc-500 uppercase tracking-wider">
            Target:
          </span>
          <span className="text-sm text-white font-medium">{targetGroove}</span>
          <button
            onClick={playTarget}
            className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            Listen
          </button>
          <button
            onClick={newTarget}
            className="text-xs text-zinc-500 hover:text-white transition-colors ml-auto"
          >
            New Target
          </button>
        </div>
      )}

      {/* Step sequencer grid */}
      <div className="p-4">
        <div className="flex flex-col gap-1">
          {INSTRUMENTS.map((inst) => (
            <div key={inst} className="flex items-center gap-2">
              <div className="w-16 text-right text-xs text-zinc-500 font-medium shrink-0">
                {INSTRUMENT_LABELS[inst]}
              </div>
              <div className="flex gap-0.5 flex-1">
                {Array.from({ length: STEPS }, (_, step) => {
                  const isActive = grid[inst][step];
                  const isCurrent = step === currentStep && isPlaying;
                  const isBeatStart = step % 4 === 0;
                  const color = INSTRUMENT_COLORS[inst];

                  return (
                    <button
                      key={step}
                      onClick={() => toggleCell(inst, step)}
                      className={`flex-1 aspect-square rounded-sm transition-all ${
                        isBeatStart ? 'ml-1' : ''
                      }`}
                      style={{
                        background: isActive
                          ? color
                          : isCurrent
                            ? 'rgba(255,255,255,0.08)'
                            : 'rgba(255,255,255,0.03)',
                        border: isCurrent
                          ? '1px solid rgba(255,255,255,0.3)'
                          : '1px solid rgba(255,255,255,0.05)',
                        opacity: isActive ? 1 : 0.7,
                        boxShadow: isActive ? `0 0 8px ${color}40` : 'none',
                      }}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Beat numbers */}
        <div className="flex items-center gap-2 mt-2">
          <div className="w-16 shrink-0" />
          <div className="flex gap-0.5 flex-1">
            {Array.from({ length: STEPS }, (_, step) => (
              <div
                key={step}
                className={`flex-1 text-center text-[10px] font-mono ${
                  step % 4 === 0 ? 'text-zinc-400 ml-1' : 'text-zinc-600'
                }`}
              >
                {step % 4 === 0 ? step / 4 + 1 : '·'}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="h-14 bg-[#121214] border-t border-zinc-800 flex items-center justify-between px-6">
        <div className="flex gap-2">
          <button
            onClick={startPlayback}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
              isPlaying
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {isPlaying ? 'Stop' : 'Play'}
          </button>
          <button
            onClick={clearGrid}
            className="px-4 py-1.5 rounded text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
          >
            Clear
          </button>
        </div>
        {mode === 'match' && (
          <button
            onClick={checkMatch}
            className="px-4 py-1.5 rounded text-sm font-medium bg-purple-600 hover:bg-purple-500 text-white transition-colors"
          >
            Check Match
          </button>
        )}
      </div>

      {/* Result overlay */}
      {showResult && mode === 'match' && (
        <div className="p-6 bg-[#0f0f11] border-t border-zinc-800 flex items-center justify-center gap-6">
          <div className="text-center">
            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">
              Match Accuracy
            </div>
            <div
              className="text-4xl font-light"
              style={{
                color:
                  accuracyPct >= 90
                    ? '#34d399'
                    : accuracyPct >= 70
                      ? '#fbbf24'
                      : '#ef4444',
              }}
            >
              {accuracyPct}%
            </div>
          </div>
          <button
            onClick={newTarget}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm rounded transition-colors"
          >
            Next Groove
          </button>
        </div>
      )}
    </div>
  );
}
