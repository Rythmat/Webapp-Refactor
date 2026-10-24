import {
  looksLikeMusicPrompt,
  PROMPT_TEXT_MAX,
} from '@/features/promptSong/parseMusicPrompt';
import type { MatchResult } from '../dashboard/assistant/types';
import {
  PROMPT_SUGGESTIONS,
  type PromptSuggestion,
  type PromptTarget,
} from './promptSuggestions';

// ── Where a Home prompt goes (owner, 2026-10-23) ───────────────────────────
//
// A prompt's first word picks the destination when none is picked under
// the bar (owner, 2026-10-23): "Make …" the Studio, "Teach …" Learn, "Show …"
// or "How …" the Globe, "Play …" the Arcade. A destination picked under the
// bar wins.
//
// The prompt bar's Go, in order:
//   1. a suggestion the student took (Tab or the dice), unedited: its route;
//   2. text that is a suggestion's, typed out: that suggestion's route;
//   3. a song prompt — Studio picked, or no destination and text that asks
//      for music made ("write a sad lo-fi beat in D Dorian") — opens the
//      Studio on a song idea built from it (features/promptSong);
//   4. the old dashboard assistant's keyword match (genres, modes, games,
//      sections), kept to the destination picked, if any;
//   5. else the destination's own way in: the Globe searches the text, Learn
//      and no destination search the app, the Arcade its games.
// Steps 4 and 5 stand in for the prompt agent that will read free text.

/** The area of the app a route is in. */
export function areaOf(route: string): PromptTarget | null {
  if (route.startsWith('/studio')) return 'studio';
  if (/^\/(learn|songs|curriculum)\b/.test(route)) return 'learn';
  if (route.startsWith('/atlas')) return 'globe';
  if (route.startsWith('/arcade')) return 'arcade';
  return null;
}

/** The destination a prompt's first word asks for, if any. */
export function intentOf(text: string): PromptTarget | null {
  const first = text.trim().toLowerCase().split(/\s+/)[0] ?? '';
  if (first === 'make') return 'studio';
  if (first === 'teach') return 'learn';
  if (first === 'show' || first === 'how') return 'globe';
  if (first === 'play') return 'arcade';
  return null;
}

/** Words around a Globe prompt's topic ("show me the history of …"). */
const GLOBE_FILLER = new Set(
  (
    'show me us how did does do is was were has have can could the a an ' +
    'history story roots origins origin of music in on from to where when ' +
    'what who why start started begin began come came get got become ' +
    'spread travel traveled travelled grow grew rise rose sound sounds ' +
    'around world globe about'
  ).split(' '),
);

/**
 * What to search the Globe for: the prompt without its lead-in and filler
 * ("Show me the history of jazz" → "jazz"). The Globe's search matches a
 * phrase, not a sentence. The whole text when nothing is left.
 */
export function globeQuery(text: string): string {
  const words = text
    .trim()
    .replace(/[?!.]+$/, '')
    .split(/\s+/)
    .filter((w) => !GLOBE_FILLER.has(w.toLowerCase()));
  return words.length ? words.join(' ') : text.trim();
}

const search = (text: string) => `/search?q=${encodeURIComponent(text)}`;

/** The Studio, building a song idea from the prompt. */
export const promptSongRoute = (text: string) =>
  `/studio/editor?prompt=${encodeURIComponent(text.trim().slice(0, PROMPT_TEXT_MAX))}`;

/** A destination's way in when nothing matches the text. */
function fallback(text: string, target: PromptTarget | null): string {
  switch (target) {
    case 'studio':
      return promptSongRoute(text);
    case 'globe':
      return `/atlas/globe?q=${encodeURIComponent(globeQuery(text))}`;
    case 'arcade':
      return '/arcade';
    case 'learn':
    case null:
      return search(text);
  }
}

export function resolvePromptRoute({
  text,
  target,
  accepted,
  match,
}: {
  text: string;
  /** The destination picked under the bar, if any. */
  target: PromptTarget | null;
  /** The suggestion the student last took, if any. */
  accepted: PromptSuggestion | null;
  /** The assistant's keyword matcher (useAssistantMatcher). */
  match: (text: string) => MatchResult[];
}): string {
  const typed = text.trim();
  // The chip under the bar, else the prompt's first word.
  const dest = target ?? intentOf(typed);
  const fits = (route: string) => dest === null || areaOf(route) === dest;

  if (accepted && accepted.text === typed && fits(accepted.route)) {
    return accepted.route;
  }
  const same = PROMPT_SUGGESTIONS.find(
    (s) => s.text.toLowerCase() === typed.toLowerCase() && fits(s.route),
  );
  if (same) return same.route;

  if (dest === 'studio' || (dest === null && looksLikeMusicPrompt(typed))) {
    return promptSongRoute(typed);
  }

  const best = match(typed).find((m) => fits(m.entry.route));
  if (best) return best.entry.route;

  return fallback(typed, dest);
}
