import { useEffect, useRef, useState, useCallback } from 'react';

// --- Types ---

interface EffectParam {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  color: string;
}

interface GenreTarget {
  label: string;
  description: string;
  params: Record<string, number>;
}

type GameMode = 'creative' | 'challenge';

// --- Constants ---

const DEFAULT_EFFECTS: EffectParam[] = [
  {
    id: 'filter',
    label: 'Filter',
    value: 1000,
    min: 100,
    max: 8000,
    color: '#a78bfa',
  },
  {
    id: 'reverb',
    label: 'Reverb',
    value: 0,
    min: 0,
    max: 100,
    color: '#38bdf8',
  },
  { id: 'delay', label: 'Delay', value: 0, min: 0, max: 100, color: '#34d399' },
  {
    id: 'distortion',
    label: 'Distort',
    value: 0,
    min: 0,
    max: 100,
    color: '#f97316',
  },
  {
    id: 'pitch',
    label: 'Pitch',
    value: 0,
    min: -12,
    max: 12,
    color: '#ec4899',
  },
  {
    id: 'speed',
    label: 'Speed',
    value: 100,
    min: 50,
    max: 200,
    color: '#eab308',
  },
];

const GENRE_TARGETS: GenreTarget[] = [
  {
    label: 'Ambient',
    description: 'Washed out, reverb-heavy, filtered',
    params: {
      filter: 2000,
      reverb: 85,
      delay: 60,
      distortion: 0,
      pitch: 0,
      speed: 80,
    },
  },
  {
    label: 'Lo-Fi',
    description: 'Warm, slow, slightly distorted',
    params: {
      filter: 3000,
      reverb: 30,
      delay: 20,
      distortion: 15,
      pitch: 0,
      speed: 85,
    },
  },
  {
    label: 'Industrial',
    description: 'Heavy distortion, dark filter, fast',
    params: {
      filter: 600,
      reverb: 10,
      delay: 30,
      distortion: 80,
      pitch: -3,
      speed: 120,
    },
  },
  {
    label: 'Shoegaze',
    description: 'Maximum reverb and delay, bright filter',
    params: {
      filter: 5000,
      reverb: 95,
      delay: 80,
      distortion: 30,
      pitch: 0,
      speed: 90,
    },
  },
  {
    label: 'Chiptune',
    description: 'High-pitched, fast, no reverb',
    params: {
      filter: 7000,
      reverb: 0,
      delay: 10,
      distortion: 40,
      pitch: 12,
      speed: 140,
    },
  },
  {
    label: 'Dub',
    description: 'Heavy delay, deep filter, moderate reverb',
    params: {
      filter: 800,
      reverb: 40,
      delay: 90,
      distortion: 5,
      pitch: -5,
      speed: 75,
    },
  },
];

// --- Audio Engine ---

class SpinnerEngine {
  private ctx: AudioContext;
  private master: GainNode;
  private sourceOsc: OscillatorNode | null = null;
  private filterNode: BiquadFilterNode;
  private convolverGain: GainNode;
  private delayNode: DelayNode;
  private delayFeedback: GainNode;
  private delayWet: GainNode;
  private distortionNode: WaveShaperNode;
  private distortionGain: GainNode;
  private dryGain: GainNode;
  private noiseBuffer: AudioBuffer;
  private isActive = false;

