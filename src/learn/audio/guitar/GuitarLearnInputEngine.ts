/**
 * GuitarLearnInputEngine.ts — a live guitar (microphone or audio interface)
 * heard as lesson notes and chords. No React.
 *
 * Built from Studio's pieces, wired as Studio wires them:
 *   rig (Studio GuitarFxAdapter via GuitarAmpRig) — the input device
 *     ├─ clean pre-amp tap → NodeTapCapture → ProbabilisticOrchestrator with
 *     │    Studio's exact mono Guitar-to-MIDI settings        → single notes
 *     ├─ clean pre-amp tap → OnsetStream (the strum attacks)  ┐
 *     ├─ chord analyser → ChordAnalysisStream (Studio's       ├→ GuitarChordSegmenter → chords
 *     │    AudioChordDetector, raw per-frame matches)         ┘
 *     └─ clean pre-amp tap → a 4096-point analyser for the tuner
 *
 * Guards against false notes (why commit 70b5e5f3 took the lesson mic away):
 * nothing is sent unless the step asks for notes or chords; nothing while the
 * app itself is sounding (setSuppressed); nothing below the noise gate, which
 * holds open 150 ms; a note must last 60 ms to count; and an attack at a
 * scheduled metronome click only counts when it is clearly the student — a
 * note that lasts 150 ms, or a strum that names a chord.
 *
 * Audio event times are performance.now() ms of the attack as heard, minus
 * the measured input latency. The engine never closes the shared context.
 */

import {
  CHORD_ANALYSER_FFT_SIZE,
  ChordAnalysisStream,
  type ChordStreamFrame,
} from '@/daw/audio/ChordAnalysisStream';
import { NodeTapCapture } from '@/daw/audio/NodeTapCapture';
import {
  GUITAR_PITCH_PROFILE,
  orchestratorOptionsFor,
} from '@/daw/audio/instrumentPitchProfiles';
import type { MidiNoteEvent } from '@/hooks/music/useMidiInput';
import { OnsetStream } from '@/learn/audio/v2/OnsetStream';
import {
  ProbabilisticOrchestrator,
  type OrchestratorCallbacks,
} from '@/learn/audio/v2/ProbabilisticOrchestrator';
import type { StreamingCaptureLike } from '@/learn/audio/v2/StreamingAudioCapture';
import { GuitarChordSegmenter } from './GuitarChordSegmenter';
import type {
  GuitarChordEvent,
  GuitarEvaluationMode,
  GuitarInputPrefs,
  GuitarInputRig,
} from './types';

/** Input loop rate, as the orchestrator's (~40 Hz). */
const INPUT_TICK_MS = 25;
/** Meter updates: every other input tick at 60 fps (~15 Hz). */
const LEVEL_REPORT_MS = 60;
/** The gate stays open this long after the level drops below it. */
const GATE_HOLD_MS = 150;
/** A detected note must sound this long before it is sent. */
const NOTE_CONFIRM_MS = 60;
/** …or, starting on a metronome click, this long (a click won't). */
const CLICK_NOTE_MIN_MS = 150;
/** A note takes its attack from an onset up to this far before it was named… */
const ONSET_LOOKBACK_MS = 200;
/**
 * …or just after: the tracker can name a note on the tick its own onset
 * fires, before this loop has read that attack. Under NOTE_CONFIRM_MS, so
 * the onset is in by the time the note is sent.
 */
const ONSET_LOOKAHEAD_MS = 50;
/** …or, with neither, is assumed named this long after its attack. */
const NOTE_DETECT_LAG_MS = 80;
/** Onsets kept for timing notes still waiting to be confirmed. */
const ONSET_MEMORY_MS = 500;
const TUNER_FFT_SIZE = 4096;
/** Gate calibration: ambient level × margin, kept within sane bounds. */
const GATE_MARGIN = 2.5;
const MIN_GATE_RMS = 0.003;
const MAX_GATE_RMS = 0.03;
const DEFAULT_CALIBRATION_MS = 2000;

