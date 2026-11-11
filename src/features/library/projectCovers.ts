// ── Images for the student's projects (owner, 2026-11-11) ──────────────────
// The owner's GIF collection (~/Pictures/gifs), made into covers by
// tools/project-covers/convert_covers.py: each an animated
// WebP, 320px on its short side (280px for the heaviest, shown cropped
// square), and its first frame as a JPEG for reduced motion and the picker.
// In public/covers/projects. `colour` is the image's average, for the page's
// wash. `credit` is the artist the source file named (GIPHY's "by …").
//
// LICENSING: these are artists' GIFs (GIPHY). Before release, each needs a
// licence to ship in the app, or the set swapped for owned art.

export interface ProjectCoverImage {
  id: string;
  credit: string | null;
  colour: string;
}

export const PROJECT_COVERS: readonly ProjectCoverImage[] = [
  { id: 'borrachas-animation-design', credit: 'Borrachas', colour: '#464343' },
  {
    id: 'winston-duke-animation-loop',
    credit: 'Winston Duke',
    colour: '#040404',
  },
  {
    id: 'lucie-mullen-art-animation',
    credit: 'Lucie Mullen',
    colour: '#340ed4',
  },
  { id: 'makio135-art-animation', credit: 'makio135', colour: '#6c6b6a' },
  { id: 'dualvoidanima-art-love', credit: 'dualvoidanima', colour: '#3d545e' },
  {
    id: 'dualvoidanima-design-loop',
    credit: 'dualvoidanima',
    colour: '#67514e',
  },
  { id: 'borrachas-untitled', credit: 'Borrachas', colour: '#7f6868' },
  {
    id: 'xponentialdesign-loop-design',
    credit: 'xponentialdesign',
    colour: '#a7a7a7',
  },
  { id: 'pink-text', credit: null, colour: '#504750' },
  { id: 'borrachas-abstract', credit: 'Borrachas', colour: '#3e3b3b' },
  { id: 'borrachas-abstract-2', credit: 'Borrachas', colour: '#423e3e' },
  {
    id: 'winston-duke-after-dark-animation',
    credit: 'Winston Duke',
    colour: '#343436',
  },
  {
    id: 'winston-duke-after-dark-animation-2',
    credit: 'Winston Duke',
    colour: '#414143',
  },
  {
    id: 'winston-duke-after-dark-animation-3',
    credit: 'Winston Duke',
    colour: '#232225',
  },
  {
    id: 'winston-duke-after-dark-animation-4',
    credit: 'Winston Duke',
    colour: '#252527',
  },
  {
    id: 'winston-duke-animation-loop-2',
    credit: 'Winston Duke',
    colour: '#3c3c3e',
  },
  {
    id: 'winston-duke-animation-morph',
    credit: 'Winston Duke',
    colour: '#424445',
  },
  {
    id: 'winston-duke-fashion-illustration',
    credit: 'Winston Duke',
    colour: '#212025',
  },
  { id: 'untitled', credit: null, colour: '#4f2b04' },
  { id: 'giphy-4', credit: null, colour: '#edbaef' },
  { id: 'giphy-5', credit: null, colour: '#c9cdb8' },
  {
    id: 'littlekingdoms-magic-skull',
    credit: 'littlekingdoms',
    colour: '#0b0d10',
  },
  {
    id: 'clayton-shonkwiler-math-minimalism',
    credit: 'Clayton Shonkwiler',
    colour: '#194846',
  },
  {
    id: 'borrachas-mesmerizing-digital-art',
    credit: 'Borrachas',
    colour: '#be9d9e',
  },
];

const BASE = '/covers/projects';

export const coverMotion = (id: string) => `${BASE}/${id}.webp`;
export const coverStill = (id: string) => `${BASE}/${id}.jpg`;

/** The image, if `id` is one (an unknown id draws the default cover). */
export function projectCover(
  id: string | null | undefined,
): ProjectCoverImage | null {
  return id ? (PROJECT_COVERS.find((c) => c.id === id) ?? null) : null;
}
