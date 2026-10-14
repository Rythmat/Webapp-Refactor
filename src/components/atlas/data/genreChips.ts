import type { GenreChipId } from './genreChipIds';
import type { LaneId } from './laneIds';
import type { TimelineEvent } from './timelineIndex';

/** A genre chip: its name and the family-tree lanes it keeps. */
export interface GenreChip {
  id: GenreChipId;
  label: string;
  lanes: readonly LaneId[];
}

export const GENRE_CHIPS: readonly GenreChip[] = [
  { id: 'roots', label: 'Roots & Folk', lanes: ['roots'] },
  {
    id: 'classical',
    label: 'Classical & Screen',
    lanes: ['classical', 'stage-screen'],
  },
  {
    id: 'blues-jazz',
    label: 'Blues & Jazz',
    lanes: ['blues', 'jazz', 'jam-band'],
  },
  {
    id: 'soul-funk',
    label: 'R&B, Soul & Funk',
    lanes: ['rnb', 'neo-soul', 'funk'],
  },
  { id: 'rock', label: 'Rock & Metal', lanes: ['rock', 'metal'] },
  { id: 'pop', label: 'Pop', lanes: ['pop'] },
  { id: 'hip-hop', label: 'Hip Hop', lanes: ['hip-hop'] },
  { id: 'electronic', label: 'Electronic', lanes: ['electronic'] },
  {
    id: 'latin-caribbean',
    label: 'Latin & Caribbean',
    lanes: ['latin', 'reggae'],
  },
];

/**
 * Whether an event passes the chips picked: any of its genres in any picked
 * chip's lanes. No chips picked keeps everything.
 */
export function keepsGenres(
  picked: readonly GenreChipId[],
): (t: TimelineEvent) => boolean {
  if (!picked.length) return () => true;
  const lanes = new Set<LaneId>(
    GENRE_CHIPS.filter((c) => picked.includes(c.id)).flatMap((c) => c.lanes),
  );
  return (t) => lanes.has(t.lane) || t.lanes.some((l) => lanes.has(l));
}
