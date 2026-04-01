import { useEffect, useRef, useState, useCallback } from 'react';

// --- Constants ---

const HARMONICS_COUNT = 16;
const FUNDAMENTAL_FREQ = 130.81; // C3

interface HarmonicInfo {
  number: number;
  frequency: number;
  interval: string;
  cents: number; // deviation from equal temperament
}

const HARMONIC_DATA: HarmonicInfo[] = Array.from(
  { length: HARMONICS_COUNT },
  (_, i) => {
    const n = i + 1;
    const freq = FUNDAMENTAL_FREQ * n;
    const intervals = [
      'Unison',
      'Octave',
      'P5 (+oct)',
      'Octave 2',
      'M3 (+2oct)',
      'P5 (+2oct)',
      'm7 (+2oct)',
      'Octave 3',
      'M2 (+3oct)',
      'M3 (+3oct)',
      'Tritone (+3oct)',
      'P5 (+3oct)',
      'm6 (+3oct)',
      'm7 (+3oct)',
      'M7 (+3oct)',
      'Octave 4',
    ];
    // Cents deviation from equal temperament
    const etCents = 1200 * Math.log2(n);
    const nearestSemitone = Math.round(etCents / 100) * 100;
    const cents = Math.round(etCents - nearestSemitone);
    return { number: n, frequency: freq, interval: intervals[i], cents };
  },
);

const HARMONIC_COLORS = [
  '#a78bfa',
  '#38bdf8',
  '#34d399',
  '#fbbf24',
  '#f97316',
  '#ef4444',
  '#ec4899',
  '#8b5cf6',
  '#06b6d4',
  '#10b981',
  '#eab308',
  '#f59e0b',
  '#e11d48',
  '#7c3aed',
  '#0891b2',
  '#059669',
];

type GameMode = 'explore' | 'quiz';

// --- Audio Engine ---

class HarmonicEngine {
  private ctx: AudioContext;
  private master: GainNode;
  private activeOsc: OscillatorNode | null = null;
  private activeGain: GainNode | null = null;

  constructor() {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.3;
    this.master.connect(this.ctx.destination);
  }

  resume() {
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  playHarmonic(harmonicNumber: number) {
    this.stop();
    this.resume();
    const freq = FUNDAMENTAL_FREQ * harmonicNumber;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, this.ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.4, this.ctx.currentTime + 0.05);
    gain.gain.linearRampToValueAtTime(0.2, this.ctx.currentTime + 0.5);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start();
    this.activeOsc = osc;
    this.activeGain = gain;
  }

  playFundamental() {
    this.playHarmonic(1);
  }

  stop() {
    if (this.activeOsc && this.activeGain) {
      this.activeGain.gain.linearRampToValueAtTime(
        0,
        this.ctx.currentTime + 0.05,
      );
      const osc = this.activeOsc;
      setTimeout(() => {
        try {
          osc.stop();
        } catch {
          /* ok */
        }
      }, 60);
      this.activeOsc = null;
      this.activeGain = null;
    }
  }

  close() {
    this.stop();
    this.ctx.close();
  }
}

// --- SVG String Visualization ---

interface StringVisualizationProps {
  harmonic: number;
  width: number;
  height: number;
  isAnimating: boolean;
  onNodeClick?: (nodePosition: number) => void;
  showNodes?: boolean;
}

