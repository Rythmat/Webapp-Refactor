// ── Yjs → Zustand ────────────────────────────────────────────────────────
// Observes Yjs shared types and applies remote changes to the Zustand store.
// Uses observeDeep for granular, surgical updates rather than rebuilding
// the entire store on every remote change.

import * as Y from 'yjs';
import type { MidiNoteEvent } from '@prism/engine';
import type { AllSlices } from '@/daw/store/index';
import type { MidiClip, Track } from '@/daw/store/tracksSlice';
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
import { DEFAULT_EFFECTS } from '@/daw/audio/EffectChain';
import { ensureProjectNoteIds, isNoteId } from '@/daw/model/noteIds';
import { restoreReturns } from '@/daw/persistence/SessionSerializer';

/** Callback type for pushing state into the Zustand store. */
type SetState = (partial: Partial<AllSlices>) => void;

/** Disposer to tear down all observers. */
export type YjsObserverDisposer = () => void;

/**
 * A track as the shared doc has it, with this user's own state carried over
 * from the store by track id. The doc never holds that state (yMapToTrack
 * fills in defaults): mute/solo/arm/monitoring, and the input routing that
 * belongs to one person's devices. Without this, any collaborator's edit to
 * any track disconnected everyone's live input.
 */
function withLocalTrackState(t: Track, prev: Track | undefined): Track {
  if (!prev) return t;
  return {
    ...t,
    mute: prev.mute,
    solo: prev.solo,
    recordArmed: prev.recordArmed,
    monitoring: prev.monitoring,
    midiInputId: prev.midiInputId,
    audioInputId: prev.audioInputId,
    audioInputChannel: prev.audioInputChannel,
    audioMidiSource: prev.audioMidiSource,
  };
}

// ── Note ids from the doc ───────────────────────────────────────────────

/** Where a note sits: what decides which of a repeated id's notes keeps it. */
interface NotePlace {
  trackId: string;
  clipId: string;
  event: MidiNoteEvent;
}

/** Calls `visit` with every note of `tracks`, in track → clip → note order. */
function forEachNote(
  tracks: readonly Track[],
  visit: (event: MidiNoteEvent, clip: MidiClip, track: Track) => void,
): void {
  for (const track of tracks) {
    for (const clip of track.midiClips) {
      for (const event of clip.events) visit(event, clip, track);
    }
  }
}

/**
 * Which of a repeated id's places keeps it: the note that holds it at the
 * same track, clip, tick and pitch as before, else one in the same clip, else
 * the first.
 */
function keeperOf(
  places: readonly NotePlace[],
  held: NotePlace | undefined,
): number {
  let keeper = 0;
  let best = 0;
  places.forEach((at, i) => {
    if (!held || at.trackId !== held.trackId || at.clipId !== held.clipId) {
      return;
    }
    const same =
      at.event.startTick === held.event.startTick &&
      at.event.note === held.event.note;
    const score = same ? 2 : 1;
    if (score > best) {
      best = score;
      keeper = i;
    }
  });
  return keeper;
}

/**
 * `tracks`, read from the doc, with every note id whole and unique. Nothing
 * is minted: the result follows from the doc and from the tracks the store
 * held before (`prev`), so every peer that has seen the same edits settles on
 * the same ids, and nothing is written back to the doc. The usual case, a doc
 * whose ids are whole already, is one scan that allocates nothing.
 *
 * A note can come with no id, or with one another note has too: an older
 * peer copies a clip, or pastes notes, along with their `_cid`s. A repeated
 * id stays with the note that held it here (keeperOf), so the copy gets new
 * ids and the original keeps its own, as with a copy made here (addMidiClip
 * in tracksSlice), wherever the copy lands. A repeat this store never held
 * (a joiner's first read) stays with the first note in track → clip → note
 * order. ensureProjectNoteIds then gives each note left without an id one
 * derived from where it sits.
 */
