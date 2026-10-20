/**
 * echoSongStudio.ts — A song made in Echo's Make Your Song, as the Studio
 * opens it: the student's Melody and Chords, the band's own tracks under
 * them, in the song's key and tempo, with its chords on the chord lane.
 *
 * THE SONG
 * The song is Echo's (engine/echo/song.ts `assembleSong`): the two takes,
 * each repeated to fill eight bars. The band is the one the student chose,
 * built by Practice with a Band (bandPracticeTrack.ts) over the song's
 * chart, following the take's chords where they really change, half bars
 * included (`EchoSong.chordChanges`, the backing's `timedChords`): its drums,
 * its bass and keys, and every captured part. A band track is sixteen
 * bars; the song keeps the first eight (`echoBandParts`).
 *
 * THE HAND-OFF
 * As Practice with a Band does it (openGenrePracticeTrack.ts): the game
 * builds the song, leaves it in a box here and navigates to the Studio link
 * (`echoSongUrl`). The band's backing engine plays a new performance every
 * build, so the box carries the very band the student heard in the
 * mini-Studio. The Studio's 'echoSong' intent takes what's in the box; on a
 * refresh or a cold link the box is empty and the link builds the song
 * again (`echoSongFromRef`): the same takes, key and tempo, the band a fresh
 * performance of the same style.
 *
 * No store writes here (seedStudioFromEchoSong.ts writes the Studio), so
 * the game page can load it.
 */

import { StudioRoutes } from '@/constants/routes';
import {
  LITERACY_TONICS,
  type LiteracyScaleDegree,
  type LiteracyTonic,
} from '@/content/musicLiteracy/schemas';
import { BAND_INSTRUMENTS } from '@/curriculum/engine/band/band';
import { getLiveBand } from '@/curriculum/engine/band/registry';
import {
  BAR_TICKS,
  NO_SCAFFOLDING,
  assembleSong,
  echoLevel,
  processTake,
  type ChordTake,
  type EchoLevelNumber,
  type EchoSong,
  type MelodyTake,
  type TakeChord,
} from '@/curriculum/engine/echo';
import type { TimedChords } from '@/curriculum/engine/genreGeneration/chordTimeline';
import {
  chartKeyName,
  chartPrismMode,
} from '@/curriculum/engine/musicLiteracy/chart';
import {
  voicedChord,
  voicedProgression,
} from '@/curriculum/engine/musicLiteracy/chords';
import {
  pitchClassOf,
  type LiteracyKey,
} from '@/curriculum/engine/musicLiteracy/pitch';
import type { MidiClip } from '@/daw/store/tracksSlice';
import {
  buildBandPracticeTrack,
  type BuiltBandTrack,
  type FlowLoader,
  loadV2Flow,
} from './bandPracticeTrack';
import {
  echoSongRefParams,
  sameEchoSongRef,
  type EchoSongRef,
} from './echoSongRef';

/**
 * The student's tracks' instruments, in the game and the Studio alike: the
 * Melody on the Studio's piano, the Chords on its Rhodes.
 */
export const ECHO_MELODY_INSTRUMENT = 'piano-sampler';
export const ECHO_CHORDS_INSTRUMENT = 'electric-piano';

// ── The band's tracks ───────────────────────────────────────────────────────

/** One of the band's own tracks in the song. */
export interface EchoBandPart {
  /** 'drums', 'bass', 'keys', or the band layer's id. */
  id: string;
  /** As a student names it: 'Drums', 'Bass', 'Keys', 'Guitar'. */
  name: string;
  /** What it plays on (daw/instruments/soundString.ts). */
  sound: string;
  /** 0–1. */
  volume: number;
  /** Its notes, the song's length of them. */
  clip: MidiClip;
}

/** A clip cut to the song's first `length` ticks. */
function trimClip(clip: MidiClip, length: number, name: string): MidiClip {
  return {
    ...clip,
    name,
    startTick: 0,
    durationTicks: length,
    events: clip.events
      .filter((e) => e.startTick < length)
      .map((e) => ({
        ...e,
        durationTicks: Math.max(
          1,
          Math.min(e.durationTicks, length - e.startTick),
        ),
      })),
  };
}

/**
 * The band's tracks, each cut to the song's `length`: its drums, bass and
 * comping keys (the lesson parts it plays), then the layers it plays on
 * instruments of their own, each named by its instrument. The sounds are
 * the Studio's own, as the Practice Track seeds them: the drums on the
 * style's kit, the bass on its voice, the keys on the Rhodes.
 */
