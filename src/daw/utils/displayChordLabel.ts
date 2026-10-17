import { formatQuality } from '@/daw/components/Library/insightConstants';
import { normalizeQuality } from '@/lib/chordNotation';
import { qualityIntervals } from '@/lib/chordNotation/qualities';
import { displayAccidentals, displayDegree } from './displayAccidentals';

/** A root letter or a degree, then the quality, then an optional "/bass". */
const LABEL =
  /^([A-G](?:bb|##|b|#|♭|♯)?|(?:bb|b|#|♭|♯)?[1-7])\s*([^/]*?)\s*(?:\/\s*(\S+))?$/;

/** Real signs for a quality's alterations: "7b5" → "7♭5", "#11" → "♯11". */
const signs = (text: string) =>
  text.replace(/b(?=\d)/g, '♭').replace(/#/g, '♯');

const bassText = (bass: string) =>
  /^[A-G]/.test(bass) ? displayAccidentals(bass) : displayDegree(bass);

/**
 * A chord-lane label as the Studio shows it in hybrid: the quality written as
 * the formatter writes it, and every accidental a real sign — never a lower-
 * case b or a #. "A min7b5" → "A min7(♭5)", "F susb2/Ab" → "F sus(♭2)/A♭",
 * "b3 maj" → "♭3 maj", "Dminor7" → "D min7".
 *
 * At display, not where a label is made: regions are stored, re-read and
 * matched by their labels, and projects saved before this keep theirs. A
 * label it can't read gets real signs and nothing else.
 */
export function displayChordLabel(label: string): string {
  const text = label.trim();
  const match = LABEL.exec(text);
  if (!match) return signs(displayAccidentals(text));
  const [, root, rawQuality, bass] = match;
  const rootText = /^[A-G]/.test(root)
    ? displayAccidentals(root)
    : displayDegree(root);
  const key = rawQuality ? normalizeQuality(rawQuality) : '';
  const quality = !rawQuality
    ? ''
    : qualityIntervals(key)
      ? formatQuality(key)
      : signs(rawQuality);
  return (
    (quality ? `${rootText} ${quality}` : rootText) +
    (bass ? `/${bassText(bass)}` : '')
  );
}
