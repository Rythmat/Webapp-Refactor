// ── renderProject ─────────────────────────────────────────────────────────
// Offline mixdown/bounce of the whole project (or the loop region) to an
// AudioBuffer, via Tone.Offline. Tone.Offline swaps Tone's global context to an
// OfflineAudioContext for the duration of the callback, so the same Tone-based
// instruments, MidiScheduler (Tone.Part) and AudioClipScheduler (Transport
// scheduling) that drive live playback render offline with no rebuild — we just
// reconstruct the graph on the offline context.
//
// ── Render-parity checklist ───────────────────────────────────────────────
// Covered (audible in the bounce):
//   • Per-track instruments scheduling their MIDI clip events (MidiScheduler).
//   • Audio clips from the AudioBufferStore, with offsetSeconds trim, fades and
//     per-clip gain (AudioClipScheduler).
//   • Per-track EffectChain (EQ/comp/reverb/delay/presence/de-esser/saturator/
//     multiband), track volume + pan, mute/solo.
//   • Post-fader aux sends → return buses (each its own EffectChain) → master.
//   • Master volume + the mastering EffectChain as stored. The MASTER view's
//     Bypass is a listening A/B (session-only, and shared in a collab room),
//     so it never takes the mastering out of an export.
//   • Parameter automation lanes (volume/pan/sends + rideable FX params) —
//     scheduled as absolute-time AudioParam ramps (applyOfflineAutomation).
//   • Master volume automation (Track automation's grammar, on the master gain).
// Deliberately NOT covered (documented gaps — see notes):
//   • Gate and ducker (milestone 1.11): an AudioWorklet, loaded on the
//     offline context too, so the bounce gates and ducks as playback does.
// Still NOT covered:
//   • SoundFont / GM tracks render SILENT. SoundFontAdapter drives a
//     module-level singleton spessasynth WorkletSynthesizer bound to the first
//     context it sees; it also unwraps ctx._nativeContext (bypassing the
//     state:'running' proxy) and, once used live, can't connect its live-context
//     output into an offline graph. A correct offline bounce needs a per-render
//     synth instance — a bigger refactor. Until then the export dialog WARNS when
//     the project has soundfont tracks so the silence isn't a surprise.
//   • Guitar/Bass/Vocal-FX tracks: their recorded DI clips bounce DRY. Live
//     playback routes these through the adapter's amp/pedal/NAM chain
//     (getNativePedalInputNode); replicating that offline needs the chain params
//     applied to an offline adapter plus remote NAM model loading — deferred, so
//     for now these tracks export the raw recorded signal, not the amped tone.
//   • Automation of gate/ducker params — those are JS poll-loops absent from the
//     offline render (only the direct-AudioParam automatable set is covered).
//
// ── One track alone, dry, unmastered (milestone 2.15) ─────────────────────
// A one-track export or a stem renders a single track (`onlyTrackId`): the
// others are left out of the graph, not muted, so each costs one track's
// load. It is rendered even when muted or outside the solo, since the student
// asked for it by name. Its sends still reach the return buses. `dry` (only
// with `onlyTrackId`) bypasses every insert effect, drops the sends (and with
// them the returns) and the mastering; the fader, pan and their automation
// stay, so the track sits at its level in the mix. An Oracle synth's own
// effects are part of the instrument and stay too. `mastering: false` keeps
// the master gain (and its automation) and its chain with every slot off, so
// a file without the mastering lines up with one with it. With none
// of these the graph is built exactly as before, so the goldens are unchanged.
//
// ── Progress and Cancel (milestone 1.11) ──────────────────────────────────
// `onProgress` hears how far the render is, from 0 to 1. Tone.Offline first
// runs its transport clock over the whole song in JS (the first part of the
// bar), then the OfflineAudioContext renders; the native context pauses at a
// suspend() point every half second of the song to say where it is and is
// resumed. Where suspend() isn't there, no progress is heard (the dialog's
// bar is then indeterminate). `signal` cancels: while the graph is built it
// throws at the next await; once rendering, the context is left paused at
// its next point and the render rejects at once with an AbortError (without
// suspend() it rejects when the render ends, before any file is made). Every
// way out goes through the one finally that hands Tone its live context back
// and disposes the graph. With neither option, nothing of this runs.

