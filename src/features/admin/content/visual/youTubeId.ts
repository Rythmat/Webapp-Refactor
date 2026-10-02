/**
 * A YouTube video's id from what an author pastes: a full URL (watch,
 * youtu.be, embed, shorts) or the bare 11-character id, because someone
 * copying from the address bar should not have to know which of those the
 * schema stores. Null when it is neither.
 *
 * Pure, and apart from the link field (`YouTubeLinkField.tsx`, which
 * re-exports it) so the Table's Video cell reads a paste the same way
 * without loading the player.
 */

const ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

export function extractYouTubeId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;
  if (ID_PATTERN.test(trimmed)) return trimmed;
  const match = trimmed.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/|v\/))([a-zA-Z0-9_-]{11})/,
  );
  return match?.[1] ?? null;
}
