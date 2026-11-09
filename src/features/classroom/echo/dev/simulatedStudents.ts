/**
 * DEV only: a class of pretend students for the dev class page.
 *
 * Each answers every call as a real device would: it hears the round at
 * the start time the teacher's computer set, converted to its own clock by
 * the clock check, plays the call back with its own timing spread and
 * slips (a wrong note now and then, a missed one, an extra), grades itself
 * the class's way (quantized), and posts its cumulative `echo` response
 * after the round. Some sit a round out.
 *
 * THE CLOCK CHECK, FOR REAL
 * Every pretend device's clock is off from the server's by its own skew.
 * It runs the real estimate (serverClock.ts) over five pretend pings with
 * uneven round trips. What the estimate misses is how far its round starts
 * from the class's (the page shows it); its grading doesn't move, since a
 * device grades against its own run.
 *
 * Pure, no React; the page runs the timers.
 */

import { gradeRunCall } from '@/components/Games/Echo/echoOutcome';
import type { RunCall } from '@/components/Games/Echo/echoRunCues';
import {
  echoRandom,
  gradeQuantizedEcho,
  msToTicks,
  type EchoRandom,
  type PlayedNote,
} from '@/curriculum/engine/echo';
import {
  JOIN_PINGS,
  createServerClockEstimate,
  type ClockSample,
} from '../../live/serverClock';
import { askedTiming } from '../classRound';
import type { EchoClassSettings, EchoRoundResult } from '../types';

export interface SimStudent {
  enrollmentId: string;
  displayName: string;
  /** Timing spread: one standard deviation, in ms. */
  jitterMs: number;
  /** Chance a note is played wrong. */
  wrong: number;
  /** Chance a note is missed. */
  miss: number;
  /** Chance of an extra note. */
  extra: number;
  /** Chance of sitting a round out. */
  absent: number;
  /** How far this device's clock is from the server's (ms). */
  skewMs: number;
}

const NAMES = [
  'Ana P.',
  'Ben K.',
  'Chloe R.',
  'Dev S.',
  'Eli M.',
  'Farah N.',
  'Gus T.',
  'Hana W.',
  'Ivan L.',
  'June O.',
  'Kai B.',
  'Lena D.',
  'Milo F.',
  'Nia G.',
  'Omar H.',
  'Pia J.',
];

/** A normal number: mean 0, deviation 1 (Box–Muller). */
function gauss(rng: EchoRandom): number {
  const u = Math.max(rng(), 1e-9);
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/** A class of pretend students, from strong to shaky. */
export function simulatedRoster(
  count: number,
  seed = 'dev-class',
): SimStudent[] {
  const rng = echoRandom(seed);
  return Array.from({ length: Math.min(count, NAMES.length) }, (_, i) => {
    const skill = rng(); // 0 shaky … 1 strong
    return {
      enrollmentId: `sim-${i + 1}`,
      displayName: NAMES[i],
      jitterMs: Math.round(25 + (1 - skill) * 90),
      wrong: 0.02 + (1 - skill) * 0.12,
      miss: 0.02 + (1 - skill) * 0.1,
      extra: 0.03 + (1 - skill) * 0.08,
      absent: 0.04,
      skewMs: Math.round((rng() - 0.5) * 3000),
    };
  });
}

/**
 * The clock check on a pretend device: five pings, each way taking 10 to
 * 90 ms, through the real estimate. The offset it finds (server − device);
 * its error is how far the device's rounds start from the class's:
 * −(offset + skew).
 */
export function simulatedClockOffset(
  student: SimStudent,
  rng: EchoRandom,
  serverNow = Date.now(),
): number {
  const estimate = createServerClockEstimate();
  let t = serverNow;
  for (let i = 0; i < JOIN_PINGS; i++) {
    const out = 10 + rng() * 80;
    const back = 10 + rng() * 80;
    const sample: ClockSample = {
      sentAt: t + student.skewMs,
      serverAt: t + out,
      receivedAt: t + out + back + student.skewMs,
    };
    estimate.add(sample);
    t += 250;
  }
  return estimate.offset();
}

/** The notes a pretend student plays back for a call, on the run's ticks. */
export function simulateAnswer(
  student: SimStudent,
  placed: RunCall,
  rng: EchoRandom,
): PlayedNote[] {
  const tempo = placed.timeline.tempo;
  const shift = (ms: number) => Math.round(msToTicks(ms, tempo));
  const off = () => shift(gauss(rng) * student.jitterMs);
  const played: PlayedNote[] = [];
  if (placed.call.kind === 'melody') {
    for (const note of placed.notes.response) {
      if (rng() < student.miss) continue;
      const wrong = rng() < student.wrong;
      played.push({
        midi: wrong ? note.midi + (rng() < 0.5 ? -2 : 2) : note.midi,
        onset: note.onset + off(),
        duration: Math.max(60, note.duration - 40),
      });
    }
  } else {
    for (const attack of placed.attacks.response) {
      if (rng() < student.miss) continue;
      const at = attack.onset + off();
      const wrong = rng() < student.wrong;
      attack.chord.midis.forEach((midi, i) =>
        played.push({
          midi: wrong && i === 1 ? midi + 1 : midi,
          onset: at + i * shift(6),
          duration: Math.max(60, attack.duration - 40),
        }),
      );
    }
  }
  if (rng() < student.extra && played.length) {
    const like = played[Math.floor(rng() * played.length)];
    played.push({
      ...like,
      midi: like.midi + 4,
      onset: like.onset + shift(150),
    });
  }
  return played.sort((a, b) => a.onset - b.onset);
}

/** A pretend student's round, graded as their device grades it. */
export function simulatedRound(
  run: number,
  placed: RunCall,
  played: readonly PlayedNote[],
  grading: EchoClassSettings['grading'],
): EchoRoundResult {
  const quantized = gradeQuantizedEcho(placed.call, played, {
    timeline: placed.timeline,
  });
  const shown = gradeRunCall(placed, played);
  const tempo = placed.timeline.tempo;
  return {
    run,
    passed: grading === 'off' ? quantized.playedAny : quantized.passed,
    score: quantized.percent,
    asked: shown.asked,
    played: quantized.playedAny ? shown.played : [],
    timing: askedTiming(placed.call, quantized.offsets, tempo),
  };
}