export interface GuitarEngineCallbacks {
  onNoteOn?: (event: MidiNoteEvent) => void;
  onNoteOff?: (event: MidiNoteEvent) => void;
  onChord?: (event: GuitarChordEvent) => void;
  /** Input RMS 0-1, ~15 Hz while listening, and 0 on stop. */
  onLevel?: (level: number) => void;
  /** The input failed after it started (e.g. the device was unplugged). */
  onError?: (error: Error) => void;
}

/** The mono note tracker (ProbabilisticOrchestrator) as the engine uses it. */
export interface GuitarNoteTracker {
  setCallbacks(callbacks: OrchestratorCallbacks): void;
  start(): Promise<void>;
  stop(): void;
  setKeyContext(rootPc: number, modeIntervals: number[]): void;
  clearKeyContext(): void;
  setExpectedNotes(notes: number[] | null): void;
}

/** The chord-analysis loop (ChordAnalysisStream) as the engine uses it. */
export type GuitarChordFrames = Pick<
  ChordAnalysisStream,
  'step' | 'setKeyContext' | 'clearKeyContext'
>;

/** Seams for tests; production uses the defaults. */
export interface GuitarEngineDeps {
  acquireRig: () => Promise<GuitarInputRig>;
  releaseRig: (rig: GuitarInputRig) => void;
  createNoteTracker: (capture: StreamingCaptureLike) => GuitarNoteTracker;
  createChordFrames: (
    analyser: AnalyserNode,
    onFrame: (frame: ChordStreamFrame) => void,
  ) => GuitarChordFrames;
  createOnsetDetector: () => Pick<OnsetStream, 'process'>;
}

/** Loaded on first use, so piano lessons never load the Studio amps. */
let ampRigModule: Promise<typeof import('./GuitarAmpRig')> | null = null;
function loadAmpRig() {
  ampRigModule ??= import('./GuitarAmpRig').catch((err: unknown) => {
    ampRigModule = null; // let the next start retry the download
    throw err;
  });
  return ampRigModule;
}

const DEFAULT_DEPS: GuitarEngineDeps = {
  // The rig is shared with the guitar voice; its last release tears it down.
  acquireRig: () => loadAmpRig().then((m) => m.acquireGuitarAmpRig()),
  releaseRig: () => {
    void loadAmpRig().then((m) => m.releaseGuitarAmpRig());
  },
  createNoteTracker: (capture) =>
    new ProbabilisticOrchestrator(
      capture,
      'monophonic',
      orchestratorOptionsFor(GUITAR_PITCH_PROFILE, 'monophonic'),
    ),
  createChordFrames: (analyser, onFrame) =>
    new ChordAnalysisStream(analyser, onFrame),
  createOnsetDetector: () => new OnsetStream(GUITAR_PITCH_PROFILE.onsetFftSize),
};

/** The input as it runs; null while stopped. */
interface Live {
  rig: GuitarInputRig;
  source: AudioNode;
  capture: NodeTapCapture;
  notes: GuitarNoteTracker;
  chords: GuitarChordFrames;
  onsets: Pick<OnsetStream, 'process'>;
  onsetAnalyser: AnalyserNode;
  tuner: AnalyserNode;
  segmenter: GuitarChordSegmenter;
  rafId: number;
}

interface PendingNote {
  velocity: number;
  /** When the tracker named it; its attack is found when it is confirmed. */
  namedAt: number;
}

export class GuitarLearnInputEngine {
  private readonly deps: GuitarEngineDeps;
  private prefs: GuitarInputPrefs;
  private callbacks: GuitarEngineCallbacks = {};
  private live: Live | null = null;
  private starting: Promise<void> | null = null;
  /** The latest open attempt, settled or not: opens run one at a time. */
  private opening: Promise<void> = Promise.resolve();
  /** Bumped by start() and stop(), so a start that stop() overtook backs out. */
  private generation = 0;
  /** Kept across reopens, so strumIds never repeat within a lesson. */
  private segmenter: GuitarChordSegmenter | null = null;

