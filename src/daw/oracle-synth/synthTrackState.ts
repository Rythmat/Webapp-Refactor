import type { SynthEngine } from '@/daw/oracle-synth/audio/SynthEngine';
import { scaleMask } from '@/daw/oracle-synth/audio/ScaleQuantizer';
import { migrateModRoute } from '@/daw/oracle-synth/audio/modMath';
import { useSynthStore } from '@/daw/oracle-synth/store';
import type { PresetData } from '@/daw/oracle-synth/store/presets/PresetData';
import { applyPresetData } from '@/daw/oracle-synth/store/slices/presetSlice';
import { defaultMacros } from '@/daw/oracle-synth/store/slices/macroSlice';
import { DEFAULT_KEYSCALE } from '@/daw/oracle-synth/store/slices/keyScaleSlice';
import { withUniqueModRouteIds } from '@/daw/oracle-synth/store/slices/modulationSlice';
import type { SynthStore } from '@/daw/oracle-synth/store/storeTypes';
import {
  SYNTH_STATE_KEYS,
  type SynthTrackState,
} from '@/daw/oracle-synth/synthPatchKeys';
import { setSynthPatchReader } from '@/daw/persistence/saveStatusStore';
import {
  getSessionGeneration,
  onSessionGeneration,
} from '@/daw/session/sessionGeneration';

export { SYNTH_STATE_KEYS, type SynthTrackState };

// ── Per-track Oracle Synth state ───────────────────────────────────────────
//
// The Oracle Synth uses a single, shared zustand store (`useSynthStore`). To
// give each DAW track its own patch, the live store is snapshotted into a
// module-level cache keyed by track id whenever the user leaves a track, and
// restored when they return. This module owns that cache so both the store
// bridge (live editing) and the session serializer (persistence) read/write
// the same source of truth.

// ── Snapshot / restore against the shared store ────────────────────────────

/** Deep-copy the patch keys of a synth store state. */
function snapshotPatch(state: SynthStore): SynthTrackState {
  const s = state as unknown as Record<string, unknown>;
  const snap = {} as Record<string, unknown>;
  for (const key of SYNTH_STATE_KEYS) {
    const val = s[key];
    snap[key] =
      typeof val === 'object' && val !== null ? structuredClone(val) : val;
  }
  return snap as SynthTrackState;
}

/** Deep-copy the current synth store into a serializable patch snapshot. */
export function captureSynthState(): SynthTrackState {
  return snapshotPatch(useSynthStore.getState());
}

/**
 * The patch of a track that has none of its own: the synth store's initial
 * patch (INITIALIZE). Its panel shows this on a first visit, and its engine
 * is given it when made (usePlaybackEngine), so the track sounds the same
 * before its panel opens, while it is open and after a reload. The engine's
 * own starting sound is not quite INITIALIZE: filter 1 opens at 20 kHz there,
 * 13.4 kHz here.
 */
export function defaultSynthTrackState(): SynthTrackState {
  return snapshotPatch(useSynthStore.getInitialState());
}

/** The synth store's default pitch-bend range in semitones (globalSlice). */
const DEFAULT_PITCH_BEND_RANGE = 2;

/**
 * A track patch built from a preset — what picking it in the synth panel would
 * leave in the store, through the same migrations (applyPresetData). Presets
 * don't carry a pitch-bend range or tempo, so those take the store default and
 * the project's `bpm` (which tempo-synced LFOs and the arp follow).
 */
export function synthTrackStateFromPreset(
  preset: PresetData,
  bpm: number,
): SynthTrackState {
  const applied = applyPresetData(preset) as unknown as Record<string, unknown>;
  const snap = {} as Record<string, unknown>;
  for (const key of SYNTH_STATE_KEYS) snap[key] = applied[key];
  return {
    ...(snap as SynthTrackState),
    pitchBendRange: DEFAULT_PITCH_BEND_RANGE,
    bpm,
  };
}

/**
 * Fill fields older saved projects lack (pre-v2 snapshots have no macros/
 * keyScale and v1-shaped modRoutes). Without this, loading an old project
 * would crash on `macros` and leak the previous track's values into the
 * restored patch. Mod routes saved under one id twice get unique ids
 * (synth-store-06).
 */
export function normalizeSynthTrackState(
  snap: SynthTrackState,
): SynthTrackState {
  return {
    ...snap,
    modRoutes: withUniqueModRouteIds(
      (snap.modRoutes ?? []).map(migrateModRoute),
    ),
    macros: snap.macros ?? defaultMacros(),
    keyScale: snap.keyScale ?? structuredClone(DEFAULT_KEYSCALE),
  };
}

/** Push a patch snapshot back into the shared synth store. */
export function restoreSynthState(snap: SynthTrackState): void {
  useSynthStore.setState(
    normalizeSynthTrackState(snap) as unknown as Partial<SynthStore>,
  );
  // Restoring a snapshot is not a user edit — the dirty watcher fires on
  // the new object references above, so explicitly clear the flag after.
  useSynthStore.setState({ isDirty: false });
}