import * as Tone from 'tone';
import { useStore } from '@/daw/store';
import type { AutomationLanes } from './automation';
import { audioEngine } from './AudioEngine';
import { EffectChain, type TrackEffectState } from './EffectChain';
import { ensureProcessedIr } from './reverbIR';
import { TrackEngine } from './TrackEngine';
import { isTrackAudible } from './trackAudibility';
import { MidiScheduler } from './MidiScheduler';
import { AudioClipScheduler } from './AudioClipScheduler';
import { dropRepeatedTicks } from './transportTicks';
import { getAudioBuffer, sliceBuffer } from './AudioBufferStore';
import { TonewheelOrganEngine } from '@/daw/instruments/TonewheelOrganEngine';
import {
  applyOfflineAutomation,
  applyOfflineLanes,
} from './AutomationScheduler';
import { resolveMasterAutomationTargets } from './automationParams';
import { createInstrument, applyDrumPads } from '@/daw/hooks/usePlaybackEngine';
import { OracleSynthAdapter } from '@/daw/instruments/OracleSynthAdapter';
import { DrumMachineEngine } from '@/daw/instruments/DrumMachineEngine';
import { ChopsSampler } from '@/daw/instruments/ChopsSampler';
import {
  getTrackSynthState,
  applySynthStateToEngine,
  defaultSynthTrackState,
} from '@/daw/oracle-synth/synthTrackState';
import {
  DEFAULT_SAMPLER_FILTER_HZ,
  isValidRootNote,
  samplerBufferKey,
  samplerSampleSignature,
  samplerTrimRange,
} from '@/daw/instruments/samplerChops';

const PPQ = 480;
// Extra tail so reverb/delay/release aren't cut off at the project end.
const TAIL_SECONDS = 2;
const LOOP_TAIL_SECONDS = 1;
// A bounce gives up on instruments that haven't loaded by then (e.g. a sample
// CDN that never answers) rather than hang on "Rendering…" forever.
const INSTRUMENT_LOAD_TIMEOUT_MS = 60_000;
// Past this, a reverb whose real IR is still loading renders with the
// synthetic one rather than hold the bounce up.
const IR_PREPARE_TIMEOUT_MS = 10_000;
// A bounce renders at the device's rate, kept to the two standard ones: an
// interface at 96 kHz would cost 2–4× the memory and CPU for nothing a
// classroom export can use, and a headset in call mode (16 kHz) would lose
// everything above 8 kHz.
const MIN_EXPORT_RATE = 44_100;
const MAX_EXPORT_RATE = 48_000;

/**
 * Family-A instruments (OracleSynth/SynthEngine, tonewheel organ, soundfont,
 * guitar/vocal FX) init with `if (ctx.state === 'suspended') await ctx.resume()`.
 * Under Tone.Offline the raw context is a standardized-audio-context
 * OfflineAudioContext: its state is 'suspended' AND it has no `resume()` method,
 * so that branch throws `resume is not a function` and the instrument renders
 * silent. We can't touch those engines, so we hand them a transparent proxy that
 * reports state 'running' (skipping the resume branch); every real call
 * (createGain, destination, currentTime, …) forwards to the offline context, so
 * all nodes are still created on — and connect within — the real render graph.
 */
function asRunningContext(ctx: AudioContext): AudioContext {
  return new Proxy(ctx, {
    get(target, prop) {
      if (prop === 'state') return 'running';
      const value = Reflect.get(target, prop, target);
      return typeof value === 'function' ? value.bind(target) : value;
    },
  }) as AudioContext;
}

/** Whole project, the loop region, or a custom [startTick, endTick) window. */
export type RenderRange =
  | 'project'
  | 'loop'
  | { startTick: number; endTick: number };

export interface RenderOptions {
  range?: RenderRange;
  sampleRate?: number;
  /** Render this track alone; the others are left out of the graph. It plays
   *  even when muted or outside the solo. */
  onlyTrackId?: string;
  /** With `onlyTrackId` only: no insert effects, no sends (so no returns) and
   *  no mastering (as `mastering: false`). The fader, pan and their automation
   *  stay. */
  dry?: boolean;
  /** The mastering on the master bus (default true). Off, its chain stays
   *  with every slot switched off, for its latency. */
  mastering?: boolean;
  /** Cancels the render: it rejects with an AbortError. */
  signal?: AbortSignal;
  /** How far the render is, 0..1; not called where the browser can't say. */
  onProgress?: (fraction: number) => void;
}