  private mode: GuitarEvaluationMode = 'off';
  private suppressed = false;
  private isClick: ((perfMs: number) => boolean) | null = null;
  private keyContext: [rootPc: number, modeIntervals: number[]] | null = null;
  private expectedNotes: number[] | null = null;

  private lastInputTick = -Infinity;
  private lastLevelReport = -Infinity;
  private level = 0;
  private gateOpen = false;
  private belowGateSince: number | null = null;
  /** Recent attacks heard with the gate open (performance.now() ms). */
  private readonly recentOnsets: number[] = [];
  /** The latest onset a sent note took; each attack starts one note. */
  private claimedOnset = -Infinity;
  private readonly pendingNotes = new Map<number, PendingNote>();
  /** Sent notes → their attack (onsetPerfMs) and velocity. */
  private readonly soundingNotes = new Map<
    number,
    { onsetPerfMs: number; velocity: number }
  >();
  private lastChroma: Float64Array | null = null;
  private calibrationSamples: number[] | null = null;

  constructor(prefs: GuitarInputPrefs, deps: Partial<GuitarEngineDeps> = {}) {
    this.prefs = prefs;
    this.deps = { ...DEFAULT_DEPS, ...deps };
  }

  get isListening(): boolean {
    return this.live !== null;
  }

  setCallbacks(callbacks: GuitarEngineCallbacks): void {
    this.callbacks = callbacks;
  }

  /**
   * Open the input and start listening. May ask for the microphone, so call
   * it from a user gesture. Rejects with the browser's error (NotAllowedError
   * when permission is denied, NotFoundError when there is no input).
   */
  start(): Promise<void> {
    if (this.live) return Promise.resolve();
    if (!this.starting) {
      const generation = ++this.generation;
      // A start soon after stop() waits for the open that stop() cancelled
      // to back out, so two opens never race for the rig's device.
      const starting = this.opening
        .then(() => this.listen(generation))
        .finally(() => {
          if (this.starting === starting) this.starting = null;
        });
      this.starting = starting;
      this.opening = starting.catch(() => {});
    }
    return this.starting;
  }

  /** Resolves without listening when stop() cancels it. */
  private async listen(generation: number): Promise<void> {
    const cancelled = () => generation !== this.generation;
    if (cancelled()) return;
    const rig = await this.deps.acquireRig();
    if (cancelled()) {
      this.deps.releaseRig(rig); // never ask for a device nobody wants
      return;
    }
    let live: Live;
    try {
      live = await this.open(rig);
    } catch (err) {
      this.deps.releaseRig(rig);
      if (cancelled()) return;
      throw err;
    }
    if (cancelled()) {
      this.close(live);
      return;
    }
    this.live = live;
    const tick = () => {
      live.rafId = requestAnimationFrame(tick);
      this.tick(live);
    };
    live.rafId = requestAnimationFrame(tick);
  }

  stop(): void {
    this.generation++;
    this.starting = null;
    const live = this.live;
    if (!live) return;
    this.quiet();
    this.live = null;
    this.close(live);
    this.gateOpen = false;
    this.belowGateSince = null;
    this.recentOnsets.length = 0;
    this.claimedOnset = -Infinity;
    this.level = 0;
    this.lastChroma = null;
    this.callbacks.onLevel?.(0);
  }

  /** New prefs: a device change reopens the input, the rest apply live. */
  async setPrefs(next: GuitarInputPrefs): Promise<void> {
    const prev = this.prefs;
    this.prefs = next;
    const live = this.live;
    if (!live) return;
    if (next.deviceId !== prev.deviceId) {
      this.stop();
      await this.start();
      return;
    }
    if (next.channel !== prev.channel) live.rig.setChannel(next.channel);
    if (next.trimDb !== prev.trimDb) live.rig.setInputTrim(next.trimDb);
    if (next.monitorThroughAmp !== prev.monitorThroughAmp) {
      live.rig.setMonitoring(next.monitorThroughAmp);
    }
  }

