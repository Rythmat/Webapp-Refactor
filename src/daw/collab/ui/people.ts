// Small helpers for showing who is in a session (the People panel).

/**
 * The room code in what the student typed or pasted: the code itself, or a
 * session link that carries it (`…/studio?collab=<code>`).
 */
export function joinCodeOf(typed: string): string {
  const text = typed.trim();
  if (!text.includes('collab=')) return text;
  try {
    const url = new URL(text, 'https://x.invalid');
    return url.searchParams.get('collab')?.trim() || text;
  } catch {
    return text;
  }
}

/** Up to two letters for an avatar: 'Ana Lee' → 'AL'. */
export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters =
    words.length > 1
      ? words[0][0] + words[words.length - 1][0]
      : words[0]?.slice(0, 2);
  return (letters ?? '?').toUpperCase();
}
