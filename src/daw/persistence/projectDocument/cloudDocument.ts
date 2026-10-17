import { guessTrackRole } from '@/daw/utils/trackRole';
import { isCloudAudioClipId, planCloudTrackIds } from './cloudIds';
import {
  draftPlaceOf,
  encodeSession,
  SESSION_COMPAT_VERSION,
  SESSION_ENVELOPE_VERSION,
  SESSION_SCHEMA_VERSION,
  type DraftCcColumns,
  type DraftMidiClip,
  type DraftTrack,
  type LocalKey,
  type PlannedTrackIds,
  type ProjectSnapshot,
  type SectionKey,
  type SerializedTrackSettings,
  type StoredSession,
} from './codec';
import { LOCAL_KEYS, STORE_FIELDS } from './fields';

// ── The cloud document (milestone 1.5, owner decision 5) ───────────────────
//
// What a cloud save carries beyond today's payload: everything of the
// project the payload has no place for (the registry's cloud 'document'
// fields: the metre, the loop range, the mode, the chord lane, the Prism
// builder, the Score and Lead Sheet, markers, song sections, mastering,
// clip lengths, controller data, note ids, clip mutes and audio clips'
// names), plus copies of the two the payload carries only in places
// music-atlas-api hasn't confirmed it keeps (the return buses, and the
// Master automation on the first track's settings). Like the draft, it
// writes the Lead Sheet's marks its sections imply in their old place, for
// builds from before 2.13, and reads sections back from them when an older
// document has none (codec.ts).
//
// It is codec v3 (codec.ts) cut down: the same sections, the same keys at
// the same places, written by encodeSession, so it needs no format of its
// own. Its schema is the draft's (SESSION_SCHEMA_VERSION), sent as
// `documentSchema`; a schema bump bumps both. The per-clip parts are keyed by
// clip id (unique in a project) and carry a checksum of the clip's notes as
// the payload sent them, so a part is applied only to the notes it was
// written for. An audio clip's part (milestone 2.12: its name and mute) says
// which row it was written for (its asset, start and length) the same way.
//
// Where it travels (docs/studio-cloud-document-contract.md):
// - the `document` field of a studio project, once music-atlas-api has it
//   (a response that holds the key says so: cloudDocumentSupport.ts);
// - until then, the interim fallback: the first track's settings blob, as
//   `settings.projectDoc` (with `projectDocSchema`). A project without
//   tracks has nowhere to put it, and its save says so.
//
// Opening a project merges the payload's rows and the document into one v3
// draft, and decodes that as a draft is decoded (decodeSession): the rows win
// for everything they carry, the document fills the rest, and every value is
// checked and repaired the same way. When the document is older than the
// rows (an app from before 1.5 saved the project since: its
// `writtenAtRevision` is behind the project's `revision`), the rows also win
// for the copies, and the checksums keep each clip's part off notes that
// changed. A document from a later schema this build can't read is left out.
//
// Pure: no store, no storage, nothing minted but through `mint`.

/** The cloud document's schema: the draft's. */
export const CLOUD_DOCUMENT_SCHEMA = SESSION_SCHEMA_VERSION;

/** The keys the payload carries too, copied into the document. */
const COPIED_KEYS = ['masterAutomation', 'returns'] as const;

/**
 * The store keys the document holds as they are, at their draft places: the
 * registry's cloud 'document' keys and the copies. The Score's note marks
 * go as the draft writes them (notation.marks, by note id), and nothing of
 * the document sits in the tracks.
 */
export const CLOUD_DOCUMENT_KEYS: readonly SectionKey[] = Object.freeze(
  (LOCAL_KEYS as readonly LocalKey[]).filter((key) => {
    const place = draftPlaceOf(key);
    if (place === 'tracks' || place === 'noteMarks') return false;
    return (
      STORE_FIELDS[key].cloud === 'document' ||
      (COPIED_KEYS as readonly string[]).includes(key)
    );
  }) as SectionKey[],
);

/** What the document keeps of one MIDI clip. */
export interface CloudClipPart {
  /** noteChecksum of the clip's notes as the payload sent them. */
  sum: string;
  durationTicks?: number;
  ccEvents?: DraftCcColumns;
  /** Each note's id, in the payload's column order. */
  ids?: string[];
  /** Muted from the clip menu (milestone 2.12). */
  muted?: boolean;
}

/**
 * What the document keeps of one audio clip (milestone 2.12): what its row
 * has no place for. Only a named or muted clip has one.
 */
export interface CloudAudioClipPart {
  /** audioRowKey of the row it was written for. */
  row: string;
  name?: string;
  muted?: boolean;
}

type Section = Record<string, unknown>;

/**
 * The cloud document: codec v3's sections, cut down to the document's keys
 * (CLOUD_DOCUMENT_KEYS), plus the parts of each clip and the tracks' ids.
 */
