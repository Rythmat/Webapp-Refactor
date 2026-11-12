/**
 * The Globe on a slide (owner, 2026-11-10: "the same Globe as the Globe
 * section"): which of its own addresses a slide's place opens, and the
 * message a slide sends its Globe to move on. Pure.
 *
 * A stop's `ref` is one of:
 *   - `place:<the Globe's place>` (`place:city:detroit`),
 *   - `event:<event id>`,
 *   - `at:<lat>,<lng>`: a town the Globe has no city for (Gary, Indiana),
 *     opened as the state it lies in once the Globe's outlines have loaded.
 * The Globe applies them as its own `?place=` / `?event=`
 * (navigation/atlasStop.ts), so a stop looks exactly as it does in the
 * Globe section: the region lifted, the pins, the card.
 */

/** A coordinate stop's position, or null when the ref is not one. */
export const stopAt = (ref: string): [number, number] | null => {
  const match = /^at:(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)$/.exec(ref);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  return Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? [lat, lng] : null;
};

/**
 * What the Globe page's address takes for a stop, or null for a bad ref.
 * A coordinate stop keeps its position as `?at=` until the page resolves it.
 */
export const stopParams = (ref: string): Record<string, string> | null => {
  const at = stopAt(ref);
  if (at) return { at: `${at[0]},${at[1]}` };
  const [kind, ...rest] = ref.split(':');
  const value = rest.join(':');
  if (!value) return null;
  if (kind === 'place') return { place: value };
  if (kind === 'event') return { event: value };
  return null;
};

/** A coordinate stop, as a ref. */
export const atRef = ([lat, lng]: readonly [number, number]): string =>
  `at:${Number(lat.toFixed(4))},${Number(lng.toFixed(4))}`;

/** A slide's message to its Globe: go to the story's stop `at`. */
export const SLIDE_GLOBE_GO = 'slide-globe:go';

export interface SlideGlobeGo {
  type: typeof SLIDE_GLOBE_GO;
  at: number;
}

export const isSlideGlobeGo = (data: unknown): data is SlideGlobeGo =>
  typeof data === 'object' &&
  data !== null &&
  (data as { type?: unknown }).type === SLIDE_GLOBE_GO &&
  Number.isInteger((data as { at?: unknown }).at) &&
  ((data as { at: number }).at ?? -1) >= 0;

/**
 * The story's places, in order, for the framed Globe's address
 * (`?path=lat,lng;lat,lng`): it draws the path between them and flies along
 * it, the Globe's own places and events out of the way.
 */
export const encodePath = (
  path: readonly (readonly [number, number])[],
): string =>
  path
    .map(([lat, lng]) => `${Number(lat.toFixed(4))},${Number(lng.toFixed(4))}`)
    .join(';');

export const decodePath = (text: string | null): [number, number][] =>
  (text ?? '')
    .split(';')
    .map((pair) => stopAt(`at:${pair}`))
    .filter((p): p is [number, number] => p !== null);

/** A stop ref the publish whitelist keeps: a place or an event, by id. */
export const isStopRef = (ref: unknown): ref is string =>
  typeof ref === 'string' &&
  (stopAt(ref) !== null ||
    (/^(place|event):[A-Za-z0-9:_.\- ]+$/.test(ref) &&
      stopParams(ref) !== null));

/** The framed Globe hands the lesson's keys back to the slide. */
export const SLIDE_GLOBE_KEY = 'slide-globe:key';

/** The keys that move a lesson on (Present, the projector). */
export const LESSON_KEYS: readonly string[] = [
  'ArrowLeft',
  'ArrowRight',
  ' ',
  'PageUp',
  'PageDown',
  'Escape',
];

export interface SlideGlobeKey {
  type: typeof SLIDE_GLOBE_KEY;
  key: string;
}

export const isSlideGlobeKey = (data: unknown): data is SlideGlobeKey =>
  typeof data === 'object' &&
  data !== null &&
  (data as { type?: unknown }).type === SLIDE_GLOBE_KEY &&
  LESSON_KEYS.includes(String((data as { key?: unknown }).key));
