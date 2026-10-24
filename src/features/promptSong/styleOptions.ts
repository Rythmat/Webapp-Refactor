import {
  parseMusicPrompt,
  type PromptFlavor,
  type PromptGenre,
} from './parseMusicPrompt';

// ── The styles a Studio session can be in (owner, 2026-10-23) ──────────────
//
// The prompt box's style tag: what its suggestions and parts keep to when
// a prompt names no style of its own. Picked from this list, or set from the
// prompt a session was generated from. Each `text` is how the prompt reader
// (parseMusicPrompt) reads the style back, so the tag and a typed prompt
// name a style the same way.

export interface StyleOption {
  id: string;
  label: string;
  /** The words that read as this style. */
  text: string;
  genre: PromptGenre;
  flavor: PromptFlavor | null;
}

const style = (
  id: string,
  label: string,
  genre: PromptGenre,
  flavor: PromptFlavor | null = null,
  text = label,
): StyleOption => ({ id, label, text, genre, flavor });

/** The genres, then the styles within them, in the menu's order. */
export const STYLE_OPTIONS: readonly StyleOption[] = [
  style('pop', 'Pop', 'pop'),
  style('rock', 'Rock', 'rock'),
  style('hip-hop', 'Hip Hop', 'hip-hop'),
  style('rnb', 'R&B', 'rnb'),
  style('jazz', 'Jazz', 'jazz'),
  style('blues', 'Blues', 'blues'),
  style('folk', 'Folk', 'folk'),
  style('funk', 'Funk', 'funk'),
  style('neo-soul', 'Neo-Soul', 'neo-soul'),
  style('electronic', 'Electronic', 'electronic'),
  style('latin', 'Latin', 'latin'),
  style('reggae', 'Reggae', 'reggae'),
  style('jam-band', 'Jam Band', 'jam-band'),
  style('african', 'Afrobeat', 'african'),
  style('lofi', 'Lo-fi', 'hip-hop', 'lofi'),
  style('trap', 'Trap', 'hip-hop', 'trap'),
  style('boom-bap', 'Boom Bap', 'hip-hop', 'boom-bap'),
  style('pop-ballad', 'Pop Ballad', 'pop', 'ballad'),
  style('rnb-ballad', 'R&B Ballad', 'rnb', 'ballad'),
  style('jazz-ballad', 'Jazz Ballad', 'jazz', 'ballad'),
  style('gospel', 'Gospel', 'rnb', 'gospel'),
  style('dance-pop', 'Dance Pop', 'pop', 'dance', 'disco pop'),
  style('house', 'House', 'electronic', 'house'),
  style('dnb', 'Drum and Bass', 'electronic', 'dnb'),
  style('punk', 'Punk', 'rock', 'punk'),
  style('indie', 'Indie', 'rock', 'indie'),
  style('reggaeton', 'Reggaeton', 'latin', 'reggaeton'),
  style('cumbia', 'Cumbia', 'latin', 'cumbia'),
  style('bossa', 'Bossa Nova', 'latin', 'bossa'),
  style('salsa', 'Salsa', 'latin', 'salsa'),
];

/** The genres, for the menu's first group; the rest are styles within them. */
export const GENRE_STYLES = STYLE_OPTIONS.filter((s) => s.flavor === null);
export const FLAVOR_STYLES = STYLE_OPTIONS.filter((s) => s.flavor !== null);

/**
 * The style the text names (a session's prompt, a project's name), as one
 * of the options: its genre and style within it, else just its genre; null
 * when it names no genre.
 */
export function styleOptionOf(
  text: string | null | undefined,
): StyleOption | null {
  if (!text) return null;
  const read = parseMusicPrompt(text);
  if (!read.genre) return null;
  return (
    STYLE_OPTIONS.find(
      (s) =>
        s.genre === read.genre && s.flavor !== null && s.flavor === read.flavor,
    ) ??
    STYLE_OPTIONS.find((s) => s.genre === read.genre && s.flavor === null) ??
    null
  );
}
