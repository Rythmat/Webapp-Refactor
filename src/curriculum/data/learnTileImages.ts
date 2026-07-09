/**
 * Interactive hex-tile SVG paths for Learn content, mirroring the honeycomb
 * tiles rendered in the Genre and Theory sections (see LearnInlet's COURSES_DATA
 * / THEORY_DATA and the mode-family arrays). Kept here so feeds outside
 * LearnInlet (e.g. the Recent Lessons / Recent Activity / Continue thumbnails)
 * can reuse the same tile art. Values are the audited paths from that data.
 */

/** Genre slug (CURRICULUM_GENRE_SLUGS values) → hex tile SVG. */
const GENRE_TILE_IMAGES: Record<string, string> = {
  pop: '/learn-tiles/pop.svg',
  rock: '/learn-tiles/rock-hex.svg',
  'hip hop': '/learn-tiles/hip-hop-hex.svg',
  rnb: '/learn-tiles/r-and-b-hex.svg',
  jazz: '/learn-tiles/jazz-hex.svg',
  blues: '/learn-tiles/blues-hex.svg',
  folk: '/learn-tiles/folk-hex.svg',
  funk: '/learn-tiles/funk-hex.svg',
  'neo-soul': '/learn-tiles/neo-soul-hex.svg',
  electronic: '/learn-tiles/electronic-hex.svg',
  latin: '/learn-tiles/latin-hex.svg',
  reggae: '/learn-tiles/reggae-hex.svg',
  'jam-band': '/learn-tiles/jam-band-hex.svg',
  african: '/learn-tiles/african-hex.svg',
};

/**
 * Mode slug (progress `mode` values) → theory tile SVG. Filenames encode
 * accidentals: `#`→`-sharp`, `♭`→`-flat`, `♮`→`-nat`, `𝄫`→`-bb`.
 */
const MODE_TILE_IMAGES: Record<string, string> = {
  // Diatonic
  lydian: '/learn-tiles/theory/lydian.svg',
  ionian: '/learn-tiles/theory/ionian.svg',
  mixolydian: '/learn-tiles/theory/mixolydian.svg',
  dorian: '/learn-tiles/theory/dorian.svg',
  aeolian: '/learn-tiles/theory/aeolian.svg',
  phrygian: '/learn-tiles/theory/phrygian.svg',
  locrian: '/learn-tiles/theory/locrian.svg',
  // Harmonic minor
  harmonicminor: '/learn-tiles/theory/harmonicminor.svg',
  locriannat6: '/learn-tiles/theory/locrian-nat6.svg',
  'ionian#5': '/learn-tiles/theory/ionian-sharp5.svg',
  'dorian#4': '/learn-tiles/theory/dorian-sharp4.svg',
  phrygiandominant: '/learn-tiles/theory/phrygiandominant.svg',
  'lydian#2': '/learn-tiles/theory/lydian-sharp2.svg',
  altereddiminished: '/learn-tiles/theory/altereddiminished.svg',
  // Melodic minor
  melodicminor: '/learn-tiles/theory/melodicminor.svg',
  'dorian♭2': '/learn-tiles/theory/dorian-flat2.svg',
  lydianaugmented: '/learn-tiles/theory/lydianaugmented.svg',
  lydiandominant: '/learn-tiles/theory/lydiandominant.svg',
  mixolydiannat6: '/learn-tiles/theory/mixolydian-flat6.svg',
  locriannat2: '/learn-tiles/theory/locrian-nat2.svg',
  altereddominant: '/learn-tiles/theory/altereddominant.svg',
  // Harmonic major
  harmonicmajor: '/learn-tiles/theory/harmonicmajor.svg',
  'dorian♭5': '/learn-tiles/theory/dorian-flat5.svg',
  altereddominantnat5: '/learn-tiles/theory/altereddominant-nat5.svg',
  'melodicminor#4': '/learn-tiles/theory/melodicminor-sharp4.svg',
  'mixolydian♭2': '/learn-tiles/theory/mixolydian-flat2.svg',
  'lydianaugmented#2': '/learn-tiles/theory/lydianaugmented-sharp2.svg',
  'locrian𝄫7': '/learn-tiles/theory/locrian-bb7.svg',
  // Double harmonic
  doubleharmonicmajor: '/learn-tiles/theory/doubleharmonicmajor.svg',
  'lydian#2#6': '/learn-tiles/theory/lydian-sharp2-sharp6.svg',
  ultraphrygian: '/learn-tiles/theory/ultraphrygian.svg',
  doubleharmonicminor: '/learn-tiles/theory/doubleharmonicminor.svg',
  oriental: '/learn-tiles/theory/oriental.svg',
  'ionian#2#5': '/learn-tiles/theory/ionian-sharp2-sharp5.svg',
  'locrian𝄫3𝄫7': '/learn-tiles/theory/locrian-bb3-bb7.svg',
};

/** Hex tile SVG for a genre slug (undefined if unknown). */
export const getGenreTileImage = (slug: string): string | undefined =>
  GENRE_TILE_IMAGES[slug];

/** Hex tile SVG for a theory mode slug (undefined if unknown). */
export const getTheoryTileImage = (modeSlug: string): string | undefined =>
  MODE_TILE_IMAGES[modeSlug];
