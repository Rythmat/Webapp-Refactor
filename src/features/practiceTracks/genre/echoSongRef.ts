/**
 * echoSongRef.ts — What a Studio link says about a song made in Echo's
 * Make Your Song: the band and its style, the key, the level and tempo, and
 * the two takes, each as its phrase (the song repeats it), all as written in
 * the URL.
 *
 *   ?echoSong=pop-band-1&echoStyle=l1-singable&echoKey=C&echoKeyMode=major
 *   &echoLevel=1&echoBpm=96&echoChords=1.0.1920_6.1920.1920
 *   &echoMelody=60.0.480_64.480.480
 *
 * A chord is `degree.tick.duration`, a melody note `midi.tick.duration`, in
 * ticks from the phrase's downbeat (480 a quarter), joined by `_`: plain
 * URL characters, no escaping. Strings here, checked only for being there:
 * echoSongStudio.ts reads them when it builds the song, and refuses one it
 * can't read. Kept apart and import-free, as bandPracticeRef.ts is, so the
 * Studio's boot reads a link without loading Echo's or Music Literacy's
 * code; the hand-off box matches on it, so a box left for another song is
 * never opened.
 */

export interface EchoSongRef {
  band: string;
  variation: string;
  /** The key's 1, as Music Literacy spells it: 'C', 'Bb', 'F#'. */
  tonic: string;
  /** 'major' | 'minor'. */
  mode: string;
  /** '1' | '2' | '3'. */
  level: string;
  /** Quarter notes a minute. */
  bpm: string;
  /** The chords take's phrase: `degree.tick.duration`, joined by `_`. */
  chords: string;
  /** The melody take's phrase: `midi.tick.duration`, joined by `_`. */
  melody: string;
}

/** The link's own keys for a ref. `echoSong` (the band) names the intent. */
export const ECHO_SONG_KEYS = {
  band: 'echoSong',
  variation: 'echoStyle',
  tonic: 'echoKey',
  mode: 'echoKeyMode',
  level: 'echoLevel',
  bpm: 'echoBpm',
  chords: 'echoChords',
  melody: 'echoMelody',
} as const satisfies Record<keyof EchoSongRef, string>;

const FIELDS = Object.keys(ECHO_SONG_KEYS) as (keyof EchoSongRef)[];

/** Two refs ask for the same song. */
export const sameEchoSongRef = (
  a: EchoSongRef | null | undefined,
  b: EchoSongRef | null | undefined,
): boolean =>
  !a || !b ? !a && !b : FIELDS.every((field) => a[field] === b[field]);

/** The ref a link carries: a band and a style make one. Null without them. */
export function echoSongRefFromParams(
  get: (key: string) => string | null,
): EchoSongRef | null {
  const band = get(ECHO_SONG_KEYS.band)?.trim();
  const variation = get(ECHO_SONG_KEYS.variation)?.trim();
  if (!band || !variation) return null;
  const text = (field: keyof EchoSongRef) =>
    get(ECHO_SONG_KEYS[field])?.trim() ?? '';
  return {
    band,
    variation,
    tonic: text('tonic'),
    mode: text('mode'),
    level: text('level'),
    bpm: text('bpm'),
    chords: text('chords'),
    melody: text('melody'),
  };
}

/** A ref's keys and values, in link order. */
export const echoSongRefParams = (ref: EchoSongRef): [string, string][] =>
  FIELDS.map((field) => [ECHO_SONG_KEYS[field], ref[field]]);
