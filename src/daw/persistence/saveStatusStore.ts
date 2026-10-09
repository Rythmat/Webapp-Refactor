import { create, type StoreApi, type UseBoundStore } from 'zustand';
import { useStore, type AllSlices, type Track } from '@/daw/store';
import { genreStrum } from '@/daw/store/genreSettings';
import {
  AUDIO_CLIP_FIELDS,
  CC_EVENT_FIELDS,
  CHORD_REGION_FIELDS,
  DOC_CONTENT_KEYS,
  DOC_KEYS,
  MARKER_FIELDS,
  MIDI_CLIP_FIELDS,
  NOTE_EVENT_FIELDS,
  RETURN_BUS_FIELDS,
  STORE_FIELDS,
  TRACK_DOC_FIELDS,
  TRACK_FIELDS,
  TRACK_PER_USER_FIELDS,
  fieldDefault,
  type FieldSpec,
  type StoreDataKey,
} from './projectDocument/fields';

// ── Save status: is the project as it was opened or last saved? ────────────
//
// Two counters and a fingerprint answer it.
//
// documentVersion moves on every store write that touches the project
// document (the registry's doc keys, the cloud link among them, and each
// track's doc fields) and on every Oracle patch edit. draftVersion moves with
// it, and also when a track's per-user fields change (arm, monitor, inputs):
// the draft keeps those for this person, but they are not the project.
// Checking a write costs a few microseconds of reference compares, so it runs
// on every store write. Both counters are triggers, not the truth: the save
// chip checks again when documentVersion moves, and the autosave schedules a
// draft write when draftVersion moves (decision D8). View keys move neither:
// the playhead and the scroll change many times a second, so the autosave
// writes them with its next write or on the page-hide flush. A rewrite with
// equal content (a chain a panel writes back, an equal chord lane) moves the
// counters too, and an undo moves them on rather than back.
//
// The truth is the fingerprint: the project's content as canonical JSON,
// built from the registry. The project is unsaved when documentVersion has
// moved since the baseline and the fingerprint differs from the baseline's,
// so undoing back to the saved state reads as saved again. A fingerprint
// costs 0.1–1 ms at 4× CPU, so isDocumentDirty and hasWorkToKeep run at a
// decision (a link, a save), on idle or on a trailing debounce: never once
// per counter move, and never inside a zustand selector. Between moves they
// reuse the last fingerprint, so a check during playback costs nothing.
//
// The baseline is the document as a load or a save left it
// (markDocumentBaseline). Every load, reset and seed marks it, and so does
// every save. savedComplete says whether that copy is whole somewhere else.
// It is false for a restored draft (the only copy), after a legacy cloud save
// that left out what today's cloud can't hold (cloudSaveGaps), and from the
// moment the session lets go of its cloud copy (File ▸ Delete; Save As before
// its save), so such a session still counts as work to keep. savedInPart
// tells the second case apart: the cloud holds all of the project but those
// gaps, so kept work that is only that gives way first.
//
// Arming, monitoring and inputs, the playhead, zoom, selection and every
// other view, pref or session key never make the project unsaved: none of
// them is the project.
//
// This module reads only the store and the registry (and a genre's Prism
// settings, which the store's own slices share). The codec imports it to
// mark baselines, and Song pages load the codec, so it never imports the
// codec or the synth store: the Oracle patches reach it through
// setSynthPatchReader, which synthTrackState registers. It reads the store
// as it loads, so nothing the store loads may import it (a slice, fields.ts,
// trackDefaults.ts); the loaders and the saves mark the baselines.

/** Where the project stands against its baseline. */
export interface SaveStatus {
  /**
   * Moves on every store write that touches the document, the cloud link
   * included, and every Oracle patch edit. A trigger, not the truth: see
   * isDocumentDirty.
   */
  documentVersion: number;
  /**
   * Moves with documentVersion, and when a track's per-user fields change
   * (arm, monitor, inputs): every write the draft has to take. The
   * autosave's trigger (decision D8).
   */
  draftVersion: number;
  /** documentVersion when the baseline was marked. */
  baselineVersion: number;
  /**
   * The document's fingerprint at the baseline; null until the first one,
   * when the empty document stands in for it.
   */
  baselineFingerprint: string | null;
  /**
   * Whether the baseline is a complete copy kept somewhere else: a project
   * opened from where it can be opened again, or a save that holds all of it.
   * False for a restored draft or a collab room (the only copy), after a
   * cloud save that left content out (cloudSaveGaps), and once the session
   * lets go of its cloud copy, until the next save or load.
   */
  savedComplete: boolean;
  /**
   * The baseline is a cloud save that left content out (cloudSaveGaps): the
   * cloud holds the rest of the project, and savedComplete is false for that
   * alone. Cleared by the next baseline, and once the session lets go of that
   * cloud copy. (1.3's localSession let a session kept only for those gaps
   * give way to other kept work first; 1.4's drafts keep it as work.)
   */
  savedInPart: boolean;
}