export function echoBandParts(
  built: Pick<BuiltBandTrack, 'track' | 'literacy'>,
  length: number,
): EchoBandPart[] {
  const { track } = built;
  const members = getLiveBand(built.literacy.band)?.layers ?? [];
  const parts: EchoBandPart[] = [];
  const used = new Map<string, number>();
  const named = (name: string) => {
    const n = (used.get(name) ?? 0) + 1;
    used.set(name, n);
    return n === 1 ? name : `${name} ${n}`;
  };
  const add = (
    id: string,
    name: string,
    sound: string,
    volume: number,
    clip: MidiClip | undefined,
  ) => {
    if (!clip) return;
    const own = named(name);
    const trimmed = trimClip(clip, length, own);
    if (trimmed.events.length === 0) return;
    parts.push({ id, name: own, sound, volume, clip: trimmed });
  };
  add('drums', 'Drums', `drum-machine:${track.drumKit}`, 1, track.clips.drums);
  add(
    'bass',
    'Bass',
    track.bassVoice ? `bass-electric:${track.bassVoice}` : 'bass-electric',
    1,
    track.clips.bass,
  );
  add('keys', 'Keys', 'electric-piano', 1, track.clips.chords);
  for (const layer of track.layerClips) {
    const instrument = members.find((m) => m.id === layer.layer)?.instrument;
    const label =
      BAND_INSTRUMENTS.find((i) => i.id === instrument)?.label ?? layer.name;
    add(layer.layer, label, layer.sound, layer.volume, layer.clip);
  }
  return parts;
}

// ── The song, as the Studio opens it ───────────────────────────────────────

/** A chord on the Studio's chord lane. */
export interface EchoLaneChord {
  startTick: number;
  endTick: number;
  /** "6 min". */
  label: string;
  /** "Am". */
  symbol: string;
  midis: number[];
}

export interface EchoStudioSong {
  /** What the link says: the song can be built again from it. */
  ref: EchoSongRef;
  /** The project's name: 'My Echo Song · Pop Band 1'. */
  name: string;
  bandName: string;
  styleName: string;
  key: LiteracyKey;
  /** 'C Major'. */
  keyName: string;
  /** The key as the Studio holds it. */
  keyRootPc: number;
  mode: 'ionian' | 'aeolian';
  tempo: number;
  bars: number;
  length: number;
  /** The student's tracks, on the piano and the Rhodes. */
  melody: MidiClip;
  chords: MidiClip;
  band: EchoBandPart[];
  /** The song's chords, as they change: the chord lane. */
  lane: EchoLaneChord[];
}

/** The student's track's notes as a clip the song's length. */
function songClip(
  name: string,
  notes: readonly { midi: number; tick: number; duration: number }[],
  velocity: number,
  length: number,
): MidiClip {
  return {
    id: crypto.randomUUID(),
    name,
    startTick: 0,
    durationTicks: length,
    events: notes.map((n) => ({
      note: n.midi,
      velocity,
      startTick: n.tick,
      durationTicks: Math.max(1, n.duration),
      channel: 0,
    })),
  };
}

// ── The song's chord changes ───────────────────────────────────────────────

/**
 * The song's chords as the band's backing takes them: every change the
 * engine heard (`EchoSong.chordChanges`, from tick 0 to the song's end, a
 * genre TimedChord each), over the song's length.
 */
export const songTimedChords = (song: EchoSong): TimedChords => ({
  changes: song.chordChanges,
  length: song.length,
});

/** The song's chords as the lane shows them, a chord held on merged. */
export function echoLane(song: EchoSong): EchoLaneChord[] {
  const lane: EchoLaneChord[] = [];
  for (const change of song.chordChanges) {
    const last = lane.at(-1);
    const end = change.tick + change.duration;
    if (last && last.label === change.label && last.endTick >= change.tick) {
      last.endTick = Math.max(last.endTick, end);
      continue;
    }
    lane.push({
      startTick: change.tick,
      endTick: end,
      label: change.label,
      symbol: change.symbol,
      midis: [...(voicedChord(song.key, change.degree)?.midis ?? [])],
    });
  }
  return lane;
}

/** How the melody and the chords are struck in the Studio. */
const MELODY_VELOCITY = 96;
const CHORD_VELOCITY = 80;

