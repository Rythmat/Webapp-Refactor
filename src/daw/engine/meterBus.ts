import { useStore } from '@/daw/store';
import { monitorsInput } from '@/daw/model/monitoring';
import { audioEngine } from '@/daw/audio/AudioEngine';
import type { EffectChain } from '@/daw/audio/EffectChain';
import type { TrackEngine } from '@/daw/audio/TrackEngine';
import {
  getTrackAudioState,
  subscribeEngineReady,
} from '@/daw/engine/trackAudio';
import type { MeterLevels, MeterSource } from '@/daw/ui/Meter';
import { addFrameTask } from './engineClock';

// ── MeterBus ────────────────────────────────────────────────────────────
// Every level the editor shows (track and master meters, the FX rack's
// in/out and gain-reduction meters, the ducker, live inputs, spectrum
// displays) comes from ONE loop: a 30 fps task on the engineClock. The loop
// runs only while there is something to show: while the transport plays,
// records or counts in, while a meter's live input is monitored or
// recording, and until every meter has fallen to rest after the signal
// stops. An idle editor runs no loop; a slow timer probes the sources
// instead, so a note played while stopped (keyboard, MIDI, a monitored
// input, Test Sound) wakes the meters within PROBE_MS.
//
// Consumers ask for a source by a logical key, never for an AnalyserNode:
//   track:<id>             the track's post-fader level (mono)
//   track-lr:<id>          its left and right, ahead of mute and solo (stereo)
//   master                 the master bus, ahead of its mute (stereo, L and R)
//   fx-pre:<id|master>     the effect chain before its compressor
//   fx-post:<id|master>    the effect chain after its compressor
//   gr:<id|master>         the compressor's gain reduction
//   duck:<trackId>         the sidechain ducker's gain reduction
//   input:<trackId>        a Vocal/Guitar/Bass track's live input
// The bus finds the nodes behind a key when it reads it and again after
// every engine-ready notice, so a meter keeps working when an engine is
// built late or rebuilt under the same id.
//
// The analysers belong to the bus: nothing may change their fftSize or
// smoothing. A display that needs a spectrum taps its own AnalyserNode off
// meterAnalysers(key) (useSpectrumCanvas does).
//
// Each source publishes only when its reading changes (in quarter-dB
// steps), so a steady or silent meter costs its subscribers nothing.

/** The loop's rate. Meters read calmly at 30 fps and it halves the cost. */
export const METER_FPS = 30;
/** How often the idle probe looks for a signal. */
const PROBE_MS = 100;
/** −60 dBFS: below this a source counts as silent and reads 0. */
const SILENT_GAIN = 0.001;
/** How fast a peak falls after the signal drops (the old 0.9 a frame at 60 Hz). */
const RELEASE_DB_PER_S = 54;
/** The held peak: how long it holds, then how fast it falls. These match the
 *  Meter primitive's own, so the bus keeps sending readings until a Meter's
 *  hold marker has come to rest too. */
const HOLD_MS = 1000;
const HOLD_FALL_DB_PER_S = 24;
/** The held peak rests a little under the silent floor (−66 dBFS), so a
 *  Meter's own hold is surely under its −60 dB floor by the last reading. */
const HOLD_FLOOR = SILENT_GAIN / 2;
/** A sample at −0.1 dBFS or over is a clip; the clip flag holds this long. */
const CLIP_GAIN = 0.989;
const CLIP_HOLD_MS = 1500;
/** Gain-reduction sources read 1 at this many dB of reduction. */
const GR_RANGE_DB = 24;
/** Readings are compared in steps of 1/QUANT dB. */
const QUANT = 4;

