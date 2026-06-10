// ── Yjs → Zustand ────────────────────────────────────────────────────────
// Observes Yjs shared types and applies remote changes to the Zustand store.
// Uses observeDeep for granular, surgical updates rather than rebuilding
// the entire store on every remote change.

import * as Y from 'yjs';
import type { AllSlices } from '@/daw/store/index';
import type { Track } from '@/daw/store/tracksSlice';
import type { ChordRegion } from '@/daw/store/prismSlice';
import type { Marker } from '@/daw/store/markersSlice';
import {
  getYProject,
  getYTransport,
  getYTracks,
  getYChordRegions,
  getYPrism,
  getYMarkers,
  getYMastering,
  getYLeadSheet,
  yMapToTrack,
  yMapToChordRegion,
  yMapToMarker,
} from './YjsDocManager';
import { ORIGIN_LOCAL } from './types';

/** Callback type for pushing state into the Zustand store. */
type SetState = (partial: Partial<AllSlices>) => void;

/** Disposer to tear down all observers. */
export type YjsObserverDisposer = () => void;

/**
 * Transport keys that are shared across the room. Everything else on the
 * transport map (play state, playhead, loop region, metronome, recording) is
 * per-user-local and must never be applied from a remote update — even if a
 * stray write somehow lands in the doc.
 */
const SYNCED_TRANSPORT_KEYS = new Set([
  'bpm',
  'timeSignatureNumerator',
  'timeSignatureDenominator',
]);

/**
 * Subscribe to all synced Yjs shared types and push remote changes into
 * the Zustand store via `setState`. Returns a disposer to unsubscribe.
 *
 * @param doc - The shared Y.Doc
 * @param setState - A function that calls `useStore.setState(partial)`
 * @param isSuppressed - Returns true when the bridge should NOT push
 *   Yjs changes into Zustand (i.e. the change originated locally).
 * @param getState - Reads the current Zustand state (used to preserve
 *   per-user-local track fields like mute/solo across remote track updates).
 * @param subscribe - Subscribes to Zustand store changes (used to flush
 *   remote track updates that were deferred while the local user was
 *   recording). Returns an unsubscribe function.
 */