/** `effects` with every slot switched off, so the track's chain passes the
 *  signal through untouched (EffectChain.update bypasses or flattens a slot
 *  that isn't enabled, where a never-updated chain would still cut and
 *  compress with its defaults). */
function allSlotsOff(effects: TrackEffectState): TrackEffectState {
  const off = structuredClone(effects) as unknown as Record<
    string,
    { enabled: boolean }
  >;
  for (const slot of Object.values(off)) slot.enabled = false;
  return off as unknown as TrackEffectState;
}

/** The fader and pan lanes of `lanes`: a dry render rides no send or effect. */
function faderLanes(
  lanes: AutomationLanes | undefined,
): AutomationLanes | undefined {
  if (!lanes) return lanes;
  const kept: AutomationLanes = {};
  if (lanes.volume) kept.volume = lanes.volume;
  if (lanes.pan) kept.pan = lanes.pan;
  return kept;
}

/** Compute the render window [startTick, endTick) for the chosen range. */
function renderWindowTicks(
  state: ReturnType<typeof useStore.getState>,
  range: RenderRange,
): { startTick: number; endTick: number; tail: number } {
  if (typeof range === 'object') {
    const startTick = Math.max(0, range.startTick);
    return {
      startTick,
      endTick: Math.max(startTick, range.endTick),
      tail: LOOP_TAIL_SECONDS,
    };
  }
  if (
    range === 'loop' &&
    state.loopEnabled &&
    state.loopEnd > state.loopStart
  ) {
    return {
      startTick: state.loopStart,
      endTick: state.loopEnd,
      tail: LOOP_TAIL_SECONDS,
    };
  }
  return { startTick: 0, endTick: projectEndTick(state), tail: TAIL_SECONDS };
}

/** The tick where the last note or audio clip ends (0 for an empty project). */
export function projectEndTick(
  state: ReturnType<typeof useStore.getState>,
): number {
  let endTick = 0;
  for (const t of state.tracks) {
    for (const c of t.midiClips) {
      const base = c.startTick ?? 0;
      for (const e of c.events) {
        endTick = Math.max(endTick, base + e.startTick + e.durationTicks);
      }
    }
    for (const c of t.audioClips) {
      endTick = Math.max(endTick, c.startTick + c.duration);
    }
  }
  return endTick;
}

/**
 * Render the project (or loop region) offline and return the mixed AudioBuffer.
 * Reconstructs the full graph on the offline context; reuses the live
 * MidiScheduler + AudioClipScheduler so scheduling stays in one place.
 */
