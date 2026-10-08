import type { DuckerParams } from '@/daw/audio/EffectChain';
import { MASTER_AUTOMATION_ID } from '@/daw/audio/automationParams';
import type { AllSlices } from '@/daw/store';
import type { AudioMidiSource } from '@/daw/store/tracksSlice';

// ── Track ids across cloud loads ─────────────────────────────────────────
//
// The API doesn't hand back the client's track ids: a project returns with
// the server's own row ids (the mock mints new ones on every write), so a
// cloud open used to give every track a fresh id. Since 2026-07-23
// (a0850557) each track's settings blob has carried the id the track had
// when it was saved (`settings.sourceTrackId`), and an open now loads the
// track under that id. A project keeps its track ids however often it is
// saved and reopened, and so does everything keyed by them. Saves from before
// then carry none: their tracks get new ids once, and the next save stores
// those. MIDI clip ids travel in the clips' JSON and already survive.
//
// Reuse means a load can bring back ids the page has already seen: reopening
// the project that is open, opening the original of a Save As copy, or
// restoring kept work after a reopen. Every cache keyed by track id (the
// TrackEngine registry, the Oracle synth patch cache and its active track,
// the synth panel bridge) must start over on a load. The loaders see to that
// by calling bumpSessionGeneration (src/daw/session/sessionGeneration.ts)
// once the load is certain (validated and decoded), then seeding the caches
// (setTrackSynthState) and setting the store in the same synchronous block;
// this module only decides the ids.
//
// Audio clip ids are still minted on every cloud open, until 1.10. The cloud
// body carries no clip id to reuse, and reusing one safely needs decoded
// audio keyed by asset: the AudioBufferStore is keyed by clip id alone, and
// the loader (src/lib/studio-assets/load-audio.ts) skips any clip whose id
// already has a buffer without checking which asset it holds. 1.10's asset
// model keys audio by asset. Until then a fresh id costs a second download
// and decode of the same asset (audit audio-core-08). Clearing the store on a
// load is no way out either: kept work's un-uploaded takes live only there.

/**
 * The longest saved id an open reuses. The app mints 36-character UUIDs; the
 * cap keeps a corrupt payload from carrying an unbounded string into every
 * key built from a track id.
 */
const MAX_TRACK_ID_LENGTH = 64;

/** How many ids planCloudTrackIds asks `mint` for before giving up on one. */
const MINT_ATTEMPTS = 16;

/**
 * Whether `value` is an id the editor gives something that isn't a track, in
 * keys it shares with track ids: the FX racks of the Master and the return
 * buses ('master', `return-${busId}`; FxBrowser.tsx and EffectsPanel.tsx hide
 * the ducker there and stop its meter) and the Master's automation lane
 * (MASTER_AUTOMATION_ID, a key in the AutomationScheduler's per-track maps
 * and a value of automationOpenTrackId).
 */
function isReservedId(value: string): boolean {
  return (
    value === 'master' ||
    value === MASTER_AUTOMATION_ID ||
    value.startsWith('return-')
  );
}

/**
 * Whether a saved id can name a track: a non-empty string of at most 64
 * characters, with no ':' or '|', that isn't reserved (isReservedId). Track
 * ids are built into the Score's note keys (`trackId:clipId:tick:pitch`,
 * joined to a mark's kind or to a slur's other note with '|') and into
 * hidden-chord keys (`trackId:regionId`), so an id holding either character
 * would make those keys ambiguous. A reserved id would make the track look
 * like a bus or the Master; no payload could set one while every cloud open
 * minted its ids, and now one can.
 */
function isTrackId(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    value.length <= MAX_TRACK_ID_LENGTH &&
    !value.includes(':') &&
    !value.includes('|') &&
    !isReservedId(value)
  );
}