const INITIAL_STATUS: Readonly<SaveStatus> = Object.freeze({
  documentVersion: 0,
  draftVersion: 0,
  baselineVersion: 0,
  baselineFingerprint: null,
  savedComplete: true,
  savedInPart: false,
});

// ── One save status per store ──────────────────────────────────────────────
//
// The observer and the status are kept on the store itself, under a key
// every copy of this module shares. A hot update (dev only) loads a second
// copy while the store lives on: the new copy carries on from the old copy's
// status and swaps the old copy's observer for its own, so the open project
// neither reads as unsaved nor has a write counted twice.

const SHARED_KEY = Symbol.for('musicAtlas.daw.saveStatus');

interface Shared {
  /** Detaches the observer counting the store's writes. */
  detach?: () => void;
  /** The status that observer counts into. */
  status?: StoreApi<SaveStatus>;
}

type SharedStore = { [SHARED_KEY]?: Shared };

/**
 * The record on the store; undefined while the store hasn't finished loading,
 * which only happens if something the store loads imports this module.
 */
function shared(): Shared | undefined {
  let store: SharedStore | undefined;
  try {
    store = useStore as unknown as SharedStore | undefined;
  } catch (err) {
    // The store's binding, read before its module has run.
    if (!(err instanceof ReferenceError)) throw err;
  }
  if (store === undefined) return undefined;
  return (store[SHARED_KEY] ??= {});
}

export const useSaveStatusStore: UseBoundStore<StoreApi<SaveStatus>> =
  create<SaveStatus>()(() => ({
    ...INITIAL_STATUS,
    ...shared()?.status?.getState(),
  }));

// ── The triggers ───────────────────────────────────────────────────────────

/**
 * The top-level keys a write is checked against: the registry's doc keys,
 * the cloud link among them (a new link has to reach the draft), with the
 * tracks gone through field by field.
 */
const WATCHED_KEYS = DOC_KEYS.filter((key) => key !== 'tracks');

/** Where the fingerprint puts a track's Oracle patch (the draft's name). */
const ORACLE_PATCH_KEY = 'oracleSynth';

/**
 * Whether any of `fields` differs, by reference, between two track lists. A
 * track added, removed or moved counts as a change. Updates are immutable, so
 * an unchanged track is the same object and is skipped whole.
 */
export function trackFieldsChanged(
  next: readonly Track[],
  prev: readonly Track[],
  fields: readonly (keyof Track)[],
): boolean {
  if (next === prev) return false;
  if (next.length !== prev.length) return true;
  for (let i = 0; i < next.length; i++) {
    const track = next[i];
    const before = prev[i];
    if (track === before) continue;
    if (track.id !== before.id) return true;
    for (let f = 0; f < fields.length; f++) {
      if (track[fields[f]] !== before[fields[f]]) return true;
    }
  }
  return false;
}

/**
 * Whether a store write touched the document: a doc key's reference changed
 * (the cloud link included), or a track doc field's. Per-user track fields
 * (arm, monitor, inputs) and every view, pref and session key are left out.
 */
export function changesDocument(state: AllSlices, prev: AllSlices): boolean {
  if (trackFieldsChanged(state.tracks, prev.tracks, TRACK_DOC_FIELDS)) {
    return true;
  }
  for (let i = 0; i < WATCHED_KEYS.length; i++) {
    const key = WATCHED_KEYS[i];
    if (state[key] !== prev[key]) return true;
  }
  return false;
}

/**
 * An Oracle patch changed. The patches live in the synth store, which this
 * module doesn't load, so the editor's synth-store subscription reports their
 * edits here. A panel restoring a track's patch reports one too; the
 * fingerprint then finds nothing changed.
 */
export function noteSynthPatchChange(): void {
  useSaveStatusStore.setState((status) => ({
    documentVersion: status.documentVersion + 1,
    draftVersion: status.draftVersion + 1,
  }));
}

