import * as Tone from 'tone';
import { useStore, type Track } from '@/daw/store';
import { audioEngine } from '@/daw/audio/AudioEngine';
import { TrackEngine } from '@/daw/audio/TrackEngine';
import type { AutomationScheduler } from '@/daw/audio/AutomationScheduler';
import { applyStoredPedalChain } from '@/daw/audio/applyPedalChain';
import { DrumMachineEngine } from '@/daw/instruments/DrumMachineEngine';
import { ChopsSampler } from '@/daw/instruments/ChopsSampler';
import { GuitarFxAdapter } from '@/daw/instruments/GuitarFxAdapter';
import { OracleSynthAdapter } from '@/daw/instruments/OracleSynthAdapter';
import { SoundFontAdapter } from '@/daw/instruments/SoundFontAdapter';
import { TonewheelOrganEngine } from '@/daw/instruments/TonewheelOrganEngine';
import { VocalFxAdapter } from '@/daw/instruments/VocalFxAdapter';
import {
  applySynthStateToEngine,
  defaultSynthTrackState,
  getTrackSynthState,
} from '@/daw/oracle-synth/synthTrackState';
import {
  getSessionGeneration,
  onSessionGeneration,
} from '@/daw/session/sessionGeneration';
import {
  applyDrumPads,
  applyOrganState,
  applySamplerState,
  applySends,
  applyStaticTrackParams,
  createInstrument,
  getTrackAudioState,
  needsNewEngine,
  notifyEngineReady,
  retireTrackAudio,
  trackEngineRegistry,
  type TrackAudioState,
} from './trackAudio';

// ── Track reconciler ────────────────────────────────────────────────────
// Keeps every track's audio (TrackEngine + instrument) in step with the
// store's tracks. It replaces usePlaybackEngine's effect on [tracks], which
// re-applied volume, pan, every effect, the sends and the automation of
// EVERY track on ANY track change (a rename, a clip edit, a Prism recolour)
// and re-rendered the editor shell to do it (engine-hooks-03).
//
// It listens to the store directly and keeps the track object it last
// applied for each id. An unchanged object is skipped; a changed one is
// compared field by field, and only what changed reaches the engine.
// Collab rebuilds every track object on a remote change, so fields compare
// by value, not identity. While playing, a track whose lanes or static
// values changed gets its automation re-asserted, all at one transport tick.
//
// A track gets a new engine when its instrument, its bass voice or the
// session generation changes (needsNewEngine). An instrument loads
// asynchronously; when it is ready it is wired in only if its engine is
// still the one registered for the track, and disposed otherwise.
//
// A control being dragged previews through previewTrack: the engine plays
// the track as if the drag's value were in the store, and the reconciler
// counts it as applied, so the one store write on release finds nothing
// left to do (milestone 1.9). Changes to a live track glide over a few
// milliseconds rather than stepping.

/** JSON equality for the small settings objects (effects, sends, pads). */
function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === undefined || b === undefined) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

/** The engine-facing fields that are re-asserted under automation. */
function staticChanged(prev: Track, next: Track): boolean {
  return (
    prev.volume !== next.volume ||
    prev.pan !== next.pan ||
    !sameValue(prev.effects, next.effects) ||
    !sameValue(prev.sends, next.sends)
  );
}

interface Applied {
  track: Track;
  audible: boolean;
}

export interface TrackReconciler {
  /** Brings every engine to the store's tracks now. */
  reconcile(): void;
  /** Plays a track as if `patch` were in the store (see previewTrack). */
  preview(trackId: string, patch: Partial<Track>): void;
  /** Stops listening. The engines stay (usePlaybackEngine disposes them). */
  stop(): void;
}

/** The reconciler running now, which previews go to. */
let active: TrackReconciler | null = null;

/**
 * Plays a track as if `patch` were applied, without writing the store: a
 * control's preview while it moves (useContinuousControl). Parameters glide,
 * and a reverb's Decay is built once, by the release's store write. Nothing
 * happens before the engine has started.
 */
export function previewTrack(trackId: string, patch: Partial<Track>): void {
  active?.preview(trackId, patch);
}

/**
 * Brings previewed tracks back to the store: after a gesture that changed
 * nothing, or was cancelled.
 */
export function endTrackPreview(): void {
  active?.reconcile();
}

/**
 * Starts reconciling the store's tracks into `trackEngineRegistry`. Runs a
 * first pass at once. `automationScheduler` is the playback engine's, so a
 * retired track's automation is cleared and a changed one re-asserted.
 */