/** A fresh id from `mint` that is valid and not taken yet, now taken. */
function mintTrackId(mint: () => string, taken: Set<string>): string {
  for (let attempt = 0; attempt < MINT_ATTEMPTS; attempt++) {
    const id = mint();
    if (isTrackId(id) && !taken.has(id)) {
      taken.add(id);
      return id;
    }
  }
  throw new Error(
    `planCloudTrackIds: mint() gave no unused, valid track id in ${MINT_ATTEMPTS} tries`,
  );
}

/**
 * The ids a cloud payload's tracks load under, in payload order, from each
 * track's saved id (`settings.sourceTrackId`; undefined when it has none).
 *
 * A saved id is reused when it is valid and no earlier track in the payload
 * carries it. Only a corrupt or hand-edited payload holds two tracks with one
 * saved id (no app path writes one): the first keeps it and later ones get a
 * fresh id, so ids stay unique. A missing or invalid saved id gets a fresh id
 * too. Reused ids are claimed before anything is minted, so a fresh id can
 * never take one that a later track reuses. Every id returned is valid: the
 * next save stores it and the next open reuses it.
 *
 * `remap` maps every saved id the payload carries, valid or not, to the id
 * its first track loads under, for rewriting the fields that name tracks
 * (rewriteTrackRefs). The first one wins here too: letting a later track
 * overwrite the entry would point every reference to the first track (a
 * ducker key, say) at the later one.
 *
 * The same payload loads under the same reused ids every time; only minted
 * ids differ. Throws when `mint` keeps returning ids that are taken or
 * invalid.
 */
export function planCloudTrackIds(
  sourceIds: readonly (string | null | undefined)[],
  mint: () => string,
): { ids: string[]; remap: Map<string, string> } {
  const taken = new Set<string>();
  const reused = sourceIds.map((source) => {
    if (!isTrackId(source) || taken.has(source)) return null;
    taken.add(source);
    return source;
  });

  const remap = new Map<string, string>();
  const ids = reused.map((kept, i) => {
    const id = kept ?? mintTrackId(mint, taken);
    const source = sourceIds[i];
    if (typeof source === 'string' && source !== '' && !remap.has(source)) {
      remap.set(source, id);
    }
    return id;
  });
  return { ids, remap };
}

/** What a track holds that names another track by id. */
export interface TrackRefHolder {
  effects?: { ducker?: Pick<DuckerParams, 'keyTrackId'> };
  audioMidiSource?: Pick<AudioMidiSource, 'sourceTrackId'>;
}

/** Tracks, with the project fields that name tracks by id. */
export interface TrackRefs
  extends Partial<
    Pick<
      AllSlices,
      | 'scoreChordTracks'
      | 'scoreChordHidden'
      | 'leadSheetMelodyTrackId'
      | 'selectedTrackId'
      | 'automationOpenTrackId'
    >
  > {
  tracks: readonly TrackRefHolder[];
}

/** The project fields that hold a single track id, or null. */
const SINGLE_REFS = [
  'leadSheetMelodyTrackId',
  'selectedTrackId',
  'automationOpenTrackId',
] as const;

/**
 * Point every field that names a track by id at the id its track loaded
 * under, through planCloudTrackIds's `remap` (saved id → loaded id):
 * - each track's ducker key (`effects.ducker.keyTrackId`) and
 *   Guitar/Bass-to-MIDI source (`audioMidiSource.sourceTrackId`);
 * - the Score parts that show chord symbols (`scoreChordTracks`) and the
 *   chords hidden from one part (`scoreChordHidden`, `trackId:regionId`);
 * - the lead sheet's melody track (`leadSheetMelodyTrackId`);
 * - the selected track and the track whose automation lane is open
 *   (`selectedTrackId`, `automationOpenTrackId`), which only a local draft
 *   restores. MASTER_AUTOMATION_ID opens the Master's lane and stays.
 *
 * A reference to a track the payload doesn't hold is cleared where that
 * changes nothing anyone hears or sees: a ducker key becomes null (the
 * ducker stops ducking and shows None, as on every load before), so do the
 * melody, selected and open tracks, and a list entry is dropped. A MIDI
 * source stays as it is. There null means "use the first guitar or bass
 * track" (AudioMidiSourcePanel, useGuitarMidiDetection), while an id that
 * names no track means no source, so clearing it would start playing from
 * another track's input after a reload.
 *
 * A local load, which keeps ids, can pass each track's id mapped to itself:
 * that clears only references to tracks that no longer exist. Apply it once,
 * to references still written in saved ids: a second pass would clear every
 * reference to a track that was given a fresh id, since a fresh id isn't a
 * saved one. Pass only the fields the project holds; a field passed as
 * undefined comes back undefined.
 *
 * Pure: returns `input` itself when nothing changes, and otherwise copies
 * only what does, so the payload a loader was handed never changes under it.
 * A new field that names a track (1.15's studentTrackId) belongs here.
 */
