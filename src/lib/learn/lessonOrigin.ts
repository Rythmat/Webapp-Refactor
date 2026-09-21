/**
 * Where a lesson was opened from. The Studio's Insight panel links into a
 * lesson with the song and chord it came from, so the lesson can say why
 * you're there and send you back to your track.
 */
export interface LessonOrigin {
  /** Project name, e.g. "Midnight Groove". */
  song: string;
  /** The chord the link was on, as the card labels it, e.g. "2 min9". */
  chord?: string;
}

const FROM = 'from';
const STUDIO = 'studio';

/** `path` with the Studio origin appended as query parameters. */
export function withStudioOrigin(path: string, origin: LessonOrigin): string {
  const params = new URLSearchParams({ [FROM]: STUDIO, song: origin.song });
  if (origin.chord) params.set('chord', origin.chord);
  return `${path}${path.includes('?') ? '&' : '?'}${params}`;
}

/** The Studio origin carried by a lesson URL, if any. */
export function readLessonOrigin(params: URLSearchParams): LessonOrigin | null {
  if (params.get(FROM) !== STUDIO) return null;
  const song = params.get('song')?.trim();
  if (!song) return null;
  const chord = params.get('chord')?.trim();
  return chord ? { song, chord } : { song };
}
