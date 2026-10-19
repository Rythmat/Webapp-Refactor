import { EnvelopeParams } from './types';
import { ANTI_CLICK_TIME } from './constants';

/** The level a fresh note's envelope starts from (a near-zero floor). */
export const ENVELOPE_FLOOR = 0.005;

/**
 * What was scheduled on one AudioParam by trigger/release/forceStop, kept so
 * the level at any later time can be computed exactly. Note-offs arrive ahead
 * of their time (the sequencer's look-ahead, or the whole song at once in an
 * offline render), so `param.value` at call time is not the level at the
 * release time; this is.
 */
export interface EnvelopeSegment {
  start: number;
  from: number;
  peak: number;
  sustain: number;
  attack: number;
  /** When the decay toward `sustain` starts (start + max(attack, 1 ms)). */
  decayStart: number;
  decayTc: number;
  /** Infinity while the note is held. */
  releaseAt: number;
  releaseFrom: number;
  /** 'exp' = setTargetAtTime toward 0; 'linear' = a ramp ending at releaseEnd. */
  releaseKind: 'exp' | 'linear';
  releaseTc: number;
  releaseEnd: number;
}

/** Level of the attack/decay/sustain part of a segment at time t. */
function heldLevelAt(seg: EnvelopeSegment, t: number): number {
  if (t <= seg.start) return seg.from;
  const attackEnd = seg.start + seg.attack;
  if (seg.attack > 0.001) {
    if (t < attackEnd) {
      return seg.from + ((seg.peak - seg.from) * (t - seg.start)) / seg.attack;
    }
  } else if (t < seg.start + 0.001) {
    return seg.from;
  }
  if (t <= seg.decayStart) return seg.peak;
  if (seg.decayTc <= 0) return seg.sustain;
  return (
    seg.sustain +
    (seg.peak - seg.sustain) * Math.exp(-(t - seg.decayStart) / seg.decayTc)
  );
}

/** The exact level a segment's automation reaches at context time t. */
export function envelopeLevelAt(seg: EnvelopeSegment, t: number): number {
  if (t < seg.releaseAt) return heldLevelAt(seg, t);
  if (seg.releaseKind === 'linear') {
    if (t >= seg.releaseEnd) return 0;
    const span = seg.releaseEnd - seg.releaseAt;
    return span > 0
      ? seg.releaseFrom * (1 - (t - seg.releaseAt) / span)
      : seg.releaseFrom;
  }
  if (seg.releaseTc <= 0) return 0;
  return seg.releaseFrom * Math.exp(-(t - seg.releaseAt) / seg.releaseTc);
}

/** A flat level (a source with no envelope assigned holds its velocity). */
export function holdSegment(
  target: AudioParam,
  level: number,
  time: number,
): EnvelopeSegment {
  target.cancelScheduledValues(time);
  target.setValueAtTime(level, time);
  return {
    start: time,
    from: level,
    peak: level,
    sustain: level,
    attack: 0,
    decayStart: time,
    decayTc: 0,
    releaseAt: Infinity,
    releaseFrom: level,
    releaseKind: 'exp',
    releaseTc: 0,
    releaseEnd: Infinity,
  };
}

/**
 * Cuts the automation of `target` at `time` and leaves it exactly at the
 * level the segment had there, without cancelAndHoldAtTime (not in every
 * browser): cancelScheduledValues drops an attack ramp that ends after `time`,
 * so the truncated ramp is re-added up to that level.
 */
function cutAt(
  target: AudioParam,
  seg: EnvelopeSegment | null,
  time: number,
): number {
  const level = seg ? envelopeLevelAt(seg, time) : target.value;
  target.cancelScheduledValues(time);
  const inAttack =
    seg !== null &&
    seg.releaseAt > time &&
    seg.attack > 0.001 &&
    time > seg.start &&
    time < seg.start + seg.attack;
  if (inAttack) {
    target.linearRampToValueAtTime(level, time);
  } else {
    target.setValueAtTime(level, time);
  }
  return level;
}

/**
 * Fades `target` linearly to 0 over `fade` seconds from `time`, starting at
 * the level the segment has at `time`. Used by voice steals and panic.
 * Returns the updated segment.
 */
export function fadeOutSegment(
  target: AudioParam,
  seg: EnvelopeSegment | null,
  time: number,
  fade: number = ANTI_CLICK_TIME,
): EnvelopeSegment {
  const level = cutAt(target, seg, time);
  target.linearRampToValueAtTime(0, time + fade);
  const base: EnvelopeSegment = seg ?? {
    start: time,
    from: level,
    peak: level,
    sustain: level,
    attack: 0,
    decayStart: time,
    decayTc: 0,
    releaseAt: Infinity,
    releaseFrom: level,
    releaseKind: 'exp',
    releaseTc: 0,
    releaseEnd: Infinity,
  };
  return {
    ...base,
    releaseAt: time,
    releaseFrom: level,
    releaseKind: 'linear',
    releaseTc: 0,
    releaseEnd: time + fade,
  };
}

