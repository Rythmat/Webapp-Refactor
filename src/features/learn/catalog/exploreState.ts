import { LearnRoutes } from '@/constants/routes';
import type { LearnChoice } from '@/features/learn/useInstrumentStore';

// ── Explore's address ──────────────────────────────────────────────────────
// /explore?i=guitar&c=theory&q=… : which topic, which of its sections,
// and a search. Words a teacher can read in a link, so `keyboard`, not the
// store's `piano`. The old one-page anchors (/learn#guitar-theory) still land.

const TOPIC_WORDS: Readonly<Record<LearnChoice, string>> = {
  piano: 'keyboard',
  guitar: 'guitar',
  bass: 'bass',
  ukulele: 'ukulele',
  audio: 'audio',
};

/** A topic as its address writes it. */
export const topicWord = (topic: LearnChoice) => TOPIC_WORDS[topic];

/** An address's topic word (or the store's own name) as a topic. */
export function topicOfWord(
  word: string | null | undefined,
): LearnChoice | null {
  if (!word) return null;
  const lower = word.toLowerCase();
  if (lower === 'piano') return 'piano';
  const hit = (Object.keys(TOPIC_WORDS) as LearnChoice[]).find(
    (topic) => TOPIC_WORDS[topic] === lower,
  );
  return hit ?? null;
}

/** The section ids the old anchors named, as Explore's. */
const OLD_SECTIONS: Readonly<Record<string, string>> = {
  theory: 'theory',
  genres: 'genres',
  genre: 'genres',
  technique: 'technique',
  courses: 'courses',
};

/**
 * An old one-page anchor as a topic and section: `#guitar-theory`,
 * `#piano-genres`, `#audio`, `#audio-hands-on`. Null for anything else.
 */
export function parseLearnHash(
  hash: string,
): { topic: LearnChoice; section: string | null } | null {
  let raw = hash.replace(/^#/, '');
  try {
    raw = decodeURIComponent(raw);
  } catch {
    // Kept as written.
  }
  if (!raw) return null;
  const dash = raw.indexOf('-');
  const head = dash < 0 ? raw : raw.slice(0, dash);
  const topic = topicOfWord(head);
  if (!topic) return null;
  const rest = dash < 0 ? null : raw.slice(dash + 1);
  return { topic, section: rest ? (OLD_SECTIONS[rest] ?? rest) : null };
}

/** Explore's address for a topic, and optionally a section and search. */
export function exploreHref(
  topic?: LearnChoice | null,
  section?: string | null,
  q?: string | null,
): string {
  const query: Record<string, string> = {};
  if (topic) query.i = topicWord(topic);
  if (section) query.c = section;
  if (q) query.q = q;
  return LearnRoutes.root(undefined, query);
}
