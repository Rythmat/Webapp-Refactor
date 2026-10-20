// ── The pads on the computer keyboard ──────────────────────────────────────
// With Pads, the home row presses them, left to right: A S D F G H J K L ;
// (ten keys, the most pads a level has). The same row plays the piano's
// white keys with Keyboard (typingKeys.ts, A = C), so a hand on the home
// row is ready either way. Matched by where the key sits (event.code), so a
// French or German layout presses the same pads.

export const PAD_KEY_CODES: readonly string[] = [
  'KeyA',
  'KeyS',
  'KeyD',
  'KeyF',
  'KeyG',
  'KeyH',
  'KeyJ',
  'KeyK',
  'KeyL',
  'Semicolon',
];

/** The pad a key presses (its index), or null. */
export function padOfKey(code: string, padCount: number): number | null {
  const index = PAD_KEY_CODES.indexOf(code);
  return index >= 0 && index < padCount ? index : null;
}

/** The letter shown on pad `index` ("A", ";"), or null past the row. */
export function padKeyLabel(index: number): string | null {
  const code = PAD_KEY_CODES[index];
  if (!code) return null;
  return code === 'Semicolon' ? ';' : code.replace(/^Key/, '');
}