export interface CloudDocument {
  schema: number;
  /** The oldest schema that may read it (SESSION_COMPAT_VERSION). */
  compat: number;
  /**
   * Each track's id in payload order: the ids a project loads under when the
   * server didn't keep the settings blob that carries them.
   */
  trackIds: string[];
  transport?: Section;
  prism?: Section;
  mixer?: Section;
  notation?: Section;
  clips: Record<string, CloudClipPart>;
  /** By audio clip id; absent while no audio clip is named or muted. */
  audioClips?: Record<string, CloudAudioClipPart>;
  [key: string]: unknown;
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v);

const NOTE_COLUMNS = [
  'notes',
  'velocities',
  'startTickDeltas',
  'durations',
  'channels',
] as const;

/**
 * A short checksum of a clip's five note columns (FNV-1a over their JSON):
 * the same columns always give the same sum, on any device.
 */
export function noteChecksum(events: unknown): string {
  const columns = isRecord(events) ? events : {};
  const text = JSON.stringify(NOTE_COLUMNS.map((name) => columns[name] ?? []));
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `${text.length.toString(36)}-${(hash >>> 0).toString(36)}`;
}

/**
 * Which row an audio clip's part belongs to: its asset, start and length, as
 * the payload carries them. A clip an older app moved, trimmed or swapped
 * no longer matches, and its part is left out rather than put on it.
 */
export function audioRowKey(row: unknown): string {
  const r = isRecord(row) ? row : {};
  return `${String(r.assetId ?? '')}:${String(r.startTick ?? '')}:${String(r.duration ?? '')}`;
}

const noPatches = () => undefined;

// ── Writing ────────────────────────────────────────────────────────────────

/**
 * The cloud document of `project`, from its v3 encoding. Deterministic, as
 * the draft is.
 */
export function encodeCloudDocument(project: ProjectSnapshot): CloudDocument {
  const draft = encodeSession(project, noPatches, 0);
  const data = draft.data as unknown as Record<string, unknown>;
  const doc: CloudDocument = {
    schema: CLOUD_DOCUMENT_SCHEMA,
    compat: SESSION_COMPAT_VERSION,
    trackIds: draft.data.tracks.map((track) => track.id),
    clips: {},
  };
  for (const key of CLOUD_DOCUMENT_KEYS) {
    const place = draftPlaceOf(key);
    if (place === 'data') {
      doc[key] = data[key];
    } else {
      const section = (doc[place] ??= {}) as Section;
      section[key] = (data[place] as Section)[key];
    }
  }
  const notation = data.notation as Section | undefined;
  if (notation?.marks !== undefined)
    (doc.notation ??= {}).marks = notation.marks;
  if (notation?.leadSheetSections !== undefined) {
    (doc.notation ??= {}).leadSheetSections = notation.leadSheetSections;
  }

  for (const track of draft.data.tracks) {
    for (const clip of track.midiClips) {
      const { ids, ...columns } = clip.events;
      const part: CloudClipPart = { sum: noteChecksum(columns) };
      if (clip.durationTicks !== undefined) {
        part.durationTicks = clip.durationTicks;
      }
      if (clip.ccEvents !== undefined) part.ccEvents = clip.ccEvents;
      if (ids !== undefined && ids.length > 0) part.ids = ids;
      if (clip.muted !== undefined) part.muted = clip.muted;
      doc.clips[clip.id] = part;
    }
    for (const clip of track.audioClips) {
      if (clip.name === undefined && clip.muted === undefined) continue;
      const part: CloudAudioClipPart = { row: audioRowKey(clip) };
      if (clip.name !== undefined) part.name = clip.name;
      if (clip.muted !== undefined) part.muted = clip.muted;
      (doc.audioClips ??= {})[clip.id] = part;
    }
  }
  return doc;
}

// ── Finding it in a project ────────────────────────────────────────────────

/** What a cloud project's payload looks like to the reader. */
export interface CloudPayload {
  id: string;
  name?: unknown;
  composerName?: unknown;
  bpm?: unknown;
  prism?: unknown;
  returns?: unknown;
  tracks: ReadonlyArray<{
    name?: unknown;
    type?: unknown;
    instrument?: unknown;
    color?: unknown;
    mute?: unknown;
    solo?: unknown;
    volume?: unknown;
    pan?: unknown;
    activeEffects?: unknown;
    settings?: unknown;
    midiClips?: unknown;
    audioClips?: unknown;
  }>;
  document?: unknown;
  documentSchema?: unknown;
  revision?: unknown;
  writtenAtRevision?: unknown;
}