export async function renderProject(
  opts: RenderOptions = {},
): Promise<AudioBuffer> {
  const state = useStore.getState();
  const {
    tracks,
    bpm,
    returns,
    masteringEffects,
    masterVolume,
    masterAutomation,
  } = state;
  const range: RenderRange = opts.range ?? 'project';
  // The tracks in the graph: one asked for by name, or every one that plays
  // in the mix (the same mute/solo rule as live playback, usePlaybackEngine,
  // so a bounce is WYSIWYG vs. Play, including while soloing).
  const only =
    opts.onlyTrackId === undefined
      ? undefined
      : tracks.find((t) => t.id === opts.onlyTrackId);
  if (opts.onlyTrackId !== undefined && !only) {
    throw new Error('That track is no longer in the song');
  }
  const renderedTracks = only
    ? [only]
    : tracks.filter((track) => isTrackAudible(track, tracks));
  const dry = Boolean(only && opts.dry);
  const withMastering = !dry && (opts.mastering ?? true);
  const withReturns = !dry;
  // The rate Play runs at (within 44.1–48 kHz), so the file is what the
  // student heard; the reverb IRs are decoded for whatever rate it is.
  const sampleRate = opts.sampleRate ?? exportSampleRate(liveSampleRate());

  const { startTick, endTick, tail } = renderWindowTicks(state, range);
  const secPerTick = 60 / bpm / PPQ;
  const duration = Math.max(0.5, (endTick - startTick) * secPerTick + tail);

  // Everything the render builds is torn down afterwards (its gate and
  // ducker worklet nodes included), so an export leaves nothing running.
  const disposables: Array<{ dispose(): void }> = [];
  // Tone.Offline points Tone's global context (and with it the transport) at
  // the offline one, and only points it back when the callback succeeds. Keep
  // the live one to hand back after any failure: otherwise Play, the metronome
  // and every transport-scheduled clip stay bound to a dead context until a
  // reload (audio-core-01).
  const live = Tone.getContext();
  // Set once this call is over, so an instrument that loads after a timeout
  // is dropped instead of scheduling its notes.
  let settled = false;
  const { signal, onProgress } = opts;
  // Rejects when a cancel stops the render part-way (see watchRender).
  let stop: (reason: unknown) => void = () => {};
  const stopped = new Promise<never>((_, reject) => {
    stop = reject;
  });
  stopped.catch(() => {});
  const watch: { current: { dispose(): void } | null } = { current: null };

  try {
    throwIfAborted(signal);
    const rendering = Tone.Offline(
      async (offlineCtx) => {
        const transport = Tone.getTransport();
        // The offline clock can run a tick on a block edge twice (at 48 kHz,
        // 3 to 5 beats in 16), and every note, clip and CC on it with it.
        dropRepeatedTicks(transport);
        transport.PPQ = PPQ;
        transport.bpm.value = bpm;
        // The Tone-wrapped offline context; raw-node factories (createGain, …)
        // are API-compatible, and Tone instruments follow this swapped global
        // context.
        const ctx = offlineCtx.rawContext as unknown as AudioContext;

        // Only the chains this render builds.
        await prepareReverbIrs(ctx, [
          ...(withMastering ? [masteringEffects] : []),
          ...(withReturns ? returns.map((ret) => ret.effects) : []),
          ...(dry ? [] : renderedTracks.map((track) => track.effects)),
        ]);

        // Master → mastering chain → offline destination.
        const master = ctx.createGain();
        master.gain.value = masterVolume;
        // Master volume automation rides over the fader value, as in playback.
        applyOfflineLanes(
          masterAutomation,
          (paramId) => resolveMasterAutomationTargets(paramId, master),
          startTick,
          bpm,
        );
        // Left out, the mastering chain is still built with every slot off:
        // its filters, compressor and shapers delay the signal by a few
        // milliseconds even then, so the file lines up with a mastered one.
        const mastering = new EffectChain(ctx);
        disposables.push(mastering);
        mastering.update(
          withMastering ? masteringEffects : allSlotsOff(masteringEffects),
        );
        master.connect(mastering.getInputNode());
        mastering.getOutputNode().connect(ctx.destination);

        // Return buses: each EffectChain → returnGain → master.
        const returnInputs = new Map<string, AudioNode>();
        const returnChains: EffectChain[] = [];
        for (const ret of withReturns ? returns : []) {
          const chain = new EffectChain(ctx);
          disposables.push(chain);
          chain.update(ret.effects);
          returnChains.push(chain);
          const g = ctx.createGain();
          g.gain.value = ret.volume;
          chain.getOutputNode().connect(g);
          g.connect(master);
          returnInputs.set(ret.id, chain.getInputNode());
        }

        const inits: Array<Promise<void>> = [];
        const engines = new Map<string, TrackEngine>();

        for (const track of renderedTracks) {
          const te = new TrackEngine(ctx, master);
          disposables.push(te);
          engines.set(track.id, te);
          te.setVolume(track.volume);
          te.setPan(track.pan);
          te.updateEffects(dry ? allSlotsOff(track.effects) : track.effects);
          // A dry render built no returns, so it sets no sends.
          for (const [id, input] of returnInputs) {
            te.setSend(id, track.sends?.[id] ?? 0, input);
          }
          // Parameter automation: schedule absolute-time ramps on the (now
          // wired) volume/pan/send/FX params, shifted to the render window
          // origin.
          applyOfflineAutomation(
            te,
            dry ? faderLanes(track.automation) : track.automation,
            startTick,
            bpm,
          );

          // Instrument: init async (samplers/soundfont load samples), then
          // apply per-track state and schedule its MIDI once ready.
          const instrument = createInstrument(
            track.instrument,
            track.gmProgram,
            track.drumKit,
            track.bassVoice,
          );
          if (instrument) {
            const ready = instrument
              .init(asRunningContext(ctx), te.getInputNode())
              .then(() => {
                if (settled) {
                  instrument.dispose();
                  return;
                }
                te.setInstrument(instrument);
                if (instrument instanceof OracleSynthAdapter) {
                  // A track with no patch of its own plays the default
                  // patch, as live playback gives it (usePlaybackEngine).
                  const patch =
                    getTrackSynthState(track.id) ?? defaultSynthTrackState();
                  const engine = instrument.getEngine();
                  if (engine) {
                    applySynthStateToEngine(engine, patch, { projectBpm: bpm });
                  }
                  // The LFOs keep the song's bars: the render's first moment
                  // is the song at startTick (milestone 1.11).
                  instrument.alignToTransport(0, startTick / PPQ);
                } else if (instrument instanceof DrumMachineEngine) {
                  applyDrumPads(instrument, track);
                } else if (instrument instanceof ChopsSampler) {
                  applyOfflineSampler(instrument, track, ctx);
                } else if (
                  instrument instanceof TonewheelOrganEngine &&
                  track.organState
                ) {
                  instrument.setState(track.organState);
                }
                scheduleTrackMidi(track, te, startTick);
              })
              .catch((err) => {
                console.error(
                  `[renderProject] instrument init failed for "${track.name}":`,
                  err,
                );
              });
            inits.push(ready);
          }

          // Audio clips render regardless of instrument readiness.
          scheduleTrackClips(track, te, bpm, startTick);
        }

        // A ducker listens to its key track here as it does live; a key track
        // left out of this render (one track alone) ducks nothing.
        for (const [id, te] of engines) {
          te.setKeySourceResolver((key) =>
            key === id ? null : (engines.get(key)?.getAnalyserNode() ?? null),
          );
        }
        // Gates and duckers run in an AudioWorklet loaded per context
        // (milestone 1.11): wait for theirs before the transport starts.
        const dynamics = Promise.all([
          ...[...engines.values()].map((te) => te.whenDynamicsReady()),
          mastering.whenDynamicsReady(),
          ...returnChains.map((chain) => chain.whenDynamicsReady()),
        ]);

        await untilAborted(
          withTimeout(
            Promise.all([...inits, dynamics]),
            INSTRUMENT_LOAD_TIMEOUT_MS,
            'Export gave up waiting for instruments to load',
          ),
          signal,
        );
        throwIfAborted(signal);
        transport.start(0);
        if (signal || onProgress) {
          watch.current = watchRender(offlineCtx, ctx, duration, {
            signal,
            onProgress,
            stop,
          });
        }
      },
      duration,
      2,
      sampleRate,
    );
    // Left behind by a cancel, it never ends (or ends unheard).
    rendering.catch(() => {});
    const rendered = await Promise.race([rendering, stopped]);
    // Without suspend() a cancel can only be heard once the render is over.
    throwIfAborted(signal);
    onProgress?.(1);
    return rendered.get() as unknown as AudioBuffer;
  } finally {
    settled = true;
    watch.current?.dispose();
    if (Tone.getContext() !== live) Tone.setContext(live);
    // Tear down the graph so its gate/duck interval loops stop.
    for (const d of disposables) {
      try {
        d.dispose();
      } catch (err) {
        console.warn('[renderProject] disposable cleanup failed:', err);
      }
    }
  }
}

