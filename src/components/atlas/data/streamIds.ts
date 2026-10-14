/**
 * The music streams' ids: the lanes of the Globe's timeline (data/streams.ts).
 *
 * A file of its own so the URL code (navigation/atlasFrame.ts) can check a
 * `streams=` param without loading the genre tables the classifier needs.
 */
export const STREAM_IDS = [
  'roots',
  'classical',
  'blues-jazz-soul',
  'rock-pop',
  'beats',
] as const;

export type StreamId = (typeof STREAM_IDS)[number];

export const isStreamId = (value: string): value is StreamId =>
  (STREAM_IDS as readonly string[]).includes(value);
