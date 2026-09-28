const ACCIDENTAL_RE = /([A-G])(bb|##|b|#)/g;

const MAP: Record<string, string> = {
  '#': '♯',
  b: '♭',
  '##': '\u{1D12A}',
  bb: '\u{1D12B}',
};

export function displayAccidentals(s: string): string {
  return s.replace(ACCIDENTAL_RE, (_, letter, acc) => letter + MAP[acc]);
}

/**
 * A scale degree or degree label with a real accidental sign: "b3" → "♭3",
 * "#11" → "♯11".
 *
 * `displayAccidentals` can't do this: it only rewrites an accidental that
 * follows a letter A-G, so that a lone "b" in ordinary text is never turned
 * into a flat. A degree's accidental leads instead of following, so it needs
 * its own pass — and degrees are written with real signs everywhere else in the
 * app ("♭7 maj" in a chord lane), so they should be here too.
 */
export function displayDegree(s: string): string {
  return s.replace(/^bb/, '\u{1D12B}').replace(/^b/, '♭').replace(/^#/, '♯');
}

/**
 * A whole hybrid chord label with real accidental signs: "5 dom7(#5)" →
 * "5 dom7(♯5)", "b7 maj" → "♭7 maj".
 *
 * Both of a label's accidentals lead rather than follow — the degree's at the
 * front, an alteration's just inside its bracket — so neither is reachable by
 * `displayAccidentals`. Only those two positions are rewritten, which keeps the
 * "b" of a quality name like "dom7b5"... and there is the reason to be careful:
 * a quality's own flat is written the same way, so the bracket is what
 * distinguishes an alteration worth a sign from a letter inside a word.
 */
export function displayDegreeLabel(s: string): string {
  return displayDegree(s).replace(/\(([b#])/g, (_, acc) =>
    acc === 'b' ? '(♭' : '(♯',
  );
}