/** Where a project's document was found, and whether it can be used. */
export interface FoundDocument {
  /** The document to merge; null when there is none this build can read. */
  document: CloudDocument | null;
  /** 'field': the API's document; 'interim': a track's settings.projectDoc. */
  source: 'field' | 'interim' | null;
  /**
   * An app from before 1.5 saved the project after the document was
   * written (writtenAtRevision behind revision): the rows are newer.
   */
  stale: boolean;
  /** There is a document, from a later schema this build can't read. */
  newer: boolean;
}

/** A document this build can read: `compat` at or below its schema. */
function readable(doc: Record<string, unknown>): boolean {
  const schema = doc.schema;
  if (!Number.isInteger(schema)) return false;
  if ((schema as number) <= CLOUD_DOCUMENT_SCHEMA) return true;
  return (
    Number.isInteger(doc.compat) &&
    (doc.compat as number) <= CLOUD_DOCUMENT_SCHEMA
  );
}

/**
 * The project's document: the API's `document` field when the payload has
 * one, else the first track whose settings carry `projectDoc`, scanning
 * every track (a reorder or a deleted first track moves it).
 */
export function findCloudDocument(project: CloudPayload): FoundDocument {
  let doc: unknown = null;
  let source: FoundDocument['source'] = null;
  let stale = false;
  if (isRecord(project.document)) {
    doc = project.document;
    source = 'field';
    const { revision, writtenAtRevision } = project;
    stale =
      typeof revision === 'number' &&
      typeof writtenAtRevision === 'number' &&
      writtenAtRevision < revision;
  } else {
    for (const track of project.tracks) {
      const settings = track.settings;
      if (isRecord(settings) && isRecord(settings.projectDoc)) {
        doc = settings.projectDoc;
        source = 'interim';
        break;
      }
    }
  }
  if (!isRecord(doc)) {
    return { document: null, source: null, stale: false, newer: false };
  }
  if (!readable(doc)) {
    return { document: null, source, stale, newer: true };
  }
  return { document: doc as CloudDocument, source, stale, newer: false };
}

// ── Reading it back ────────────────────────────────────────────────────────

/** A cloud project as one v3 draft, with the track ids it loads under. */
export interface CloudDraft {
  session: StoredSession;
  trackIds: PlannedTrackIds;
  /** Clips whose part the document held for other notes, left out. */
  partsSkipped: number;
}

const isString = (v: unknown): v is string => typeof v === 'string';

/**
 * The Master automation the payload carried on a track's settings (the
 * first track at save time; searched for, so track order can't lose it).
 */
function masterAutomationOf(project: CloudPayload): unknown {
  for (const track of project.tracks) {
    const settings = track.settings;
    if (isRecord(settings) && settings.masterAutomation !== undefined) {
      return settings.masterAutomation;
    }
  }
  return undefined;
}

/**
 * `project` (its rows) and `found` (its document) as one v3 draft, for
 * decodeSession. Each track loads under the id it was saved with
 * (settings.sourceTrackId, or else the document's trackIds when the
 * document isn't stale and the track count still matches); `mint` gives the
 * rest new ones. Audio clips load under the ids they were saved with
 * (settings.audioClipIds, since milestone 1.10), and `mint` gives the rest
 * new ones. Throws nothing itself; decodeSession and migrateSession check
 * what it holds.
 */
