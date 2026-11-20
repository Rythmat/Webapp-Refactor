import {
  encodePlace,
  stopKey,
  type AtlasStop,
} from '@/components/atlas/navigation/atlasStop';
import type { SelectedLocation } from '@/components/atlas/types';

/**
 * A student's own tour of the Globe (owner, 2026-11-16): the Story tab. Its
 * stops are what they added as they explored — an event, a place, an artist,
 * or a link between two places from the Connections card — each with a title
 * and a note of their own, and it plays as a Music Atlas tour does.
 */

/** One end of a link, kept as it was when added: the network loads late. */
export interface StoryLinkEnd {
  label: string;
  lat: number;
  lng: number;
  /** The place a click on it opens; a region has none. */
  place: SelectedLocation | null;
}

/** What a stop is: one of the Globe's own stops, or a link. */
export type StoryTarget =
  | Extract<AtlasStop, { kind: 'event' | 'artist' | 'place' }>
  | {
      kind: 'link';
      /** The network's `${from}>${to}` (network/types.ts). */
      linkId: string;
      from: StoryLinkEnd;
      to: StoryLinkEnd;
      /** An influence it carries, for the stop's picture. */
      eventId?: string;
    };

export interface StoryStop {
  id: string;
  target: StoryTarget;
  title: string;
  note: string;
  addedAt: number;
}

export interface Story {
  id: string;
  title: string;
  description: string;
  stops: StoryStop[];
  createdAt: number;
  updatedAt: number;
}

/** A target's identity: the same thing added twice is one stop. */
export function storyTargetKey(target: StoryTarget): string {
  return target.kind === 'link' ? `link:${target.linkId}` : stopKey(target);
}

/** The Globe stop a target is, or null for a link. */
export const targetStop = (target: StoryTarget): AtlasStop | null =>
  target.kind === 'link' ? null : target;

/** Whether a Globe stop can go on a Story. */
export function isStoryStop(
  stop: AtlasStop,
): stop is Extract<AtlasStop, { kind: 'event' | 'artist' | 'place' }> {
  return (
    stop.kind === 'event' || stop.kind === 'artist' || stop.kind === 'place'
  );
}

/* ── Checks for what comes back from storage ─────────────────────────────── */

const isString = (v: unknown): v is string => typeof v === 'string';
const isNumber = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v);

function isPlace(value: unknown): value is SelectedLocation {
  const p = value as SelectedLocation | null;
  if (!p || typeof p !== 'object') return false;
  if (p.type === 'city') return isString(p.id);
  if (p.type === 'state') return isString(p.name);
  if (p.type === 'country') return isString(p.name) && isString(p.iso);
  return false;
}

function isLinkEnd(value: unknown): value is StoryLinkEnd {
  const e = value as StoryLinkEnd | null;
  return (
    !!e &&
    isString(e.label) &&
    isNumber(e.lat) &&
    isNumber(e.lng) &&
    (e.place === null || isPlace(e.place))
  );
}

export function isStoryTarget(value: unknown): value is StoryTarget {
  const t = value as StoryTarget | null;
  if (!t || typeof t !== 'object') return false;
  switch (t.kind) {
    case 'event':
      return isString(t.eventId);
    case 'artist':
      return isString(t.artist);
    case 'place':
      // encodePlace must not throw on it: it keys the stop.
      return isPlace(t.place) && !!encodePlace(t.place);
    case 'link':
      return (
        isString(t.linkId) &&
        isLinkEnd(t.from) &&
        isLinkEnd(t.to) &&
        (t.eventId === undefined || isString(t.eventId))
      );
    default:
      return false;
  }
}

function isStoryStopRecord(value: unknown): value is StoryStop {
  const s = value as StoryStop | null;
  return (
    !!s &&
    isString(s.id) &&
    isStoryTarget(s.target) &&
    isString(s.title) &&
    isString(s.note) &&
    isNumber(s.addedAt)
  );
}

/** A stored Story, its bad stops dropped; null when it isn't one. */
export function readStory(value: unknown): Story | null {
  const s = value as Story | null;
  if (
    !s ||
    !isString(s.id) ||
    !isString(s.title) ||
    !isNumber(s.createdAt) ||
    !isNumber(s.updatedAt) ||
    !Array.isArray(s.stops)
  ) {
    return null;
  }
  return {
    id: s.id,
    title: s.title,
    description: isString(s.description) ? s.description : '',
    stops: s.stops.filter(isStoryStopRecord),
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
  };
}
