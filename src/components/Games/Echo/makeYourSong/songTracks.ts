// ── The mini-Studio's tracks ───────────────────────────────────────────────
// What each track plays and shows. The student's two tracks are on top,
// Chords and Melody, on the sounds the Studio gives them (the Rhodes and
// the piano); the band's own tracks under them (echoSongStudio.ts
// `echoBandParts`: Drums, Bass, Keys, Guitar as the style has them). Pure.

import {
  chordPads,
  type ChordTake,
  type EchoSong,
  type EchoTake,
  type MelodyTake,
} from '@/curriculum/engine/echo';
import { chartKeyColor } from '@/curriculum/engine/musicLiteracy/chart';
import type { LiteracyKey } from '@/curriculum/engine/musicLiteracy/pitch';
import {
  ECHO_CHORDS_INSTRUMENT,
  ECHO_MELODY_INSTRUMENT,
  type EchoBandPart,
} from '@/features/practiceTracks/genre/echoSongStudio';
import type { SongTrack } from './songFlow';
import type { PlayerNote, PlayerTrack } from './songPlayer';

/** The sound each of the student's tracks plays (and is heard live) on. */
export const TRACK_SOUND: Record<SongTrack, string> = {
  chords: ECHO_CHORDS_INSTRUMENT,
  melody: ECHO_MELODY_INSTRUMENT,
};

const MELODY_VELOCITY = 96;
const CHORD_VELOCITY = 80;

/** A take's notes as a track plays them, in the phrase's ticks. */
export function takeEvents(take: EchoTake | null): PlayerNote[] {
  if (!take) return [];
  if (take.kind === 'melody')
    return take.notes.map((n) => ({
      note: n.midi,
      velocity: MELODY_VELOCITY,
      startTick: n.tick,
      durationTicks: n.duration,
    }));
  return take.chords.flatMap((c) =>
    c.chord.midis.map((midi) => ({
      note: midi,
      velocity: CHORD_VELOCITY,
      startTick: c.tick,
      durationTicks: c.duration,
    })),
  );
}

/** The student's two tracks, the whole song of each. */
export function songEvents(song: EchoSong): Record<SongTrack, PlayerNote[]> {
  return {
    melody: song.melody.map((n) => ({
      note: n.midi,
      velocity: MELODY_VELOCITY,
      startTick: n.tick,
      durationTicks: n.duration,
    })),
    chords: song.chordNotes.map((n) => ({
      note: n.midi,
      velocity: CHORD_VELOCITY,
      startTick: n.tick,
      durationTicks: n.duration,
    })),
  };
}

/** The band's tracks for the player. */
export const bandTracks = (parts: readonly EchoBandPart[]): PlayerTrack[] =>
  parts.map((p) => ({
    id: p.id,
    sound: p.sound,
    volume: p.volume,
    events: p.clip.events,
  }));

/** Every sound a song with this band plays. */
export const songSounds = (parts: readonly EchoBandPart[]): string[] => [
  ...new Set([
    ...parts.map((p) => p.sound),
    TRACK_SOUND.chords,
    TRACK_SOUND.melody,
  ]),
];

/**
 * What plays while a track is recorded. Recording the chords, the drums
 * alone: the student's own chords are the harmony, and a band still on the
 * old chords (or the 1) would fight the new ones. Recording the melody,
 * the whole band over the song's chords, and the Chords take. Either way,
 * the other track's take plays too.
 */
export function recordingTracks(
  track: SongTrack,
  band: readonly EchoBandPart[],
  takes: { chords: ChordTake | null; melody: MelodyTake | null },
): PlayerTrack[] {
  const tracks = bandTracks(
    track === 'chords' ? band.filter((p) => p.id === 'drums') : band,
  );
  const other: SongTrack = track === 'chords' ? 'melody' : 'chords';
  const otherTake = takes[other];
  if (otherTake)
    tracks.push({
      id: other,
      sound: TRACK_SOUND[other],
      volume: 1,
      events: takeEvents(otherTake),
    });
  return tracks;
}

