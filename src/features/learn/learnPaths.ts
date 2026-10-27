import { START_HERE_TAB } from '@/curriculum/musicLiteracy/literacyPath';
import {
  learnPageRoute,
  type LearnInstrument,
} from '@/features/learn/useInstrumentStore';

// ── Learn's tabs as paths (owner, 2026-10-24) ──────────────────────────────
// Each Learn tab has its own page per instrument: /learn/keyboard/songs,
// /learn/guitar/theory… where it was /learn?tab=Songs. An old ?tab= link
// forwards to its page on the chosen instrument (learnTabRedirect).

/** Each tab (as ?tab= named it) and its path segment. */
export const LEARN_TAB_SEGMENTS = {
  [START_HERE_TAB]: 'start-here',
  Songs: 'songs',
  Genre: 'genre',
  Theory: 'theory',
  Technique: 'technique',
  WorldHarmony: 'world-harmony',
} as const;

export type LearnTab = keyof typeof LEARN_TAB_SEGMENTS;

export const LEARN_TABS = Object.keys(LEARN_TAB_SEGMENTS) as LearnTab[];

export const isLearnTab = (tab: string | null | undefined): tab is LearnTab =>
  !!tab && Object.prototype.hasOwnProperty.call(LEARN_TAB_SEGMENTS, tab);

/** A tab's page on an instrument: /learn/keyboard/songs. */
export const learnTabRoute = (instrument: LearnInstrument, tab: LearnTab) =>
  `${learnPageRoute(instrument)}/${LEARN_TAB_SEGMENTS[tab]}`;

/** The tab whose page a path is (/learn/guitar/genre → Genre), if any. */
export function learnTabOfPath(pathname: string): LearnTab | null {
  const segment = pathname.match(
    /^\/learn\/(?:keyboard|guitar|bass)\/([^/]+)\/?$/,
  )?.[1];
  return LEARN_TABS.find((t) => LEARN_TAB_SEGMENTS[t] === segment) ?? null;
}

/**
 * Where an old ?tab= link goes: that tab's page on the instrument, its other
 * params kept (/learn?tab=Songs&q=jolene → /learn/keyboard/songs?q=jolene).
 * Null when the search names no tab.
 */
export function learnTabRedirect(
  instrument: LearnInstrument,
  search: string,
): string | null {
  const params = new URLSearchParams(search);
  const tab = params.get('tab');
  if (!isLearnTab(tab)) return null;
  params.delete('tab');
  const rest = params.toString();
  return `${learnTabRoute(instrument, tab)}${rest ? `?${rest}` : ''}`;
}
