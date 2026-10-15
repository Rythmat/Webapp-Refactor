/**
 * The lanes of the Globe's timeline: music's family tree (data/lineage.ts),
 * listed top to bottom as the river stacks them.
 *
 * A file of its own so the URL code (navigation/atlasFrame.ts) can check a
 * `lane=` param without loading the genre tables the classifier needs.
 */
export const LANE_IDS = [
  'pop',
  'stage-screen',
  'electronic',
  'classical',
  'roots',
  'reggae',
  'latin',
  'jazz',
  'blues',
  'jam-band',
  'rock',
  'metal',
  'rnb',
  'neo-soul',
  'funk',
  'hip-hop',
] as const;

export type LaneId = (typeof LANE_IDS)[number];

export const isLaneId = (value: string): value is LaneId =>
  (LANE_IDS as readonly string[]).includes(value);
