/**
 * songFit.ts — "Fits your song", the block on top of the Library (2.14).
 *
 * Soundtrap's "Top picks for this project" change with the project and show
 * locked items. Ours are chosen by what the song lacks and how an item sits
 * in its key and tempo: no drums yet → grooves first; drums but no bass →
 * bass lines; no chords → chord parts. A pick in the song's tempo, a part
 * whose notes sit on the song's scale once moved, a basic part and a ♡ rank
 * higher. There are no melody parts yet, so melody is never asked for.
 *
 * The song's key is the student's, else a detected one, else one read from
 * the song's notes; with none, every part fits (the first part sets the key).
 */

import { audioSourceOf } from '@/daw/audio/audioSource';
import type { MidiNoteEvent } from '@prism/engine';
import { detectClipKey } from '@/daw/harmony/clipKey';
import { selectEffectiveKey } from '@/daw/harmony/effectiveKey';
import type { AllSlices } from '@/daw/store';
import type { Track } from '@/daw/store/tracksSlice';
import { hasHarmonyNotes, trackRole } from '@/daw/utils/chordAnalysis';
import type { SongKey } from './partInSong';
import type { QueryItem } from './query';

export interface SongRoles {
  drums: boolean;
  bass: boolean;
  chords: boolean;
}

export type SongRole = keyof SongRoles;

/** What the picks read of an item. */
export interface FitItem extends QueryItem {
  name: string;
  /** The tempo it was played at, or null. */
  bpm: number | null;
  /** What it plays in a band, or null. */
  role: SongRole | 'melody' | null;
  /** A part's level, 1 (basic) to 5. */
  level: number | null;
  /** A part: whether it sits on the song's scale once moved; else null. */
  keyFits: boolean | null;
}

export interface SongContext {
  key: SongKey | null;
  /** Where the key came from, for the reason line. */
  keySource?: 'project' | 'detected' | 'notes' | null;
  bpm: number;
  roles: SongRoles;
}

const ORDER: readonly SongRole[] = ['drums', 'bass', 'chords'];
/** How many picks the first, second and third missing roles may take. */
const TAKE = [3, 2, 2];
const MAX_PICKS = 5;

const isDrums = (t: Track) =>
  t.instrument === 'drum-machine' || trackRole(t) === 'drums';

const isBass = (t: Track) =>
  trackRole(t) === 'bass' ||
  audioSourceOf(t) === 'bass' ||
  (t.instrument === 'soundfont' &&
    (t.gmProgram ?? 0) >= 32 &&
    (t.gmProgram ?? 0) <= 39);

/** Which of the band's roles the song's tracks already play. */
export function songRolesOf(
  tracks: readonly Track[],
  hasChordLane: boolean,
): SongRoles {
  return {
    drums: tracks.some(isDrums),
    bass: tracks.some(isBass),
    chords:
      hasChordLane ||
      tracks.some((t) => trackRole(t) === 'chords') ||
      hasHarmonyNotes(tracks),
  };
}

// A key read from the song's notes, kept per tracks array.
const notesKeys = new WeakMap<readonly Track[], SongKey | null>();

function keyFromNotes(tracks: readonly Track[]): SongKey | null {
  if (notesKeys.has(tracks)) return notesKeys.get(tracks) ?? null;
  const events: MidiNoteEvent[] = [];
  for (const t of tracks) {
    if (t.type !== 'midi' || isDrums(t)) continue;
    for (const clip of t.midiClips) {
      if (!clip.muted) events.push(...clip.events);
    }
  }
  const found = detectClipKey(events, null);
  const key = found ? { rootPc: found.rootPc, mode: found.mode } : null;
  notesKeys.set(tracks, key);
  return key;
}

type ContextState = Pick<
  AllSlices,
  | 'rootNote'
  | 'mode'
  | 'detectedKeyRootPc'
  | 'detectedMode'
  | 'bpm'
  | 'tracks'
  | 'chordRegions'
>;

/** The song as the picks and the + rules read it. */
export function songContextOf(state: ContextState): SongContext {
  const effective = selectEffectiveKey(state);
  let key: SongKey | null = effective
    ? { rootPc: effective.rootPc, mode: effective.mode }
    : null;
  let keySource: SongContext['keySource'] = effective?.source ?? null;
  if (!key) {
    key = keyFromNotes(state.tracks);
    keySource = key ? 'notes' : null;
  }
  return {
    key,
    keySource,
    bpm: state.bpm,
    roles: songRolesOf(state.tracks, state.chordRegions.length > 0),
  };
}

const candidateFor = (item: FitItem, role: SongRole) =>
  role === 'drums'
    ? item.type === 'groove'
    : item.type === 'part' && item.role === role;

function score(
  item: FitItem,
  ctx: SongContext,
  favourites: ReadonlySet<string>,
): number {
  let s = 0;
  if (item.bpm !== null && ctx.bpm > 0) {
    const off = Math.abs(item.bpm - ctx.bpm) / ctx.bpm;
    if (off <= 0.05) s += 2;
    else if (off <= 0.15) s += 1;
  }
  if (item.type === 'part') {
    if (!ctx.key) s += 1;
    else if (item.keyFits) s += 2;
  }
  if (item.level === 1) s += 0.5;
  else if (item.level === 2) s += 0.25;
  if (favourites.has(item.id)) s += 0.5;
  return s;
}

/**
 * Up to five items for what the song lacks, in the order drums, bass,
 * chords; with nothing lacking, the parts and grooves that fit it best.
 */
export function fitsYourSong<T extends FitItem>(
  items: readonly T[],
  ctx: SongContext,
  favourites: ReadonlySet<string>,
): { missing: SongRole[]; picks: T[] } {
  const ranked = (pool: T[]) =>
    pool
      .map((item) => ({ item, s: score(item, ctx, favourites) }))
      .sort((a, b) => b.s - a.s || a.item.name.localeCompare(b.item.name))
      .map(({ item }) => item);

  const missing = ORDER.filter((role) => !ctx.roles[role]);
  if (missing.length === 0) {
    return {
      missing,
      picks: ranked(
        items.filter((i) => i.type === 'part' || i.type === 'groove'),
      ).slice(0, MAX_PICKS),
    };
  }

  const picks: T[] = [];
  const leftovers: T[][] = [];
  missing.forEach((role, i) => {
    // With no drums, one kit (a ♡ one first) is ranked with the grooves: a
    // kit to play on.
    const kit =
      role === 'drums'
        ? (items.find((i) => i.type === 'kit' && favourites.has(i.id)) ??
          items.find((i) => i.type === 'kit'))
        : undefined;
    const pool = ranked([
      ...items.filter((item) => candidateFor(item, role)),
      ...(kit ? [kit] : []),
    ]);
    picks.push(...pool.slice(0, TAKE[i]));
    leftovers.push(pool.slice(TAKE[i]));
  });
  for (const rest of leftovers) {
    for (const item of rest) {
      if (picks.length >= MAX_PICKS) break;
      picks.push(item);
    }
  }
  return { missing, picks: picks.slice(0, MAX_PICKS) };
}
