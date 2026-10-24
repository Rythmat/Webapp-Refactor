/**
 * The genre courses Learn teaches (its Genre tab), in Learn's order: shared
 * by Learn's course tiles and Home's Catalog, so the two never drift apart.
 * Small on purpose: Home imports it without loading Learn.
 */
export interface GenreCourse {
  title: string;
  /** The curriculum's genre slug (CurriculumRoutes.genre). */
  slug: string;
  /** Its hex-tile art (1920×1080). */
  image: string;
  /** Learn's expand id for the tile (kept as Learn has always named it). */
  expandId: string;
}

export const GENRE_COURSES: readonly GenreCourse[] = [
  {
    title: 'Pop',
    slug: 'pop',
    image: '/learn-tiles/pop.svg',
    expandId: 'course:pop',
  },
  {
    title: 'Rock',
    slug: 'rock',
    image: '/learn-tiles/rock-hex.svg',
    expandId: 'course:rock',
  },
  {
    title: 'Hip Hop',
    slug: 'hip-hop',
    image: '/learn-tiles/hip-hop-hex.svg',
    expandId: 'course:hip hop',
  },
  {
    title: 'R&B',
    slug: 'rnb',
    image: '/learn-tiles/r-and-b-hex.svg',
    expandId: 'course:rnb',
  },
  {
    title: 'Jazz',
    slug: 'jazz',
    image: '/learn-tiles/jazz-hex.svg',
    expandId: 'course:jazz',
  },
  {
    title: 'Blues',
    slug: 'blues',
    image: '/learn-tiles/blues-hex.svg',
    expandId: 'course:blues',
  },
  {
    title: 'Folk',
    slug: 'folk',
    image: '/learn-tiles/folk-hex.svg',
    expandId: 'course:folk',
  },
  {
    title: 'Funk',
    slug: 'funk',
    image: '/learn-tiles/funk-hex.svg',
    expandId: 'course:funk',
  },
  {
    title: 'Neo Soul',
    slug: 'neo-soul',
    image: '/learn-tiles/neo-soul-hex.svg',
    expandId: 'course:neo-soul',
  },
  {
    title: 'Electronic',
    slug: 'electronic',
    image: '/learn-tiles/electronic-hex.svg',
    expandId: 'course:electronic',
  },
  {
    title: 'Latin',
    slug: 'latin',
    image: '/learn-tiles/latin-hex.svg',
    expandId: 'course:latin',
  },
  {
    title: 'Reggae',
    slug: 'reggae',
    image: '/learn-tiles/reggae-hex.svg',
    expandId: 'course:reggae',
  },
  {
    title: 'Jam Band',
    slug: 'jam-band',
    image: '/learn-tiles/jam-band-hex.svg',
    expandId: 'course:jam-band',
  },
  {
    title: 'African',
    slug: 'african',
    image: '/learn-tiles/african-hex.svg',
    expandId: 'course:african',
  },
];
