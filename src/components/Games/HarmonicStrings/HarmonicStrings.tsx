import { useEffect, useRef, useState, useCallback } from 'react';
import { createBus, resumeAudio } from '@/audio/engine/AudioBus';
import { HarmonicTone } from '@/audio/harmonics/HarmonicTone';
import { StandingWave } from '@/components/harmonics/StandingWave';
import {
  centsFromET,
  partialHz,
  partialInterval,
} from '@/lib/music/harmonicSeries';
import { ArcadeGameHeader } from '../ArcadeGameHeader';
import { VolumeDial } from '../VolumeDial';

// --- Constants ---

const HARMONICS_COUNT = 16;
const FUNDAMENTAL_FREQ = 130.81; // C3

interface HarmonicInfo {
  number: number;
  frequency: number;
  interval: string;
  cents: number; // deviation from equal temperament
}

// The series' maths and names are shared (lib/music/harmonicSeries) with the
// guitar Harmonics activity; the game shows its cents rounded to whole ones.
const HARMONIC_DATA: HarmonicInfo[] = Array.from(
  { length: HARMONICS_COUNT },
  (_, i) => {
    const n = i + 1;
    return {
      number: n,
      frequency: partialHz(FUNDAMENTAL_FREQ, n),
      interval: partialInterval(n).short,
      cents: Math.round(centsFromET(n)),
    };
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

/** The game's harmonics on C3, as held sines on its own bus. */
class HarmonicEngine {
  private tone = new HarmonicTone({
    // Shared context + this game's own bus, rather than a context per game.
    output: createBus(0.3),
    resume: resumeAudio,
  });

  setVolume(v: number) {
    this.tone.setVolume(v);
  }

  playHarmonic(harmonicNumber: number) {
    this.tone.play(partialHz(FUNDAMENTAL_FREQ, harmonicNumber), 'sine');
  }

  playFundamental() {
    this.playHarmonic(1);
  }

  stop() {
    this.tone.stop();
  }

  /** Release this engine's nodes. The context is shared — never close it. */
  close() {
    this.tone.close();
  }
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
  const [volume, setVolume] = useState(0.3);
  const engineRef = useRef<HarmonicEngine | null>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const volumeRef = useRef(volume);

  const getEngine = useCallback(() => {
    if (!engineRef.current) {
      engineRef.current = new HarmonicEngine();
      engineRef.current.setVolume(volumeRef.current);
    }
    return engineRef.current;
  }, []);

  // Keep the (lazily created) engine's master gain in sync with the dial
  useEffect(() => {
    volumeRef.current = volume;
    engineRef.current?.setVolume(volume);
  }, [volume]);

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
    <div className="flex flex-col h-full w-full bg-[#101012] overflow-hidden">
      <ArcadeGameHeader
        title="Harmonic Strings"
        controls={
          <>
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
          </>
        }
        right={
          <div className="flex items-center gap-6 rounded-xl border border-white/5 bg-black/20 px-5 py-3 backdrop-blur-sm">
            {mode === 'quiz' && (
              <>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                    Score
                  </span>
                  <span className="text-xl font-medium tabular-nums text-white">
                    {score}/{rounds}
                  </span>
                </div>
                <div className="h-8 w-px bg-white/10" />
              </>
            )}
            <VolumeDial value={volume} onChange={setVolume} />
          </div>
        }
      />

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-y-auto flex flex-col">
        {/* Game content — vertically centered in the available space */}
        <div className="flex-1 flex flex-col justify-center min-h-0">
          {/* String visualization */}
          <div ref={svgContainerRef} className="px-4 pt-6 pb-2">
            <StandingWave
              harmonic={selectedHarmonic}
              width={svgWidth}
              height={120}
              isAnimating={isPlaying}
              color={
                HARMONIC_COLORS[(selectedHarmonic - 1) % HARMONIC_COLORS.length]
              }
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
                <div className="text-xl font-light text-white">
                  {info.number}
                </div>
              </div>
              <div>
                <span className="text-[10px] text-zinc-600 uppercase tracking-wider">
                  Frequency
                </span>
                <div className="text-sm text-zinc-300 tabular-nums">
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
                  <div className="text-sm text-zinc-300 tabular-nums">
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
                      className={`flex-1 py-1.5 rounded-b text-xs tabular-nums transition-all ${
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
                        className="px-4 py-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] text-zinc-300 text-sm transition-colors border border-white/10"
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
        </div>

        {/* Footer controls */}
        <div className="h-12 bg-white/[0.03] border-t border-white/10 flex items-center px-6">
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
    </div>
  );
}
