/**
 * Players: the people in the back office's bands — for now generic
 * placeholders, one per instrument per genre ('Latin-Bassist-1',
 * 'Funk-Drummer-1'), later named personas. A player owns the items that are
 * theirs — the drum grooves, bass lines, comping patterns and parts they
 * play — and a part captured "as" a player is filed under them.
 *
 * A player lists its items rather than each item naming its player, so the
 * items' own formats (and the content API's part schema) stay as they are.
 * An item belongs to one player at most, and to none until someone files it:
 * a player is a choice, never an obligation.
 */

import type { BandInstrument, BandSource } from '../band/band';

/** An item a player owns: the same reference a band layer plays. */
export type PlayerItem = BandSource;

export interface Player {
  /** File name: lowercase, digits, _ and -. 'latin-bassist-1'. */
  id: string;
  /** What the console shows: 'Latin-Bassist-1', or a persona's name. */
  name: string;
  instrument: BandInstrument;
  /** The genre they play, as lessons name it ('latin', 'hip-hop', 'theory'). */
  genre?: string;
  /** Only placeholders for now; personas and real players come later. */
  kind: 'placeholder';
  description?: string;
  /** Position in the list; lower first. */
  order?: number;
  items: PlayerItem[];
}

export const PLAYER_ID_PATTERN = /^[a-z0-9][a-z0-9_-]*$/;

/** What a player is called by instrument: 'Drummer', 'Bassist'… */
export const PLAYER_ROLE: Record<BandInstrument, string> = {
  drums: 'Drummer',
  percussion: 'Percussionist',
  bass: 'Bassist',
  keys: 'Pianist',
  guitar: 'Guitarist',
  synth: 'Synth Player',
  strings: 'String Player',
  horns: 'Horn Player',
};

export const sameItem = (a: PlayerItem, b: PlayerItem) =>
  a.kind === b.kind && a.id === b.id;

/** A player's items, the item added (once) or taken out. */
export function withItem(player: Player, item: PlayerItem): Player {
  return player.items.some((i) => sameItem(i, item))
    ? player
    : { ...player, items: [...player.items, item] };
}

export function withoutItem(player: Player, item: PlayerItem): Player {
  return { ...player, items: player.items.filter((i) => !sameItem(i, item)) };
}
