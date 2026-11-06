// ── Choosing a scale's notes by hand ───────────────────────────────────────
// Pure, so that every way of getting it wrong can be tested without a screen.

export type NotePickVerdict =
  | { ok: true }
  | { ok: false; extra: readonly number[]; missing: readonly number[] };

/** Pitch classes picked against the scale's: anything extra, anything left out. */
export function gradeNotePick(
  picked: Iterable<number>,
  scale: readonly number[],
): NotePickVerdict {
  const chosen = new Set(picked);
  const wanted = new Set(scale);
  const extra = [...chosen].filter((pc) => !wanted.has(pc));
  const missing = [...wanted].filter((pc) => !chosen.has(pc));
  return extra.length || missing.length
    ? { ok: false, extra, missing }
    : { ok: true };
}

/** What a one-octave keyboard shows for a tonic: from it, up to it again. */
export function pickerRange(tonicPc: number): readonly number[] {
  const tonic = 60 + tonicPc;
  // A black tonic starts from the white key under it, so that the row starts clean.
  const black = [1, 3, 6, 8, 10].includes(tonicPc);
  const from = black ? tonic - 1 : tonic;
  const to = black ? tonic + 13 : tonic + 12;
  return Array.from({ length: to - from + 1 }, (_, i) => from + i);
}

export const isBlackKey = (midi: number) =>
  [1, 3, 6, 8, 10].includes(((midi % 12) + 12) % 12);