function observeStoreWrite(state: AllSlices, prev: AllSlices): void {
  const document = changesDocument(state, prev);
  if (
    !document &&
    !trackFieldsChanged(state.tracks, prev.tracks, TRACK_PER_USER_FIELDS)
  ) {
    return;
  }
  // The session let go of its cloud copy: File ▸ Delete, or Save As and
  // Save & Leave before their save. Until a save or a load marks a baseline
  // again, this session is the only copy, whatever the baseline said.
  const unlinked =
    prev.projectId !== null && state.projectId !== prev.projectId;
  useSaveStatusStore.setState((status) => ({
    documentVersion: status.documentVersion + (document ? 1 : 0),
    draftVersion: status.draftVersion + 1,
    savedComplete: status.savedComplete && !unlinked,
    savedInPart: status.savedInPart && !unlinked,
  }));
}

let detachObserver: (() => void) | null = null;

/**
 * Start counting writes: one subscription on the store, for the life of the
 * page. Attached when this module loads and by every markDocumentBaseline;
 * attaching again changes nothing. The returned function detaches it, for
 * tests only: kept-work checks run while no editor is mounted (a Song page
 * opening a song), so the editor must never detach it on unmount.
 */
export function attachDocumentObserver(): () => void {
  const record = shared();
  if (record === undefined) {
    throw new Error('[save status] the store has not finished loading');
  }
  if (detachObserver !== null && record.detach === detachObserver) {
    return detachObserver;
  }
  record.detach?.();
  const unsubscribe = useStore.subscribe(observeStoreWrite);
  const detach = (): void => {
    unsubscribe();
    if (record.detach === detach) delete record.detach;
    if (detachObserver === detach) detachObserver = null;
  };
  record.detach = detach;
  record.status = useSaveStatusStore;
  detachObserver = detach;
  return detach;
}

/** Whether this copy's observer is the one counting the store's writes. */
function observing(): boolean {
  return detachObserver !== null && shared()?.detach === detachObserver;
}

// ── The fingerprint ────────────────────────────────────────────────────────
//
// Canonical JSON of the document, written by hand into one string: no
// intermediate objects, and the same text for the same content whatever
// order its objects' keys were made in. Where the registry describes an
// entry (a track, clip, note, CC event, audio clip, chord region, marker,
// return bus), exactly its registry fields are written, in sorted order;
// anything the registry doesn't name isn't saved, so it isn't the document.
// Below that (effects, chains, automation, a chord's identity), every key is
// written, sorted. As in JSON, a missing key and an undefined one read the
// same. A note's fields are a fixed list, so a 500-note project costs no
// per-note sort.
//
// It is written afresh each time rather than kept per object: it is the
// check on the reference-based trigger, so it never trusts a reference.

/** How the fingerprint writes one kind of entry. */
interface Shape {
  /** The entry's registry fields, sorted. */
  readonly keys: readonly string[];
  /** The same keys, quoted for JSON once. */
  readonly quoted: readonly string[];
  /** For a key holding a list of entries: their shape. */
  readonly lists: readonly (Shape | undefined)[];
}

function shapeOf(
  fields: readonly string[],
  lists: Readonly<Record<string, Shape>> = {},
): Shape {
  const keys = [...fields].sort();
  return Object.freeze({
    keys,
    quoted: keys.map((key) => JSON.stringify(key)),
    lists: keys.map((key) => lists[key]),
  });
}

const NOTE_SHAPE = shapeOf(Object.keys(NOTE_EVENT_FIELDS));
const CC_SHAPE = shapeOf(Object.keys(CC_EVENT_FIELDS));
const MIDI_CLIP_SHAPE = shapeOf(Object.keys(MIDI_CLIP_FIELDS), {
  events: NOTE_SHAPE,
  ccEvents: CC_SHAPE,
});
const AUDIO_CLIP_SHAPE = shapeOf(Object.keys(AUDIO_CLIP_FIELDS));
const TRACK_SHAPE = shapeOf(TRACK_DOC_FIELDS, {
  midiClips: MIDI_CLIP_SHAPE,
  audioClips: AUDIO_CLIP_SHAPE,
});

/** The top-level keys holding lists of registry entries, but tracks. */
const TOP_LIST_SHAPES: Readonly<Record<string, Shape>> = {
  chordRegions: shapeOf(Object.keys(CHORD_REGION_FIELDS)),
  markers: shapeOf(Object.keys(MARKER_FIELDS)),
  returns: shapeOf(Object.keys(RETURN_BUS_FIELDS)),
};