export class Envelope {
  private params: EnvelopeParams;

  constructor(params?: Partial<EnvelopeParams>) {
    this.params = {
      attack: params?.attack ?? 0.01,
      decay: params?.decay ?? 0.1,
      sustain: params?.sustain ?? 0.7,
      release: params?.release ?? 0.3,
    };
  }

  setParams(params: Partial<EnvelopeParams>): void {
    if (params.attack !== undefined) this.params.attack = params.attack;
    if (params.decay !== undefined) this.params.decay = params.decay;
    if (params.sustain !== undefined) this.params.sustain = params.sustain;
    if (params.release !== undefined) this.params.release = params.release;
  }

  getParams(): EnvelopeParams {
    return { ...this.params };
  }

  /**
   * Schedules attack → decay → sustain on `target` from `time`. A fresh note
   * starts from the near-zero floor; a mono retrigger passes `prev` (the
   * segment still running on this param) and the attack starts from the level
   * that segment has at `time`, so there is no jump.
   */
  trigger(
    target: AudioParam,
    velocity: number,
    ctx: BaseAudioContext,
    time?: number,
    prev?: EnvelopeSegment | null,
  ): EnvelopeSegment {
    const now = time ?? ctx.currentTime;
    const { attack, decay, sustain } = this.params;
    const peak = velocity;
    const sustainLevel = sustain * velocity;

    let from = ENVELOPE_FLOOR;
    if (prev) {
      from = cutAt(target, prev, now);
    } else {
      target.cancelScheduledValues(now);
      target.setValueAtTime(from, now);
    }

    // Attack: ramp to peak
    if (attack > 0.001) {
      target.linearRampToValueAtTime(peak, now + attack);
    } else {
      target.setValueAtTime(peak, now + 0.001);
    }

    // Decay toward sustain. It starts once the peak is reached: with an
    // attack under 1 ms the peak lands at +1 ms, and a decay scheduled
    // before that would be overridden by the peak and never run.
    const decayStart = now + Math.max(attack, 0.001);
    const decayTc = decay / 3;
    target.setTargetAtTime(sustainLevel, decayStart, decayTc);

    return {
      start: now,
      from,
      peak,
      sustain: sustainLevel,
      attack,
      decayStart,
      decayTc,
      releaseAt: Infinity,
      releaseFrom: 0,
      releaseKind: 'exp',
      releaseTc: 0,
      releaseEnd: Infinity,
    };
  }

  /**
   * Starts the release at `time` from the level the envelope has at `time`
   * (computed from the segment, not read from param.value at call time).
   */
  release(
    target: AudioParam,
    ctx: BaseAudioContext,
    time?: number,
    seg?: EnvelopeSegment | null,
  ): EnvelopeSegment {
    const now = time ?? ctx.currentTime;
    const releaseTc = Math.max(this.params.release / 5, 0.001);
    const level = cutAt(target, seg ?? null, now);
    target.setTargetAtTime(0, now, releaseTc);
    const base = seg ?? {
      start: now,
      from: level,
      peak: level,
      sustain: level,
      attack: 0,
      decayStart: now,
      decayTc: 0,
      releaseAt: Infinity,
      releaseFrom: 0,
      releaseKind: 'exp' as const,
      releaseTc: 0,
      releaseEnd: Infinity,
    };
    return {
      ...base,
      releaseAt: now,
      releaseFrom: level,
      releaseKind: 'exp',
      releaseTc,
      releaseEnd: now + this.getTailTime(),
    };
  }

  /** Fades to 0 over the anti-click time from the level at `time`. */
  forceStop(
    target: AudioParam,
    ctx: BaseAudioContext,
    time?: number,
    seg?: EnvelopeSegment | null,
  ): EnvelopeSegment {
    return fadeOutSegment(target, seg ?? null, time ?? ctx.currentTime);
  }

  getReleaseTime(): number {
    return this.params.release;
  }

  /**
   * How long after the release starts the sources can stop: six time
   * constants (the level is under 0.25 % of where it started), plus the
   * anti-click time.
   */
  getTailTime(): number {
    const releaseTc = Math.max(this.params.release / 5, 0.001);
    return releaseTc * 6 + ANTI_CLICK_TIME;
  }

  getVisualizationPoints(): Array<{ time: number; value: number }> {
    const { attack, decay, sustain, release } = this.params;
    return [
      { time: 0, value: 0 },
      { time: attack, value: 1 },
      { time: attack + decay, value: sustain },
      { time: attack + decay + 0.5, value: sustain }, // hold
      { time: attack + decay + 0.5 + release, value: 0 },
    ];
  }
}