  /** Which events the current step listens for; 'off' sends none. */
  setEvaluationMode(mode: GuitarEvaluationMode): void {
    if (mode === this.mode) return;
    this.quiet();
    this.mode = mode;
  }

  /** Ignore the input while the app itself is sounding. */
  setSuppressed(suppressed: boolean): void {
    if (suppressed === this.suppressed) return;
    if (suppressed) this.quiet();
    this.suppressed = suppressed;
  }

  /**
   * `isClick(perfMs)` says whether an attack heard at `perfMs` (before the
   * input latency is removed) falls on a scheduled metronome click.
   */
  setClickFilter(isClick: ((perfMs: number) => boolean) | null): void {
    this.isClick = isClick;
  }

  setKeyContext(rootPc: number, modeIntervals: number[]): void {
    this.keyContext = [rootPc, modeIntervals];
    this.live?.notes.setKeyContext(rootPc, modeIntervals);
    this.live?.chords.setKeyContext(rootPc, modeIntervals);
  }

  clearKeyContext(): void {
    this.keyContext = null;
    this.live?.notes.clearKeyContext();
    this.live?.chords.clearKeyContext();
  }

  /** The step's notes, which the note tracker favours (octave errors). */
  setExpectedNotes(midis: number[] | null): void {
    this.expectedNotes = midis;
    this.live?.notes.setExpectedNotes(midis);
  }

  /**
   * Listen to the quiet room for `ms` and set the gate to its level × 2.5
   * (0.003-0.03). Resolves to the new gate; the caller saves it.
   */
  async calibrateGate(ms = DEFAULT_CALIBRATION_MS): Promise<number> {
    if (!this.live) throw new Error('Guitar input is not listening');
    const samples: number[] = [];
    this.calibrationSamples = samples;
    await new Promise((resolve) => setTimeout(resolve, ms));
    if (this.calibrationSamples === samples) this.calibrationSamples = null;
    if (samples.length === 0) {
      throw new Error('Guitar input stopped while calibrating');
    }
    const ambient = samples.reduce((sum, s) => sum + s, 0) / samples.length;
    const gateRms = Math.min(
      MAX_GATE_RMS,
      Math.max(MIN_GATE_RMS, ambient * GATE_MARGIN),
    );
    this.prefs = { ...this.prefs, gateRms };
    return gateRms;
  }

  getTunerAnalyser(): AnalyserNode | null {
    return this.live?.tuner ?? null;
  }

  /** The chord analyser's latest chroma (chord-tone diagnostics). */
  getLastChroma(): Float64Array | null {
    return this.lastChroma;
  }

  getRig(): GuitarInputRig | null {
    return this.live?.rig ?? null;
  }

  // ── Wiring ───────────────────────────────────────────────────────────────

  private async open(rig: GuitarInputRig): Promise<Live> {
    try {
      // Enough channels for the one chosen: the adapter would clamp a
      // channel above what the browser grants by default (often 2).
      await rig.setDevice(
        this.prefs.deviceId,
        Math.max(2, this.prefs.channel + 1),
      );
    } catch (err) {
      throw await inputFailure(err);
    }
    rig.setChannel(this.prefs.channel);
    rig.setInputTrim(this.prefs.trimDb);
    rig.setMonitoring(this.prefs.monitorThroughAmp);
    const source = rig.getPitchDetectSourceNode();
    const chordAnalyser = rig.getChordAnalyserNode();
    if (!source || !chordAnalyser) {
      throw namedError('NotFoundError', 'No guitar input found');
    }

    const capture = new NodeTapCapture(source, GUITAR_PITCH_PROFILE);
    const notes = this.deps.createNoteTracker(capture);
    notes.setCallbacks({
      onNoteOn: (e) => this.handleNoteOn(e),
      onNoteOff: (e) => this.handleNoteOff(e),
    });
    const chords = this.deps.createChordFrames(chordAnalyser, (f) =>
      this.handleChordFrame(f),
    );
    if (this.keyContext) {
      notes.setKeyContext(...this.keyContext);
      chords.setKeyContext(...this.keyContext);
    }
    notes.setExpectedNotes(this.expectedNotes);

    const tuner = source.context.createAnalyser();
    tuner.fftSize = TUNER_FFT_SIZE;
    source.connect(tuner);

    const live: Live = {
      rig,
      source,
      capture,
      notes,
      chords,
      onsets: this.deps.createOnsetDetector(),
      onsetAnalyser: capture.getOnsetAnalyser()!,
      tuner,
      // One context for the session, so the analyser's window never changes.
      segmenter: (this.segmenter ??= new GuitarChordSegmenter(
        (e) => this.sendChord(e),
        {
          analysisWindowMs:
            (CHORD_ANALYSER_FFT_SIZE / chordAnalyser.context.sampleRate) * 1000,
        },
      )),
      rafId: 0,
    };
    try {
      await notes.start();
    } catch (err) {
      this.close(live, false);
      throw err;
    }
    return live;
  }

