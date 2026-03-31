import { useEffect, useRef, useState, useCallback } from 'react';

// --- Types ---

type WaveformType = 'sine' | 'square' | 'sawtooth' | 'triangle';

interface OscillatorSlot {
  frequency: number;
  amplitude: number;
  type: WaveformType;
}

interface Challenge {
  label: string;
  description: string;
  slots: OscillatorSlot[];
}

// --- Constants ---

const SAMPLE_RATE = 512;
const MATCH_THRESHOLD = 0.9;

const WAVEFORM_TYPES: WaveformType[] = [
  'sine',
  'square',
  'sawtooth',
  'triangle',
];

const WAVEFORM_COLORS: Record<WaveformType, string> = {
  sine: '#a78bfa',
  square: '#38bdf8',
  sawtooth: '#f97316',
  triangle: '#34d399',
};

// Generate a single waveform sample (0..1 normalized phase)
function waveformSample(type: WaveformType, phase: number): number {
  const p = phase % 1;
  switch (type) {
    case 'sine':
      return Math.sin(2 * Math.PI * p);
    case 'square':
      return p < 0.5 ? 1 : -1;
    case 'sawtooth':
      return 2 * p - 1;
    case 'triangle':
      return p < 0.5 ? 4 * p - 1 : 3 - 4 * p;
  }
}

// Render a composite waveform from multiple oscillator slots
function renderWaveform(
  slots: OscillatorSlot[],
  sampleCount: number,
): Float32Array {
  const buffer = new Float32Array(sampleCount);
  for (const slot of slots) {
    if (slot.amplitude === 0) continue;
    for (let i = 0; i < sampleCount; i++) {
      const phase = (i / sampleCount) * (slot.frequency / 100);
      buffer[i] += slot.amplitude * waveformSample(slot.type, phase);
    }
  }
  // Normalize to -1..1
  let max = 0;
  for (let i = 0; i < sampleCount; i++) {
    const abs = Math.abs(buffer[i]);
    if (abs > max) max = abs;
  }
  if (max > 0) {
    for (let i = 0; i < sampleCount; i++) buffer[i] /= max;
  }
  return buffer;
}

