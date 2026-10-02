/**
 * Text → slug, with no imports.
 *
 * These used to live beside the things that needed them: `artistSlug` in the
 * globe's artist index, which also imports the content store. That made the
 * graph's pure derivation code drag the store (and its CDN loader) into every
 * test and every console chunk that only wanted to turn a name into an id. A
 * leaf module keeps "what is this thing's id" free of "where does data live".
 */

/** Generic text → kebab slug: 'Hitsville U.S.A.' → 'hitsville-u-s-a'. */
export const toSlug = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // fold accents: Sinéad → Sinead
    .replace(/['’]/g, '') // Ain't → aint, not ain-t
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

/**
 * Accent-, case-, and punctuation-insensitive comparison key.
 *
 * Tags are ASCII-folded (`cesaria evora`) while titles keep their diacritics
 * (`Cesária Évora`), so matching on the raw strings silently drops a large and
 * mostly non-Anglophone part of the catalogue.
 *
 * Apostrophes are deleted rather than turned into a separator, because the two
 * sides disagree about them: the title writes `N'Dour` and the tag writes
 * `ndour`. Collapsing them to a space would make those `n dour` and `ndour` —
 * still unequal, and the bug this normalization exists to prevent.
 */
export function normalizeArtistName(name: string): string {
  return (
    name
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/['’ʼ`]/g, '')
      // '&' and 'and' are the same word and the dataset uses both: the song
      // library writes 'Hall & Oates' and 'Earth, Wind & Fire' where the globe's
      // event titles write 'Hall and Oates' and 'Earth, Wind and Fire'. Folding
      // one into the other is what stops those becoming two different artists.
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
  );
}

/** The artist registry's identity: `artistSlug('Hall & Oates')` → 'hall-and-oates'. */
export function artistSlug(name: string): string {
  return normalizeArtistName(name).replace(/ /g, '-');
}

const KEY_SLUG = /^[a-g](-(flat|sharp))?$/;

/**
 * A tonic → its key slug, with the accidental SPELLED: 'E♭' → 'e-flat',
 * 'F♯' → 'f-sharp', 'C' → 'c'.
 *
 * `toSlug` strips ♭ and ♯ as punctuation, which folded E♭ into E and made
 * "everything in E" include every E♭ song (153 songs across nine tonics). The
 * spelling is kept rather than normalised to one enharmonic: a chart in E♭ and
 * a chart in D♯ are written differently, and the key node is about the chart.
 *
 * Accepts ASCII accidentals ('Eb', 'F#') and is idempotent on its own output.
 * Returns null for anything that is not a single-letter tonic.
 */
export function keySlug(tonic: string): string | null {
  const text = tonic.trim();
  if (KEY_SLUG.test(text)) return text;
  const match = /^([A-Ga-g])(♭|♯|b|#)?$/.exec(text);
  if (!match) return null;
  const letter = match[1].toLowerCase();
  const accidental = match[2];
  if (!accidental) return letter;
  return `${letter}-${accidental === '♭' || accidental === 'b' ? 'flat' : 'sharp'}`;
}
