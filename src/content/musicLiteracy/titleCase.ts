/**
 * Music Literacy's titles in Title Case (the owner: "Titles in Title Case.
 * Descriptions and directive text in body style."): every word capitalized
 * but the short ones, which stay lowercase unless first, last or first
 * after a colon:
 *
 *   a an the and but or nor for so yet at by in of on to up as with from
 *
 * The music stays exactly as written: a word that starts with no letter
 * ("1-2-3", "♭3", "7th", "|"), a word in capitals ("ALL", "X"), and a
 * chord's quality after its number, the hybrid way ("4 maj", "♭6 maj7",
 * "5 dom7"). Nothing is lowercased but a short word, and "A" alone stays as
 * it is, since it may be the note. Words joined by a hyphen are each a
 * word.
 *
 * For titles the app builds (a new step's, a heading made from a count);
 * never run over a title the owner types. Pure.
 */

const SHORT_WORDS: ReadonlySet<string> = new Set([
  'a',
  'an',
  'the',
  'and',
  'but',
  'or',
  'nor',
  'for',
  'so',
  'yet',
  'at',
  'by',
  'in',
  'of',
  'on',
  'to',
  'up',
  'as',
  'with',
  'from',
]);

/** A chord's number, the hybrid way: "4", "♭6", "b7". */
const DEGREE = /^[♭♯b#]?[1-7]$/;
/** What follows it: "maj", "min7", "dom7", "7", "sus4". */
const QUALITY = /^(maj|min|dim|aug|dom|sus|m)?\d*$/;

/** Splits a word into what leads it ("(", "“"), its core, and what trails. */
const PARTS = /^([^\p{L}\p{N}♭♯#]*)(.*?)([^\p{L}\p{N}]*)$/u;

const capitalize = (core: string) =>
  core.charAt(0).toLocaleUpperCase() + core.slice(1);

/** One word (no spaces, no hyphens) in its place in the title. */
function casePart(
  part: string,
  { edge, afterNumber }: { edge: boolean; afterNumber: boolean },
): string {
  const [, lead, core, trail] = PARTS.exec(part) ?? ['', '', part, ''];
  if (!core) return part;
  // The music, as written.
  if (!/^\p{L}/u.test(core)) return part;
  if (afterNumber && QUALITY.test(core)) return part;
  // Capitals as written: "ALL", "X", "iPad".
  if (core === core.toLocaleUpperCase() || /\p{Lu}/u.test(core.slice(1)))
    return part;
  const short = SHORT_WORDS.has(core.toLocaleLowerCase());
  if (short && !edge) return `${lead}${core.toLocaleLowerCase()}${trail}`;
  return `${lead}${capitalize(core)}${trail}`;
}

/** A title in Title Case (see the head of the file). */
export function titleCase(title: string): string {
  const tokens = title.split(/(\s+)/);
  const words = tokens
    .map((token, index) => ({ token, index }))
    .filter(({ token }) => token.trim() !== '');
  const firstWord = words[0]?.index;
  const lastWord = words.at(-1)?.index;
  let previous = '';
  let newClause = true;
  return tokens
    .map((token, index) => {
      if (token.trim() === '') return token;
      const afterNumber = DEGREE.test(previous);
      const edge = newClause || index === firstWord || index === lastWord;
      previous = token;
      // A colon (or a dash between words) starts the title afresh.
      newClause = /[:—–]$/.test(token) || token === '·';
      return token
        .split('-')
        .map((part, i, parts) =>
          casePart(part, {
            edge: i === 0 ? edge : index === lastWord && i === parts.length - 1,
            afterNumber: afterNumber && i === 0,
          }),
        )
        .join('-');
    })
    .join('');
}
