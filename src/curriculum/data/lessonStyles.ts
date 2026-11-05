/**
 * The lesson styles a back-office drum groove, bass line or comping pattern
 * can be paired with (Use in lessons, ledger D-084). A style is a genre ·
 * level · style group of steps: pairing one covers every play-along step in it
 * and that level's Practice Track.
 *
 * Pop, Funk, Hip Hop and Jazz teach one style per level, so a style there is
 * the whole level. Latin teaches three per level (D-075), four in L2 where
 * Merengue and Bachata are styles of their own, told apart by the steps'
 * styleRef: a = first style, b = second, and so on. Blues teaches one style
 * per level except L2, where the 4/4 shuffle (l2a) and the 12/8 half-time
 * shuffle (l2b) are told apart the same way.
 */

export interface LessonStyle {
  /** Also the pairing file's name: genre-l{level}-{slug}. */
  id: string;
  genre: string;
  /** The genre's display name. */
  genreName: string;
  level: 1 | 2 | 3;
  name: string;
  /** The steps' styleRefs it covers; absent = every step in the level. */
  styleRefs?: readonly string[];
}

const level = (
  genre: string,
  genreName: string,
  lvl: 1 | 2 | 3,
  slug: string,
  name: string,
): LessonStyle => ({
  id: `${genre}-l${lvl}-${slug}`,
  genre,
  genreName,
  level: lvl,
  name,
});

const latin = (
  lvl: 1 | 2 | 3,
  letter: 'a' | 'b' | 'c' | 'd',
  slug: string,
  name: string,
): LessonStyle => ({
  ...level('latin', 'Latin', lvl, slug, name),
  styleRefs: [`l${lvl}${letter}`],
});

const blues = (
  lvl: 1 | 2 | 3,
  letter: 'a' | 'b',
  slug: string,
  name: string,
): LessonStyle => ({
  ...level('blues', 'Blues', lvl, slug, name),
  styleRefs: [`l${lvl}${letter}`],
});

export const LESSON_STYLES: readonly LessonStyle[] = [
  level('pop', 'Pop', 1, 'singable', 'Singable & Simple'),
  level('pop', 'Pop', 2, 'craft', 'The Craft'),
  level('pop', 'Pop', 3, 'artistry', 'Artistry'),
  level('funk', 'Funk', 1, 'pocket', 'The Pocket'),
  level('funk', 'Funk', 2, 'syncopation', 'Syncopation & Sauce'),
  level('funk', 'Funk', 3, 'deep-groove', 'Deep Groove'),
  level('hip-hop', 'Hip Hop', 1, 'trap', 'Trap'),
  level('hip-hop', 'Hip Hop', 2, 'boom-bap', 'Boom Bap'),
  level('hip-hop', 'Hip Hop', 3, 'conscious', 'Conscious'),
  level('jazz', 'Jazz', 1, 'blues', 'Blues'),
  level('jazz', 'Jazz', 2, 'transfer', 'Color & Transfer'),
  level('jazz', 'Jazz', 3, 'ii-v-i', 'The ii–V–I'),
  level('blues', 'Blues', 1, 'shuffle', 'Shuffle Blues'),
  blues(2, 'a', 'shuffle', 'The 12-Bar Shuffle'),
  blues(2, 'b', 'half-time', 'The Half-Time Shuffle'),
  level('blues', 'Blues', 3, 'jazz-blues', 'Jazz Blues'),
  // Latin, D-075 / D-081.
  latin(1, 'a', 'reggaeton', 'Reggaeton'),
  latin(1, 'b', 'cumbia', 'Cumbia'),
  latin(1, 'c', 'mariachi', 'Mariachi'),
  latin(2, 'a', 'merengue', 'Merengue'),
  latin(2, 'b', 'bachata', 'Bachata'),
  latin(2, 'c', 'cha-cha', 'Cha-cha-chá'),
  latin(2, 'd', 'bolero', 'Bolero'),
  latin(3, 'a', 'bossa-samba', 'Bossa & Samba'),
  latin(3, 'b', 'tango', 'Tango'),
  latin(3, 'c', 'afro-cuban', 'Afro-Cuban'),
];

const BY_ID = new Map(LESSON_STYLES.map((s) => [s.id, s]));

export function getLessonStyle(id: string): LessonStyle | undefined {
  return BY_ID.get(id);
}

/** The style a step belongs to, or undefined when its genre has none. */
export function lessonStyleFor(
  genre: string,
  lvl: number,
  styleRef: string | undefined,
): LessonStyle | undefined {
  return LESSON_STYLES.find(
    (s) =>
      s.genre === genre &&
      s.level === lvl &&
      (!s.styleRefs || (styleRef != null && s.styleRefs.includes(styleRef))),
  );
}

/** A level's styles, in teaching order — the Practice Track's toggle. */
export function lessonStylesForLevel(
  genre: string,
  lvl: number,
): LessonStyle[] {
  return LESSON_STYLES.filter((s) => s.genre === genre && s.level === lvl);
}

/** "Latin L1 · Cumbia". */
export function lessonStyleLabel(style: LessonStyle): string {
  return `${style.genreName} L${style.level} · ${style.name}`;
}

/**
 * A style across levels, as a player's part family names it: 'latin-cumbia'
 * for latin-l1-cumbia, so one idea can be taught at L1 and again at L2.
 */
export const styleKey = (style: Pick<LessonStyle, 'id'>) =>
  style.id.replace(/-l\d-/, '-');

/** A style key's name: 'Cumbia'; the key itself when no style has it. */
export const styleKeyName = (key: string) =>
  LESSON_STYLES.find((s) => styleKey(s) === key)?.name ?? key;