const FINGERPRINT_SHAPE = shapeOf(DOC_CONTENT_KEYS, TOP_LIST_SHAPES);
const TRACKS_INDEX = FINGERPRINT_SHAPE.keys.indexOf('tracks');
const QUOTED_PATCH_KEY = JSON.stringify(ORACLE_PATCH_KEY);

/** The fingerprint being written. */
let out = '';

/** Left out of an object, as JSON.stringify leaves them out. */
const isOmitted = (value: unknown): boolean =>
  value === undefined ||
  typeof value === 'function' ||
  typeof value === 'symbol';

// The keys of objects the registry doesn't describe (effect slots, pedal
// params, automation lanes), quoted once. A project has a few hundred
// distinct ones; the cap only stops a pathological project growing it.
const quotedKeys = new Map<string, string>();
const MAX_QUOTED_KEYS = 10_000;

function quote(key: string): string {
  let quoted = quotedKeys.get(key);
  if (quoted === undefined) {
    if (quotedKeys.size >= MAX_QUOTED_KEYS) quotedKeys.clear();
    quoted = JSON.stringify(key);
    quotedKeys.set(key, quoted);
  }
  return quoted;
}

function writeValue(value: unknown): void {
  switch (typeof value) {
    case 'string':
      out += JSON.stringify(value);
      return;
    case 'number':
      out += Number.isFinite(value) ? String(value) : 'null';
      return;
    case 'boolean':
      out += value ? 'true' : 'false';
      return;
    case 'bigint':
      out += String(value);
      return;
    case 'object':
      if (value === null) {
        out += 'null';
      } else if (Array.isArray(value)) {
        out += '[';
        for (let i = 0; i < value.length; i++) {
          if (i > 0) out += ',';
          writeValue(value[i]);
        }
        out += ']';
      } else {
        writeObject(value as Record<string, unknown>);
      }
      return;
    default:
      // undefined, a function or a symbol in a list: JSON writes null.
      out += 'null';
  }
}

/** An object the registry doesn't describe: every key, sorted. */
function writeObject(record: Record<string, unknown>): void {
  const keys = Object.keys(record).sort();
  out += '{';
  let first = true;
  for (const key of keys) {
    const value = record[key];
    if (isOmitted(value)) continue;
    out += first ? quote(key) : ',' + quote(key);
    out += ':';
    first = false;
    writeValue(value);
  }
  out += '}';
}

/**
 * An entry's registry fields as `"key":value` pairs, without the braces.
 * Returns whether it wrote any.
 */
function writeFields(entry: object, shape: Shape): boolean {
  const record = entry as Record<string, unknown>;
  let first = true;
  for (let i = 0; i < shape.keys.length; i++) {
    const value = record[shape.keys[i]];
    if (isOmitted(value)) continue;
    out += first ? shape.quoted[i] : ',' + shape.quoted[i];
    out += ':';
    first = false;
    const list = shape.lists[i];
    if (list !== undefined && Array.isArray(value)) writeList(value, list);
    else writeValue(value);
  }
  return !first;
}

const isEntry = (value: unknown): value is object =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

function writeList(list: readonly unknown[], shape: Shape): void {
  out += '[';
  for (let i = 0; i < list.length; i++) {
    if (i > 0) out += ',';
    const item = list[i];
    if (isEntry(item)) {
      out += '{';
      writeFields(item, shape);
      out += '}';
    } else {
      writeValue(item);
    }
  }
  out += ']';
}

/**
 * The tracks, each with its Oracle patch when it is an Oracle track, as the
 * codec saves it. The patch goes after the track's fields: a fixed place, so
 * the text stays the same for the same content.
 */
function writeTracks(
  tracks: readonly Track[],
  synthPatches: Readonly<Record<string, unknown>>,
): void {
  out += '[';
  for (let i = 0; i < tracks.length; i++) {
    if (i > 0) out += ',';
    const track = tracks[i];
    if (!isEntry(track)) {
      writeValue(track);
      continue;
    }
    out += '{';
    const wrote = writeFields(track, TRACK_SHAPE);
    const patch =
      track.instrument === 'oracle-synth' ? synthPatches[track.id] : undefined;
    if (!isOmitted(patch)) {
      out += wrote ? ',' + QUOTED_PATCH_KEY : QUOTED_PATCH_KEY;
      out += ':';
      writeValue(patch);
    }
    out += '}';
  }
  out += ']';
}

/** `value` as canonical JSON; undefined when JSON would leave it out. */
function canonical(value: unknown): string | undefined {
  if (isOmitted(value)) return undefined;
  const outer = out;
  out = '';
  try {
    writeValue(value);
    return out;
  } finally {
    out = outer;
  }
}

