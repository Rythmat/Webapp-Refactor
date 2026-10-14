/**
 * The picture an event shows: its curated image when the content has one,
 * else its video's YouTube poster, at the size the place it shows needs.
 *
 * - `thumb` — 120×90, for the trail and list rows (56–80 px).
 * - `lane` — 320×180 and 16:9 with no black bars, for the timeline's round
 *   bubbles (40 px at 2× density).
 * - `stage` — 480×360, letterboxed to 4:3, for the event stage and the video
 *   facade; shown with `object-cover` and scaled past the bars.
 */
export type EventImageSize = 'thumb' | 'lane' | 'stage';

const POSTER_FILE: Record<EventImageSize, string> = {
  thumb: 'default.jpg',
  lane: 'mqdefault.jpg',
  stage: 'hqdefault.jpg',
};

export function posterUrl(videoId: string, size: EventImageSize): string {
  return `https://i.ytimg.com/vi/${videoId}/${POSTER_FILE[size]}`;
}

/**
 * What an event needs for a picture. `image` is the curated one the content
 * back office will add (plan phase 8, a content-contract change); events do
 * not carry it yet, and the poster stands in.
 */
export interface EventPictureSource {
  videoId?: string;
  image?: string;
}

export function eventImage(
  event: EventPictureSource | undefined,
  size: EventImageSize,
): string | undefined {
  if (!event) return undefined;
  if (event.image) return event.image;
  return event.videoId ? posterUrl(event.videoId, size) : undefined;
}