export function rewriteTrackRefs<P extends TrackRefs>(
  input: P,
  remap: ReadonlyMap<string, string>,
): P {
  const resolve = (id: unknown): string | null =>
    typeof id === 'string' ? (remap.get(id) ?? null) : null;
  const patch: Partial<TrackRefs> = {};

  const tracks = rewriteList(input.tracks, (track) =>
    rewriteTrack(track, resolve),
  );
  if (tracks) patch.tracks = tracks;

  if (input.scoreChordTracks) {
    const parts = rewriteList(input.scoreChordTracks, resolve);
    if (parts) patch.scoreChordTracks = parts;
  }
  if (input.scoreChordHidden) {
    const hidden = rewriteList(input.scoreChordHidden, (entry) => {
      // A track id holds no ':' (isTrackId), so the first one ends it; a
      // region id may hold more.
      const colon = typeof entry === 'string' ? entry.indexOf(':') : -1;
      const trackId = colon > 0 ? resolve(entry.slice(0, colon)) : null;
      return trackId === null ? null : trackId + entry.slice(colon);
    });
    if (hidden) patch.scoreChordHidden = hidden;
  }
  for (const key of SINGLE_REFS) {
    const id = input[key];
    if (!id) continue;
    if (key === 'automationOpenTrackId' && id === MASTER_AUTOMATION_ID) {
      continue;
    }
    const resolved = resolve(id);
    if (resolved !== id) patch[key] = resolved;
  }

  return Object.keys(patch).length > 0 ? { ...input, ...patch } : input;
}

/** A track with its ducker key and MIDI source resolved; itself if they are. */
function rewriteTrack<T extends TrackRefHolder>(
  track: T,
  resolve: (id: unknown) => string | null,
): T {
  let next = track;
  const ducker = track.effects?.ducker;
  if (ducker?.keyTrackId) {
    const keyTrackId = resolve(ducker.keyTrackId);
    if (keyTrackId !== ducker.keyTrackId) {
      next = {
        ...next,
        effects: { ...track.effects, ducker: { ...ducker, keyTrackId } },
      };
    }
  }
  // A source that resolves to nothing stays as it is (see rewriteTrackRefs).
  const source = track.audioMidiSource;
  const sourceTrackId = resolve(source?.sourceTrackId);
  if (
    source &&
    sourceTrackId !== null &&
    sourceTrackId !== source.sourceTrackId
  ) {
    next = { ...next, audioMidiSource: { ...source, sourceTrackId } };
  }
  return next;
}

/**
 * `items` through `fn`, which returns an item itself, a replacement, or null
 * to drop it. Null when every item came back as itself.
 */
function rewriteList<T>(
  items: readonly T[],
  fn: (item: T) => T | null,
): T[] | null {
  let out: T[] | null = null;
  for (let i = 0; i < items.length; i++) {
    const next = fn(items[i]);
    if (out === null) {
      if (next === items[i]) continue;
      out = items.slice(0, i);
    }
    if (next !== null) out.push(next);
  }
  return out;
}
