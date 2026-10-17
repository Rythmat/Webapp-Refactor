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
//   • SoundFont / GM tracks. The live synth is a singleton AudioWorklet bound
//     to the live context (SoundFontAdapter), out of the offline graph's
//     reach, so each one's MIDI is rendered first on spessasynth_core's
//     pure-JS synth, with the same sound bank and settings (soundFontRender),
//     and that audio plays into the track's input where the live synth's
//     channel would: FX, fader, pan, sends, automation and mute/solo apply.
//     Notes from before the window that still sound in it ring in.
//   • Audio clips from the AudioBufferStore, with offsetSeconds trim, fades and
//     per-clip gain (AudioClipScheduler).
//   • Guitar/Bass/Vocal-FX tracks: their recorded DI clips run through the
//     track's stored amp/pedal chain, NAM amp model and pitch correction
//     included, on the offline context (offlinePedalChain), as playback runs
//     them through the adapter's chain (getNativePedalInputNode).
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
//   • Ducker (Phase 5) and Gate rely on a JS setInterval loop that does NOT run
//     during an OfflineAudioContext render (offline renders faster than real
//     time), so sidechain ducking + gating are absent from the bounce. The rest
//     of each track's chain still renders.
//   • The wah pedal's envelope follower runs on the page's frame loop, which
//     the offline render outruns, so a bounced wah is its filter at rest, no
//     sweep (WahPedal). The export dialog warns when an audible track uses it.
//   • Automation of gate/ducker params — those are JS poll-loops absent from the
//     offline render (only the direct-AudioParam automatable set is covered).

import * as Tone from 'tone';
import { useStore } from '@/daw/store';
import { audioEngine } from './AudioEngine';
import { EffectChain, type TrackEffectState } from './EffectChain';
import { ensureProcessedIr } from './reverbIR';
import { TrackEngine } from './TrackEngine';
import { isTrackAudible } from './trackAudibility';
import { MidiScheduler } from './MidiScheduler';
import { AudioClipScheduler } from './AudioClipScheduler';
import { dropRepeatedTicks } from './transportTicks';
import { getAudioBuffer, sliceBuffer } from './AudioBufferStore';
import { applyOfflinePedalChain } from './offlinePedalChain';
import { renderSoundFontTracks, type RenderedSegment } from './soundFontRender';
import { TonewheelOrganEngine } from '@/daw/instruments/TonewheelOrganEngine';
import { GuitarFxAdapter } from '@/daw/instruments/GuitarFxAdapter';
import { VocalFxAdapter } from '@/daw/instruments/VocalFxAdapter';
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
// The mixdown reports its progress this many times as it renders.
const MIXDOWN_PROGRESS_STEPS = 20;
// A bounce renders at the device's rate, kept to the two standard ones: an
// interface at 96 kHz would cost 2–4× the memory and CPU for nothing a
// classroom export can use, and a headset in call mode (16 kHz) would lose
// everything above 8 kHz.
const MIN_EXPORT_RATE = 44_100;
const MAX_EXPORT_RATE = 48_000;

/**
 * Family-A instruments (OracleSynth/SynthEngine, tonewheel organ, guitar/vocal
 * FX) init with `if (ctx.state === 'suspended') await ctx.resume()`.
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

/** Where a render is, 0–1 through each stage: SoundFont tracks first (when
 *  the project has any), then the offline mixdown. */
export interface RenderProgress {
  stage: 'instruments' | 'mixdown';
  pct: number;
}

export interface RenderOptions {
  range?: RenderRange;
  sampleRate?: number;
  onProgress?: (p: RenderProgress) => void;
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
  // The rate Play runs at (within 44.1–48 kHz), so the file is what the
  // student heard; the reverb IRs are decoded for whatever rate it is.
  const sampleRate = opts.sampleRate ?? exportSampleRate(liveSampleRate());

  const { startTick, endTick, tail } = renderWindowTicks(state, range);
  const secPerTick = 60 / bpm / PPQ;
  const duration = Math.max(0.5, (endTick - startTick) * secPerTick + tail);

  // SoundFont tracks render before the mixdown, while Tone's global context
  // is still the live one; the offline graph then only plays their audio.
  const soundFontTracks = tracks.filter(
    (t) => t.instrument === 'soundfont' && isTrackAudible(t, tracks),
  );
  const soundFontAudio =
    soundFontTracks.length > 0
      ? await renderSoundFontTracks(
          soundFontTracks,
          {
            startTick,
            bpm,
            sampleRate,
            lengthFrames: Math.ceil(duration * sampleRate),
          },
          (pct) => opts.onProgress?.({ stage: 'instruments', pct }),
        )
      : new Map<string, RenderedSegment[]>();
  opts.onProgress?.({ stage: 'mixdown', pct: 0 });