/**
 * One reading of a bus source. The object is reused from reading to
 * reading: paint from it in the callback, and copy what you keep.
 *
 * `peak` is each channel's level as linear amplitude (1 = 0 dBFS) with a
 * time-based release; `hold` is the held peak (it holds HOLD_MS, then
 * falls). For `gr:` and `duck:` sources the value is the reduction's depth
 * instead: 0 none, 1 at GR_RANGE_DB (24 dB) or more. `rms` is the live
 * input's RMS (input sources only). `clipped` is set for CLIP_HOLD_MS after
 * a sample reaches full scale.
 */
export interface BusLevels extends MeterLevels {
  readonly peak: Float32Array;
  readonly hold: Float32Array;
  readonly rms: Float32Array | null;
  readonly clipped: boolean;
}

type Kind =
  | 'track'
  | 'track-lr'
  | 'master'
  | 'fx-pre'
  | 'fx-post'
  | 'gr'
  | 'duck'
  | 'input'
  | 'node';

/** What an input adapter (Vocal, Guitar, Bass) offers the bus. */
interface InputAdapter {
  getInputLevel(): number;
  getChordAnalyserNode?(): AnalyserNode | null;
  getDeviceId?(): string | null;
}

type Resolved =
  | { type: 'analysers'; nodes: AnalyserNode[] }
  | { type: 'gr'; chain: EffectChain }
  | { type: 'duck'; engine: TrackEngine }
  | { type: 'input'; adapter: InputAdapter };

interface MutableLevels {
  peak: Float32Array;
  hold: Float32Array;
  rms: Float32Array | null;
  clipped: boolean;
}

type Listener = (levels: BusLevels) => void;

interface Entry {
  kind: Kind;
  arg: string;
  node: AnalyserNode | null;
  channels: number;
  source: MeterSource;
  listeners: Set<Listener>;
  /** The nodes behind the key; undefined until resolved (or after engine-ready). */
  resolved: Resolved | null | undefined;
  /** For master-bus sources: what `resolved` was found on (see masterOwner). */
  owner: unknown;
  instant: Float32Array;
  instantRms: number;
  levels: MutableLevels;
  holdAt: Float64Array;
  clipAt: number;
  /** The last published reading, quantised (peak and hold per channel, rms, clip). */
  codes: Int32Array;
}

const entries = new Map<string, Entry>();
const nodeEntries = new WeakMap<AnalyserNode, Entry>();
/** Entries with at least one listener: what the loop reads. */
const live = new Set<Entry>();
const frameListeners = new Set<(running: boolean) => void>();
const buffers = new WeakMap<AnalyserNode, Float32Array<ArrayBuffer>>();

let removeTask: (() => void) | null = null;
let probeTimer: ReturnType<typeof setTimeout> | null = null;
let lastFrameAt = 0;
let transportActive = false;
let following = false;

// ── Reading the audio graph ──────────────────────────────────────────────

function chainFor(target: string): EffectChain | null {
  if (target === 'master') return audioEngine.getMasteringChain();
  return getTrackAudioState(target)?.trackEngine.getEffectChain() ?? null;
}

function isInputAdapter(value: unknown): value is InputAdapter {
  return (
    !!value &&
    typeof (value as { getInputLevel?: unknown }).getInputLevel === 'function'
  );
}

function resolve(e: Entry): Resolved | null {
  switch (e.kind) {
    case 'node':
      return { type: 'analysers', nodes: [e.node!] };
    case 'track': {
      const node = getTrackAudioState(e.arg)?.trackEngine.getMeterAnalyser();
      return node ? { type: 'analysers', nodes: [node] } : null;
    }
    case 'track-lr': {
      const engine = getTrackAudioState(e.arg)?.trackEngine;
      return engine
        ? { type: 'analysers', nodes: engine.getMeterAnalysersLR() }
        : null;
    }
    case 'master':
      if (!audioEngine.getIsInitialized()) return null;
      return { type: 'analysers', nodes: audioEngine.getMasterAnalysers() };
    case 'fx-pre':
    case 'fx-post': {
      const chain = chainFor(e.arg);
      if (!chain) return null;
      const node =
        e.kind === 'fx-pre'
          ? chain.getPreCompAnalyser()
          : chain.getPostCompAnalyser();
      return { type: 'analysers', nodes: [node] };
    }
    case 'gr': {
      const chain = chainFor(e.arg);
      return chain ? { type: 'gr', chain } : null;
    }
    case 'duck': {
      const engine = getTrackAudioState(e.arg)?.trackEngine;
      return engine ? { type: 'duck', engine } : null;
    }
    case 'input': {
      const instrument = getTrackAudioState(e.arg)?.trackEngine.getInstrument();
      return isInputAdapter(instrument)
        ? { type: 'input', adapter: instrument }
        : null;
    }
  }
}