function abortError(): DOMException {
  return new DOMException('Stopped', 'AbortError');
}

function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw abortError();
}

/** `promise`, or an AbortError as soon as `signal` aborts. */
function untilAborted<T>(
  promise: Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  if (!signal) return promise;
  let onAbort = () => {};
  const aborted = new Promise<never>((_, reject) => {
    onAbort = () => reject(abortError());
    if (signal.aborted) onAbort();
    else signal.addEventListener('abort', onAbort, { once: true });
  });
  return Promise.race([promise, aborted]).finally(() =>
    signal.removeEventListener('abort', onAbort),
  );
}

// The share of the bar for Tone's JS clock pass, before the native render.
const CLOCK_SHARE = 0.15;
// How often (in song time) the native render pauses to say where it is.
const PROGRESS_STEP_SECONDS = 0.5;
const RENDER_QUANTUM = 128;
const CLOCK_POLL_MS = 100;

/** The parts of a native OfflineAudioContext a progress watch uses. */
interface SuspendableContext {
  length: number;
  sampleRate: number;
  suspend(time: number): Promise<void>;
  resume(): Promise<void>;
}

/** The browser's own OfflineAudioContext behind standardized-audio-context's
 *  (the one with suspend()), or null where there is no suspend(). */
function suspendableContext(raw: unknown): SuspendableContext | null {
  const native = ((raw as { _nativeContext?: unknown })._nativeContext ??
    raw) as Partial<SuspendableContext> & { startRendering?: unknown };
  if (
    typeof native?.suspend !== 'function' ||
    typeof native.resume !== 'function' ||
    typeof native.startRendering !== 'function' ||
    typeof native.length !== 'number' ||
    typeof native.sampleRate !== 'number'
  ) {
    return null;
  }
  return native as SuspendableContext;
}