export function observeYjsAndPushToStore(
  doc: Y.Doc,
  setState: SetState,
  isSuppressed: () => boolean,
  getState: () => AllSlices,
  subscribe: (listener: () => void) => () => void,
): YjsObserverDisposer {
  const disposers: (() => void)[] = [];

  // ── Project ──
  const yProject = getYProject(doc);
  const onProject = (events: Y.YEvent<Y.Map<string>>[], tx: Y.Transaction) => {
    if (tx.origin === ORIGIN_LOCAL || isSuppressed()) return;
    const patch: Partial<AllSlices> = {};
    for (const event of events) {
      if (event instanceof Y.YMapEvent) {
        for (const key of event.keysChanged) {
          if (key === 'name')
            (patch as Record<string, unknown>).projectName =
              yProject.get('name');
          if (key === 'composerName')
            (patch as Record<string, unknown>).composerName =
              yProject.get('composerName');
        }
      }
    }
    if (Object.keys(patch).length) setState(patch);
  };
  yProject.observeDeep(onProject);
  disposers.push(() => yProject.unobserveDeep(onProject));

  // ── Transport ──
  const yTransport = getYTransport(doc);
  const onTransport = (
    events: Y.YEvent<Y.Map<unknown>>[],
    tx: Y.Transaction,
  ) => {
    if (tx.origin === ORIGIN_LOCAL || isSuppressed()) return;
    const patch: Partial<AllSlices> = {};
    for (const event of events) {
      if (event instanceof Y.YMapEvent) {
        for (const key of event.keysChanged) {
          if (!SYNCED_TRANSPORT_KEYS.has(key)) continue; // skip per-user-local
          (patch as Record<string, unknown>)[key] = yTransport.get(key);
        }
      }
    }
    if (Object.keys(patch).length) setState(patch);
  };
  yTransport.observeDeep(onTransport);
  disposers.push(() => yTransport.unobserveDeep(onTransport));

  // ── Tracks ──
  // Any change to the tracks Y.Array (add/remove/modify) rebuilds the full
  // tracks array from Yjs. This is simpler than surgical per-field updates
  // and fast enough for the typical track count (<20).
  //
  // While the local user is recording, applying a rebuild would swap the
  // `tracks` array reference and re-run every effect keyed off `tracks` — the
  // audio/MIDI recording lifecycles and the TrackEngine sync (which disposes
  // and rebuilds audio nodes). That aborts the in-progress take. So remote
  // track changes are deferred during recording and flushed the instant it
  // ends; a remote edit (e.g. another user deleting an unrelated track) can no
  // longer interrupt a local recording.
  const yTracks = getYTracks(doc);
  let tracksApplyPending = false;
  const applyTracksFromDoc = () => {
    // mute/solo/recordArmed/monitoring are per-user-local: yMapToTrack returns
    // false defaults, so we carry the local user's current values forward by
    // track id rather than letting a remote track update clobber them.
    const prevById = new Map(getState().tracks.map((t) => [t.id, t]));
    const tracks: Track[] = yTracks.toArray().map((ym) => {
      const t = yMapToTrack(ym as Y.Map<unknown>);
      const prev = prevById.get(t.id);
      return prev
        ? {
            ...t,
            mute: prev.mute,
            solo: prev.solo,
            recordArmed: prev.recordArmed,
            monitoring: prev.monitoring,
          }
        : t;
    });
    setState({ tracks } as Partial<AllSlices>);
  };
  const onTracks = (_events: Y.YEvent<any>[], tx: Y.Transaction) => {
    if (tx.origin === ORIGIN_LOCAL || isSuppressed()) return;
    if (getState().isRecording) {
      // Defer — re-read the (latest) doc state when recording ends.
      tracksApplyPending = true;
      return;
    }
    applyTracksFromDoc();
  };
  yTracks.observeDeep(onTracks);
  disposers.push(() => yTracks.unobserveDeep(onTracks));

  // Flush deferred remote track changes the moment recording stops.
  let wasRecording = getState().isRecording;
  const unsubscribeRecording = subscribe(() => {
    const recording = getState().isRecording;
    if (wasRecording && !recording && tracksApplyPending) {
      tracksApplyPending = false;
      applyTracksFromDoc();
    }
    wasRecording = recording;
  });
  disposers.push(unsubscribeRecording);

  // ── Chord Regions ──
  const yChordRegions = getYChordRegions(doc);
  const onChordRegions = (_events: Y.YEvent<any>[], tx: Y.Transaction) => {
    if (tx.origin === ORIGIN_LOCAL || isSuppressed()) return;
    const chordRegions: ChordRegion[] = yChordRegions
      .toArray()
      .map((ym) => yMapToChordRegion(ym as Y.Map<unknown>));
    setState({ chordRegions } as Partial<AllSlices>);
  };
  yChordRegions.observeDeep(onChordRegions);
  disposers.push(() => yChordRegions.unobserveDeep(onChordRegions));

  // ── Prism ──
  const yPrism = getYPrism(doc);
  const onPrism = (events: Y.YEvent<any>[], tx: Y.Transaction) => {
    if (tx.origin === ORIGIN_LOCAL || isSuppressed()) return;
    const patch: Partial<AllSlices> = {};
    for (const event of events) {
      if (event instanceof Y.YMapEvent) {
        for (const key of event.keysChanged) {
          (patch as Record<string, unknown>)[key] = yPrism.get(key);
        }
      }
    }
    if (Object.keys(patch).length) setState(patch);
  };
  yPrism.observeDeep(onPrism);
  disposers.push(() => yPrism.unobserveDeep(onPrism));

  // ── Markers ──
  const yMarkers = getYMarkers(doc);
  const onMarkers = (_events: Y.YEvent<any>[], tx: Y.Transaction) => {
    if (tx.origin === ORIGIN_LOCAL || isSuppressed()) return;
    const markers: Marker[] = yMarkers
      .toArray()
      .map((ym) => yMapToMarker(ym as Y.Map<unknown>));
    setState({ markers } as Partial<AllSlices>);
  };
  yMarkers.observeDeep(onMarkers);
  disposers.push(() => yMarkers.unobserveDeep(onMarkers));

  // ── Mastering ──
  const yMastering = getYMastering(doc);
  const onMastering = (events: Y.YEvent<any>[], tx: Y.Transaction) => {
    if (tx.origin === ORIGIN_LOCAL || isSuppressed()) return;
    const patch: Partial<AllSlices> = {};
    for (const event of events) {
      if (event instanceof Y.YMapEvent) {
        for (const key of event.keysChanged) {
          const value = yMastering.get(key);
          switch (key) {
            case 'style':
              (patch as Record<string, unknown>).masteringStyle = value;
              break;
            case 'eq':
              (patch as Record<string, unknown>).masteringEq = JSON.parse(
                value as string,
              );
              break;
            case 'dynamics':
              (patch as Record<string, unknown>).masteringDynamics = JSON.parse(
                value as string,
              );
              break;
            case 'loudness':
              (patch as Record<string, unknown>).masteringLoudness = value;
              break;
            case 'stereoField':
              (patch as Record<string, unknown>).masteringStereoField = value;
              break;
            case 'bypass':
              (patch as Record<string, unknown>).masteringBypass = value;
              break;
            case 'amount':
              (patch as Record<string, unknown>).masteringAmount = value;
              break;
            case 'presence':
              (patch as Record<string, unknown>).masteringPresence = value;
              break;
            case 'deEsser':
              (patch as Record<string, unknown>).masteringDeEsser = JSON.parse(
                value as string,
              );
              break;
            case 'fxChain':
              (patch as Record<string, unknown>).masteringFxChain = JSON.parse(
                value as string,
              );
              break;
            case 'effects':
              (patch as Record<string, unknown>).masteringEffects = JSON.parse(
                value as string,
              );
              break;
          }
        }
      }
    }
    if (Object.keys(patch).length) setState(patch);
  };
  yMastering.observeDeep(onMastering);
  disposers.push(() => yMastering.unobserveDeep(onMastering));

  // ── Lead Sheet ──
  const yLeadSheet = getYLeadSheet(doc);
  const onLeadSheet = (events: Y.YEvent<any>[], tx: Y.Transaction) => {
    if (tx.origin === ORIGIN_LOCAL || isSuppressed()) return;
    const patch: Partial<AllSlices> = {};
    for (const event of events) {
      if (event instanceof Y.YMapEvent) {
        for (const key of event.keysChanged) {
          const value = yLeadSheet.get(key);
          switch (key) {
            case 'sections':
              (patch as Record<string, unknown>).leadSheetSections = JSON.parse(
                value as string,
              );
              break;
            case 'repeats':
              (patch as Record<string, unknown>).leadSheetRepeats = JSON.parse(
                value as string,
              );
              break;
            case 'chordFormat':
              (patch as Record<string, unknown>).leadSheetChordFormat = value;
              break;
            case 'showRepeats':
              (patch as Record<string, unknown>).leadSheetShowRepeats = value;
              break;
          }
        }
      }
    }
    if (Object.keys(patch).length) setState(patch);
  };
  yLeadSheet.observeDeep(onLeadSheet);
  disposers.push(() => yLeadSheet.unobserveDeep(onLeadSheet));

  return () => {
    for (const dispose of disposers) dispose();
  };
}