function StringVisualization({
  harmonic,
  width,
  height,
  isAnimating,
  onNodeClick,
  showNodes = true,
}: StringVisualizationProps) {
  const animRef = useRef<number>();
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (!isAnimating) {
      setPhase(0);
      return;
    }
    let p = 0;
    const animate = () => {
      p += 0.04;
      setPhase(p);
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [isAnimating]);

  const padding = 40;
  const stringWidth = width - padding * 2;
  const midY = height / 2;
  const amplitude = isAnimating ? 30 : 0;
  const color = HARMONIC_COLORS[(harmonic - 1) % HARMONIC_COLORS.length];

  // Generate standing wave path
  const points: string[] = [];
  const resolution = 200;
  for (let i = 0; i <= resolution; i++) {
    const t = i / resolution;
    const x = padding + t * stringWidth;
    const y =
      midY + amplitude * Math.sin(harmonic * Math.PI * t) * Math.sin(phase * 3);
    points.push(`${x},${y}`);
  }
  const pathD = 'M ' + points.join(' L ');

  // Node positions (where the string doesn't move)
  const nodes: number[] = [];
  for (let i = 0; i <= harmonic; i++) {
    nodes.push(padding + (i / harmonic) * stringWidth);
  }

  return (
    <svg width={width} height={height} className="block">
      {/* Bridge ends */}
      <rect
        x={padding - 4}
        y={midY - 15}
        width={8}
        height={30}
        rx={2}
        fill="#3f3f46"
      />
      <rect
        x={padding + stringWidth - 4}
        y={midY - 15}
        width={8}
        height={30}
        rx={2}
        fill="#3f3f46"
      />

      {/* Standing wave / string */}
      <path
        d={pathD}
        fill="none"
        stroke={isAnimating ? color : '#71717a'}
        strokeWidth={isAnimating ? 2.5 : 1.5}
        style={
          isAnimating ? { filter: `drop-shadow(0 0 6px ${color})` } : undefined
        }
      />

      {/* Nodes */}
      {showNodes &&
        nodes.map((x, i) => (
          <g key={i}>
            <circle
              cx={x}
              cy={midY}
              r={6}
              fill={isAnimating ? color : '#27272a'}
              stroke={isAnimating ? '#fff' : '#52525b'}
              strokeWidth={1.5}
              style={{ cursor: onNodeClick ? 'pointer' : 'default' }}
              onClick={() => onNodeClick?.(i)}
            />
            {isAnimating && (
              <circle
                cx={x}
                cy={midY}
                r={10}
                fill="none"
                stroke={color}
                strokeWidth={0.5}
                opacity={0.4}
              />
            )}
          </g>
        ))}

      {/* Antinode labels */}
      {isAnimating &&
        harmonic <= 8 &&
        Array.from({ length: harmonic }, (_, i) => {
          const x = padding + ((i + 0.5) / harmonic) * stringWidth;
          return (
            <text
              key={i}
              x={x}
              y={midY + 50}
              textAnchor="middle"
              fill="#71717a"
              fontSize={10}
              fontFamily="monospace"
            >
              {i + 1}
            </text>
          );
        })}
    </svg>
  );
}

// --- Main Component ---

interface HarmonicStringsProps {
  onComplete?: () => void;
}