  /** Undo open(); `release` hands the rig back. */
  private close(live: Live, release = true): void {
    cancelAnimationFrame(live.rafId);
    live.notes.stop();
    live.capture.stop();
    try {
      live.source.disconnect(live.tuner);
    } catch {
      /* edge already gone */
    }
    if (release) this.deps.releaseRig(live.rig);
  }

  // ── Loop ─────────────────────────────────────────────────────────────────

  private tick(live: Live): void {
    const now = performance.now();
    if (now - this.lastInputTick >= INPUT_TICK_MS) {
      this.lastInputTick = now;
      if (live.rig.getPitchDetectSourceNode() !== live.source) {
        this.stop(); // the device went away (unplugged, permission revoked)
        this.callbacks.onError?.(
          namedError('NotFoundError', 'The guitar input was disconnected'),
        );
        return;
      }
      this.updateGate(live, now);
      this.detectOnset(live);
      this.confirmNotes(now);
      if (now - this.lastLevelReport >= LEVEL_REPORT_MS) {
        this.lastLevelReport = now;
        this.callbacks.onLevel?.(this.level);
      }
    }
    live.chords.step(now); // throttles itself to ~20 Hz
  }

  private updateGate(live: Live, now: number): void {
    this.level = live.rig.getInputLevel();
    this.calibrationSamples?.push(this.level);
    if (this.level >= this.prefs.gateRms) {
      this.gateOpen = true;
      this.belowGateSince = null;
      return;
    }
    this.belowGateSince ??= now;
    if (this.gateOpen && now - this.belowGateSince >= GATE_HOLD_MS) {
      this.gateOpen = false;
      if (this.listeningFor('chords')) {
        live.segmenter.gateClosed(this.belowGateSince);
      }
    }
  }

  private detectOnset(live: Live): void {
    const onset = live.onsets.process(live.onsetAnalyser);
    if (!onset || !this.gateOpen) return;
    const onsets = this.recentOnsets;
    onsets.push(onset.timestamp);
    while (onsets[0] < onset.timestamp - ONSET_MEMORY_MS) onsets.shift();
    if (this.listeningFor('chords')) {
      live.segmenter.pushOnset(
        onset.timestamp,
        this.isClick?.(onset.timestamp) ?? false,
      );
    }
  }

  private listeningFor(mode: GuitarEvaluationMode): boolean {
    return this.mode === mode && !this.suppressed;
  }

  // ── Notes ────────────────────────────────────────────────────────────────

  private handleNoteOn(event: MidiNoteEvent): void {
    if (!this.listeningFor('notes') || !this.gateOpen) return;
    this.pendingNotes.set(event.number, {
      velocity: event.velocity,
      namedAt: performance.now(),
    });
  }

  private handleNoteOff(event: MidiNoteEvent): void {
    // A note that ended before it was confirmed was never sent.
    if (this.pendingNotes.delete(event.number)) return;
    this.releaseNote(event.number, performance.now());
  }

