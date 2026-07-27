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
//   • Master volume + the mastering EffectChain.
//   • Parameter automation lanes (volume/pan/sends + rideable FX params) —
//     scheduled as absolute-time AudioParam ramps (applyOfflineAutomation).
// Deliberately NOT covered (documented gaps — see notes):
//   • Ducker (Phase 5) and Gate rely on a JS setInterval loop that does NOT run
//     during an OfflineAudioContext render (offline renders faster than real
//     time), so sidechain ducking + gating are absent from the bounce. The rest
//     of each track's chain still renders.
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
//   • Pitch-editor edits on audio clips (resolvePitchBuffer) — the bounce uses
//     the original recorded buffer, not the pitch-shifted render.
//   • Automation of gate/ducker params — those are JS poll-loops absent from the
//     offline render (only the direct-AudioParam automatable set is covered).

import * as Tone from 'tone';
import { useStore } from '@/daw/store';
import { EffectChain } from './EffectChain';
import { TrackEngine } from './TrackEngine';
import { MidiScheduler } from './MidiScheduler';
import { AudioClipScheduler } from './AudioClipScheduler';
import { getAudioBuffer, sliceBuffer } from './AudioBufferStore';
import { applyOfflineAutomation } from './AutomationScheduler';
import { createInstrument, applyDrumPads } from '@/daw/hooks/usePlaybackEngine';
import { OracleSynthAdapter } from '@/daw/instruments/OracleSynthAdapter';
import { DrumMachineEngine } from '@/daw/instruments/DrumMachineEngine';
import { ChopsSampler } from '@/daw/instruments/ChopsSampler';
import {
  getTrackSynthState,
  applySynthStateToEngine,
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

export type RenderRange = 'project' | 'loop';

export interface RenderOptions {
  range?: RenderRange;
  sampleRate?: number;
}

/** Compute the render window [startTick, endTick) for the chosen range. */
function renderWindowTicks(
  state: ReturnType<typeof useStore.getState>,
  range: RenderRange,
): { startTick: number; endTick: number; tail: number } {
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
  return { startTick: 0, endTick, tail: TAIL_SECONDS };
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
  const { tracks, bpm, returns, masteringEffects, masterVolume } = state;
  const range: RenderRange = opts.range ?? 'project';
  const sampleRate = opts.sampleRate ?? 44100;

  const { startTick, endTick, tail } = renderWindowTicks(state, range);
  const secPerTick = 60 / bpm / PPQ;
  const duration = Math.max(0.5, (endTick - startTick) * secPerTick + tail);

  // EffectChains/TrackEngines each start a gate + duck window.setInterval on
  // construction. Nothing stops those wall-clock loops when the offline render
  // ends, so collect every disposable and tear them all down afterwards — else
  // each export leaks N timers polling a dead graph forever.
  const disposables: Array<{ dispose(): void }> = [];

  const rendered = await Tone.Offline(
    async (offlineCtx) => {
      const transport = Tone.getTransport();
      transport.PPQ = PPQ;
      transport.bpm.value = bpm;
      // The Tone-wrapped offline context; raw-node factories (createGain, …) are
      // API-compatible, and Tone instruments follow this swapped global context.
      const ctx = offlineCtx.rawContext as unknown as AudioContext;

      // Master → mastering chain → offline destination.
      const master = ctx.createGain();
      master.gain.value = masterVolume;
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
        // Match live playback (usePlaybackEngine), which gates on mute ONLY and
        // ignores solo — so a bounce is WYSIWYG vs. Play even while soloing.
        if (track.mute) continue;

        const te = new TrackEngine(ctx, master);
        disposables.push(te);
        te.setVolume(track.volume);
        te.setPan(track.pan);
        te.updateEffects(track.effects);
        for (const [id, input] of returnInputs) {
          te.setSend(id, track.sends?.[id] ?? 0, input);
        }
        // Parameter automation: schedule absolute-time ramps on the (now wired)
        // volume/pan/send/FX params, shifted to the render window origin.
        applyOfflineAutomation(te, track.automation, startTick, bpm);

        // Instrument: init async (samplers/soundfont load samples), then apply
        // per-track state and schedule its MIDI once ready.
        const instrument = createInstrument(
          track.instrument,
          track.gmProgram,
          track.drumKit,
        );
        if (instrument) {
          const ready = instrument
            .init(asRunningContext(ctx), te.getInputNode())
            .then(() => {
              te.setInstrument(instrument);
              if (instrument instanceof OracleSynthAdapter) {
                const patch = getTrackSynthState(track.id);
                const engine = instrument.getEngine();
                if (patch && engine) applySynthStateToEngine(engine, patch);
              } else if (instrument instanceof DrumMachineEngine) {
                applyDrumPads(instrument, track);
              } else if (instrument instanceof ChopsSampler) {
                applyOfflineSampler(instrument, track, ctx);
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

      await Promise.all(inits);
      transport.start(0);
    },
    duration,
    2,
    sampleRate,
  );

  // Render done — tear down the graph so its gate/duck interval loops stop.
  for (const d of disposables) {
    try {
      d.dispose();
    } catch (err) {
      console.warn('[renderProject] disposable cleanup failed:', err);
    }
  }

  return rendered.get() as unknown as AudioBuffer;
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
 *  = 0 so every clip is scheduled ahead on the transport). */
function scheduleTrackClips(
  track: ReturnType<typeof useStore.getState>['tracks'][number],
  te: TrackEngine,
  bpm: number,
  startTick: number,
): void {
  const scheduler = new AudioClipScheduler();
  for (const clip of track.audioClips) {
    const buffer = getAudioBuffer(clip.id);
    if (!buffer) continue;
    scheduler.scheduleClip(
      buffer,
      clip.startTick - startTick,
      clip.duration,
      te,
      0,
      bpm,
      undefined,
      clip.fadeInTicks ?? 0,
      clip.fadeOutTicks ?? 0,
      clip.offsetSeconds ?? 0,
    );
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