export default function HarmonicStrings({ onComplete }: HarmonicStringsProps) {
  const [mode, setMode] = useState<GameMode>('explore');
  const [selectedHarmonic, setSelectedHarmonic] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [quizQuestion, setQuizQuestion] = useState<HarmonicInfo | null>(null);
  const [quizOptions, setQuizOptions] = useState<string[]>([]);
  const [quizResult, setQuizResult] = useState<'correct' | 'wrong' | null>(
    null,
  );
  const [score, setScore] = useState(0);
  const [rounds, setRounds] = useState(0);

  const [svgWidth, setSvgWidth] = useState(720);
  const engineRef = useRef<HarmonicEngine | null>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);

  const getEngine = useCallback(() => {
    if (!engineRef.current) engineRef.current = new HarmonicEngine();
    return engineRef.current;
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      engineRef.current?.close();
    };
  }, []);

  // Measure container width
  useEffect(() => {
    const el = svgContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setSvgWidth(entry.contentRect.width);
      }
    });
    ro.observe(el);
    setSvgWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  // --- Explore mode ---
  const stopHarmonic = useCallback(() => {
    const engine = getEngine();
    engine.stop();
    setIsPlaying(false);
  }, [getEngine]);

  const playHarmonic = useCallback(
    (n: number) => {
      const engine = getEngine();
      // Toggle off if clicking the same harmonic that's already playing
      if (isPlaying && selectedHarmonic === n) {
        stopHarmonic();
        return;
      }
      setSelectedHarmonic(n);
      setIsPlaying(true);
      engine.playHarmonic(n);
    },
    [getEngine, isPlaying, selectedHarmonic, stopHarmonic],
  );

  // --- Quiz mode ---
  const newQuiz = useCallback(() => {
    const idx = Math.floor(Math.random() * 8) + 1; // harmonics 2-9
    const info = HARMONIC_DATA[idx];
    setQuizQuestion(info);
    setQuizResult(null);

    // Generate 4 options including the correct one
    const correctAnswer = info.interval;
    const allIntervals = HARMONIC_DATA.slice(1, 10).map((h) => h.interval);
    const wrong = allIntervals.filter((i) => i !== correctAnswer);
    const shuffled = wrong.sort(() => Math.random() - 0.5).slice(0, 3);
    const options = [correctAnswer, ...shuffled].sort(
      () => Math.random() - 0.5,
    );
    setQuizOptions(options);

    const engine = getEngine();
    engine.playFundamental();
    setTimeout(() => {
      engine.stop();
      setTimeout(() => {
        engine.playHarmonic(info.number);
        setIsPlaying(true);
        setTimeout(() => {
          engine.stop();
          setIsPlaying(false);
        }, 2000);
      }, 300);
    }, 1500);
  }, [getEngine]);

  const submitQuizAnswer = useCallback(
    (answer: string) => {
      if (!quizQuestion) return;
      const correct = answer === quizQuestion.interval;
      setQuizResult(correct ? 'correct' : 'wrong');
      if (correct) setScore((s) => s + 1);
      setRounds((r) => {
        const next = r + 1;
        if (next >= 10) onComplete?.();
        return next;
      });
    },
    [quizQuestion, onComplete],
  );

  const info = HARMONIC_DATA[selectedHarmonic - 1];

  return (
    <div className="flex flex-col bg-[#09090b] rounded-2xl overflow-hidden border border-zinc-800">
      {/* Header */}
      <div className="h-14 bg-[#121214] border-b border-zinc-800 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <h2
            className="text-lg font-semibold text-white"
            style={{ fontFamily: '"Playfair Display", serif' }}
          >
            Harmonic Strings
          </h2>
          <div className="flex gap-1">
            {(['explore', 'quiz'] as GameMode[]).map((m) => (
              <button
                key={m}
                onClick={() => {
                  setMode(m);
                  setQuizResult(null);
                  stopHarmonic();
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
        {mode === 'quiz' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-500">Score:</span>
            <span className="text-sm text-emerald-400 font-mono">
              {score}/{rounds}
            </span>
          </div>
        )}
      </div>

      {/* String visualization */}
      <div ref={svgContainerRef} className="px-4 pt-6 pb-2">
        <StringVisualization
          harmonic={selectedHarmonic}
          width={svgWidth}
          height={120}
          isAnimating={isPlaying}
          showNodes={true}
        />
      </div>

      {/* Harmonic info (explore mode) */}
      {mode === 'explore' && info && (
        <div className="px-6 pb-2 flex items-center gap-6">
          <div>
            <span className="text-[10px] text-zinc-600 uppercase tracking-wider">
              Harmonic
            </span>
            <div className="text-xl font-light text-white">{info.number}</div>
          </div>
          <div>
            <span className="text-[10px] text-zinc-600 uppercase tracking-wider">
              Frequency
            </span>
            <div className="text-sm text-zinc-300 font-mono">
              {info.frequency.toFixed(1)} Hz
            </div>
          </div>
          <div>
            <span className="text-[10px] text-zinc-600 uppercase tracking-wider">
              Interval
            </span>
            <div className="text-sm text-zinc-300">{info.interval}</div>
          </div>
          {info.cents !== 0 && (
            <div>
              <span className="text-[10px] text-zinc-600 uppercase tracking-wider">
                ET Deviation
              </span>
              <div className="text-sm text-zinc-300 font-mono">
                {info.cents > 0 ? '+' : ''}
                {info.cents}¢
              </div>
            </div>
          )}
        </div>
      )}

      {/* Harmonic selector (explore mode) */}
      {mode === 'explore' && (
        <div className="px-4 pb-4">
          <div className="flex items-end gap-0.5 h-16">
            {HARMONIC_DATA.map((h) => {
              const relAmplitude = 1 / h.number;
              const color =
                HARMONIC_COLORS[(h.number - 1) % HARMONIC_COLORS.length];
              const active = selectedHarmonic === h.number;
              return (
                <div
                  key={h.number}
                  className="flex-1 rounded-t transition-all cursor-pointer"
                  style={{
                    height: `${relAmplitude * 100}%`,
                    backgroundColor: active ? color : color + '30',
                    opacity: active ? 1 : 0.5,
                    boxShadow: active ? `0 0 8px ${color}60` : 'none',
                  }}
                  onClick={() => playHarmonic(h.number)}
                />
              );
            })}
          </div>
          <div className="flex gap-0.5">
            {HARMONIC_DATA.map((h) => {
              const color =
                HARMONIC_COLORS[(h.number - 1) % HARMONIC_COLORS.length];
              const active = selectedHarmonic === h.number;
              return (
                <button
                  key={h.number}
                  onClick={() => playHarmonic(h.number)}
                  className={`flex-1 py-1.5 rounded-b text-xs font-mono transition-all ${
                    active ? 'text-white' : 'text-zinc-500 hover:text-white'
                  }`}
                  style={{
                    backgroundColor: active
                      ? color + '30'
                      : 'rgba(255,255,255,0.03)',
                    borderLeft: active
                      ? `1px solid ${color}`
                      : '1px solid rgba(255,255,255,0.05)',
                    borderRight: active
                      ? `1px solid ${color}`
                      : '1px solid rgba(255,255,255,0.05)',
                    borderBottom: active
                      ? `1px solid ${color}`
                      : '1px solid rgba(255,255,255,0.05)',
                  }}
                >
                  {h.number}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Quiz mode */}
      {mode === 'quiz' && (
        <div className="px-6 pb-4">
          {quizQuestion === null ? (
            <div className="flex flex-col items-center gap-4 py-4">
              <p className="text-sm text-zinc-400">
                Hear a fundamental, then a harmonic. Name the interval.
              </p>
              <button
                onClick={newQuiz}
                className="px-4 py-2 rounded text-sm font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-colors"
              >
                Start Quiz
              </button>
            </div>
          ) : quizResult === null ? (
            <div className="flex flex-col items-center gap-4">
              <p className="text-sm text-zinc-400">
                What interval is harmonic #{quizQuestion.number} above the
                fundamental?
              </p>
              <div className="flex gap-2 flex-wrap justify-center">
                {quizOptions.map((opt) => (
                  <button
                    key={opt}
                    onClick={() => submitQuizAnswer(opt)}
                    className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm transition-colors border border-zinc-700"
                  >
                    {opt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div
                className="text-lg font-medium"
                style={{
                  color: quizResult === 'correct' ? '#34d399' : '#ef4444',
                }}
              >
                {quizResult === 'correct'
                  ? 'Correct!'
                  : `Wrong — it was ${quizQuestion.interval}`}
              </div>
              <p className="text-xs text-zinc-500">
                Harmonic {quizQuestion.number}:{' '}
                {quizQuestion.frequency.toFixed(1)} Hz
                {quizQuestion.cents !== 0 &&
                  ` (${quizQuestion.cents > 0 ? '+' : ''}${quizQuestion.cents}¢ from ET)`}
              </p>
              <button
                onClick={newQuiz}
                className="px-4 py-1.5 rounded text-sm font-medium bg-purple-600 hover:bg-purple-500 text-white transition-colors"
              >
                Next Question
              </button>
            </div>
          )}
        </div>
      )}

      {/* Footer controls */}
      <div className="h-12 bg-[#121214] border-t border-zinc-800 flex items-center px-6">
        {mode === 'explore' &&
          (isPlaying ? (
            <button
              onClick={stopHarmonic}
              className="px-4 py-1.5 rounded text-sm font-medium bg-red-600 hover:bg-red-500 text-white transition-colors"
            >
              Stop
            </button>
          ) : (
            <span className="text-xs text-zinc-600">
              Click a number to hear and see its standing wave pattern
            </span>
          ))}
      </div>
    </div>
  );
}
