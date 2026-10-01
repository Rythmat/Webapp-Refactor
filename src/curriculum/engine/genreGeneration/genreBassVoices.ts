/**
 * genreBassVoices.ts — which bass sound a genre's play-along uses.
 *
 * Aaron picked these by ear on the Hip Hop groove audition page
 * (/__hiphop-grooves, 2026-09-29): Fretless for Pop, Finger electric for Funk
 * and Hip Hop.
 * A genre not listed keeps the lesson's electric bass sampler
 * (/samples/bass-electric/).
 *
 * The samples are General MIDI sets from the same CDN as the EP1 chord
 * sampler (epSamplerV2.ts). They are recorded quieter than the electric bass,
 * so each carries a gain that level-matches it: the gap in mean loudness
 * measured with ffmpeg volumedetect on A1, C2 and E♭2.
 */

export type BassVoiceId = 'fretless' | 'finger' | 'upright';

export interface BassVoiceConfig {
  id: BassVoiceId;
  label: string;
  baseUrl: string;
  /** Tone.Sampler urls map, note name → file. */
  urls: Record<string, string>;
  /** Level match to the electric bass sampler. */
  volumeDb: number;
}

const GM_BASE = 'https://gleitz.github.io/midi-js-soundfonts/FluidR3_GM/';
const SAMPLE_NOTES = [
  'A0',
  'C1',
  'Eb1',
  'Gb1',
  'A1',
  'C2',
  'Eb2',
  'Gb2',
  'A2',
  'C3',
  'Eb3',
  'Gb3',
  'A3',
  'C4',
];
const urls = Object.fromEntries(SAMPLE_NOTES.map((n) => [n, `${n}.mp3`]));

export const BASS_VOICES: Record<BassVoiceId, BassVoiceConfig> = {
  fretless: {
    id: 'fretless',
    label: 'Fretless (FluidR3)',
    baseUrl: `${GM_BASE}fretless_bass-mp3/`,
    urls,
    volumeDb: 7,
  },
  finger: {
    id: 'finger',
    label: 'Finger electric (FluidR3)',
    baseUrl: `${GM_BASE}electric_bass_finger-mp3/`,
    urls,
    volumeDb: 8,
  },
  upright: {
    id: 'upright',
    label: 'Upright (FluidR3)',
    baseUrl: `${GM_BASE}acoustic_bass-mp3/`,
    urls,
    volumeDb: 9,
  },
};

const GENRE_BASS: Partial<Record<string, BassVoiceId>> = {
  pop: 'fretless',
  funk: 'finger',
  // Hip Hop's default; some progressions switch to the 808 or Upright (T-029).
  'hip-hop': 'finger',
};

/** The bass voice a genre plays, or null for the default electric sampler. */
export function genreBassVoice(genre: string): BassVoiceConfig | null {
  const id = GENRE_BASS[genre];
  return id ? BASS_VOICES[id] : null;
}