  constructor() {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.2;
    this.master.connect(this.ctx.destination);

    // Filter
    this.filterNode = this.ctx.createBiquadFilter();
    this.filterNode.type = 'lowpass';
    this.filterNode.frequency.value = 1000;
    this.filterNode.Q.value = 1;

    // Reverb (simulated with convolver gain)
    this.convolverGain = this.ctx.createGain();
    this.convolverGain.gain.value = 0;

    // Delay
    this.delayNode = this.ctx.createDelay(1.0);
    this.delayNode.delayTime.value = 0.3;
    this.delayFeedback = this.ctx.createGain();
    this.delayFeedback.gain.value = 0.4;
    this.delayWet = this.ctx.createGain();
    this.delayWet.gain.value = 0;

    // Delay feedback loop
    this.delayNode.connect(this.delayFeedback);
    this.delayFeedback.connect(this.delayNode);
    this.delayNode.connect(this.delayWet);

    // Distortion
    this.distortionNode = this.ctx.createWaveShaper();
    this.distortionNode.curve = this.makeDistortionCurve(0) as Float32Array<ArrayBuffer>;
    this.distortionNode.oversample = '4x';
    this.distortionGain = this.ctx.createGain();
    this.distortionGain.gain.value = 0;
    this.dryGain = this.ctx.createGain();
    this.dryGain.gain.value = 1;

    // Noise buffer for reverb simulation
    const size = this.ctx.sampleRate * 2;
    this.noiseBuffer = this.ctx.createBuffer(1, size, this.ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < size; i++)
      data[i] =
        (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.5));
  }

  private makeDistortionCurve(amount: number) {
    const k = amount;
    const samples = 44100;
    const curve = new Float32Array(samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  resume() {
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  start(frequency = 261.63) {
    if (this.isActive) this.stop();
    this.resume();

    const osc = this.ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.value = frequency;

    // Signal chain: osc → filter → [dry + distortion] → [master + delay wet]
    osc.connect(this.filterNode);

    // Dry path
    this.filterNode.connect(this.dryGain);
    this.dryGain.connect(this.master);

    // Distortion path
    this.filterNode.connect(this.distortionNode);
    this.distortionNode.connect(this.distortionGain);
    this.distortionGain.connect(this.master);

    // Delay send
    this.filterNode.connect(this.delayNode);
    this.delayWet.connect(this.master);

    // Reverb simulation (noise burst convolved)
    const reverbNoise = this.ctx.createBufferSource();
    reverbNoise.buffer = this.noiseBuffer;
    reverbNoise.loop = true;
    reverbNoise.connect(this.convolverGain);
    this.convolverGain.connect(this.master);
    reverbNoise.start();

    osc.start();
    this.sourceOsc = osc;
    this.isActive = true;
  }

  stop() {
    if (this.sourceOsc) {
      try {
        this.sourceOsc.stop();
      } catch {
        /* ok */
      }
      this.sourceOsc = null;
    }
    this.isActive = false;
  }

  updateParams(effects: EffectParam[]) {
    const get = (id: string) => effects.find((e) => e.id === id)?.value ?? 0;

    // Filter
    this.filterNode.frequency.setTargetAtTime(
      get('filter'),
      this.ctx.currentTime,
      0.05,
    );

    // Reverb (noise level)
    const reverbVal = get('reverb') / 100;
    this.convolverGain.gain.setTargetAtTime(
      reverbVal * 0.15,
      this.ctx.currentTime,
      0.05,
    );

    // Delay
    const delayVal = get('delay') / 100;
    this.delayWet.gain.setTargetAtTime(
      delayVal * 0.5,
      this.ctx.currentTime,
      0.05,
    );
    this.delayFeedback.gain.setTargetAtTime(
      0.2 + delayVal * 0.5,
      this.ctx.currentTime,
      0.05,
    );

    // Distortion
    const distVal = get('distortion') / 100;
    this.distortionNode.curve = this.makeDistortionCurve(distVal * 400) as Float32Array<ArrayBuffer>;
    this.distortionGain.gain.setTargetAtTime(
      distVal * 0.5,
      this.ctx.currentTime,
      0.05,
    );
    this.dryGain.gain.setTargetAtTime(
      1 - distVal * 0.5,
      this.ctx.currentTime,
      0.05,
    );

    // Pitch (change oscillator frequency)
    if (this.sourceOsc) {
      const pitchShift = get('pitch');
      const baseFreq = 261.63; // C4
      this.sourceOsc.frequency.setTargetAtTime(
        baseFreq * Math.pow(2, pitchShift / 12),
        this.ctx.currentTime,
        0.05,
      );
    }
  }

  close() {
    this.stop();
    this.ctx.close();
  }
}

// Compute similarity between player effects and target
function computeMatchScore(
  effects: EffectParam[],
  target: Record<string, number>,
): number {
  let totalDiff = 0;
  let count = 0;
  for (const effect of effects) {
    const targetVal = target[effect.id];
    if (targetVal === undefined) continue;
    const range = effect.max - effect.min;
    const diff = Math.abs(effect.value - targetVal) / range;
    totalDiff += diff;
    count++;
  }
  return count > 0 ? Math.max(0, 1 - totalDiff / count) : 0;
}

// --- Radial dial SVG ---

interface DialProps {
  effects: EffectParam[];
  matchScore: number | null;
}

function RadialDial({ effects, matchScore }: DialProps) {
  const cx = 150;
  const cy = 150;
  const radius = 120;

  return (
    <svg width={300} height={300} viewBox="0 0 300 300">
      {/* Background ring */}
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke="#27272a"
        strokeWidth={2}
      />
      <circle
        cx={cx}
        cy={cy}
        r={radius - 20}
        fill="none"
        stroke="#18181b"
        strokeWidth={1}
      />

      {/* Effect arcs */}
      {effects.map((effect, i) => {
        const angleStart = (i / effects.length) * Math.PI * 2 - Math.PI / 2;
        const angleEnd = ((i + 1) / effects.length) * Math.PI * 2 - Math.PI / 2;
        const normalized =
          (effect.value - effect.min) / (effect.max - effect.min);
        const arcRadius = radius - 8;

        // Arc path for the filled portion
        const midAngle = (angleStart + angleEnd) / 2;
        const fillAngle = angleStart + normalized * (angleEnd - angleStart);

        const x1 = cx + arcRadius * Math.cos(angleStart);
        const y1 = cy + arcRadius * Math.sin(angleStart);
        const x2 = cx + arcRadius * Math.cos(fillAngle);
        const y2 = cy + arcRadius * Math.sin(fillAngle);

        const largeArc = fillAngle - angleStart > Math.PI ? 1 : 0;

        // Label position
        const labelR = radius + 16;
        const lx = cx + labelR * Math.cos(midAngle);
        const ly = cy + labelR * Math.sin(midAngle);

        return (
          <g key={effect.id}>
            {/* Track */}
            <path
              d={`M ${cx + arcRadius * Math.cos(angleStart)},${cy + arcRadius * Math.sin(angleStart)} A ${arcRadius},${arcRadius} 0 0,1 ${cx + arcRadius * Math.cos(angleEnd)},${cy + arcRadius * Math.sin(angleEnd)}`}
              fill="none"
              stroke="#27272a"
              strokeWidth={6}
              strokeLinecap="round"
            />
            {/* Filled portion */}
            {normalized > 0.01 && (
              <path
                d={`M ${x1},${y1} A ${arcRadius},${arcRadius} 0 ${largeArc},1 ${x2},${y2}`}
                fill="none"
                stroke={effect.color}
                strokeWidth={6}
                strokeLinecap="round"
                style={{ filter: `drop-shadow(0 0 4px ${effect.color}60)` }}
              />
            )}
            {/* Label */}
            <text
              x={lx}
              y={ly}
              textAnchor="middle"
              dominantBaseline="middle"
              fill="#71717a"
              fontSize={9}
              fontFamily="monospace"
            >
              {effect.label}
            </text>
          </g>
        );
      })}

      {/* Center score */}
      {matchScore !== null && (
        <>
          <circle
            cx={cx}
            cy={cy}
            r={40}
            fill="#09090b"
            stroke="#27272a"
            strokeWidth={1}
          />
          <text
            x={cx}
            y={cy - 6}
            textAnchor="middle"
            dominantBaseline="middle"
            fill={
              matchScore >= 0.8
                ? '#34d399'
                : matchScore >= 0.6
                  ? '#fbbf24'
                  : '#ef4444'
            }
            fontSize={22}
            fontWeight="300"
          >
            {Math.round(matchScore * 100)}%
          </text>
          <text
            x={cx}
            y={cy + 14}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#52525b"
            fontSize={8}
            fontFamily="monospace"
            style={{ textTransform: 'uppercase' }}
          >
            MATCH
          </text>
        </>
      )}
    </svg>
  );
}

// --- Main Component ---

interface SoundSpinnerProps {
  onComplete?: () => void;
}

export default function SoundSpinner({ onComplete }: SoundSpinnerProps) {
  const [mode, setMode] = useState<GameMode>('creative');
  const [effects, setEffects] = useState<EffectParam[]>(
    DEFAULT_EFFECTS.map((e) => ({ ...e })),
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [targetIndex, setTargetIndex] = useState(0);
  const [matchScore, setMatchScore] = useState<number | null>(null);
  const [challengeComplete, setChallengeComplete] = useState(false);
  const [roundsWon, setRoundsWon] = useState(0);

  const engineRef = useRef<SpinnerEngine | null>(null);

  const target = GENRE_TARGETS[targetIndex];

  const getEngine = useCallback(() => {
    if (!engineRef.current) engineRef.current = new SpinnerEngine();
    return engineRef.current;
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      engineRef.current?.close();
    };
  }, []);

  // Update audio params when effects change
  useEffect(() => {
    if (isPlaying) {
      engineRef.current?.updateParams(effects);
    }
  }, [effects, isPlaying]);

  // Compute match score in challenge mode
  useEffect(() => {
    if (mode === 'challenge' && target) {
      const score = computeMatchScore(effects, target.params);
      setMatchScore(score);
      if (score >= 0.8 && !challengeComplete) {
        setChallengeComplete(true);
        setRoundsWon((w) => w + 1);
      }
    } else {
      setMatchScore(null);
    }
  }, [effects, mode, target, challengeComplete]);

  const togglePlayback = useCallback(() => {
    const engine = getEngine();
    if (isPlaying) {
      engine.stop();
      setIsPlaying(false);
    } else {
      engine.start();
      engine.updateParams(effects);
      setIsPlaying(true);
    }
  }, [getEngine, isPlaying, effects]);

  const updateEffect = useCallback((id: string, value: number) => {
    setEffects((prev) => prev.map((e) => (e.id === id ? { ...e, value } : e)));
  }, []);

  const resetEffects = useCallback(() => {
    setEffects(DEFAULT_EFFECTS.map((e) => ({ ...e })));
  }, []);

  const nextChallenge = useCallback(() => {
    const next = (targetIndex + 1) % GENRE_TARGETS.length;
    setTargetIndex(next);
    setChallengeComplete(false);
    resetEffects();
    if (next === 0 && roundsWon > 0) {
      onComplete?.();
    }
  }, [targetIndex, resetEffects, roundsWon, onComplete]);

  return (
    <div className="flex flex-col bg-[#09090b] rounded-2xl overflow-hidden border border-zinc-800">
      {/* Header */}
      <div className="h-14 bg-[#121214] border-b border-zinc-800 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <h2
            className="text-lg font-semibold text-white"
            style={{ fontFamily: '"Playfair Display", serif' }}
          >
            Sound Spinner
          </h2>
          <div className="flex gap-1">
            {(['creative', 'challenge'] as GameMode[]).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setChallengeComplete(false);
                }}
                className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                  mode === m
                    ? 'bg-white text-black'
                    : 'text-zinc-500 hover:text-white'
                }`}
              >
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
        </div>
        {mode === 'challenge' && (
          <span className="text-xs text-zinc-500">
            Rounds:{' '}
            <span className="text-emerald-400 font-mono">{roundsWon}</span>
          </span>
        )}
      </div>

      {/* Challenge target */}
      {mode === 'challenge' && target && (
        <div className="h-10 bg-[#0f0f11] border-b border-zinc-800 flex items-center px-6 gap-4">
          <span className="text-xs text-zinc-500 uppercase tracking-wider">
            Make it sound:
          </span>
          <span className="text-sm text-white font-medium">{target.label}</span>
          <span className="text-xs text-zinc-500">{target.description}</span>
        </div>
      )}

      {/* Main content: dial + sliders */}
      <div className="p-4 flex gap-6 items-start">
        {/* Radial dial */}
        <div className="shrink-0 flex justify-center">
          <RadialDial
            effects={effects}
            matchScore={mode === 'challenge' ? matchScore : null}
          />
        </div>

        {/* Sliders */}
        <div className="flex-1 flex flex-col gap-3 pt-2">
          {effects.map((effect) => (
            <div key={effect.id} className="flex items-center gap-3">
              <span
                className="text-xs w-14 text-right shrink-0 font-medium"
                style={{ color: effect.color }}
              >
                {effect.label}
              </span>
              <input
                type="range"
                min={effect.min}
                max={effect.max}
                step={
                  effect.id === 'pitch' ? 1 : (effect.max - effect.min) / 100
                }
                value={effect.value}
                onChange={(e) =>
                  updateEffect(effect.id, Number(e.target.value))
                }
                className="flex-1 h-1.5"
                style={{ accentColor: effect.color }}
              />
              <span className="text-[10px] text-zinc-500 font-mono w-14 text-right">
                {effect.id === 'filter'
                  ? `${Math.round(effect.value)}Hz`
                  : effect.id === 'pitch'
                    ? `${effect.value > 0 ? '+' : ''}${effect.value}st`
                    : `${Math.round(effect.value)}%`}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Challenge complete overlay */}
      {challengeComplete && mode === 'challenge' && (
        <div className="px-6 pb-4 flex items-center justify-center gap-6">
          <div className="text-center">
            <div className="text-xs text-zinc-500 uppercase tracking-wider mb-1">
              Match!
            </div>
            <div className="text-2xl font-light text-emerald-400">
              {Math.round((matchScore ?? 0) * 100)}%
            </div>
          </div>
          <button
            onClick={nextChallenge}
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm rounded transition-colors"
          >
            Next Genre
          </button>
        </div>
      )}

      {/* Controls */}
      <div className="h-14 bg-[#121214] border-t border-zinc-800 flex items-center justify-between px-6">
        <div className="flex gap-2">
          <button
            onClick={togglePlayback}
            className={`px-4 py-1.5 rounded text-sm font-medium transition-colors ${
              isPlaying
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {isPlaying ? 'Stop' : 'Play'}
          </button>
          <button
            onClick={resetEffects}
            className="px-4 py-1.5 rounded text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
          >
            Reset
          </button>
        </div>
        {mode === 'creative' && (
          <span className="text-xs text-zinc-600">
            Twist the dials. Warp the sound.
          </span>
        )}
      </div>
    </div>
  );
}