// Compute similarity between two waveforms (cosine similarity)
function computeSimilarity(a: Float32Array, b: Float32Array): number {
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  const len = Math.min(a.length, b.length);
  for (let i = 0; i < len; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return Math.max(0, dotProduct / (Math.sqrt(normA) * Math.sqrt(normB)));
}

// --- Challenges by level ---

const CHALLENGES: Challenge[][] = [
  // Level 1: Match single waveforms with 1 oscillator
  [
    {
      label: 'Pure Sine',
      description: 'Match this simple sine wave',
      slots: [{ frequency: 100, amplitude: 1, type: 'sine' }],
    },
    {
      label: 'Square Wave',
      description: 'Create a square wave signal',
      slots: [{ frequency: 100, amplitude: 1, type: 'square' }],
    },
    {
      label: 'Sawtooth',
      description: 'Match the sawtooth wave',
      slots: [{ frequency: 100, amplitude: 1, type: 'sawtooth' }],
    },
    {
      label: 'Triangle',
      description: 'Reproduce the triangle wave',
      slots: [{ frequency: 100, amplitude: 1, type: 'triangle' }],
    },
  ],
  // Level 2: Combine 2 oscillators
  [
    {
      label: 'Octave Sine',
      description: 'Sine + its octave harmonic',
      slots: [
        { frequency: 100, amplitude: 1, type: 'sine' },
        { frequency: 200, amplitude: 0.5, type: 'sine' },
      ],
    },
    {
      label: 'Warm Pad',
      description: 'Triangle + detuned sine',
      slots: [
        { frequency: 100, amplitude: 0.8, type: 'triangle' },
        { frequency: 150, amplitude: 0.5, type: 'sine' },
      ],
    },
    {
      label: 'Buzzy Lead',
      description: 'Sawtooth + square sub',
      slots: [
        { frequency: 200, amplitude: 0.7, type: 'sawtooth' },
        { frequency: 100, amplitude: 0.6, type: 'square' },
      ],
    },
  ],
  // Level 3: 3 oscillator composites
  [
    {
      label: 'Organ Tone',
      description: 'Three sine harmonics like a pipe organ',
      slots: [
        { frequency: 100, amplitude: 1, type: 'sine' },
        { frequency: 200, amplitude: 0.6, type: 'sine' },
        { frequency: 300, amplitude: 0.3, type: 'sine' },
      ],
    },
    {
      label: 'Metallic',
      description: 'Non-harmonic partials create a metallic tone',
      slots: [
        { frequency: 100, amplitude: 0.8, type: 'square' },
        { frequency: 173, amplitude: 0.5, type: 'triangle' },
        { frequency: 267, amplitude: 0.4, type: 'sine' },
      ],
    },
    {
      label: 'Rich Brass',
      description: 'Multiple sawtooth partials',
      slots: [
        { frequency: 100, amplitude: 1, type: 'sawtooth' },
        { frequency: 200, amplitude: 0.5, type: 'sawtooth' },
        { frequency: 300, amplitude: 0.25, type: 'sine' },
      ],
    },
  ],
];

function emptySlot(): OscillatorSlot {
  return { frequency: 100, amplitude: 0, type: 'sine' };
}

// --- Audio preview ---

class WavePreview {
  private ctx: AudioContext;
  private oscillators: OscillatorNode[] = [];
  private gains: GainNode[] = [];
  private master: GainNode;

  constructor() {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.15;
    this.master.connect(this.ctx.destination);
  }

  resume() {
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  play(slots: OscillatorSlot[]) {
    this.stop();
    this.resume();
    for (const slot of slots) {
      if (slot.amplitude === 0) continue;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = slot.type;
      osc.frequency.value = slot.frequency;
      gain.gain.value = slot.amplitude * 0.3;
      osc.connect(gain);
      gain.connect(this.master);
      osc.start();
      this.oscillators.push(osc);
      this.gains.push(gain);
    }
  }

  stop() {
    for (const osc of this.oscillators) {
      try {
        osc.stop();
      } catch {
        /* already stopped */
      }
    }
    this.oscillators = [];
    this.gains = [];
  }

  close() {
    this.stop();
    this.ctx.close();
  }
}

// --- Component ---

interface WaveSculptorProps {
  onComplete?: () => void;
}

export default function WaveSculptor({ onComplete }: WaveSculptorProps) {
  const [level, setLevel] = useState(0);
  const [challengeIndex, setChallengeIndex] = useState(0);
  const [playerSlots, setPlayerSlots] = useState<OscillatorSlot[]>([
    { frequency: 100, amplitude: 1, type: 'sine' },
  ]);
  const [similarity, setSimilarity] = useState(0);
  const [roundComplete, setRoundComplete] = useState(false);
  const [roundsWon, setRoundsWon] = useState(0);
  const [isPreviewing, setIsPreviewing] = useState(false);

  const targetCanvasRef = useRef<HTMLCanvasElement>(null);
  const playerCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<WavePreview | null>(null);
  const rafRef = useRef<number>();

  const challenge = CHALLENGES[level]?.[challengeIndex];
  const maxSlots = level + 1; // L1=1 slot, L2=2, L3=3

  // Compute target waveform
  const targetWaveform = challenge
    ? renderWaveform(challenge.slots, SAMPLE_RATE)
    : new Float32Array(SAMPLE_RATE);

  // Compute player waveform and similarity
  const playerWaveform = renderWaveform(playerSlots, SAMPLE_RATE);
  const currentSimilarity = computeSimilarity(targetWaveform, playerWaveform);

  // Update similarity on slot changes
  useEffect(() => {
    setSimilarity(currentSimilarity);
    if (currentSimilarity >= MATCH_THRESHOLD && !roundComplete) {
      setRoundComplete(true);
      setRoundsWon((w) => w + 1);
    }
  }, [currentSimilarity, roundComplete]);

  // Draw waveforms
  useEffect(() => {
    const drawWaveform = (
      canvas: HTMLCanvasElement | null,
      data: Float32Array,
      color: string,
    ) => {
      const ctx = canvas?.getContext('2d');
      if (!canvas || !ctx) return;
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      // Grid lines
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();

      // Waveform
      ctx.shadowBlur = 10;
      ctx.shadowColor = color;
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      const sliceWidth = width / data.length;
      for (let i = 0; i < data.length; i++) {
        const x = i * sliceWidth;
        const y = ((data[i] + 1) / 2) * height;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    };

    drawWaveform(targetCanvasRef.current, targetWaveform, '#a78bfa');
    drawWaveform(playerCanvasRef.current, playerWaveform, '#38bdf8');
  }, [targetWaveform, playerWaveform]);

  // Cleanup audio
  useEffect(() => {
    return () => {
      previewRef.current?.close();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const updateSlot = useCallback(
    (
      index: number,
      field: keyof OscillatorSlot,
      value: number | WaveformType,
    ) => {
      setPlayerSlots((prev) => {
        const next = [...prev];
        next[index] = { ...next[index], [field]: value };
        return next;
      });
    },
    [],
  );

  const addSlot = useCallback(() => {
    setPlayerSlots((prev) => {
      if (prev.length >= maxSlots) return prev;
      return [...prev, emptySlot()];
    });
  }, [maxSlots]);

  const removeSlot = useCallback((index: number) => {
    setPlayerSlots((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const previewTarget = useCallback(() => {
    if (!previewRef.current) previewRef.current = new WavePreview();
    if (!challenge) return;
    if (isPreviewing) {
      previewRef.current.stop();
      setIsPreviewing(false);
    } else {
      previewRef.current.play(challenge.slots);
      setIsPreviewing(true);
      setTimeout(() => {
        previewRef.current?.stop();
        setIsPreviewing(false);
      }, 2000);
    }
  }, [challenge, isPreviewing]);

  const previewPlayer = useCallback(() => {
    if (!previewRef.current) previewRef.current = new WavePreview();
    previewRef.current.play(playerSlots);
    setTimeout(() => previewRef.current?.stop(), 2000);
  }, [playerSlots]);

  const nextChallenge = useCallback(() => {
    const levelChallenges = CHALLENGES[level];
    if (challengeIndex + 1 < levelChallenges.length) {
      setChallengeIndex((i) => i + 1);
    } else if (level + 1 < CHALLENGES.length) {
      setLevel((l) => l + 1);
      setChallengeIndex(0);
    } else {
      onComplete?.();
      return;
    }
    setRoundComplete(false);
    setPlayerSlots([{ frequency: 100, amplitude: 1, type: 'sine' }]);
    setSimilarity(0);
  }, [level, challengeIndex, onComplete]);

  const similarityPct = Math.round(similarity * 100);
  const similarityColor =
    similarityPct >= 90
      ? '#34d399'
      : similarityPct >= 70
        ? '#fbbf24'
        : '#ef4444';

  return (
    <div className="flex flex-col bg-[#09090b] rounded-2xl overflow-hidden border border-zinc-800">
      {/* Header */}
      <div className="h-14 bg-[#121214] border-b border-zinc-800 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <h2
            className="text-lg font-semibold text-white"
            style={{ fontFamily: '"Playfair Display", serif' }}
          >
            Wave Sculptor
          </h2>
          <span className="text-xs text-zinc-500 font-mono">
            Level {level + 1} · {challengeIndex + 1}/
            {CHALLENGES[level]?.length ?? 0}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-500">Rounds won:</span>
          <span className="text-sm text-emerald-400 font-mono">
            {roundsWon}
          </span>
        </div>
      </div>

      {/* Challenge info */}
      {challenge && (
        <div className="h-10 bg-[#0f0f11] border-b border-zinc-800 flex items-center px-6 gap-4">
          <span className="text-xs text-zinc-500 uppercase tracking-wider">
            Target:
          </span>
          <span className="text-sm text-white font-medium">
            {challenge.label}
          </span>
          <span className="text-xs text-zinc-500">{challenge.description}</span>
          <button
            onClick={previewTarget}
            className="text-xs text-purple-400 hover:text-purple-300 transition-colors ml-auto"
          >
            {isPreviewing ? 'Stop' : 'Listen'}
          </button>
        </div>
      )}

      {/* Waveform displays */}
      <div className="p-4 grid grid-cols-2 gap-4">
        <div>
          <div className="text-xs text-zinc-500 mb-1 uppercase tracking-wider">
            Target
          </div>
          <div className="rounded-lg border border-zinc-800 bg-[#0a0a0c] overflow-hidden">
            <canvas
              ref={targetCanvasRef}
              width={512}
              height={120}
              className="w-full"
            />
          </div>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-zinc-500 uppercase tracking-wider">
              Your Wave
            </span>
            <button
              onClick={previewPlayer}
              className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              Preview
            </button>
          </div>
          <div className="rounded-lg border border-zinc-800 bg-[#0a0a0c] overflow-hidden">
            <canvas
              ref={playerCanvasRef}
              width={512}
              height={120}
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Similarity meter */}
      <div className="px-6 pb-2">
        <div className="flex items-center gap-3">
          <span className="text-xs text-zinc-500 uppercase tracking-wider w-20">
            Similarity
          </span>
          <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${similarityPct}%`,
                backgroundColor: similarityColor,
                boxShadow: `0 0 8px ${similarityColor}60`,
              }}
            />
          </div>
          <span
            className="text-sm font-mono w-12 text-right"
            style={{ color: similarityColor }}
          >
            {similarityPct}%
          </span>
        </div>
        {similarityPct >= 90 && (
          <div className="text-xs text-zinc-400 mt-1">
            {similarityPct >= 90 ? '90%+ threshold reached!' : ''}
          </div>
        )}
      </div>

      {/* Oscillator controls */}
      <div className="px-4 pb-4">
        <div className="flex flex-col gap-3">
          {playerSlots.map((slot, idx) => (
            <div
              key={idx}
              className="flex items-center gap-3 p-3 rounded-lg bg-[#0f0f11] border border-zinc-800"
            >
              <span className="text-xs text-zinc-500 w-8 shrink-0">
                #{idx + 1}
              </span>

              {/* Waveform type selector */}
              <div className="flex gap-1">
                {WAVEFORM_TYPES.map((wt) => (
                  <button
                    key={wt}
                    onClick={() => updateSlot(idx, 'type', wt)}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors ${
                      slot.type === wt
                        ? 'text-white'
                        : 'text-zinc-600 hover:text-zinc-300'
                    }`}
                    style={
                      slot.type === wt
                        ? {
                            backgroundColor: WAVEFORM_COLORS[wt] + '40',
                            color: WAVEFORM_COLORS[wt],
                          }
                        : undefined
                    }
                  >
                    {wt}
                  </button>
                ))}
              </div>

              {/* Frequency slider */}
              <div className="flex items-center gap-1.5 flex-1">
                <span className="text-[10px] text-zinc-600 w-8">Freq</span>
                <input
                  type="range"
                  min={50}
                  max={500}
                  step={10}
                  value={slot.frequency}
                  onChange={(e) =>
                    updateSlot(idx, 'frequency', Number(e.target.value))
                  }
                  className="flex-1 accent-purple-500 h-1"
                />
                <span className="text-[10px] text-zinc-400 font-mono w-10 text-right">
                  {slot.frequency}Hz
                </span>
              </div>

              {/* Amplitude slider */}
              <div className="flex items-center gap-1.5 flex-1">
                <span className="text-[10px] text-zinc-600 w-8">Amp</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={Math.round(slot.amplitude * 100)}
                  onChange={(e) =>
                    updateSlot(idx, 'amplitude', Number(e.target.value) / 100)
                  }
                  className="flex-1 accent-cyan-500 h-1"
                />
                <span className="text-[10px] text-zinc-400 font-mono w-10 text-right">
                  {Math.round(slot.amplitude * 100)}%
                </span>
              </div>

              {/* Remove button */}
              {playerSlots.length > 1 && (
                <button
                  onClick={() => removeSlot(idx)}
                  className="text-zinc-600 hover:text-red-400 text-xs px-1 transition-colors"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>

        {playerSlots.length < maxSlots && (
          <button
            onClick={addSlot}
            className="mt-2 text-xs text-zinc-500 hover:text-white transition-colors"
          >
            + Add Oscillator
          </button>
        )}
      </div>

      {/* Controls / Result */}
      <div className="h-14 bg-[#121214] border-t border-zinc-800 flex items-center justify-between px-6">
        <div className="flex gap-2">
          <button
            onClick={() => {
              setPlayerSlots([{ frequency: 100, amplitude: 1, type: 'sine' }]);
              setSimilarity(0);
            }}
            className="px-4 py-1.5 rounded text-sm font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
          >
            Reset
          </button>
        </div>
        {roundComplete && (
          <button
            onClick={nextChallenge}
            className="px-4 py-1.5 rounded text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
          >
            Next Challenge →
          </button>
        )}
      </div>
    </div>
  );
}