/**
 * One-time full read of the shared document into the Zustand store.
 *
 * The observers above only fire on *subsequent* changes, so a client that joins
 * a room with existing content would never see it — the document is populated
 * by the initial sync, but nothing copies that state into the store. Call this
 * once, right after the initial sync, to seed the store from the document.
 *
 * Per-user-local track fields (mute/solo/recordArmed/monitoring) are preserved
 * from the current store rather than reset to the doc's `false` defaults.
 */
export function pullDocIntoStore(
  doc: Y.Doc,
  setState: SetState,
  getState: () => AllSlices,
): void {
  const patch: Record<string, unknown> = {};

  // ── Project ──
  const yProject = getYProject(doc);
  if (yProject.has('name')) patch.projectName = yProject.get('name');
  if (yProject.has('composerName'))
    patch.composerName = yProject.get('composerName');

  // ── Transport (shared keys only) ──
  const yTransport = getYTransport(doc);
  for (const key of SYNCED_TRANSPORT_KEYS) {
    if (yTransport.has(key)) patch[key] = yTransport.get(key);
  }

  // ── Tracks (preserve local per-user fields by id) ──
  const prevById = new Map(getState().tracks.map((t) => [t.id, t]));
  patch.tracks = getYTracks(doc)
    .toArray()
    .map((ym) => {
      const t = yMapToTrack(ym as Y.Map<unknown>);
      const prev = prevById.get(t.id);
      return prev
        ? {
            ...t,
            mute: prev.mute,
            solo: prev.solo,
            recordArmed: prev.recordArmed,
            monitoring: prev.monitoring,
          }
        : t;
    });

  // ── Chord regions ──
  patch.chordRegions = getYChordRegions(doc)
    .toArray()
    .map((ym) => yMapToChordRegion(ym as Y.Map<unknown>));

  // ── Prism ──
  const yPrism = getYPrism(doc);
  for (const key of ['rootNote', 'mode', 'genre', 'rhythmName', 'swing']) {
    if (yPrism.has(key)) patch[key] = yPrism.get(key);
  }

  // ── Markers ──
  patch.markers = getYMarkers(doc)
    .toArray()
    .map((ym) => yMapToMarker(ym as Y.Map<unknown>));

  // ── Mastering ── (docKey → [storeKey, isJsonEncoded])
  const yMastering = getYMastering(doc);
  const masteringMap: Record<string, [string, boolean]> = {
    style: ['masteringStyle', false],
    eq: ['masteringEq', true],
    dynamics: ['masteringDynamics', true],
    loudness: ['masteringLoudness', false],
    stereoField: ['masteringStereoField', false],
    bypass: ['masteringBypass', false],
    amount: ['masteringAmount', false],
    presence: ['masteringPresence', false],
    deEsser: ['masteringDeEsser', true],
    fxChain: ['masteringFxChain', true],
    effects: ['masteringEffects', true],
  };
  for (const [docKey, [storeKey, isJson]] of Object.entries(masteringMap)) {
    if (!yMastering.has(docKey)) continue;
    const value = yMastering.get(docKey);
    patch[storeKey] = isJson ? JSON.parse(value as string) : value;
  }

  // ── Lead sheet ──
  const yLeadSheet = getYLeadSheet(doc);
  const leadSheetMap: Record<string, [string, boolean]> = {
    sections: ['leadSheetSections', true],
    repeats: ['leadSheetRepeats', true],
    chordFormat: ['leadSheetChordFormat', false],
    showRepeats: ['leadSheetShowRepeats', false],
  };
  for (const [docKey, [storeKey, isJson]] of Object.entries(leadSheetMap)) {
    if (!yLeadSheet.has(docKey)) continue;
    const value = yLeadSheet.get(docKey);
    patch[storeKey] = isJson ? JSON.parse(value as string) : value;
  }

  setState(patch as Partial<AllSlices>);
}