/**
 * What a master-bus source was resolved against (the master analyser or the
 * mastering chain). The master bus is rebuilt with the audio engine, not
 * with a track, so its sources check this on each read as well.
 */
function masterOwner(e: Entry): unknown {
  if (e.kind !== 'master' && e.arg !== 'master') return undefined;
  if (!audioEngine.getIsInitialized()) return null;
  return e.kind === 'master'
    ? audioEngine.getMasterAnalysers()[0]
    : audioEngine.getMasteringChain();
}

/** The nodes behind `e`, resolved on first use and again after engine-ready. */
function resolved(e: Entry): Resolved | null {
  const owner = masterOwner(e);
  if (e.resolved && owner !== e.owner) e.resolved = undefined;
  if (e.resolved === undefined || e.resolved === null) {
    try {
      e.resolved = resolve(e);
    } catch {
      e.resolved = null;
    }
    e.owner = owner;
  }
  return e.resolved;
}

function bufferFor(node: AnalyserNode): Float32Array<ArrayBuffer> {
  let buf = buffers.get(node);
  if (!buf || buf.length !== node.fftSize) {
    buf = new Float32Array(node.fftSize);
    buffers.set(node, buf);
  }
  return buf;
}

/** The largest absolute sample in the analyser's window (or its last `tail` samples). */
function analyserPeak(node: AnalyserNode, tail = 0): number {
  const buf = bufferFor(node);
  node.getFloatTimeDomainData(buf);
  let peak = 0;
  const from = tail > 0 ? Math.max(0, buf.length - tail) : 0;
  for (let i = from; i < buf.length; i++) {
    const v = buf[i] < 0 ? -buf[i] : buf[i];
    if (v > peak) peak = v;
  }
  return peak;
}

/** Reads `e`'s instantaneous levels into e.instant; true when a sample clipped. */
function readInstant(e: Entry): boolean {
  const r = resolved(e);
  e.instant.fill(0);
  e.instantRms = 0;
  if (!r) return false;
  let clipped = false;
  try {
    switch (r.type) {
      case 'analysers':
        for (let ch = 0; ch < e.channels && ch < r.nodes.length; ch++) {
          const peak = analyserPeak(r.nodes[ch]);
          e.instant[ch] = peak;
          if (peak >= CLIP_GAIN) clipped = true;
        }
        break;
      case 'gr':
        e.instant[0] = Math.min(
          1,
          Math.abs(r.chain.getGainReduction()) / GR_RANGE_DB,
        );
        break;
      case 'duck':
        e.instant[0] = Math.min(
          1,
          Math.abs(r.engine.getDuckReduction()) / GR_RANGE_DB,
        );
        break;
      case 'input': {
        const rms = r.adapter.getInputLevel();
        // The true peak comes from the chord analyser, which hears the same
        // raw input over a long window: its most recent frame and a half of
        // samples, so no transient between two reads is missed.
        const tap = r.adapter.getChordAnalyserNode?.() ?? null;
        const tail = tap
          ? Math.ceil((tap.context.sampleRate / METER_FPS) * 1.5)
          : 0;
        const peak = tap ? analyserPeak(tap, tail) : rms;
        e.instantRms = rms;
        e.instant[0] = peak;
        if (peak >= CLIP_GAIN) clipped = true;
        break;
      }
    }
  } catch {
    // A node disposed under us: find it again on the next read.
    e.resolved = null;
    e.instant.fill(0);
  }
  return clipped;
}