/**
 * Reports a render's progress and stops it on a cancel, from the end of the
 * Tone.Offline callback (the graph is built, nothing has rendered). Tone's
 * clock pass is read from the offline context's time; the native render from
 * suspend() points, each resumed unless the render has been cancelled (it
 * then stays paused there and `stop` rejects the render). Without suspend()
 * it does nothing, and the caller hears a cancel when the render ends.
 */
function watchRender(
  toneCtx: { currentTime: number },
  raw: unknown,
  duration: number,
  {
    signal,
    onProgress,
    stop,
  }: {
    signal?: AbortSignal;
    onProgress?: (fraction: number) => void;
    stop: (reason: unknown) => void;
  },
): { dispose(): void } {
  const native = suspendableContext(raw);
  if (!native) return { dispose() {} };

  let alive = true;
  let last = 0;
  const report = (fraction: number) => {
    if (!alive || !onProgress) return;
    const f = Math.min(1, Math.max(0, fraction));
    if (f <= last) return;
    last = f;
    onProgress(f);
  };

  // Every point is registered before the native render starts. One that is
  // refused (a browser that can't pause there) leaves the cancel to the
  // render's end, but the points it did take still report.
  let everyPoint = true;
  let clockDone = false;
  const step =
    Math.max(
      1,
      Math.round((PROGRESS_STEP_SECONDS * native.sampleRate) / RENDER_QUANTUM),
    ) * RENDER_QUANTUM;
  for (let frame = step; frame < native.length; frame += step) {
    let paused: Promise<void>;
    try {
      paused = native.suspend(frame / native.sampleRate);
    } catch {
      everyPoint = false;
      break;
    }
    paused.then(
      () => {
        clockDone = true;
        if (signal?.aborted) {
          // Left paused: nothing more renders.
          stop(abortError());
          return;
        }
        report(CLOCK_SHARE + ((1 - CLOCK_SHARE) * frame) / native.length);
        // Cancelled as it heard this point: not resumed either.
        if (signal?.aborted) return;
        native.resume().catch(() => {});
      },
      () => {
        everyPoint = false;
      },
    );
  }

  const clock = onProgress
    ? setInterval(() => {
        if (clockDone) return;
        report((CLOCK_SHARE * toneCtx.currentTime) / duration);
      }, CLOCK_POLL_MS)
    : undefined;

  // Once rendering, a cancel ends the render at once where every point was
  // taken: the context pauses at the next one and is never resumed.
  const onAbort = () => {
    if (everyPoint) stop(abortError());
  };
  signal?.addEventListener('abort', onAbort, { once: true });

  return {
    dispose() {
      alive = false;
      if (clock !== undefined) clearInterval(clock);
      signal?.removeEventListener('abort', onAbort);
    },
  };
}

/** The live engine's output rate (Tone's own context until the engine starts). */
function liveSampleRate(): number {
  return audioEngine.getSampleRate() || Tone.getContext().sampleRate;
}

