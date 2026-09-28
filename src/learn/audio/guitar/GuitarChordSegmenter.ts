/**
 * GuitarChordSegmenter.ts — audio strums → GuitarChordEvent (pure).
 *
 * Timing and identity come from different places. Each strum starts at an
 * onset (OnsetStream, ~25 ms accurate). Its chord comes from a local vote over
 * the chord detector's raw per-frame matches (AudioChordDetector
 * getLastFrameMatch) in [onset + 60 ms, min(next onset, onset + 600 ms)]. The
 * detector's own smoothed vote lags a strum by 350-500 ms, so a chord changed
 * every eighth note would be named after the chord before it.
 *
 * Frames are weighted by how much of the analyser's window the strum fills
 * (0 at the onset, 1 once the window holds only the new strum), so the tail
 * of the previous chord still in the window early on can't outvote it.
 *
 * Events:
 *   'on'      once the vote is confident (from 150 ms), or when the window
 *             closes — with `unclear: true` if it never became confident;
 *   'change'  the leading chord changed before the window closed;
 *   'off'     the gate closed, or a named chord's frames went chordless.
 * Every onset is its own strum, so re-strumming a chord gives a new strumId.
 * A tentative onset (one that may be a metronome click) is dropped instead of
 * sent as unclear. All times are the caller's performance.now() ms.
 */

import type { AudioChordResult } from '@/daw/audio/AudioChordDetector';
import { chordPcs } from './chordIdentity';
import type { GuitarChordEvent } from './types';

/** A downstroke fires several flux frames; closer onsets are one strum. */
const MIN_INTER_ONSET_MS = 90;
/** The identity window skips the pick attack's noise… */
const ID_WINDOW_START_MS = 60;
/** …and ends here, or at the next onset. */
export const ID_WINDOW_MAX_MS = 600;
/** The earliest a confident vote is sent as the strum's 'on'. */
const ID_SETTLE_MS = 150;
/** A confident vote needs this many frames for the winner… */
const MIN_ID_FRAMES = 2;
/** …and this share of the window's weight (chordless frames included). */
const MIN_ID_SHARE = 0.5;
/** Consecutive chordless frames that end a named chord. */
const RELEASE_FRAMES = 3;
/** A stopped chord stays in the analyser's window this long. */
const RELEASE_LATENCY_MS = 150;
/** AudioChordDetector's window at 48 kHz (16384 samples). */
const DEFAULT_ANALYSIS_WINDOW_MS = (16384 / 48000) * 1000;

interface Tally {
  match: AudioChordResult;
  weight: number;
  /** Σ weight × frame confidence. */
  confidenceWeight: number;
  frames: number;
  chroma: Float64Array | null;
}

interface Strum {
  onsetPerfMs: number;
  tentative: boolean;
  /** `${rootPc}:${quality}` → votes. */
  tally: Map<string, Tally>;
  totalWeight: number;
  lastChroma: Float64Array | null;
  windowOpen: boolean;
  /** The last identity event sent; null until the strum is sent. */
  sent: GuitarChordEvent | null;
  ended: boolean;
}

export interface GuitarChordSegmenterOptions {
  /** The chord analyser's window (fftSize / sampleRate), for frame weights. */
  analysisWindowMs?: number;
}

export class GuitarChordSegmenter {
  private readonly analysisWindowMs: number;
  private strum: Strum | null = null;
  private nextStrumId = 1;
  private chordlessFrames = 0;
  private chordlessSince: number | null = null;

  constructor(
    private readonly onEvent: (event: GuitarChordEvent) => void,
    options: GuitarChordSegmenterOptions = {},
  ) {
    this.analysisWindowMs =
      options.analysisWindowMs ?? DEFAULT_ANALYSIS_WINDOW_MS;
  }

  /**
   * An attack. `tentative` marks one that may not be the student's (a
   * metronome click): it only counts if the window names a chord.
   */
  pushOnset(perfMs: number, tentative = false): void {
    const current = this.strum;
    if (current && perfMs - current.onsetPerfMs < MIN_INTER_ONSET_MS) {
      current.tentative &&= tentative;
      return;
    }
    if (current?.windowOpen) this.closeWindow(current);
    this.strum = {
      onsetPerfMs: perfMs,
      tentative,
      tally: new Map(),
      totalWeight: 0,
      lastChroma: null,
      windowOpen: true,
      sent: null,
      ended: false,
    };
    this.chordlessFrames = 0;
    this.chordlessSince = null;
  }

  /** One chord-analysis frame, heard while the input gate was open. */
  pushFrame(
    perfMs: number,
    match: AudioChordResult | null,
    chroma: Float64Array | null,
  ): void {
    const strum = this.strum;
    if (!strum || strum.ended) return;

    if (strum.windowOpen) {
      const age = perfMs - strum.onsetPerfMs;
      if (age >= ID_WINDOW_MAX_MS) {
        this.closeWindow(strum);
        if (strum.ended) return;
      } else if (age >= ID_WINDOW_START_MS) {
        this.vote(strum, age, match, chroma);
        if (age >= ID_SETTLE_MS) this.sendLeader(strum);
      }
    }

    // Only a named chord can go quiet; an unclear strum ends with the gate.
    if (match || !strum.sent || strum.sent.unclear) {
      this.chordlessFrames = 0;
      this.chordlessSince = null;
      return;
    }
    this.chordlessSince ??= perfMs;
    if (++this.chordlessFrames >= RELEASE_FRAMES) {
      this.end(
        strum,
        Math.max(strum.onsetPerfMs, this.chordlessSince - RELEASE_LATENCY_MS),
      );
    }
  }