// ── Ballistics and publishing ────────────────────────────────────────────

const dbFactor = (db: number) => 10 ** (-db / 20);

const SILENT_CODE = -1_000_000;

function code(v: number): number {
  return v <= 0 ? SILENT_CODE : Math.round(20 * Math.log10(v) * QUANT);
}

/** Marks `e` as having last published silence (what a new meter shows). */
function markSilent(e: Entry): void {
  e.codes.fill(SILENT_CODE, 0, e.channels * 2);
  e.codes[e.channels * 2] = e.levels.rms ? SILENT_CODE : 0;
  e.codes[e.channels * 2 + 1] = 0;
}

function publishIfChanged(e: Entry): void {
  const { peak, hold, rms, clipped } = e.levels;
  const codes = e.codes;
  let changed = false;
  for (let ch = 0; ch < e.channels; ch++) {
    const p = code(peak[ch]);
    const h = code(hold[ch]);
    if (codes[ch * 2] !== p || codes[ch * 2 + 1] !== h) changed = true;
    codes[ch * 2] = p;
    codes[ch * 2 + 1] = h;
  }
  const r = rms ? code(rms[0]) : 0;
  const c = clipped ? 1 : 0;
  const base = e.channels * 2;
  if (codes[base] !== r || codes[base + 1] !== c) changed = true;
  codes[base] = r;
  codes[base + 1] = c;
  if (!changed) return;
  for (const listener of Array.from(e.listeners)) listener(e.levels);
}

/** Advances `e` by `dt` ms with a fresh read; true while it still shows something. */
function step(e: Entry, now: number, dt: number): boolean {
  const clip = readInstant(e);
  const fall = dbFactor((RELEASE_DB_PER_S * dt) / 1000);
  const holdFall = dbFactor((HOLD_FALL_DB_PER_S * dt) / 1000);
  const { peak, hold } = e.levels;
  let lit = false;
  for (let ch = 0; ch < e.channels; ch++) {
    const inst = e.instant[ch];
    let p = Math.max(inst, peak[ch] * fall);
    if (p < SILENT_GAIN) p = 0;
    peak[ch] = p;
    if (inst >= hold[ch]) {
      hold[ch] = inst < SILENT_GAIN ? 0 : inst;
      e.holdAt[ch] = now;
    } else if (now - e.holdAt[ch] > HOLD_MS) {
      let h = Math.max(p, hold[ch] * holdFall);
      if (h < HOLD_FLOOR) h = 0;
      hold[ch] = h;
    }
    if (hold[ch] > 0) lit = true;
  }
  if (e.levels.rms) {
    const prev = e.levels.rms[0];
    let r = Math.max(e.instantRms, prev * fall);
    if (r < SILENT_GAIN) r = 0;
    e.levels.rms[0] = r;
  }
  if (clip) e.clipAt = now;
  e.levels.clipped = e.clipAt > 0 && now - e.clipAt < CLIP_HOLD_MS;
  if (e.levels.clipped) lit = true;
  publishIfChanged(e);
  return lit;
}

function resetLevels(e: Entry): void {
  e.levels.peak.fill(0);
  e.levels.hold.fill(0);
  e.levels.rms?.fill(0);
  e.levels.clipped = false;
  e.holdAt.fill(0);
  e.clipAt = 0;
}

function isSilent(e: Entry): boolean {
  for (let ch = 0; ch < e.channels; ch++) {
    if (e.levels.peak[ch] > 0 || e.levels.hold[ch] > 0) return false;
  }
  return !e.levels.clipped && !(e.levels.rms && e.levels.rms[0] > 0);
}

// ── The loop ─────────────────────────────────────────────────────────────