  private confirmNotes(now: number): void {
    for (const [midi, note] of this.pendingNotes) {
      const age = now - note.namedAt;
      if (age < NOTE_CONFIRM_MS) continue;
      // The tracker names a note ~80 ms after its attack; the onset has it.
      const onset = this.onsetOf(note.namedAt);
      const heardAt = onset ?? note.namedAt - NOTE_DETECT_LAG_MS;
      if (age < CLICK_NOTE_MIN_MS && this.isClick?.(heardAt)) continue;
      this.pendingNotes.delete(midi);
      if (onset !== null) this.claimedOnset = onset;
      const onsetPerfMs = heardAt - this.prefs.inputLatencyMs;
      const { velocity } = note;
      this.soundingNotes.set(midi, { onsetPerfMs, velocity });
      this.callbacks.onNoteOn?.({
        number: midi,
        duration: 0,
        velocity,
        source: 'audio',
        onsetPerfMs,
      });
    }
  }

  /**
   * The attack of a note named at `namedAt`: the latest onset before it, or
   * the first one read just after — never one an earlier note already took.
   */
  private onsetOf(namedAt: number): number | null {
    let before: number | null = null;
    let after: number | null = null;
    for (const t of this.recentOnsets) {
      if (t <= this.claimedOnset || t < namedAt - ONSET_LOOKBACK_MS) continue;
      if (t <= namedAt) before = t;
      else if (t <= namedAt + ONSET_LOOKAHEAD_MS) after ??= t;
    }
    return before ?? after;
  }

  private releaseNote(midi: number, now: number): void {
    const note = this.soundingNotes.get(midi);
    if (!note) return;
    this.soundingNotes.delete(midi);
    const endPerfMs = now - this.prefs.inputLatencyMs;
    this.callbacks.onNoteOff?.({
      number: midi,
      duration: Math.max(0, endPerfMs - note.onsetPerfMs) / 1000,
      velocity: note.velocity,
      source: 'audio',
      onsetPerfMs: note.onsetPerfMs,
    });
  }

  // ── Chords ───────────────────────────────────────────────────────────────

  private handleChordFrame(frame: ChordStreamFrame): void {
    this.lastChroma = frame.chroma;
    if (!this.live || !this.listeningFor('chords') || !this.gateOpen) return;
    this.live.segmenter.pushFrame(frame.perfMs, frame.frameMatch, frame.chroma);
  }

  private sendChord(event: GuitarChordEvent): void {
    const latency = this.prefs.inputLatencyMs;
    this.callbacks.onChord?.({
      ...event,
      onsetPerfMs: event.onsetPerfMs - latency,
      ...(event.offsetPerfMs !== undefined
        ? { offsetPerfMs: event.offsetPerfMs - latency }
        : {}),
    });
  }

  /** End what is sounding (offs sent, unconfirmed input dropped). */
  private quiet(): void {
    const now = performance.now();
    this.pendingNotes.clear();
    for (const midi of [...this.soundingNotes.keys()]) {
      this.releaseNote(midi, now);
    }
    this.segmenter?.close(now);
  }
}

function namedError(name: string, message: string): Error {
  const error = new Error(message);
  error.name = name;
  return error;
}

/**
 * Name a failed open as getUserMedia would. The rig can only report a plain
 * Error (Studio's adapter swallows the browser's), so ask the permission API:
 * NotAllowedError when the microphone is blocked, NotFoundError otherwise.
 */
async function inputFailure(err: unknown): Promise<Error> {
  if (err instanceof Error && err.name !== 'Error') return err; // a DOMException
  const message =
    err instanceof Error ? err.message : 'Could not open the audio input';
  let denied = false;
  try {
    const status = await navigator.permissions.query({
      name: 'microphone' as PermissionName,
    });
    denied = status.state === 'denied';
  } catch {
    // Not queryable in this browser (Firefox): report it as no input.
  }
  return namedError(denied ? 'NotAllowedError' : 'NotFoundError', message);
}