// ── The Oracle patches ─────────────────────────────────────────────────────

/**
 * Each Oracle track's patch, by track id, as a save would write it. Given
 * the tracks of the session; may leave out any track without a patch.
 */
export type SynthPatchReader = (
  tracks: readonly Track[],
) => Readonly<Record<string, unknown>>;

let synthPatchReader: SynthPatchReader | null = null;

/**
 * How the fingerprint reads the Oracle patches, which live in the synth
 * store and its per-track cache (synthTrackState registers this when it
 * loads). Without a reader the fingerprint holds no patches. Returns a
 * function that unregisters it.
 */
export function setSynthPatchReader(
  reader: SynthPatchReader | null,
): () => void {
  synthPatchReader = reader;
  return () => {
    if (synthPatchReader === reader) synthPatchReader = null;
  };
}

function readSynthPatches(
  tracks: readonly Track[],
): Readonly<Record<string, unknown>> {
  if (synthPatchReader === null) return {};
  try {
    return synthPatchReader(tracks);
  } catch (err) {
    // Without the patches the project reads as changed, which keeps work
    // rather than losing it.
    console.error('[save status] reading the Oracle patches failed:', err);
    return {};
  }
}

// ── Reading the status ─────────────────────────────────────────────────────

/**
 * The project document as one deterministic string: the registry's content
 * keys, each track's doc fields and each Oracle track's patch, with every key
 * sorted. The playhead, per-user track fields, view, prefs and session state
 * are not in it, and nor is the cloud link (projectId). `synthPatches` is
 * each Oracle track's patch by track id, read from the live session when
 * left out. About 0.1–0.4 ms at 1× CPU for a typical project, 0.3–1 ms at
 * 4×: see the header for when to call it.
 */
export function documentFingerprint(
  state: AllSlices = useStore.getState(),
  synthPatches: Readonly<Record<string, unknown>> = readSynthPatches(
    state.tracks,
  ),
): string {
  const outer = out;
  out = '{';
  try {
    const { keys, quoted, lists } = FINGERPRINT_SHAPE;
    let first = true;
    for (let i = 0; i < keys.length; i++) {
      const value = state[keys[i] as StoreDataKey];
      if (isOmitted(value)) continue;
      out += first ? quoted[i] : ',' + quoted[i];
      out += ':';
      first = false;
      const list = lists[i];
      if (i === TRACKS_INDEX && Array.isArray(value)) {
        writeTracks(state.tracks, synthPatches);
      } else if (list !== undefined && Array.isArray(value)) {
        writeList(value, list);
      } else {
        writeValue(value);
      }
    }
    out += '}';
    return out;
  } finally {
    out = outer;
  }
}

let emptyFingerprint: string | null = null;

/** A new, empty project's fingerprint: each content key at its default. */
function emptyDocumentFingerprint(): string {
  if (emptyFingerprint === null) {
    const empty = Object.fromEntries(
      DOC_CONTENT_KEYS.map((key) => [key, fieldDefault(key)]),
    ) as unknown as AllSlices;
    emptyFingerprint = documentFingerprint(empty, {});
  }
  return emptyFingerprint;
}

// The live document's fingerprint, kept until documentVersion or the patch
// reader changes. The content changes only with the version: the observer
// moves it on every write to a key or track field the fingerprint reads, and
// noteSynthPatchChange on every patch edit. So a check between moves (the
// chip, the autosave and a kept-work check after the same edit, or any check
// while the playhead writes ~30 times a second) pays once. It is trusted only
// while this copy's observer is counting. A baseline and a save snapshot
// always write it afresh: they are rare, and a load may have seeded the
// patch cache without a write.
let lastFingerprint: {
  version: number;
  reader: SynthPatchReader | null;
  fingerprint: string;
} | null = null;

/** The live document's fingerprint; `fresh` skips the one kept. */
function liveFingerprint(fresh = false): string {
  const version = useSaveStatusStore.getState().documentVersion;
  const kept = lastFingerprint;
  if (
    !fresh &&
    kept !== null &&
    kept.version === version &&
    kept.reader === synthPatchReader &&
    observing()
  ) {
    return kept.fingerprint;
  }
  const fingerprint = documentFingerprint(useStore.getState());
  lastFingerprint = { version, reader: synthPatchReader, fingerprint };
  return fingerprint;
}

