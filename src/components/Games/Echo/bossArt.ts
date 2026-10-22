import type { EchoOutcome } from './echoFlow';

// ── The Echo Boss's art ────────────────────────────────────────────────────
// The owner's animations of the boss (public/echo/boss/): the circle the
// student has played on all game becomes a vortex, and a grinning face
// comes out of it. Five clips, silent, 640×640 on #090b0f:
//
//   emerge   7 s  the entrance: the plain circle turns to a vortex, the
//                 face emerges
//   frown    4 s  a good echo: smile, frown, smile
//   nod      4 s  a miss: two happy nods
//   loss     6 s  the student lost: the art spirals into a black hole
//   victory  8 s  the student won: the boss goes, the ring shines
//
// Every clip but the last two starts and ends on the same face, so they
// join without a seam. Each has a still (WebP, framed as the videos are):
// the face and the vortex are the owner's own stills; the frown, the nod
// and the shining ring are frames of their clips. The stills stand in for
// the videos under reduced motion, and when a video won't play.

export type BossClip = 'emerge' | 'frown' | 'nod' | 'loss' | 'victory';

export const BOSS_CLIPS: readonly BossClip[] = [
  'emerge',
  'frown',
  'nod',
  'loss',
  'victory',
];

const DIR = '/echo/boss';

/** Each clip's video, its length, and the still that stands in for it. */
export const BOSS_CLIP: Readonly<
  Record<BossClip, { video: string; seconds: number; still: string }>
> = {
  emerge: {
    video: `${DIR}/boss-emerge.mp4`,
    seconds: 7,
    still: `${DIR}/boss-face.webp`,
  },
  frown: {
    video: `${DIR}/boss-frown.mp4`,
    seconds: 4,
    still: `${DIR}/boss-frown.webp`,
  },
  nod: {
    video: `${DIR}/boss-nod.mp4`,
    seconds: 4,
    still: `${DIR}/boss-nod.webp`,
  },
  loss: {
    video: `${DIR}/boss-loss.mp4`,
    seconds: 6,
    still: `${DIR}/boss-vortex.webp`,
  },
  victory: {
    video: `${DIR}/boss-victory.mp4`,
    seconds: 8,
    still: `${DIR}/boss-victory.webp`,
  },
};

/** The boss at rest: its grin in the vortex (the owner's still). */
export const BOSS_FACE = `${DIR}/boss-face.webp`;
/** The vortex with no face: the black hole a lost fight ends in. */
export const BOSS_VORTEX = `${DIR}/boss-vortex.webp`;
/** The face, cropped small: the HUD's boss beside its health. */
export const BOSS_AVATAR = `${DIR}/boss-avatar.webp`;
/** The ring shining once the boss is gone: the gate's picture. */
export const BOSS_VICTORY_STILL = `${DIR}/boss-victory.webp`;

/**
 * The art's box over the circle's: its ring (0.333 of the frame from the
 * middle) on the circle's (0.34 of the circle's box, CircleOfFifthsSvg).
 */
export const BOSS_ART_SCALE = 0.34 / 0.3336;

/** The clips that end on the face the boss rests on. */
export const ENDS_ON_FACE: ReadonlySet<BossClip> = new Set([
  'emerge',
  'frown',
  'nod',
]);

/** A boss echo's reaction: a good one makes it frown, a miss makes it nod. */
export const reactionTo = (outcome: Pick<EchoOutcome, 'passed'>): BossClip =>
  outcome.passed ? 'frown' : 'nod';

/** The fastest a reaction plays. */
export const MAX_REACTION_RATE = 2;
/** A reaction ends a little before the next call, not on its downbeat. */
const REACTION_SHARE = 0.9;

/**
 * How fast a reaction plays to fit the gap between two of the boss's calls
 * (`gapSeconds`): its clip, sped up so it's over just before the next call
 * (never slower than as made, never faster than 2×).
 */
export function reactionRate(clip: BossClip, gapSeconds: number): number {
  const fit = BOSS_CLIP[clip].seconds / (gapSeconds * REACTION_SHARE);
  return Math.min(MAX_REACTION_RATE, Math.max(1, fit));
}

/** Seconds a bar lasts at `bpm`, in 4/4. */
export const barSeconds = (bpm: number) => (4 * 60) / bpm;

/**
 * How long each still holds where its clip would play (reduced motion, or
 * a video that won't): long enough to read, short enough to keep the game
 * going. A reaction's is its clip's length at its rate.
 */
export const STILL_MS: Readonly<Record<BossClip, number>> = {
  emerge: 3500,
  frown: 2000,
  nod: 2000,
  loss: 2500,
  victory: 2500,
};

/** A video not playing by now has failed: its still stands in. */
export const VIDEO_START_MS = 2500;
/** Past a clip's length by this much, a video is taken as over. */
export const VIDEO_OVERRUN_MS = 1500;
/** The cross-fades between the live ring and the art. */
export const ART_FADE_MS = 700;
