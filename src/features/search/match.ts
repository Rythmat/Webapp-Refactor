/**
 * Case-insensitive substring scoring, mirroring the song library's
 * lowercase `.includes()` approach (SongLibraryPage `filterSongs`). Artist and
 * title strings carry non-standard capitalizations, so all matching is
 * lowercased on both sides.
 *
 * `query` MUST already be lowercased and trimmed by the caller.
 * Returns -1 for no match; higher is a better match.
 */
export function scoreText(haystack: string, query: string): number {
  const h = haystack.toLowerCase();
  const idx = h.indexOf(query);
  if (idx === -1) return -1;
  if (h === query) return 100; // exact
  if (idx === 0) return 80; // prefix
  if (h.charAt(idx - 1) === ' ') return 60; // word-boundary prefix
  return Math.max(10, 40 - idx); // interior; earlier is better
}

/** Best {@link scoreText} across a set of keywords. */
export function scoreKeywords(keywords: string[], query: string): number {
  let best = -1;
  for (const k of keywords) {
    const s = scoreText(k, query);
    if (s > best) best = s;
  }
  return best;
}