/**
 * The live document's fingerprint, kept per documentVersion: what the chip
 * and the draft snapshot compare, without re-serializing between edits.
 */
export function liveDocumentFingerprint(): string {
  return liveFingerprint(false);
}

/** The live document at one moment: what a save sends, captured before it. */
export interface DocumentSnapshot {
  readonly version: number;
  readonly fingerprint: string;
  /** The cloud link when it was captured: the copy the save writes. */
  readonly projectId: string | null;
}

/**
 * The live document as it stands, for a save to capture before its request
 * and pass to markDocumentBaseline when the request succeeds. An edit made
 * while the request is in flight isn't in the saved copy, so it must still
 * read as unsaved afterwards.
 */
export function documentSnapshot(
  synthPatches?: Readonly<Record<string, unknown>>,
): DocumentSnapshot {
  const state = useStore.getState();
  return {
    version: useSaveStatusStore.getState().documentVersion,
    fingerprint:
      synthPatches === undefined
        ? liveFingerprint(true)
        : documentFingerprint(state, synthPatches),
    projectId: state.projectId,
  };
}

export interface BaselineOptions {
  /**
   * Whether the baseline is a complete copy kept somewhere else (see
   * SaveStatus.savedComplete). True when left out: a project opened from
   * where it can be opened again, or a save that holds all of it.
   */
  savedComplete?: boolean;
  /** The Oracle patches, when the caller has them; read live otherwise. */
  synthPatches?: Readonly<Record<string, unknown>>;
  /**
   * What a save sent, captured before its request (documentSnapshot). It is
   * ignored when the session moved on while the request was in flight: a
   * newer baseline was marked (another project opened, or a later save
   * finished first), or the session let go of the copy it wrote (File ▸
   * Delete, a Save As). A save's baseline that isn't complete is a cloud
   * copy in part (SaveStatus.savedInPart).
   */
  snapshot?: DocumentSnapshot;
}

/**
 * Mark the document as it stands (or as `snapshot` captured it) as the
 * baseline: after every load, reset and seed, including a seed that arrives
 * later (the demo drums, the practice groove), and after every save.
 */
export function markDocumentBaseline(opts: BaselineOptions = {}): void {
  attachDocumentObserver();
  const status = useSaveStatusStore.getState();
  const { snapshot, synthPatches } = opts;
  if (snapshot !== undefined) {
    if (snapshot.version < status.baselineVersion) return;
    if (
      snapshot.projectId !== null &&
      snapshot.projectId !== useStore.getState().projectId
    ) {
      return;
    }
  }
  let version: number;
  let fingerprint: string;
  if (snapshot !== undefined) {
    ({ version, fingerprint } = snapshot);
  } else if (synthPatches !== undefined) {
    version = status.documentVersion;
    fingerprint = documentFingerprint(useStore.getState(), synthPatches);
  } else {
    version = status.documentVersion;
    fingerprint = liveFingerprint(true);
  }
  const savedComplete = opts.savedComplete ?? true;
  useSaveStatusStore.setState({
    baselineVersion: version,
    baselineFingerprint: fingerprint,
    savedComplete,
    savedInPart: snapshot !== undefined && !savedComplete,
  });
}

/**
 * Whether the project differs from its baseline: the version moved since,
 * and the content did too. Equal-content rewrites and an undo back to the
 * baseline read as clean.
 */
export function isDocumentDirty(): boolean {
  const status = useSaveStatusStore.getState();
  if (status.documentVersion <= status.baselineVersion) return false;
  return (
    liveFingerprint() !==
    (status.baselineFingerprint ?? emptyDocumentFingerprint())
  );
}

/**
 * Content keys that make nothing on their own in a project without tracks,
 * and that builds before 1.3 wrote into blank projects by themselves: the
 * Prism generator's rhythm, genre and swing (their reset wrote the rhythm
 * 'Quarters' where the registry's default is 'Whole Notes', decision D6) and
 * the composer (their Lead Sheet filled in the signed-in name). A blank draft
 * those builds saved is still an empty project.
 */
const NOT_WORK_WITHOUT_TRACKS: readonly StoreDataKey[] = [
  'rhythmName',
  'genre',
  'swing',
  'composerName',
];

/**
 * Whether `state` is an empty project: no track, and every content key at
 * its default but the few that make nothing without tracks
 * (NOT_WORK_WITHOUT_TRACKS). A chord lane, a progression, a marker, a tempo
 * or a name is a project.
 */
