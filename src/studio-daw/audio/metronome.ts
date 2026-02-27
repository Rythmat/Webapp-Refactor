/**
 * Metronome engine for count-in and continuous click during recording.
 * Uses Web Audio API OscillatorNode for precise, low-latency clicks.
 */

export interface MetronomeConfig {
  bpm: number;
  beatsPerBar: number;    // time signature numerator (default 4)
  countInBars: number;    // 0 = no count-in, 1-4 bars
  accentFirstBeat: boolean;
  volume: number;         // 0-1
}

export interface MetronomeInstance {
  /** Schedule count-in clicks. Resolves when count-in finishes. */
  startCountIn: () => Promise<void>;
  /** Start continuous click (call after count-in or standalone). */
  startContinuous: () => void;
  /** Stop all metronome sounds immediately. */
  stop: () => void;
  /** Update BPM on the fly. */
  setBpm: (bpm: number) => void;
  /** Whether the metronome is currently producing clicks. */
  readonly isRunning: boolean;
}

function scheduleClick(
  ctx: AudioContext,
  destination: AudioNode,
  when: number,
  isAccent: boolean,
  volume: number,
): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.frequency.value = isAccent ? 1500 : 1000;
  osc.type = 'sine';

  const clickVolume = volume * (isAccent ? 1.0 : 0.7);
  gain.gain.setValueAtTime(clickVolume, when);
  gain.gain.exponentialRampToValueAtTime(0.001, when + 0.05);

  osc.connect(gain);
  gain.connect(destination);

  osc.start(when);
  osc.stop(when + 0.06);
}

export function createMetronome(
  audioContext: AudioContext,
  config: MetronomeConfig,
): MetronomeInstance {
  let bpm = config.bpm;
  let running = false;
  let lookaheadTimer: ReturnType<typeof setInterval> | null = null;
  let nextClickTime = 0;
  let currentBeat = 0;

  const LOOKAHEAD_MS = 25;    // how often to check (ms)
  const SCHEDULE_AHEAD = 0.1; // how far ahead to schedule (seconds)

  const instance: MetronomeInstance = {
    get isRunning() {
      return running;
    },

    startCountIn(): Promise<void> {
      return new Promise((resolve) => {
        const secondsPerBeat = 60 / bpm;
        const totalBeats = config.countInBars * config.beatsPerBar;

        if (totalBeats === 0) {
          resolve();
          return;
        }

        running = true;
        const startTime = audioContext.currentTime + 0.05; // tiny lead-in

        for (let i = 0; i < totalBeats; i++) {
          const when = startTime + i * secondsPerBeat;
          const isAccent = config.accentFirstBeat && (i % config.beatsPerBar === 0);
          scheduleClick(audioContext, audioContext.destination, when, isAccent, config.volume);
        }

        const countInEnd = startTime + totalBeats * secondsPerBeat;

        const check = setInterval(() => {
          if (audioContext.currentTime >= countInEnd - 0.01) {
            clearInterval(check);
            running = false;
            resolve();
          }
        }, 10);
      });
    },

    startContinuous(): void {
      if (running) return;
      running = true;
      currentBeat = 0;
      nextClickTime = audioContext.currentTime + 0.05;

      lookaheadTimer = setInterval(() => {
        const secondsPerBeat = 60 / bpm;

        while (nextClickTime < audioContext.currentTime + SCHEDULE_AHEAD) {
          const isAccent = config.accentFirstBeat && (currentBeat % config.beatsPerBar === 0);
          scheduleClick(audioContext, audioContext.destination, nextClickTime, isAccent, config.volume);
          nextClickTime += secondsPerBeat;
          currentBeat++;
        }
      }, LOOKAHEAD_MS);
    },

    stop(): void {
      running = false;
      if (lookaheadTimer !== null) {
        clearInterval(lookaheadTimer);
        lookaheadTimer = null;
      }
    },

    setBpm(newBpm: number): void {
      bpm = Math.max(20, Math.min(300, newBpm));
    },
  };

  return instance;
}