// ── Per-track cache ────────────────────────────────────────────────────────

const stateCache = new Map<string, SynthTrackState>();

// The track whose patch is currently live in the shared store (i.e. the synth
// panel is mounted on it), and the session generation its panel showed it in.
// Its freshest edits live in the store, not the cache, so reads for this id
// must snapshot the store rather than return a stale entry. After a load or a
// reset no track is live until a panel shows one again: until then the store
// still holds the previous project's patch, which may share the track's id.
let activeTrackId: string | null = null;
let activeGeneration = 0;

// Set when a panel showed a track with no patch of its own: the default patch
// values it put in the store, as the app's own writes left them since
// (writeLivePatchAsSystem). While the store still holds exactly these, the
// track still has no patch, so saving writes none, as before its panel opened.
// Opening a synth panel is not an edit to the project.
let untouchedDefault: { trackId: string; values: unknown[] } | null = null;

function livePatchValues(): unknown[] {
  const s = useSynthStore.getState() as unknown as Record<string, unknown>;
  return SYNTH_STATE_KEYS.map((key) => s[key]);
}

/** Whether the store shows `trackId`'s default patch, untouched since. */
function showsUntouchedDefault(trackId: string): boolean {
  if (untouchedDefault?.trackId !== trackId) return false;
  const shown = untouchedDefault.values;
  return livePatchValues().every((value, i) => value === shown[i]);
}

/** Mark which track's patch is currently live in the shared store. */
export function setActiveSynthTrack(trackId: string | null): void {
  activeTrackId = trackId;
  activeGeneration = getSessionGeneration();
}

/** The track whose patch is currently live in the shared store, if any. */
export function getActiveSynthTrack(): string | null {
  return activeGeneration === getSessionGeneration() ? activeTrackId : null;
}

// More than one synth panel can be bridged to the same track at once (the
// inline strip stays mounted under the full-screen pop-out). Count them so
// closing one panel doesn't mark the track as no longer live.
let mountedBridges = 0;

/** Register a mounted store bridge. */
export function acquireSynthBridge(): void {
  mountedBridges++;
}

/** Unregister a store bridge; returns true when it was the last one. */
export function releaseSynthBridge(): boolean {
  mountedBridges = Math.max(0, mountedBridges - 1);
  return mountedBridges === 0;
}

/** Cache `trackId`'s outgoing patch. */
export function cacheSynthState(trackId: string, snap: SynthTrackState): void {
  stateCache.set(trackId, snap);
}

/**
 * Put `trackId`'s patch in the shared store for its panel: its cached patch,
 * or the default patch when it has none of its own. Never the patch the
 * previously open track left there: a track that adopted it changed its sound
 * when its panel opened, and saved another track's patch as its own
 * (synth-store-05, engine-hooks-28, state-reload-32, synth-ui-17).
 */
export function showTrackSynthState(trackId: string): void {
  const cached = stateCache.get(trackId);
  if (cached) {
    restoreSynthState(cached);
    untouchedDefault = null;
    return;
  }
  restoreSynthState(defaultSynthTrackState());
  untouchedDefault = { trackId, values: livePatchValues() };
}

/**
 * Cache the live patch as `trackId`'s, as its panel leaves it (a switch to
 * another track, or the panel closing). A default patch nobody touched is not
 * cached: the track still has no patch of its own.
 */
export function keepLiveSynthState(trackId: string): void {
  if (showsUntouchedDefault(trackId)) return;
  stateCache.set(trackId, captureSynthState());
}

/**
 * Run `write`, a change the app makes to the live patch on its own (the
 * follow-project-key mirror), not one the student makes. A track whose panel
 * shows its untouched default still has no patch of its own afterwards, so
 * opening its panel in a project with a detected key is not an edit. A track
 * with a patch of its own takes the change like any other.
 */
export function writeLivePatchAsSystem(write: () => void): void {
  const live = getActiveSynthTrack();
  const untouched = live !== null && showsUntouchedDefault(live);
  write();
  if (untouched) {
    untouchedDefault = { trackId: live, values: livePatchValues() };
  }
}

/**
 * The current patch for a track, for persistence. Returns the live store
 * snapshot when this is the active track (so unsaved edits are captured),
 * otherwise the cached patch, or undefined if the track has no patch of its
 * own (never opened, or opened and left on the untouched default).
 */
export function getTrackSynthState(
  trackId: string,
): SynthTrackState | undefined {
  if (trackId === getActiveSynthTrack()) {
    return showsUntouchedDefault(trackId) ? undefined : captureSynthState();
  }
  return stateCache.get(trackId);
}

/**
 * Seed a track's patch from a loaded project. Populates the cache so the panel
 * restores it on open; the engine is configured separately at instrument init.
 * A loader seeds right after its bumpSessionGeneration, before anything
 * renders: a track a panel showed in between is live, so it would go on
 * showing and saving the store's patch instead of this one.
 */
export function setTrackSynthState(
  trackId: string,
  snap: SynthTrackState,
): void {
  stateCache.set(trackId, snap);
}