  /** The input fell below the gate at `perfMs`: the strum has stopped. */
  gateClosed(perfMs: number): void {
    const strum = this.strum;
    if (strum && !strum.ended) {
      this.end(strum, Math.max(strum.onsetPerfMs, perfMs));
    }
  }

  /**
   * Stop listening (suppressed, or the step stopped evaluating): a sounding
   * strum gets its 'off'. One still being named is dropped, since it may be
   * the app's own sound — unless its window is already over, when it is sent
   * first (the last strum of a take may wait on a frame to close it).
   */
  close(perfMs: number): void {
    const strum = this.strum;
    if (strum?.windowOpen && perfMs - strum.onsetPerfMs >= ID_WINDOW_MAX_MS) {
      this.closeWindow(strum);
    }
    if (strum?.sent && !strum.ended) {
      this.emit('off', strum, Math.max(strum.onsetPerfMs, perfMs));
    }
    this.reset();
  }

  /** Forget everything without emitting; strumIds keep counting up. */
  reset(): void {
    this.strum = null;
    this.chordlessFrames = 0;
    this.chordlessSince = null;
  }

  // ── Voting ───────────────────────────────────────────────────────────────

  private vote(
    strum: Strum,
    ageMs: number,
    match: AudioChordResult | null,
    chroma: Float64Array | null,
  ): void {
    const weight = Math.min(1, ageMs / this.analysisWindowMs);
    strum.totalWeight += weight;
    if (chroma) strum.lastChroma = chroma;
    if (!match) return;
    const key = `${match.rootPc}:${match.quality}`;
    const tally = strum.tally.get(key) ?? {
      match,
      weight: 0,
      confidenceWeight: 0,
      frames: 0,
      chroma: null,
    };
    tally.weight += weight;
    tally.confidenceWeight += weight * match.confidence;
    tally.frames += 1;
    tally.chroma = chroma;
    strum.tally.set(key, tally);
  }

  /** The heaviest chord in the window, and whether it is confident. */
  private leader(strum: Strum): { tally: Tally; confident: boolean } | null {
    let best: Tally | null = null;
    for (const tally of strum.tally.values()) {
      if (!best || tally.weight > best.weight) best = tally;
    }
    if (!best) return null;
    const confident =
      best.frames >= MIN_ID_FRAMES &&
      best.weight >= MIN_ID_SHARE * strum.totalWeight;
    return { tally: best, confident };
  }

  /** Send the confident leader as 'on', or as 'change' if it moved. */
  private sendLeader(strum: Strum): void {
    const lead = this.leader(strum);
    if (!lead?.confident) return;
    const { match } = lead.tally;
    const sent = strum.sent;
    if (sent && sent.rootPc === match.rootPc && sent.quality === match.quality)
      return;
    this.emit(sent ? 'change' : 'on', strum);
  }

  private closeWindow(strum: Strum): void {
    strum.windowOpen = false;
    this.sendLeader(strum);
    if (strum.sent) return;
    if (strum.tentative) {
      strum.ended = true; // most likely a click: never counted
      return;
    }
    this.emit('on', strum, undefined, true);
  }

  private end(strum: Strum, offsetPerfMs: number): void {
    if (strum.windowOpen) this.closeWindow(strum);
    if (strum.ended) return;
    strum.ended = true;
    this.emit('off', strum, offsetPerfMs);
  }

  // ── Events ───────────────────────────────────────────────────────────────

  private emit(
    phase: GuitarChordEvent['phase'],
    strum: Strum,
    offsetPerfMs?: number,
    unclear = false,
  ): void {
    let event: GuitarChordEvent;
    if (phase === 'off') {
      event = { ...strum.sent!, phase, offsetPerfMs };
    } else {
      const lead = this.leader(strum);
      const match = lead?.tally.match;
      const strumId = strum.sent?.strumId ?? this.nextStrumId++;
      event = {
        phase,
        strumId,
        rootPc: match?.rootPc ?? 0,
        quality: match?.quality ?? '',
        pcs: match
          ? chordPcs(match.rootPc, match.quality).sort((a, b) => a - b)
          : [],
        confidence: lead
          ? Math.min(1, lead.tally.confidenceWeight / strum.totalWeight)
          : 0,
        onsetPerfMs: strum.onsetPerfMs,
        source: 'audio',
        chroma: (unclear ? strum.lastChroma : lead?.tally.chroma) ?? null,
        ...(unclear ? { unclear } : {}),
      };
      strum.sent = event;
    }
    this.onEvent(event);
  }
}