export function isDocumentEmpty(
  state: AllSlices = useStore.getState(),
): boolean {
  if (state.tracks.length > 0) return false;
  const content: Partial<Record<StoreDataKey, unknown>> = {};
  for (const key of DOC_CONTENT_KEYS) content[key] = state[key];
  for (const key of NOT_WORK_WITHOUT_TRACKS) content[key] = fieldDefault(key);
  return (
    documentFingerprint(content as AllSlices, {}) === emptyDocumentFingerprint()
  );
}

/**
 * Whether replacing the live session now would lose work: it holds a
 * project, and that project is either changed since its baseline or kept
 * nowhere else whole (savedComplete false). An untouched template, demo or
 * song, a project as last saved in full, and an empty one have nothing to
 * keep. Arming a track or turning the metronome on never makes work.
 *
 * It judges the live session only. On a fresh page, before anything loads,
 * the store is empty and this is false, while the stored draft may be the
 * only copy of the last session: the caller judges that draft itself (the
 * draft store's draftHasWork).
 */
export function hasWorkToKeep(): boolean {
  const status = useSaveStatusStore.getState();
  const moved = status.documentVersion > status.baselineVersion;
  if (status.savedComplete && !moved) return false;
  if (isDocumentEmpty()) return false;
  return !status.savedComplete || isDocumentDirty();
}

// ── What a cloud save leaves out ───────────────────────────────────────────

/** Which cloud format a save writes: today's payload, or 1.5's document. */
export type CloudSaveMode = 'legacy' | 'document';

const canonicalDefaults = new Map<StoreDataKey, string | undefined>();

function canonicalDefault(key: StoreDataKey): string | undefined {
  if (!canonicalDefaults.has(key)) {
    canonicalDefaults.set(key, canonical(fieldDefault(key)));
  }
  return canonicalDefaults.get(key);
}

/** What a gap check needs of a nested field's spec. */
type NestedSpecs = Readonly<
  Record<string, Pick<FieldSpec<unknown>, 'cloud' | 'default'>>
>;

/** The fields of a nested spec that only the 1.5 document field carries. */
const documentOnly = (
  specs: NestedSpecs,
  except: readonly string[] = [],
): string[] =>
  Object.keys(specs).filter(
    (key) => specs[key].cloud === 'document' && !except.includes(key),
  );

/**
 * Content today's payload sends but music-atlas-api isn't confirmed to keep:
 * its StudioProjectInput type has no such field (see each key's reason in
 * fieldReasons.ts). Until the owner confirms the API stores it, a legacy save
 * counts it as left out when it isn't at its default, so the session stays
 * work to keep rather than being dropped by the next link.
 */
const UNCONFIRMED_LEGACY_KEYS: readonly StoreDataKey[] = ['returns'];

/** Top-level content the legacy payload has no (confirmed) place for. */
const LEGACY_GAP_KEYS: readonly StoreDataKey[] = [
  ...new Set([
    ...DOC_CONTENT_KEYS.filter((key) => STORE_FIELDS[key].cloud === 'document'),
    ...UNCONFIRMED_LEGACY_KEYS,
  ]),
];

/**
 * How the Prism generator strums: the payload has no place for it, but the
 * genre it carries sets one. Every project template and every genre picked
 * in Prism writes its genre's strum (genreSettings), so counting that made
 * every saved template project a cloud copy in part, kept again at each
 * later link. A strum that is the genre's own (or the default) isn't the
 * student's, and the legacy check leaves it out; one the student set counts,
 * as the tilt and the filter always do (nothing sets those but the student).
 */
const STRUM_KEYS: readonly StoreDataKey[] = ['strumMode', 'strumAmount'];

/**
 * Whether `state` strums as its genre does, which a genre pick sets
 * (genreStrum: the strum alone, without genreSettings' random rhythm).
 */
function strumsAsItsGenre(state: AllSlices): boolean {
  const strum = genreStrum(state.genre);
  return (
    state.strumMode === strum.strumMode &&
    state.strumAmount === strum.strumAmount
  );
}
const LEGACY_GAP_TRACK_FIELDS = documentOnly(
  Object.fromEntries(TRACK_DOC_FIELDS.map((key) => [key, TRACK_FIELDS[key]])),
);
const LEGACY_GAP_CLIP_FIELDS = documentOnly(MIDI_CLIP_FIELDS);
// A note's id is left out of the payload, but a load derives the same id
// again; marks keyed by it are counted with the marks.
const LEGACY_GAP_NOTE_FIELDS = documentOnly(NOTE_EVENT_FIELDS, ['id']);
const LEGACY_GAP_AUDIO_FIELDS = documentOnly(AUDIO_CLIP_FIELDS);

