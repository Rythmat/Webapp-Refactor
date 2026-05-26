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