/** The song and the band built over it, as the Studio opens them. */
export function echoStudioSong(
  song: EchoSong,
  built: Pick<BuiltBandTrack, 'track' | 'literacy'>,
  ref: EchoSongRef,
): EchoStudioSong {
  return {
    ref,
    name: `My Echo Song · ${built.literacy.bandName}`,
    bandName: built.literacy.bandName,
    styleName: built.literacy.styleName,
    key: song.key,
    keyName: chartKeyName(song.key),
    keyRootPc: pitchClassOf(song.key.tonic),
    mode: chartPrismMode(song.key.mode),
    tempo: song.tempo,
    bars: song.bars,
    length: song.length,
    melody: songClip('Melody', song.melody, MELODY_VELOCITY, song.length),
    chords: songClip('Chords', song.chordNotes, CHORD_VELOCITY, song.length),
    band: echoBandParts(built, song.length),
    lane: echoLane(song),
  };
}

// ── The link ───────────────────────────────────────────────────────────────

/** What the game knows of a finished song. */
export interface EchoSongRequest {
  level: EchoLevelNumber;
  key: LiteracyKey;
  chordTake: ChordTake | null;
  melodyTake: MelodyTake | null;
  band: string;
  variation: string;
  bpm: number;
  /**
   * The band the student heard (`buildEchoBand`): the Studio gets this very
   * performance. Built again when it plays another song's chords or style.
   */
  heard?: EchoBand | null;
}

/** The ref a song's link carries. */
export function echoSongRefFor(request: EchoSongRequest): EchoSongRef {
  return {
    band: request.band,
    variation: request.variation,
    tonic: request.key.tonic,
    mode: request.key.mode,
    level: String(request.level),
    bpm: String(Math.round(request.bpm)),
    chords: (request.chordTake?.chords ?? [])
      .map((c) => `${c.degree}.${c.tick}.${c.duration}`)
      .join('_'),
    melody: (request.melodyTake?.notes ?? [])
      .map((n) => `${n.midi}.${n.tick}.${n.duration}`)
      .join('_'),
  };
}

/** The Studio URL that opens a song (and can build it again by itself). */
export function echoSongUrl(ref: EchoSongRef): string {
  const params = new URLSearchParams(echoSongRefParams(ref));
  return `${StudioRoutes.editor.definition}?${params.toString()}`;
}

/** `a.b.c` triples, or null when any part isn't a whole number. */
function triples(text: string): [string, number, number][] | null {
  if (text === '') return [];
  const out: [string, number, number][] = [];
  for (const item of text.split('_')) {
    const [first, tick, duration, ...rest] = item.split('.');
    const t = Number(tick);
    const d = Number(duration);
    if (
      rest.length ||
      !first ||
      !Number.isInteger(t) ||
      !Number.isInteger(d) ||
      t < 0 ||
      d <= 0
    )
      return null;
    out.push([first, t, d]);
  }
  return out;
}

const SCALE_DEGREES: readonly string[] = ['1', '2', '3', '4', '5', '6', '7'];

/** A chords take from the link's chords: as recorded, voiced together. */
function chordTakeOf(
  key: LiteracyKey,
  level: EchoLevelNumber,
  tempo: number,
  chords: readonly [LiteracyScaleDegree, number, number][],
): ChordTake {
  const bars = echoLevel(level).phraseBars;
  const voiced = voicedProgression(
    key,
    chords.map(([degree]) => degree),
  );
  const taken: TakeChord[] = chords.map(([degree, tick, duration], i) => ({
    tick,
    duration,
    bar: Math.floor(tick / BAR_TICKS),
    degree,
    label: voiced[i].label,
    chord: voiced[i],
    struck: [],
  }));
  return {
    kind: 'chords',
    key,
    level,
    bars,
    barTicks: BAR_TICKS,
    length: bars * BAR_TICKS,
    scaffolding: NO_SCAFFOLDING,
    tempo,
    flags: [],
    empty: taken.length === 0,
    chords: taken,
  };
}

/** The song a ref names, read back; null when any part can't be read. */
export function echoSongOfRef(ref: EchoSongRef): EchoSong | null {
  const tonic = LITERACY_TONICS.find((t) => t === ref.tonic) as
    | LiteracyTonic
    | undefined;
  const mode =
    ref.mode === 'major' || ref.mode === 'minor' ? ref.mode : undefined;
  const level = Number(ref.level);
  const bpm = Number(ref.bpm);
  if (!tonic || !mode || ![1, 2, 3].includes(level)) return null;
  if (!Number.isFinite(bpm) || bpm < 30 || bpm > 300) return null;
  const key: LiteracyKey = { tonic, mode };
  const chords = triples(ref.chords);
  const melody = triples(ref.melody);
  if (!chords || !melody) return null;
  if (!chords.every(([degree]) => SCALE_DEGREES.includes(degree))) return null;
  if (!melody.every(([midi]) => /^\d+$/.test(midi) && Number(midi) <= 127))
    return null;
  const echo = level as EchoLevelNumber;
  const chordTake = chords.length
    ? chordTakeOf(
        key,
        echo,
        bpm,
        chords as [LiteracyScaleDegree, number, number][],
      )
    : null;
  // A take's notes are already on its grid: read again, they stay put.
  const melodyTake = melody.length
    ? processTake(
        melody.map(([midi, onset, duration]) => ({
          midi: Number(midi),
          onset,
          duration,
        })),
        { kind: 'melody', key, level: echo, tempo: bpm },
      )
    : null;
  return assembleSong(echo, key, chordTake, melodyTake, { tempo: bpm });
}