export function cloudProjectDraft(
  project: CloudPayload,
  found: FoundDocument,
  mint: () => string,
): CloudDraft {
  const doc = found.document;
  // By position, so only while the rows are the ones it was written with.
  const docTrackIds =
    doc &&
    !found.stale &&
    Array.isArray(doc.trackIds) &&
    doc.trackIds.length === project.tracks.length
      ? doc.trackIds
      : null;
  const settingsOf = (i: number): SerializedTrackSettings | undefined => {
    const settings = project.tracks[i].settings;
    return isRecord(settings)
      ? (settings as SerializedTrackSettings)
      : undefined;
  };
  const trackIds = planCloudTrackIds(
    project.tracks.map((_, i) => {
      const saved = settingsOf(i)?.sourceTrackId;
      if (saved !== undefined) return saved;
      const fromDoc = docTrackIds?.[i];
      return isString(fromDoc) ? fromDoc : undefined;
    }),
    mint,
  );

  // Audio clip ids by position in each track's rows, each used once in the
  // project, else minted (cloudAudioClipId).
  const audioIdsSeen = new Set<string>();
  const audioClipId = (trackIndex: number, clipIndex: number): string => {
    const saved = settingsOf(trackIndex)?.audioClipIds?.[clipIndex];
    const id =
      isCloudAudioClipId(saved) && !audioIdsSeen.has(saved) ? saved : mint();
    audioIdsSeen.add(id);
    return id;
  };

  const parts = doc && isRecord(doc.clips) ? doc.clips : {};
  let partsSkipped = 0;
  const midiClip = (raw: unknown): unknown => {
    if (!isRecord(raw)) return raw;
    const part = isString(raw.id) ? parts[raw.id] : undefined;
    if (!isRecord(part)) return raw;
    if (part.sum !== noteChecksum(raw.events)) {
      partsSkipped++;
      return raw;
    }
    const clip: Record<string, unknown> = { ...raw };
    if (part.durationTicks !== undefined) {
      clip.durationTicks = part.durationTicks;
    }
    if (part.ccEvents !== undefined) clip.ccEvents = part.ccEvents;
    if (part.ids !== undefined && isRecord(raw.events)) {
      clip.events = { ...raw.events, ids: part.ids };
    }
    if (part.muted !== undefined) clip.muted = part.muted;
    return clip;
  };

  const audioParts = doc && isRecord(doc.audioClips) ? doc.audioClips : {};
  const audioClip = (raw: unknown, trackIndex: number, clipIndex: number) => {
    if (!isRecord(raw)) return raw;
    const clip: Record<string, unknown> = {
      ...raw,
      id: audioClipId(trackIndex, clipIndex),
    };
    const part = audioParts[clip.id as string];
    if (!isRecord(part)) return clip;
    if (part.row !== audioRowKey(raw)) {
      partsSkipped++;
      return clip;
    }
    if (part.name !== undefined) clip.name = part.name;
    if (part.muted !== undefined) clip.muted = part.muted;
    return clip;
  };

  // A draft track without this person's own fields (arm, monitor, inputs):
  // the cloud copy never holds them, and they load at their defaults.
  const tracks = project.tracks.map((row, i) => {
    const settings = settingsOf(i);
    const name = row.name;
    const instrument = row.instrument;
    return {
      id: trackIds.ids[i],
      name: name as string,
      type: row.type as DraftTrack['type'],
      instrument: instrument as string,
      color: row.color as string,
      mute: row.mute as boolean,
      solo: row.solo as boolean,
      volume: row.volume as number,
      pan: row.pan as number,
      activeEffects: (row.activeEffects ?? []) as string[],
      // Saves from before the role was carried guess it from the name.
      trackRole:
        settings?.trackRole ??
        (isString(name) && isString(instrument)
          ? guessTrackRole(name, instrument)
          : undefined),
      settings,
      midiClips: (Array.isArray(row.midiClips) ? row.midiClips : []).map(
        midiClip,
      ) as DraftMidiClip[],
      audioClips: (Array.isArray(row.audioClips) ? row.audioClips : []).map(
        (clip, c) => audioClip(clip, i, c),
      ) as DraftTrack['audioClips'],
    } satisfies Omit<
      DraftTrack,
      'recordArmed' | 'monitoring' | 'midiInputId' | 'audioInputId'
    >;
  }) as unknown as DraftTrack[];

  // The document's keys, at their draft places. The rows win for what they
  // carry: a stale document's copies are older than the rows.
  const sections: Record<string, Section> = {
    data: {},
    transport: {},
    prism: {},
    mixer: {},
    notation: {},
  };
  if (doc) {
    for (const key of CLOUD_DOCUMENT_KEYS) {
      const place = draftPlaceOf(key);
      const from = place === 'data' ? doc : doc[place];
      if (!isRecord(from) || from[key] === undefined) continue;
      if (found.stale && (COPIED_KEYS as readonly string[]).includes(key)) {
        continue;
      }
      sections[place][key] = from[key];
    }
    const notation = doc.notation;
    if (isRecord(notation) && notation.marks !== undefined) {
      sections.notation.marks = notation.marks;
    }
    // A document from before 2.13 has only these; decodeSession reads the
    // sections back from them.
    if (isRecord(notation) && notation.leadSheetSections !== undefined) {
      sections.notation.leadSheetSections = notation.leadSheetSections;
    }
  }
  const prism = isRecord(project.prism) ? project.prism : {};
  sections.data.returns ??= project.returns;
  sections.data.masterAutomation ??= masterAutomationOf(project);

  const session: StoredSession = {
    version: SESSION_ENVELOPE_VERSION,
    schema: SESSION_SCHEMA_VERSION,
    compat: SESSION_COMPAT_VERSION,
    timestamp: 0,
    data: {
      ...sections.data,
      projectId: project.id,
      projectName: project.name,
      composerName: project.composerName ?? '',
      transport: { ...sections.transport, bpm: project.bpm },
      tracks,
      prism: {
        ...sections.prism,
        rootNote: prism.rootNote,
        rhythmName: prism.rhythmName,
        genre: prism.genre,
        swing: prism.swing,
      },
      mixer: sections.mixer,
      notation: sections.notation,
    } as unknown as StoredSession['data'],
  };
  return { session, trackIds, partsSkipped };
}
