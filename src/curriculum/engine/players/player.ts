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
  /** Their parts gathered by idea, band take to easiest version. */
  families?: PartFamily[];
}

/**
 * One idea a player plays in a style — the Cumbia offbeat comp — from the
 * take the band plays down to the easiest version a lesson teaches. Whether
 * a part is backing or a target is the student's seat, not the part's: the
 * keys take is a piano student's target and a bass student's backing. What
 * differs is how it was played, and that is what a version says.
 */
export interface PartFamily {
  /** Unique within the player; kebab-case. */
  id: string;
  /** 'Cumbia offbeat comp'. */
  name: string;
  /** The style across levels (lessonStyles styleKey): 'latin-cumbia'. */
  style?: string;
  versions: FamilyVersion[];
}

export interface FamilyVersion {
  /** One of the player's parts. */
  part: string;
  /**
   * 'band': as played in the band — backing, the demo, the Studio.
   * 'teaching': made learnable — a lesson target. 'both': a take simple and
   * clean enough to be each (its written notes graded, its feel heard).
   */
  use: 'band' | 'teaching' | 'both';
  /** The levels it teaches or plays in; one idea can climb levels. */
  levels: number[];
}

export const VERSION_USE: Record<FamilyVersion['use'], string> = {
  band: 'Band take',
  teaching: 'Teaching version',
  both: 'Band take & teaching',
};

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
  const rest = {
    ...player,
    items: player.items.filter((i) => !sameItem(i, item)),
  };
  return item.kind === 'part' ? withoutVersion(rest, item.id) : rest;
}

/** A family id not yet taken: 'cumbia-offbeat-comp', '…-2'. */
export function familyIdFor(name: string, families: readonly PartFamily[]) {
  const base =
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'family';
  const taken = new Set(families.map((f) => f.id));
  let id = base;
  for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
  return id;
}

/** The family a part is a version in, if any. */
export const familyOf = (player: Player, partId: string) =>
  player.families?.find((f) => f.versions.some((v) => v.part === partId));

/** The player with a part out of its family; a family left empty goes. */
export function withoutVersion(player: Player, partId: string): Player {
  if (!familyOf(player, partId)) return player;
  const families = (player.families ?? [])
    .map((f) => ({
      ...f,
      versions: f.versions.filter((v) => v.part !== partId),
    }))
    .filter((f) => f.versions.length);
  return { ...player, families: families.length ? families : undefined };
}

/**
 * The player with a version filed in a family — one they have, by id, or a
 * new one, by name — and out of any other: a part is in one family at most.
 * The part becomes one of their items if it wasn't.
 */
export function withVersion(
  player: Player,
  family: { id: string } | { name: string; style?: string },
  version: FamilyVersion,
): Player {
  const owned = withItem(player, { kind: 'part', id: version.part });
  const into =
    'id' in family && owned.families?.some((f) => f.id === family.id)
      ? family.id
      : null;
  // Changed in place where it already is; added to the end of a family new
  // to it; taken out of every other.
  const families = (owned.families ?? [])
    .map((f) => {
      if (f.id !== into)
        return {
          ...f,
          versions: f.versions.filter((v) => v.part !== version.part),
        };
      return {
        ...f,
        versions: f.versions.some((v) => v.part === version.part)
          ? f.versions.map((v) => (v.part === version.part ? version : v))
          : [...f.versions, version],
      };
    })
    .filter((f) => f.versions.length);
  if (into) return { ...owned, families };
  const name = 'name' in family ? family.name : family.id;
  const style = 'style' in family ? family.style : undefined;
  return {
    ...owned,
    families: [
      ...families,
      {
        id: familyIdFor(name, families),
        name,
        ...(style ? { style } : {}),
        versions: [version],
      },
    ],
  };
}
