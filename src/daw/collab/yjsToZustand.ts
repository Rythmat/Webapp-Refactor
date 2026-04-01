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
 * Subscribe to all synced Yjs shared types and push remote changes into
 * the Zustand store via `setState`. Returns a disposer to unsubscribe.
 *
 * @param doc - The shared Y.Doc
 * @param setState - A function that calls `useStore.setState(partial)`
 * @param isSuppressed - Returns true when the bridge should NOT push
 *   Yjs changes into Zustand (i.e. the change originated locally).
 */
export function observeYjsAndPushToStore(
  doc: Y.Doc,
  setState: SetState,
  isSuppressed: () => boolean,
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
  const yTracks = getYTracks(doc);
  const onTracks = (_events: Y.YEvent<any>[], tx: Y.Transaction) => {
    if (tx.origin === ORIGIN_LOCAL || isSuppressed()) return;
    const tracks: Track[] = yTracks
      .toArray()
      .map((ym) => yMapToTrack(ym as Y.Map<unknown>));
    setState({ tracks } as Partial<AllSlices>);
  };
  yTracks.observeDeep(onTracks);
  disposers.push(() => yTracks.unobserveDeep(onTracks));

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