// ── The hand-off box ─────────────────────────────────────────────────────────

let pending: EchoStudioSong | null = null;

/** Leave a built song for the Studio to pick up on the next route. */
export function stashEchoSong(song: EchoStudioSong): void {
  pending = song;
}

/** The song in the box if it's the one the link asks for, left there. */
export function peekEchoSong(ref: EchoSongRef): EchoStudioSong | null {
  return pending && sameEchoSongRef(pending.ref, ref) ? pending : null;
}

/** Take the song in the box if it's the one asked for; the box empties. */
export function takeEchoSong(ref: EchoSongRef): EchoStudioSong | null {
  const found = peekEchoSong(ref);
  pending = null;
  return found;
}

// ── Opening one ──────────────────────────────────────────────────────────────

/** A band built over a song's chords, and what it was built over. */
export interface EchoBand {
  /** `echoBandKey`: the band, its style, the tempo and the chords. */
  key: string;
  built: BuiltBandTrack;
}

/**
 * What a band over a song plays from: the band and style, the tempo, the
 * key and every chord change. Two songs with one key play the same.
 */
export const echoBandKey = (
  song: EchoSong,
  band: string,
  variation: string,
): string =>
  [
    band,
    variation,
    song.tempo,
    song.key.tonic,
    song.key.mode,
    song.chordChanges.map((c) => `${c.symbol}@${c.tick}`).join(' '),
  ].join('|');

/**
 * The band playing a song: its style over the song's chart (the key, a
 * chord a bar for the loop), following the chords where they really
 * change. Null when the band can't play (no longer live, a style it
 * dropped).
 */
export async function buildEchoBand(
  song: EchoSong,
  band: string,
  variation: string,
  loadFlow: FlowLoader = loadV2Flow,
): Promise<EchoBand | null> {
  const built = await buildBandPracticeTrack(
    {
      band,
      variation,
      chart: song.chart,
      charts: [],
      bpm: song.tempo,
      timedChords: songTimedChords(song),
    },
    loadFlow,
  );
  return built ? { key: echoBandKey(song, band, variation), built } : null;
}

/** The band over a song: the one heard if it plays that, else built. */
async function bandFor(
  song: EchoSong,
  band: string,
  variation: string,
  heard: EchoBand | null | undefined,
  loadFlow: FlowLoader,
): Promise<BuiltBandTrack | null> {
  if (heard && heard.key === echoBandKey(song, band, variation))
    return heard.built;
  return (await buildEchoBand(song, band, variation, loadFlow))?.built ?? null;
}

/**
 * Build the song, leave it for the Studio and give back the URL that opens
 * it; null when the band can't play (no longer live, a style it dropped).
 */
export async function openEchoSongInStudio(
  request: EchoSongRequest,
  loadFlow: FlowLoader = loadV2Flow,
): Promise<string | null> {
  const song = assembleSong(
    request.level,
    request.key,
    request.chordTake,
    request.melodyTake,
    { tempo: request.bpm },
  );
  const built = await bandFor(
    song,
    request.band,
    request.variation,
    request.heard,
    loadFlow,
  );
  if (!built) return null;
  const ref = echoSongRefFor(request);
  stashEchoSong(echoStudioSong(song, built, ref));
  return echoSongUrl(ref);
}

/**
 * The Studio's side: the song the link names, from the box when the game
 * just left it, else built again from the link. Reads the box without
 * emptying it unless `consume`: the open takes it once ready. Null when the
 * link names nothing that can be built.
 */
export async function resolveEchoSong(
  ref: EchoSongRef,
  { consume = false }: { consume?: boolean } = {},
  loadFlow: FlowLoader = loadV2Flow,
): Promise<EchoStudioSong | null> {
  const handed = consume ? takeEchoSong(ref) : peekEchoSong(ref);
  if (handed) return handed;
  const song = echoSongOfRef(ref);
  if (!song) return null;
  const built = await bandFor(song, ref.band, ref.variation, null, loadFlow);
  return built ? echoStudioSong(song, built, ref) : null;
}