function settleNoteIds(tracks: Track[], prev: readonly Track[]): Track[] {
  const settled = ensureProjectNoteIds(tracks);
  if (settled === tracks) return tracks;

  const seen = new Set<string>();
  const repeated = new Set<string>();
  forEachNote(tracks, ({ id }) => {
    if (!isNoteId(id)) return;
    if (seen.has(id)) repeated.add(id);
    else seen.add(id);
  });
  // Only notes without an id: ensureProjectNoteIds has settled those.
  if (repeated.size === 0) return settled;

  const held = new Map<string, NotePlace>();
  forEachNote(prev, (event, clip, track) => {
    const { id } = event;
    if (id === undefined || !repeated.has(id) || held.has(id)) return;
    held.set(id, { trackId: track.id, clipId: clip.id, event });
  });
  const places = new Map<string, NotePlace[]>();
  forEachNote(tracks, (event, clip, track) => {
    const { id } = event;
    if (id === undefined || !repeated.has(id)) return;
    const at = { trackId: track.id, clipId: clip.id, event };
    const list = places.get(id);
    if (list) list.push(at);
    else places.set(id, [at]);
  });

  // Every note but the keeper gives the id up.
  const givesUp = new Set<MidiNoteEvent>();
  for (const [id, list] of places) {
    const keeper = keeperOf(list, held.get(id));
    list.forEach((at, i) => {
      if (i !== keeper) givesUp.add(at.event);
    });
  }
  const withoutId = (event: MidiNoteEvent): MidiNoteEvent => {
    const copy = { ...event };
    delete copy.id;
    return copy;
  };
  return ensureProjectNoteIds(
    tracks.map((track) => ({
      ...track,
      midiClips: track.midiClips.map((clip) => ({
        ...clip,
        events: clip.events.map((event) =>
          givesUp.has(event) ? withoutId(event) : event,
        ),
      })),
    })),
  );
}

/**
 * The doc's tracks as the store should hold them: this user's own state
 * carried over by track id (withLocalTrackState) and the note ids settled
 * (settleNoteIds), both against `prev`, the tracks the store holds now.
 */
function tracksFromDoc(doc: Y.Doc, prev: readonly Track[]): Track[] {
  const prevById = new Map(prev.map((t) => [t.id, t]));
  const tracks = getYTracks(doc)
    .toArray()
    .map((ym) => {
      const t = yMapToTrack(ym as Y.Map<unknown>);
      return withLocalTrackState(t, prevById.get(t.id));
    });
  return settleNoteIds(tracks, prev);
}

/** The origin of chord-id repairs: not ORIGIN_LOCAL, so undo skips them. */
const ORIGIN_CHORD_ID_REPAIR = 'chord-id-repair';

/**
 * Give every chord region in the doc an id of its own. Pages used to mint
 * chord ids from a counter that restarted on every load and every peer, so a
 * room can hold two regions with one id, and an edit by id then lands on the
 * wrong chord. The repair is written to the doc, not just this store, so
 * every peer converges on the same ids.
 */