/**
 * Forget every track's patch and which track is live. A load or reset runs it
 * through bumpSessionGeneration (registered below) before it seeds the cache,
 * so no entry of the outgoing project survives under an id the new one reuses.
 * The shared store keeps showing the outgoing patch until a panel shows a
 * track of the new session; nothing reads it for a track until then.
 */
export function resetSynthTrackCache(): void {
  stateCache.clear();
  activeTrackId = null;
  untouchedDefault = null;
}

// The save status reads each Oracle track's patch as a save writes it
// (SessionSerializer): none for a track without a patch of its own, or one
// still on its untouched default. Its module doesn't load the synth store,
// so the patches reach it from here. The same choice as getTrackSynthState,
// without its deep copy of the live patch: the fingerprint only reads it.
function readTrackSynthPatches(
  tracks: readonly { id: string; instrument: string }[],
): Record<string, unknown> {
  const patches: Record<string, unknown> = {};
  const live = getActiveSynthTrack();
  for (const track of tracks) {
    if (track.instrument !== 'oracle-synth') continue;
    if (track.id !== live) {
      // As its panel would show it (normalised): a patch saved before Oracle
      // v2 gains its macros and key scale there, so opening the panel is no
      // edit.
      const cached = stateCache.get(track.id);
      if (cached) patches[track.id] = normalizeSynthTrackState(cached);
    } else if (!showsUntouchedDefault(track.id)) {
      const values = livePatchValues();
      const patch: Record<string, unknown> = {};
      SYNTH_STATE_KEYS.forEach((key, i) => {
        patch[key] = values[i];
      });
      patches[track.id] = patch;
    }
  }
  return patches;
}

const stopResettingOnLoad = onSessionGeneration(resetSynthTrackCache);
const stopReadingPatches = setSynthPatchReader(readTrackSynthPatches);
// One callback: Vite keeps only the last dispose a module registers.
import.meta.hot?.dispose(() => {
  stopResettingOnLoad();
  stopReadingPatches();
});

// ── Engine application ─────────────────────────────────────────────────────

export interface ApplySynthStateOptions {
  /** The project tempo. Tempo is host state: the bpm a patch was saved with
   *  is whatever the synth store held then (often its 120 default), so
   *  tempo-synced LFOs and the arp follow the project instead when given. */
  projectBpm?: number;
}

/**
 * Push a patch onto a track's SynthEngine. Mirrors the initial-sync block in
 * useSyncStoreToEngine so a loaded project's tracks play correctly even before
 * their panel is opened (which is what would normally trigger that sync).
 */
export function applySynthStateToEngine(
  engine: SynthEngine,
  snap: SynthTrackState,
  { projectBpm }: ApplySynthStateOptions = {},
): void {
  const s = normalizeSynthTrackState(snap);
  engine.setOscillatorParams(0, s.oscillators[0]);
  engine.setOscillatorParams(1, s.oscillators[1]);
  void engine.ensureWavetables([
    s.oscillators[0].wavetable,
    s.oscillators[1].wavetable,
  ]);
  engine.setSubOscillatorParams(s.subOscillator);
  engine.setNoiseParams(s.noise);
  engine.setFilterParams(0, s.filters[0]);
  engine.setFilterParams(1, s.filters[1]);
  engine.setEnvelopeParams(0, s.envelopes[0]);
  engine.setEnvelopeParams(1, s.envelopes[1]);
  engine.setMasterVolume(s.masterVolume);
  engine.setVoiceMode(s.voiceMode);
  engine.setVoiceCount(s.voiceCount);
  engine.setGlide(s.glide);
  engine.setSpread(s.spread);
  engine.setPitchBendRange(s.pitchBendRange);
  engine.setBPM(
    projectBpm !== undefined && Number.isFinite(projectBpm)
      ? projectBpm
      : s.bpm,
  );
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      engine.setLFONodes(i, j, s.lfos[i].bars[j]);
      engine.setLFOSmooth(i, j, s.lfos[i].smooths[j]);
    }
  }
  engine.setModRoutes(s.modRoutes);
  for (let i = 0; i < s.macros.length; i++) {
    engine.setMacro(i, s.macros[i].value);
  }
  engine.setKeyScale(
    scaleMask(s.keyScale.rootPc, s.keyScale.mode),
    s.keyScale.snapMode,
    s.keyScale.enabled,
  );
  engine.setDriveParams(s.fx.drive);
  engine.setChorusParams(s.fx.chorus);
  engine.setPhaserParams(s.fx.phaser);
  engine.setDelayParams(s.fx.delay);
  // Effects start disabled, so without this a patch's reverb is missing on
  // reload and in every export until its panel opens; a disabled one also
  // detaches the convolver it would otherwise run unheard. Pre-v3 patches
  // have no reverb section, and its updateParams would throw on undefined.
  if (s.fx.reverb) engine.setReverbParams(s.fx.reverb);
  engine.setCompressorParams(s.fx.compressor);
  engine.setRouting(s.routing);
  engine.setArpParams(s.arp);
}