/** The rate a bounce renders at on a device running at `liveRate`. */
function exportSampleRate(liveRate: number): number {
  if (!Number.isFinite(liveRate)) return MIN_EXPORT_RATE;
  return Math.min(MAX_EXPORT_RATE, Math.max(MIN_EXPORT_RATE, liveRate));
}

/** `promise`, or a rejection with `message` once `ms` have passed. */
function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  message: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Decode the real IR of every reverb the bounce uses at the render's own rate
 * before any chain is built, so each convolver gets it straight away instead of
 * starting on the synthetic IR and swapping mid-render (the live engine only
 * holds them at its rate). A slow load falls back to the synthetic IR.
 */
async function prepareReverbIrs(
  ctx: BaseAudioContext,
  chains: TrackEffectState[],
): Promise<void> {
  const loads = chains
    .filter((fx) => fx.reverb?.enabled)
    .map((fx) => ensureProcessedIr(ctx, fx.reverb.type, fx.reverb.decay));
  if (loads.length === 0) return;
  let timer: ReturnType<typeof setTimeout> | undefined;
  await Promise.race([
    Promise.all(loads),
    new Promise<void>((resolve) => {
      timer = setTimeout(resolve, IR_PREPARE_TIMEOUT_MS);
    }),
  ]);
  clearTimeout(timer);
}

/** Schedule a track's MIDI clips onto the (offline) transport via the shared
 *  MidiScheduler. Ticks are shifted so the render window starts at t=0. A
 *  muted clip (milestone 2.12) is left out, as playback leaves it silent. */
function scheduleTrackMidi(
  track: ReturnType<typeof useStore.getState>['tracks'][number],
  te: TrackEngine,
  startTick: number,
): void {
  const scheduler = new MidiScheduler();
  for (const clip of track.midiClips) {
    if (clip.muted || clip.events.length === 0) continue;
    scheduler.scheduleSequence(
      {
        ticksPerQuarterNote: PPQ,
        trackName: track.name,
        events: clip.events,
        ccEvents: clip.ccEvents,
      },
      te,
      (clip.startTick ?? 0) - startTick,
    );
  }
}

/** Schedule a track's audio clips via the shared AudioClipScheduler (currentTick
 *  = 0 so every clip is scheduled ahead on the transport). */
function scheduleTrackClips(
  track: ReturnType<typeof useStore.getState>['tracks'][number],
  te: TrackEngine,
  bpm: number,
  startTick: number,
): void {
  const scheduler = new AudioClipScheduler();
  for (const clip of track.audioClips) {
    if (clip.muted) continue;
    const buffer = getAudioBuffer(clip.id);
    if (!buffer) continue;
    scheduler.scheduleClip({
      buffer,
      clip: { ...clip, startTick: clip.startTick - startTick },
      trackEngine: te,
      fromTick: 0,
      bpm,
    });
  }
}

/** Apply a Chops sampler track's state to its offline engine (mirrors the live
 *  applySamplerState but slices on the offline context). */
function applyOfflineSampler(
  engine: ChopsSampler,
  track: ReturnType<typeof useStore.getState>['tracks'][number],
  ctx: AudioContext,
): void {
  const sample = track.samplerSample;
  if (!sample) return;
  engine.setEnvelope(sample.attack, sample.release);
  engine.setMode(sample.mode ?? 'classic');
  engine.setGain(sample.gain ?? 1);
  engine.setFilter(
    sample.filterOn ?? false,
    sample.filterHz ?? DEFAULT_SAMPLER_FILTER_HZ,
    sample.filterRes ?? 0,
  );
  const buffer = getAudioBuffer(samplerBufferKey(sample.sampleId));
  if (!buffer) return;
  const rootNote = isValidRootNote(sample.rootNote) ? sample.rootNote : 'C4';
  const { startFrame, endFrame } = samplerTrimRange(
    buffer.length,
    sample.startPct,
    sample.lengthPct,
  );
  const playBuffer =
    startFrame === 0 && endFrame === buffer.length
      ? buffer
      : sliceBuffer(ctx, buffer, startFrame, endFrame);
  engine.setSample(samplerSampleSignature(sample), playBuffer, rootNote);
}