  // EffectChains/TrackEngines each start a gate + duck window.setInterval on
  // construction. Nothing stops those wall-clock loops when the offline render
  // ends, so collect every disposable and tear them all down afterwards — else
  // each export leaks N timers polling a dead graph forever.
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

  try {
    const rendered = await Tone.Offline(
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

        await prepareReverbIrs(ctx, [
          masteringEffects,
          ...returns.map((ret) => ret.effects),
          ...tracks
            .filter((track) => isTrackAudible(track, tracks))
            .map((track) => track.effects),
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
        const mastering = new EffectChain(ctx);
        disposables.push(mastering);
        mastering.update(masteringEffects);
        master.connect(mastering.getInputNode());
        mastering.getOutputNode().connect(ctx.destination);

        // Return buses: each EffectChain → returnGain → master.
        const returnInputs = new Map<string, AudioNode>();
        for (const ret of returns) {
          const chain = new EffectChain(ctx);
          disposables.push(chain);
          chain.update(ret.effects);
          const g = ctx.createGain();
          g.gain.value = ret.volume;
          chain.getOutputNode().connect(g);
          g.connect(master);
          returnInputs.set(ret.id, chain.getInputNode());
        }

        const inits: Array<Promise<void>> = [];

        for (const track of tracks) {
          // Same mute/solo rule as live playback (usePlaybackEngine), so a
          // bounce is WYSIWYG vs. Play — including while soloing.
          if (!isTrackAudible(track, tracks)) continue;

          const te = new TrackEngine(ctx, master);
          disposables.push(te);
          te.setVolume(track.volume);
          te.setPan(track.pan);
          te.updateEffects(track.effects);
          for (const [id, input] of returnInputs) {
            te.setSend(id, track.sends?.[id] ?? 0, input);
          }
          // Parameter automation: schedule absolute-time ramps on the (now
          // wired) volume/pan/send/FX params, shifted to the render window
          // origin.
          applyOfflineAutomation(te, track.automation, startTick, bpm);

          if (track.instrument === 'soundfont') {
            // Rendered before the mixdown (soundFontRender); taken from the
            // map as it's wired, so its chunks can go once copied.
            playRenderedAudio(te, soundFontAudio.get(track.id), sampleRate);
            soundFontAudio.delete(track.id);
            scheduleTrackClips(track, te, bpm, startTick);
            continue;
          }

          // Instrument: init async (samplers load samples), then apply
          // per-track state and schedule its MIDI once ready.
          const instrument = createInstrument(
            track.instrument,
            track.gmProgram,
            track.drumKit,
            track.bassVoice,
          );
          // Guitar/Bass/Vocal: the recorded clips play through the amp and
          // pedals, so they wait for the chain; the rest play straight in.
          const pedalAdapter =
            instrument instanceof GuitarFxAdapter ||
            instrument instanceof VocalFxAdapter
              ? instrument
              : null;
          if (instrument) {
            inits.push(
              (async () => {
                try {
                  await instrument.init(
                    asRunningContext(ctx),
                    te.getInputNode(),
                  );
                } catch (err) {
                  console.error(
                    `[renderProject] instrument init failed for "${track.name}":`,
                    err,
                  );
                  // No amp to play through: the takes still bounce, dry.
                  if (pedalAdapter && !settled) {
                    scheduleTrackClips(track, te, bpm, startTick);
                  }
                  return;
                }
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
                } else if (instrument instanceof DrumMachineEngine) {
                  applyDrumPads(instrument, track);
                } else if (instrument instanceof ChopsSampler) {
                  applyOfflineSampler(instrument, track, ctx);
                } else if (
                  instrument instanceof TonewheelOrganEngine &&
                  track.organState
                ) {
                  instrument.setState(track.organState);
                } else if (pedalAdapter) {
                  let pedalInput: AudioNode | undefined;
                  try {
                    await applyOfflinePedalChain(pedalAdapter, track, bpm);
                    pedalInput =
                      pedalAdapter.getNativePedalInputNode() ?? undefined;
                  } catch (err) {
                    console.error(
                      `[renderProject] amp/pedal chain failed for "${track.name}"; its takes bounce dry:`,
                      err,
                    );
                  }
                  if (settled) return;
                  scheduleTrackClips(track, te, bpm, startTick, pedalInput);
                }
                scheduleTrackMidi(track, te, startTick);
              })().catch((err) => {
                console.error(
                  `[renderProject] instrument setup failed for "${track.name}":`,
                  err,
                );
              }),
            );
          }

          // Audio clips render regardless of instrument readiness.
          if (!pedalAdapter) scheduleTrackClips(track, te, bpm, startTick);
        }

        await withTimeout(
          Promise.all(inits),
          INSTRUMENT_LOAD_TIMEOUT_MS,
          'Export gave up waiting for instruments to load',
        );
        transport.start(0);
        reportMixdownProgress(ctx, duration, (pct) =>
          opts.onProgress?.({ stage: 'mixdown', pct }),
        );
      },
      duration,
      2,
      sampleRate,
    );
    return rendered.get() as unknown as AudioBuffer;
  } finally {
    settled = true;
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

/**
 * Report the mixdown's progress as it renders: the offline context pauses at
 * each step (suspend), reports, and carries on. A browser without offline
 * suspend renders without the steps.
 */
function reportMixdownProgress(
  ctx: AudioContext,
  duration: number,
  onProgress: (pct: number) => void,
): void {
  const native = (ctx as unknown as { _nativeContext?: OfflineAudioContext })
    ._nativeContext;
  if (typeof native?.suspend !== 'function') return;
  for (let step = 1; step < MIXDOWN_PROGRESS_STEPS; step++) {
    const pct = step / MIXDOWN_PROGRESS_STEPS;
    native
      .suspend(duration * pct)
      .then(() => {
        try {
          onProgress(pct);
        } finally {
          // Resumed whatever happens: a suspended render never finishes.
          void native.resume();
        }
      })
      .catch(() => {
        // Not a time it could pause at (past the end, or a render quantum
        // already taken): that step goes unreported.
      });
  }
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
 *  MidiScheduler. Ticks are shifted so the render window starts at t=0. */
function scheduleTrackMidi(
  track: ReturnType<typeof useStore.getState>['tracks'][number],
  te: TrackEngine,
  startTick: number,
): void {
  const scheduler = new MidiScheduler();
  for (const clip of track.midiClips) {
    if (clip.events.length === 0) continue;
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
 *  = 0 so every clip is scheduled ahead on the transport), through the
 *  track's amp/pedal chain when it has one (`pedalInput`), as playback does. */
function scheduleTrackClips(
  track: ReturnType<typeof useStore.getState>['tracks'][number],
  te: TrackEngine,
  bpm: number,
  startTick: number,
  pedalInput?: AudioNode,
): void {
  const scheduler = new AudioClipScheduler();
  for (const clip of track.audioClips) {
    const buffer = getAudioBuffer(clip.id);
    if (!buffer) continue;
    scheduler.scheduleClip({
      buffer,
      clip: { ...clip, startTick: clip.startTick - startTick },
      trackEngine: te,
      fromTick: 0,
      bpm,
      pedalInput,
    });
  }
}

/**
 * Play a SoundFont track's rendered audio (soundFontRender) into its track
 * input, where the live synth's channel output arrives (SoundFontAdapter):
 * native buffer sources on the offline context, each segment at its frame.
 */
function playRenderedAudio(
  te: TrackEngine,
  segments: RenderedSegment[] | undefined,
  sampleRate: number,
): void {
  if (!segments || segments.length === 0) return;
  // The input is a standardized-audio-context wrapper, passive until
  // something connects through it: hold it open, as AudioClipScheduler and
  // the live adapter do, for the native sources to be heard.
  const input = te.getInputNode();
  const hold = (input.context as BaseAudioContext).createConstantSource();
  hold.offset.value = 0;
  hold.connect(input);
  hold.start();
  const native = te.getNativeInputNode();
  const nativeCtx = native.context as BaseAudioContext;
  for (const segment of segments) {
    const buffer = nativeCtx.createBuffer(2, segment.length, sampleRate);
    let offset = 0;
    for (const [left, right] of segment.parts) {
      buffer.copyToChannel(left, 0, offset);
      buffer.copyToChannel(right, 1, offset);
      offset += left.length;
    }
    const source = nativeCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(native);
    source.start(segment.startFrame / sampleRate);
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