export function startTrackReconciler(
  automationScheduler: AutomationScheduler,
): TrackReconciler {
  const applied = new Map<string, Applied>();
  // A return added or removed re-wires every track's sends.
  let returnIds = '';
  let stopped = false;

  /** The live transport tick for this pass, read at most once. */
  let passTick: number | null = null;
  const tickNow = () => (passTick ??= Tone.getTransport().ticks);

  function reassert(
    track: Track,
    engine: TrackEngine,
    opts: { glide?: boolean; deferIr?: boolean } = {},
  ): void {
    automationScheduler.clearTrack(track.id);
    applyStaticTrackParams(engine, track, opts);
    automationScheduler.scheduleTrack(
      track.id,
      engine,
      track.automation,
      tickNow(),
      useStore.getState().bpm,
    );
  }

  function applyMonitoring(state: TrackAudioState, track: Track): void {
    const instrument = state.instrument as
      | { setMonitoring?: (on: boolean) => void }
      | null
      | undefined;
    instrument?.setMonitoring?.(track.monitoring);
  }

  /**
   * Brings an existing engine from `prev` to `next`, field by field. Values
   * glide (the track is live); a preview also leaves the reverb's impulse
   * response for the release to build.
   */
  function update(
    state: TrackAudioState,
    prev: Applied,
    next: Track,
    audible: boolean,
    sendsRewired: boolean,
    playing: boolean,
    preview = false,
  ): void {
    const engine = state.trackEngine;
    const old = prev.track;
    const opts = { glide: true, deferIr: preview };
    if (audible !== prev.audible) engine.setAudible(audible);

    if (old !== next) {
      const statics = staticChanged(old, next);
      const lanes = !sameValue(old.automation, next.automation);
      // A preview frame of a track with no lanes has nothing to hand back,
      // so it skips the re-assert (a clear and reschedule every frame).
      const automated = !preview || hasLanes(next);
      if (playing && automated && (statics || lanes || sendsRewired)) {
        // Static writes stomp an automated param: hand the param back to
        // the lanes, which re-applies the static base first.
        reassert(next, engine, opts);
      } else {
        if (old.volume !== next.volume) engine.setVolume(next.volume, true);
        if (old.pan !== next.pan) engine.setPan(next.pan, true);
        if (!sameValue(old.effects, next.effects)) {
          engine.updateEffects(next.effects, opts);
        }
        if (sendsRewired || !sameValue(old.sends, next.sends)) {
          applySends(engine, next, true);
        }
      }
      if (old.monitoring !== next.monitoring) applyMonitoring(state, next);
      updateInstrument(state, old, next);
    } else if (sendsRewired) {
      if (playing) reassert(next, engine);
      else applySends(engine, next);
    }
  }

  /** Instrument settings the track is the source of truth for. */
  function updateInstrument(
    state: TrackAudioState,
    old: Track,
    next: Track,
  ): void {
    const instrument = state.instrument;
    // Kit changes from the store (view, project load, collab peer) land
    // here; setKit is idempotent and last-wins under races.
    if (instrument instanceof DrumMachineEngine) {
      const kitId = next.drumKit ?? 'natural';
      if (instrument.getKit() !== kitId) {
        instrument
          .setKit(kitId)
          .then(() => {
            const current = currentTrack(next.id);
            if (current) applyDrumPads(instrument, current);
          })
          .catch((err) => {
            console.error('[Audio] Drum kit load failed:', err);
          });
      } else if (!sameValue(old.drumPads, next.drumPads)) {
        applyDrumPads(instrument, next);
      }
    }
    // The GM sound, the organ settings and the sampler's sample likewise
    // follow undo, project load and collab peers.
    if (instrument instanceof SoundFontAdapter) {
      const program = next.gmProgram ?? 0;
      if (instrument.getProgram() !== program) instrument.setProgram(program);
    }
    if (
      instrument instanceof TonewheelOrganEngine &&
      old.organState !== next.organState
    ) {
      applyOrganState(instrument, next);
    }
    if (
      instrument instanceof ChopsSampler &&
      !sameValue(old.samplerSample, next.samplerSample)
    ) {
      applySamplerState(instrument, next);
    }
    // The amp and pedals of a Guitar/Bass/Vocal track, whether or not its
    // view is open (the view applies its own edits as they happen, so the
    // store write that saves one finds it applied). An adapter still in its
    // init gets the chain the track holds when the init ends (create).
    if (
      isPedalAdapter(instrument) &&
      state.trackEngine.getInstrument() === instrument
    ) {
      const key =
        instrument instanceof GuitarFxAdapter ? 'guitarChain' : 'vocalChain';
      if (!sameValue(old[key], next[key])) {
        void applyStoredPedalChain(instrument, next, useStore.getState().bpm);
      }
    }
  }

  /** Makes a track's engine and starts loading its instrument. */
  function create(
    track: Track,
    audible: boolean,
    generation: number,
    playing: boolean,
  ): void {
    const ctx = audioEngine.getContext();
    const trackEngine = new TrackEngine(ctx, audioEngine.getMasterGain());
    trackEngine.setVolume(track.volume);
    trackEngine.setAudible(audible);
    trackEngine.setPan(track.pan);
    trackEngine.updateEffects(track.effects);
    applySends(trackEngine, track);
    if (playing) reassert(track, trackEngine);
    // Ducker key source: resolve any OTHER track's analyser by id from the
    // registry. Returns null for self (no feedback) or a missing key (fail
    // silent), and re-resolves live so key deletion/creation is handled.
    const ownId = track.id;
    trackEngine.setKeySourceResolver((keyId) =>
      keyId === ownId
        ? null
        : (getTrackAudioState(keyId)?.trackEngine.getAnalyserNode() ?? null),
    );

    const instrument = createInstrument(
      track.instrument,
      track.gmProgram,
      track.drumKit,
      track.bassVoice,
    );

    if (instrument) {
      console.log(
        `[Audio] Initializing ${track.instrument} for track "${track.name}"...`,
      );
      instrument
        .init(ctx, trackEngine.getInputNode())
        .then(() => {
          // The track's engine was made again (a load, a new instrument) or
          // removed while this loaded: let the instrument go rather than
          // wire it into a disposed engine, where it would keep running
          // (and holding a SoundFont channel) unheard.
          const state = trackEngineRegistry.get(track.id);
          if (state?.trackEngine !== trackEngine) {
            instrument.dispose();
            return;
          }
          trackEngine.setInstrument(instrument);
          console.log(`[Audio] Instrument ready for track "${track.name}"`);
          // What the track holds now, not when the load began: an edit made
          // meanwhile reached the store but not this instrument.
          const current = currentTrack(track.id) ?? track;
          // Apply the track's saved Oracle Synth patch to its fresh engine so
          // a loaded project plays with the right sound even before the synth
          // panel (which would otherwise be the first thing to sync it) opens.
          // A track with no patch of its own plays the default patch its
          // panel shows. The engine's own starting sound differs from it
          // (filter 1 at 20 kHz, not 13.4), so the track used to change
          // sound when its panel first opened, and change back on a reload.
          if (instrument instanceof OracleSynthAdapter) {
            const synthEngine = instrument.getEngine();
            if (synthEngine) {
              applySynthStateToEngine(
                synthEngine,
                getTrackSynthState(track.id) ?? defaultSynthTrackState(),
                { projectBpm: useStore.getState().bpm },
              );
            }
          }
          // Saved drum pad mixes (the kit itself was passed to the
          // constructor, so init() already loaded the right samples), organ
          // settings and the sampler's sample. The sample buffer may still be
          // fetching (project load); the buffer-store subscription in
          // usePlaybackEngine re-applies on arrival.
          if (instrument instanceof DrumMachineEngine) {
            applyDrumPads(instrument, current);
          }
          if (instrument instanceof TonewheelOrganEngine) {
            applyOrganState(instrument, current);
          }
          if (instrument instanceof ChopsSampler) {
            applySamplerState(instrument, current);
          }
          // The saved amp and pedals of a Guitar/Bass/Vocal track, so its
          // takes and its live input play through them before (or without)
          // its view opening. The amp's NAM model loads in the background:
          // the amp plays its classic model until it is in.
          if (isPedalAdapter(instrument)) {
            void applyStoredPedalChain(
              instrument,
              current,
              useStore.getState().bpm,
            );
          }
          applyMonitoring(state, current);
          // Tap audio-input adapters into the live-monitor send bus so this
          // user's mic / instrument FX can be streamed to collaborators.
          const monitorBus = audioEngine.getMonitorBus();
          const getTap = (
            instrument as { getMonitorOutputNode?: () => AudioNode | null }
          ).getMonitorOutputNode;
          if (monitorBus && typeof getTap === 'function') {
            try {
              getTap.call(instrument)?.connect(monitorBus);
            } catch (err) {
              console.warn('[Audio] monitor tap connect failed:', err);
            }
          }
          notifyEngineReady();
        })
        .catch((err) => {
          console.error(
            `[Audio] Instrument init FAILED for track "${track.name}":`,
            err,
          );
        });
    }

    trackEngineRegistry.set(track.id, {
      trackEngine,
      instrument,
      instrumentType: track.instrument,
      bassVoice: track.bassVoice,
      generation,
    });
  }

  function reconcile(): void {
    if (stopped) return;
    const s = useStore.getState();
    const tracks = s.tracks;
    const generation = getSessionGeneration();
    const playing = s.isPlaying;
    passTick = null;
    // Whether this pass made or let go of an engine (see the end).
    let enginesChanged = false;

    const ids = audioEngine.getReturnIds().join('|');
    const sendsRewired = ids !== returnIds;
    returnIds = ids;

    const currentIds = new Set(tracks.map((t) => t.id));
    for (const [id, state] of trackEngineRegistry) {
      if (currentIds.has(id)) continue;
      retireTrackAudio(id, state, automationScheduler);
      applied.delete(id);
      enginesChanged = true;
    }

    // Mute and solo: a track is audible unless muted, or another track is
    // soloed and it isn't, so one solo changes every track's gate.
    const anySolo = tracks.some((t) => t.solo);
    for (const track of tracks) {
      const audible = !track.mute && (track.solo || !anySolo);
      const existing = trackEngineRegistry.get(track.id);
      const prev = applied.get(track.id);
      // An engine this reconciler didn't apply (left by a previous start)
      // is made again too, rather than guessed at.
      if (existing && (!prev || needsNewEngine(existing, track, generation))) {
        retireTrackAudio(track.id, existing, automationScheduler);
        applied.delete(track.id);
        enginesChanged = true;
      }
      const state = trackEngineRegistry.get(track.id);
      if (state && prev) {
        update(state, prev, track, audible, sendsRewired, playing);
      } else {
        create(track, audible, generation, playing);
        enginesChanged = true;
      }
      applied.set(track.id, { track, audible });
    }

    // Readers that hold a track's engine (the meters, the instrument panels)
    // re-read on this. A load makes every engine again under the same track
    // ids, so a reader keyed on the id alone would keep the disposed engine.
    if (enginesChanged) notifyEngineReady();
  }

  function safeReconcile(): void {
    try {
      reconcile();
    } catch (err) {
      console.error('[Audio] track reconcile failed:', err);
    }
  }

  function preview(trackId: string, patch: Partial<Track>): void {
    if (stopped) return;
    const state = trackEngineRegistry.get(trackId);
    const prev = applied.get(trackId);
    if (!state || !prev) return;
    const next = { ...prev.track, ...patch };
    passTick = null;
    try {
      update(
        state,
        prev,
        next,
        prev.audible,
        false,
        useStore.getState().isPlaying,
        true,
      );
    } catch (err) {
      console.error('[Audio] track preview failed:', err);
    }
    // The chain kept its old impulse response (a preview defers it), so it
    // counts as applied with the old decay and type: the release's store
    // write then differs, and builds the new one.
    const heard = prev.track.effects.reverb;
    const reverb = next.effects.reverb;
    const track =
      reverb.decay === heard.decay && reverb.type === heard.type
        ? next
        : {
            ...next,
            effects: {
              ...next.effects,
              reverb: { ...reverb, decay: heard.decay, type: heard.type },
            },
          };
    applied.set(trackId, { track, audible: prev.audible });
  }

  // Runs inside the store write that changed the tracks. A load bumps the
  // generation, seeds the patch caches and sets the tracks in one
  // synchronous block (sessionGeneration.ts), so the write sees the new
  // generation with the new tracks. A bump with no track write (a reset of
  // an unchanged project) reconciles once that block is done.
  const unsubscribeTracks = useStore.subscribe(
    (s) => s.tracks,
    () => safeReconcile(),
  );
  const unsubscribeGeneration = onSessionGeneration(() => {
    queueMicrotask(safeReconcile);
  });
  // The phaser syncs to the project tempo: a tempo change reaches every
  // chain (an open view applies its own as well; an unchanged chain is a
  // no-op).
  const unsubscribeBpm = useStore.subscribe(
    (s) => s.bpm,
    (bpm) => {
      if (stopped) return;
      for (const track of useStore.getState().tracks) {
        const state = trackEngineRegistry.get(track.id);
        const instrument = state?.instrument;
        // An adapter still in its init gets the tempo when it ends.
        if (!isPedalAdapter(instrument)) continue;
        if (state?.trackEngine.getInstrument() !== instrument) continue;
        void applyStoredPedalChain(instrument, track, bpm);
      }
    },
  );

  safeReconcile();

  const reconciler: TrackReconciler = {
    reconcile: safeReconcile,
    preview,
    stop() {
      stopped = true;
      unsubscribeTracks();
      unsubscribeGeneration();
      unsubscribeBpm();
      applied.clear();
      if (active === reconciler) active = null;
    },
  };
  active = reconciler;
  return reconciler;
}

/** A Guitar/Bass or Vocal adapter: the instruments with a pedal chain. */
function isPedalAdapter(
  instrument: unknown,
): instrument is GuitarFxAdapter | VocalFxAdapter {
  return (
    instrument instanceof GuitarFxAdapter ||
    instrument instanceof VocalFxAdapter
  );
}

/** Whether a track has any automation lane. */
function hasLanes(track: Track): boolean {
  return Object.keys(track.automation ?? {}).length > 0;
}

function currentTrack(id: string): Track | undefined {
  return useStore.getState().tracks.find((t) => t.id === id);
}