/** A subscribed live input that is monitored, or armed while recording. */
function inputIsLive(e: Entry): boolean {
  const r = resolved(e);
  if (!r || r.type !== 'input') return false;
  const s = useStore.getState();
  const track = s.tracks.find((t) => t.id === e.arg);
  if (!track) return false;
  if (track.recordArmed && s.isRecording) return true;
  return monitorsInput(track) && (r.adapter.getDeviceId?.() ?? null) !== null;
}

/** Whether the loop must run even with every meter at rest. */
function keepAwake(): boolean {
  if (transportActive) return true;
  for (const e of live) {
    if (e.kind === 'input' && inputIsLive(e)) return true;
  }
  return false;
}

function frame(): void {
  const now = performance.now();
  const dt = lastFrameAt === 0 ? 0 : now - lastFrameAt;
  lastFrameAt = now;
  let lit = false;
  for (const e of Array.from(live)) {
    if (step(e, now, dt)) lit = true;
  }
  for (const listener of Array.from(frameListeners)) listener(true);
  if (lit || keepAwake()) return;
  stopLoop();
}

function startLoop(): void {
  if (probeTimer !== null) {
    clearTimeout(probeTimer);
    probeTimer = null;
  }
  if (removeTask || live.size === 0) return;
  lastFrameAt = 0;
  removeTask = addFrameTask(frame, { fps: METER_FPS, name: 'meterBus' });
}

/** Every meter is at rest: stop the loop and go back to probing. */
function stopLoop(): void {
  removeTask?.();
  removeTask = null;
  lastFrameAt = 0;
  // The last frame already published each source's fall to silence; this
  // sends the silent reading to anything that still shows a level.
  for (const e of live) {
    if (isSilent(e)) continue;
    resetLevels(e);
    publishIfChanged(e);
  }
  for (const listener of Array.from(frameListeners)) listener(false);
  scheduleProbe(PROBE_MS);
}

function scheduleProbe(delay: number): void {
  if (probeTimer !== null || removeTask || live.size === 0) return;
  probeTimer = setTimeout(probe, delay);
}

function probe(): void {
  probeTimer = null;
  if (removeTask || live.size === 0) return;
  if (keepAwake()) {
    startLoop();
    return;
  }
  for (const e of live) {
    const clip = readInstant(e);
    let loud = clip;
    for (let ch = 0; ch < e.channels; ch++) {
      if (e.instant[ch] >= SILENT_GAIN) loud = true;
    }
    if (loud) {
      startLoop();
      return;
    }
  }
  scheduleProbe(PROBE_MS);
}

function isTransportActive(s: {
  isPlaying: boolean;
  isRecording: boolean;
  isCountingIn: boolean;
}): boolean {
  return s.isPlaying || s.isRecording || s.isCountingIn;
}

/** Follow the transport, the tracks and engine-ready once, for the module's lifetime. */
function follow(): void {
  if (following) return;
  following = true;
  let state = useStore.getState();
  transportActive = isTransportActive(state);
  useStore.subscribe((s) => {
    const prev = state;
    state = s;
    const active = isTransportActive(s);
    const transportStarted = active && !transportActive;
    transportActive = active;
    // Starting: meter from the first frame, not the next probe. Stopping:
    // the loop winds down by itself once the meters fall to rest. A track
    // change (monitoring on, a record arm) can make an input live.
    if (removeTask || live.size === 0) return;
    if (transportStarted || (s.tracks !== prev.tracks && keepAwake())) {
      startLoop();
    }
  });
  subscribeEngineReady(() => {
    // Engines were built or replaced: find every source's nodes again.
    for (const e of entries.values()) e.resolved = undefined;
    if (!removeTask && live.size > 0 && keepAwake()) startLoop();
  });
}

// ── Sources ──────────────────────────────────────────────────────────────