/**
 * Whether a nested field holds something a cloud copy without it would lose:
 * set, not an empty list, and not its default.
 */
function holdsContent(
  value: unknown,
  spec: Pick<FieldSpec<unknown>, 'default'>,
): boolean {
  if (value === undefined) return false;
  if (Array.isArray(value) && value.length === 0) return false;
  const fallback =
    typeof spec.default === 'function'
      ? (spec.default as () => unknown)()
      : spec.default;
  return canonical(value) !== canonical(fallback);
}

/** Adds `${type}.${key}` to `gaps` for each of `keys` that holds content. */
function addNestedGaps(
  gaps: Set<string>,
  type: string,
  entry: object,
  keys: readonly string[],
  specs: NestedSpecs,
): void {
  const fields = entry as Record<string, unknown>;
  for (const key of keys) {
    if (holdsContent(fields[key], specs[key])) gaps.add(`${type}.${key}`);
  }
}

const isPendingSample = (sample: Track['samplerSample']): boolean =>
  sample !== undefined && !sample.assetId && !sample.sourceUrl;

/**
 * What a cloud save in `mode` would leave out of `state`, by registry name:
 * top-level keys ('mode', 'chordRegions', 'markers', …) and nested fields
 * ('MidiClip.ccEvents'). Empty when the cloud copy would hold the whole
 * project. After a legacy save, `savedComplete` is whether this was empty
 * when the save captured the document (decision D7).
 *
 * In the legacy mode it also names the return buses when they aren't at
 * their default (UNCONFIRMED_LEGACY_KEYS), and leaves out a strum that is
 * the genre's own (STRUM_KEYS). Both modes count media whose bytes
 * never reached the cloud: an audio clip without an asset
 * ('AudioClip.assetId'), which the save leaves out, and a sampler sample
 * neither uploaded nor bundled ('Track.samplerSample').
 */
export function cloudSaveGaps(
  state: AllSlices = useStore.getState(),
  mode: CloudSaveMode = 'legacy',
): string[] {
  const gaps = new Set<string>();
  if (mode === 'legacy') {
    const asItsGenre = strumsAsItsGenre(state);
    for (const key of LEGACY_GAP_KEYS) {
      if (asItsGenre && STRUM_KEYS.includes(key)) continue;
      if (canonical(state[key]) !== canonicalDefault(key)) gaps.add(key);
    }
    // The payload carries the master automation on the first track's
    // settings, so a project without tracks loses it.
    if (
      state.tracks.length === 0 &&
      canonical(state.masterAutomation) !== canonicalDefault('masterAutomation')
    ) {
      gaps.add('masterAutomation');
    }
  }
  for (const track of state.tracks) {
    if (mode === 'legacy') {
      addNestedGaps(
        gaps,
        'Track',
        track,
        LEGACY_GAP_TRACK_FIELDS,
        TRACK_FIELDS,
      );
      for (const clip of track.midiClips) {
        addNestedGaps(
          gaps,
          'MidiClip',
          clip,
          LEGACY_GAP_CLIP_FIELDS,
          MIDI_CLIP_FIELDS,
        );
        if (LEGACY_GAP_NOTE_FIELDS.length === 0) continue;
        for (const note of clip.events) {
          addNestedGaps(
            gaps,
            'MidiNoteEvent',
            note,
            LEGACY_GAP_NOTE_FIELDS,
            NOTE_EVENT_FIELDS,
          );
        }
      }
      for (const clip of track.audioClips) {
        addNestedGaps(
          gaps,
          'AudioClip',
          clip,
          LEGACY_GAP_AUDIO_FIELDS,
          AUDIO_CLIP_FIELDS,
        );
      }
    }
    if (track.audioClips.some((clip) => !clip.assetId)) {
      gaps.add('AudioClip.assetId');
    }
    if (isPendingSample(track.samplerSample)) gaps.add('Track.samplerSample');
  }
  return [...gaps];
}

// ── Lifetime ───────────────────────────────────────────────────────────────

// Count from the moment anything can load a project: the codec imports this
// module, so no load or edit happens before the observer is on. A copy a hot
// update loads takes over here from the copy before it.
if (shared() === undefined) {
  // Loaded while the store itself was loading, which the header rules out:
  // attach once it has finished, rather than fail the page.
  queueMicrotask(() => attachDocumentObserver());
} else {
  attachDocumentObserver();
}
