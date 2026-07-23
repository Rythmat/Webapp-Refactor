import type { SynthEngine } from '@/daw/oracle-synth/audio/SynthEngine';
import { scaleMask } from '@/daw/oracle-synth/audio/ScaleQuantizer';
import { migrateModRoute } from '@/daw/oracle-synth/audio/modMath';
import { useSynthStore } from '@/daw/oracle-synth/store';
import { defaultMacros } from '@/daw/oracle-synth/store/slices/macroSlice';
import { DEFAULT_KEYSCALE } from '@/daw/oracle-synth/store/slices/keyScaleSlice';
import type { SynthStore } from '@/daw/oracle-synth/store/storeTypes';

// ── Per-track Oracle Synth state ───────────────────────────────────────────
//
// The Oracle Synth uses a single, shared zustand store (`useSynthStore`). To
// give each DAW track its own patch, the live store is snapshotted into a
// module-level cache keyed by track id whenever the user leaves a track, and
// restored when they return. This module owns that cache so both the store
// bridge (live editing) and the session serializer (persistence) read/write
// the same source of truth.

/**
 * The audio-relevant slice of the synth store that defines a track's patch.
 * A superset of PresetData (adds presetName + pitchBendRange) — everything that
 * must round-trip so a saved project sounds and looks identical on reload.
 * Excludes transient runtime state (pitchBend, modWheel, activeNotes) and UI
 * state (selectedSection, activeLFOBar, …).
 */
export type SynthTrackState = Pick<
  SynthStore,
  | 'oscillators'
  | 'subOscillator'
  | 'noise'
  | 'filters'
  | 'envelopes'
  | 'lfos'
  | 'modRoutes'
  | 'voiceMode'
  | 'voiceCount'
  | 'glide'
  | 'spread'
  | 'masterVolume'
  | 'fx'
  | 'fxRoutes'
  | 'routing'
  | 'arp'
  | 'macros'
  | 'keyScale'
  | 'presetName'
  | 'pitchBendRange'
  | 'bpm'
>;

const SYNTH_STATE_KEYS: (keyof SynthTrackState)[] = [
  'oscillators',
  'subOscillator',
  'noise',
  'filters',
  'envelopes',
  'lfos',
  'modRoutes',
  'voiceMode',
  'voiceCount',
  'glide',
  'spread',
  'masterVolume',
  'fx',
  'fxRoutes',
  'routing',
  'arp',
  'macros',
  'keyScale',
  'presetName',
  'pitchBendRange',
  'bpm',
];

// ── Snapshot / restore against the shared store ────────────────────────────

/** Deep-copy the current synth store into a serializable patch snapshot. */
export function captureSynthState(): SynthTrackState {
  const s = useSynthStore.getState() as unknown as Record<string, unknown>;
  const snap = {} as Record<string, unknown>;
  for (const key of SYNTH_STATE_KEYS) {
    const val = s[key];
    snap[key] =
      typeof val === 'object' && val !== null ? structuredClone(val) : val;
  }
  return snap as SynthTrackState;
}

/**
 * Fill fields older saved projects lack (pre-v2 snapshots have no macros/
 * keyScale and v1-shaped modRoutes). Without this, loading an old project
 * would crash on `macros` and leak the previous track's values into the
 * restored patch.
 */
export function normalizeSynthTrackState(
  snap: SynthTrackState,
): SynthTrackState {
  return {
    ...snap,
    modRoutes: (snap.modRoutes ?? []).map(migrateModRoute),
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
// panel is mounted on it). Its freshest edits live in the store, not the cache,
// so reads for this id must snapshot the store rather than return a stale entry.
let activeTrackId: string | null = null;

/** Mark which track's patch is currently live in the shared store. */
export function setActiveSynthTrack(trackId: string | null): void {
  activeTrackId = trackId;
}

/** Cache `trackId`'s outgoing patch (called by the bridge on switch/unmount). */
export function cacheSynthState(trackId: string, snap: SynthTrackState): void {
  stateCache.set(trackId, snap);
}

/** Restore `trackId`'s cached patch into the store, if one exists. */
export function restoreCachedSynthState(trackId: string): boolean {
  const cached = stateCache.get(trackId);
  if (!cached) return false;
  restoreSynthState(cached);
  return true;
}

/**
 * The current patch for a track, for persistence. Returns the live store
 * snapshot when this is the active track (so unsaved edits are captured),
 * otherwise the cached patch, or undefined if the track was never opened.
 */
export function getTrackSynthState(
  trackId: string,
): SynthTrackState | undefined {
  if (trackId === activeTrackId) return captureSynthState();
  return stateCache.get(trackId);
}

/**
 * Seed a track's patch from a loaded project. Populates the cache so the panel
 * restores it on open; the engine is configured separately at instrument init.
 */
export function setTrackSynthState(
  trackId: string,
  snap: SynthTrackState,
): void {
  stateCache.set(trackId, snap);
}

// ── Engine application ─────────────────────────────────────────────────────

/**
 * Push a patch onto a track's SynthEngine. Mirrors the initial-sync block in
 * useSyncStoreToEngine so a loaded project's tracks play correctly even before
 * their panel is opened (which is what would normally trigger that sync).
 */
export function applySynthStateToEngine(
  engine: SynthEngine,
  snap: SynthTrackState,
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
  engine.setBPM(s.bpm);
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
  engine.setCompressorParams(s.fx.compressor);
  engine.setRouting(s.routing);
  engine.setArpParams(s.arp);
}
