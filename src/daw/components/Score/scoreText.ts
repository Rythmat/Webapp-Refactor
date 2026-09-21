// ── Text and navigation marks ──────────────────────────────────────────────
// Words and signs hung off a barline: a free text directive the user types,
// the segno and coda signs, and the jumps that send a reader back to them.
// They share one list because they share a home — above the staff at a given
// bar — and because a reader meets them as one vocabulary.

export type ScoreMarkKind =
  | 'text'
  | 'segno'
  | 'coda'
  | 'dc'
  | 'ds'
  | 'dcAlCoda'
  | 'dsAlCoda';

export interface ScoreTextMark {
  id: string;
  /** The bar it stands over. */
  measureIdx: number;
  kind: ScoreMarkKind;
  /** What the user typed; only a 'text' mark has one. */
  text?: string;
}

export interface MarkStyle {
  name: string;
  /** SMuFL glyph, for the signs. */
  glyph?: string;
  /** The words, for the jumps. */
  words?: string;
}

/**
 * How each mark is written. The signs are glyphs; the jumps are words, set in
 * italics as they always are, and pointing at the signs by name.
 */
export const MARK_STYLES: Record<ScoreMarkKind, MarkStyle> = {
  text: { name: 'Staff text' },
  segno: { name: 'Segno', glyph: '' },
  coda: { name: 'Coda', glyph: '' },
  dc: { name: 'Da Capo', words: 'D.C.' },
  ds: { name: 'Dal Segno', words: 'D.S.' },
  dcAlCoda: { name: 'D.C. al Coda', words: 'D.C. al Coda' },
  dsAlCoda: { name: 'D.S. al Coda', words: 'D.S. al Coda' },
};

/** What a mark reads as on the page. */
export function markLabel(mark: ScoreTextMark): string {
  const style = MARK_STYLES[mark.kind];
  if (mark.kind === 'text') return mark.text ?? '';
  return style.glyph ?? style.words ?? '';
}

/** A sign is drawn in the music font; words and free text are not. */
export const isGlyphMark = (kind: ScoreMarkKind): boolean =>
  MARK_STYLES[kind].glyph !== undefined;

/**
 * A jump is read at the end of the bar it stands over, so it sits to the
 * right; everything else stands at the left of its bar, where a reader looks
 * for it on the way in.
 */
export const marksBarEnd = (kind: ScoreMarkKind): boolean =>
  kind === 'dc' || kind === 'ds' || kind === 'dcAlCoda' || kind === 'dsAlCoda';

let counter = 0;
export const nextMarkId = (): string => `mark-${Date.now()}-${counter++}`;

/** Add a mark at a bar. A sign or a jump appears once per bar; text may repeat. */
export function withMark(
  marks: readonly ScoreTextMark[],
  measureIdx: number,
  kind: ScoreMarkKind,
  text?: string,
): ScoreTextMark[] {
  const kept =
    kind === 'text'
      ? [...marks]
      : marks.filter(
          (mark) => !(mark.measureIdx === measureIdx && mark.kind === kind),
        );
  // Clicking the same sign on the same bar again takes it off.
  if (kind !== 'text' && kept.length !== marks.length) return kept;
  return [
    ...kept,
    { id: nextMarkId(), measureIdx, kind, ...(text ? { text } : {}) },
  ];
}

/** Remove one mark by id. */
export const withoutMark = (
  marks: readonly ScoreTextMark[],
  id: string,
): ScoreTextMark[] => marks.filter((mark) => mark.id !== id);

/** Rewrite a free text mark. Emptying it removes it. */
export function withMarkText(
  marks: readonly ScoreTextMark[],
  id: string,
  text: string,
): ScoreTextMark[] {
  const trimmed = text.trim();
  if (!trimmed) return withoutMark(marks, id);
  return marks.map((mark) =>
    mark.id === id ? { ...mark, text: trimmed } : mark,
  );
}

/** The marks standing over one bar, in the order they were written. */
export const marksAt = (
  marks: readonly ScoreTextMark[],
  measureIdx: number,
): ScoreTextMark[] => marks.filter((mark) => mark.measureIdx === measureIdx);
