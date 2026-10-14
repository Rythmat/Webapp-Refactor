/**
 * The lesson styles a back-office drum groove, bass line or comping pattern
 * can be paired with (Use in lessons, ledger D-084). A style is a genre ·
 * level · style group of steps: pairing one covers every play-along step in it
 * and that level's Practice Track.
 *
 * Pop, Funk and Hip Hop teach one style per level, so a style there is the
 * whole level. Latin teaches three per level (D-075), told apart by the steps'
 * styleRef: a = first style, b = second, c = third.
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
  letter: 'a' | 'b' | 'c',
  slug: string,
  name: string,
): LessonStyle => ({
  ...level('latin', 'Latin', lvl, slug, name),
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
  // Latin, D-075 / D-081.
  latin(1, 'a', 'reggaeton', 'Reggaeton'),
  latin(1, 'b', 'cumbia', 'Cumbia'),
  latin(1, 'c', 'mariachi', 'Mariachi'),
  latin(2, 'a', 'merengue-bachata', 'Merengue & Bachata'),
  latin(2, 'b', 'cha-cha', 'Cha-cha-chá'),
  latin(2, 'c', 'bolero', 'Bolero'),
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