function subscribe(e: Entry, listener: Listener): () => void {
  follow();
  e.listeners.add(listener);
  live.add(e);
  // A meter that mounts mid-signal starts from what the source shows now.
  if (!isSilent(e)) listener(e.levels);
  if (!removeTask) {
    if (keepAwake()) startLoop();
    // Read where the meters are now; the probe starts the loop if loud.
    else scheduleProbe(0);
  }
  return () => {
    if (!e.listeners.delete(listener) || e.listeners.size > 0) return;
    live.delete(e);
    resetLevels(e);
    markSilent(e);
    if (live.size > 0) return;
    removeTask?.();
    removeTask = null;
    lastFrameAt = 0;
    if (probeTimer !== null) clearTimeout(probeTimer);
    probeTimer = null;
  };
}

function makeEntry(kind: Kind, arg: string, node: AnalyserNode | null): Entry {
  const channels = kind === 'master' || kind === 'track-lr' ? 2 : 1;
  const e: Entry = {
    kind,
    arg,
    node,
    channels,
    source: { subscribe: (listener) => subscribe(e, listener) },
    listeners: new Set(),
    resolved: undefined,
    owner: undefined,
    instant: new Float32Array(channels),
    instantRms: 0,
    levels: {
      peak: new Float32Array(channels),
      hold: new Float32Array(channels),
      rms: kind === 'input' ? new Float32Array(1) : null,
      clipped: false,
    },
    holdAt: new Float64Array(channels),
    clipAt: 0,
    codes: new Int32Array(channels * 2 + 2),
  };
  markSilent(e);
  return e;
}

const KINDS = new Set<Kind>([
  'track',
  'track-lr',
  'fx-pre',
  'fx-post',
  'gr',
  'duck',
  'input',
]);

function entryFor(key: string): Entry {
  let e = entries.get(key);
  if (e) return e;
  const colon = key.indexOf(':');
  const kind = (colon < 0 ? key : key.slice(0, colon)) as Kind;
  const arg = colon < 0 ? '' : key.slice(colon + 1);
  if (kind !== 'master' && !(KINDS.has(kind) && arg)) {
    throw new Error(`[meterBus] unknown meter source "${key}"`);
  }
  e = makeEntry(kind, arg, null);
  entries.set(key, e);
  return e;
}

/**
 * The level source for a logical key ('track:<id>', 'master',
 * 'fx-pre:<id|master>', 'fx-post:<…>', 'gr:<…>', 'duck:<trackId>',
 * 'input:<trackId>'). The same key always returns the same object, so it
 * can be passed straight to <Meter source> or a dependency list.
 */
export function meterSource(key: string): MeterSource {
  return entryFor(key).source;
}

/** A source for an AnalyserNode the caller holds (the legacy meter hooks). */
export function analyserSource(node: AnalyserNode): MeterSource {
  let e = nodeEntries.get(node);
  if (!e) {
    e = makeEntry('node', '', node);
    nodeEntries.set(node, e);
  }
  return e.source;
}

/** Subscribes `listener` to a source; the reading it gets is a BusLevels. */
export function subscribeMeter(
  source: MeterSource,
  listener: (levels: BusLevels) => void,
): () => void {
  return source.subscribe(listener as (levels: MeterLevels) => void);
}

/**
 * The analysers behind a key as the bus reads them now (none until the
 * engine has built them). For displays that tap their own analyser off the
 * source, such as a spectrum: never retune these.
 */
export function meterAnalysers(key: string): AnalyserNode[] {
  const r = resolved(entryFor(key));
  return r?.type === 'analysers' ? r.nodes : [];
}

/**
 * Calls `listener(true)` once per bus frame while the loop runs and
 * `listener(false)` once when it stops. It rides on the meter loop and does
 * not keep it awake: subscribe to the source as well.
 */
export function subscribeMeterFrames(
  listener: (running: boolean) => void,
): () => void {
  frameListeners.add(listener);
  return () => {
    frameListeners.delete(listener);
  };
}

/** True while the bus loop runs (dev tools, tests). */
export function isMeterBusRunning(): boolean {
  return removeTask !== null;
}