/** A take played back with the band and the other track. */
export function reviewTracks(
  take: EchoTake,
  band: readonly EchoBandPart[],
  takes: { chords: ChordTake | null; melody: MelodyTake | null },
): PlayerTrack[] {
  const other: SongTrack = take.kind === 'chords' ? 'melody' : 'chords';
  const tracks = bandTracks(band);
  const otherTake = takes[other];
  if (otherTake)
    tracks.push({
      id: other,
      sound: TRACK_SOUND[other],
      volume: 1,
      events: takeEvents(otherTake),
    });
  tracks.push({
    id: take.kind,
    sound: TRACK_SOUND[take.kind],
    volume: 1,
    events: takeEvents(take),
  });
  return tracks;
}

/** The whole song: the band and both takes. */
export function listenTracks(
  song: EchoSong,
  band: readonly EchoBandPart[],
): PlayerTrack[] {
  const own = songEvents(song);
  return [
    ...bandTracks(band),
    { id: 'chords', sound: TRACK_SOUND.chords, volume: 1, events: own.chords },
    { id: 'melody', sound: TRACK_SOUND.melody, volume: 1, events: own.melody },
  ];
}

// ── What the timeline shows ────────────────────────────────────────────────

/** A chord block on the Chords track: "6 min". */
export interface ChordBlock {
  tick: number;
  duration: number;
  label: string;
  color: string;
}

/** A note mark on a track: where, how long, how high. */
export interface NoteMark {
  tick: number;
  duration: number;
  midi: number;
}

/** A clip on a track's timeline, in song ticks. */
export interface RowClip {
  start: number;
  length: number;
  chords?: ChordBlock[];
  notes?: NoteMark[];
}

export interface StudioRow {
  id: string;
  name: string;
  /** Under the name: "Your chords", "Band". */
  role: string;
  track: SongTrack | null;
  color: string;
  clips: RowClip[];
}

/** Each chord's color: its root's on the circle, as the chord pads wear it. */
export function chordColors(key: LiteracyKey): Map<string, string> {
  return new Map(chordPads(key).map((pad) => [pad.degree, pad.color]));
}

/** A neutral color for the band's clips: Stage B keeps color for meaning. */
const BAND_COLOR = '#8e8ea3';

/**
 * The rows the mini-Studio draws: Chords and Melody, each take repeated as
 * the song plays it (a clip a phrase), then the band's tracks, a clip a
 * phrase too.
 */
export function studioRows(
  song: EchoSong,
  takes: { chords: ChordTake | null; melody: MelodyTake | null },
  band: readonly EchoBandPart[],
): StudioRow[] {
  const phrase = song.phraseBars * song.barTicks;
  const repeats = Array.from({ length: song.repeats }, (_, r) => r * phrase);
  const colors = chordColors(song.key);
  const keyColor = chartKeyColor(song.key);
  const chordClips: RowClip[] = takes.chords
    ? repeats.map((start) => ({
        start,
        length: phrase,
        chords: takes.chords!.chords.map((c) => ({
          tick: c.tick,
          duration: c.duration,
          label: c.label,
          color: colors.get(c.degree) ?? keyColor,
        })),
      }))
    : [];
  const melodyClips: RowClip[] = takes.melody
    ? repeats.map((start) => ({
        start,
        length: phrase,
        notes: takes.melody!.notes.map((n) => ({
          tick: n.tick,
          duration: n.duration,
          midi: n.midi,
        })),
      }))
    : [];
  return [
    {
      id: 'chords',
      name: 'Chords',
      role: 'Your chords',
      track: 'chords',
      color: keyColor,
      clips: chordClips,
    },
    {
      id: 'melody',
      name: 'Melody',
      role: 'Your melody',
      track: 'melody',
      color: keyColor,
      clips: melodyClips,
    },
    ...band.map((part) => ({
      id: `band-${part.id}`,
      name: part.name,
      role: 'Band',
      track: null,
      color: BAND_COLOR,
      clips: repeats.map((start) => ({
        start,
        length: phrase,
        notes: part.clip.events
          .filter((e) => e.startTick >= start && e.startTick < start + phrase)
          .map((e) => ({
            tick: e.startTick - start,
            duration: e.durationTicks,
            midi: e.note,
          })),
      })),
    })),
  ];
}