function repairChordRegionIds(doc: Y.Doc): void {
  const seen = new Set<string>();
  const repeats: Y.Map<unknown>[] = [];
  for (const ym of getYChordRegions(doc).toArray()) {
    const id = ym.get('id');
    if (typeof id === 'string' && id && !seen.has(id)) seen.add(id);
    else repeats.push(ym);
  }
  if (repeats.length === 0) return;
  doc.transact(() => {
    for (const ym of repeats) ym.set('id', crypto.randomUUID());
  }, ORIGIN_CHORD_ID_REPAIR);
}

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
    // Per-user-local fields: yMapToTrack returns defaults, so the local
    // user's current values carry forward by track id rather than a remote
    // track update clobbering them. Notes come back with their ids (`_cid`),
    // settled against the store's notes (tracksFromDoc).
    const tracks = tracksFromDoc(doc, getState().tracks);
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
  // The doc also holds the eight retired mastering macros (style, eq,
  // dynamics, loudness, stereoField, amount, presence, deEsser) for older
  // peers. The store has no place for them: they fall through the switch.
  const yMastering = getYMastering(doc);
  const onMastering = (events: Y.YEvent<any>[], tx: Y.Transaction) => {
    if (tx.origin === ORIGIN_LOCAL || isSuppressed()) return;
    const patch: Partial<AllSlices> = {};
    for (const event of events) {
      if (event instanceof Y.YMapEvent) {
        for (const key of event.keysChanged) {
          const value = yMastering.get(key);
          switch (key) {
            case 'bypass':
              (patch as Record<string, unknown>).masteringBypass = value;
              break;
            case 'fxChain':
              (patch as Record<string, unknown>).masteringFxChain = JSON.parse(
                value as string,
              );
              break;
            case 'effects':
              // Merge over defaults so an older peer's mastering doc missing a
              // newer effect slot (e.g. multiband) still yields a complete
              // TrackEffectState — else EffectChain.update crashes on it.
              (patch as Record<string, unknown>).masteringEffects = {
                ...structuredClone(DEFAULT_EFFECTS),
                ...JSON.parse(value as string),
              };
              break;
            case 'masterVolume':
              (patch as Record<string, unknown>).masterVolume = value;
              break;
            case 'masterAutomation':
              (patch as Record<string, unknown>).masterAutomation = JSON.parse(
                value as string,
              );
              break;
            case 'returns':
              (patch as Record<string, unknown>).returns = restoreReturns(
                JSON.parse(value as string),
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
 * Per-user-local track fields (mute/solo/recordArmed/monitoring and the input
 * routing) are preserved from the current store rather than reset to the doc's
 * defaults, notes sharing an id are settled as the observer settles them
 * (tracksFromDoc), and chord regions sharing an id are given ids of their own.
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

  // ── Tracks (preserve local per-user fields by id; settle note ids) ──
  patch.tracks = tracksFromDoc(doc, getState().tracks);

  // ── Chord regions ──
  repairChordRegionIds(doc);
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
  // Only these keys reach the store: the retired macros the doc keeps for
  // older peers are left where they are (see the observer above).
  const yMastering = getYMastering(doc);
  const masteringMap: Record<string, [string, boolean]> = {
    bypass: ['masteringBypass', false],
    fxChain: ['masteringFxChain', true],
    effects: ['masteringEffects', true],
    masterVolume: ['masterVolume', false],
    masterAutomation: ['masterAutomation', true],
    returns: ['returns', true],
  };
  for (const [docKey, [storeKey, isJson]] of Object.entries(masteringMap)) {
    if (!yMastering.has(docKey)) continue;
    const value = yMastering.get(docKey);
    const parsed = isJson ? JSON.parse(value as string) : value;
    // Backfill effect slots a cross-version peer may omit (see observer above).
    if (storeKey === 'masteringEffects') {
      patch[storeKey] = {
        ...structuredClone(DEFAULT_EFFECTS),
        ...(parsed as object),
      };
    } else if (storeKey === 'returns') {
      patch[storeKey] = restoreReturns(parsed as never);
    } else {
      patch[storeKey] = parsed;
    }
  }

  // ── Lead sheet ──
  const yLeadSheet = getYLeadSheet(doc);
  const leadSheetMap: Record<string, [string, boolean]> = {
    sections: ['leadSheetSections', true],
    repeats: ['leadSheetRepeats', true],
    chordFormat: ['leadSheetChordFormat', false],
    showRepeats: ['leadSheetShowRepeats', false],
    scoreChordTracks: ['scoreChordTracks', true],
    scoreChordHidden: ['scoreChordHidden', true],
    scoreArticulations: ['scoreArticulations', true],
    scoreSlurs: ['scoreSlurs', true],
    scoreSlashNotes: ['scoreSlashNotes', true],
  };
  for (const [docKey, [storeKey, isJson]] of Object.entries(leadSheetMap)) {
    if (!yLeadSheet.has(docKey)) continue;
    const value = yLeadSheet.get(docKey);
    patch[storeKey] = isJson ? JSON.parse(value as string) : value;
  }

  setState(patch as Partial<AllSlices>);
}
