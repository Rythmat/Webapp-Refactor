import type { Hand, PianoFinger } from '@/lib/learn/pianoFingering';

/**
 * One of Peter's hand drawings, ready to lay over the keys: a hand seen as
 * the player sees their own, the fingers that play reaching up into the keys
 * and the rest curled. Built by scripts/fingering/buildHandPoses.mjs.
 */
export interface HandPoseArt {
  /** From the drawing's file name. */
  id: string;
  /** The hand drawn: a left hand's little finger on the left, a right hand's thumb. */
  hand: Hand;
  /** The fingers on or over keys in the drawing (the rest are curled). */
  plays: readonly PianoFinger[];
  /**
   * The sets of them that play together: a drawing can serve more than one
   * shape, the fingers a shape doesn't use hovering over their keys.
   */
  uses: readonly (readonly PianoFinger[])[];
  /** A relaxed five-finger hand: the one to show when no shape fits better. */
  neutral?: boolean;
  /** The hand's width and height. */
  size: readonly [number, number];
  /**
   * Each playing finger: the middle of its pad, where it meets the key; its
   * inside; and how far down the finger the inside reaches, where its wash
   * fades out.
   */
  fingers: Partial<
    Record<
      PianoFinger,
      {
        tip: readonly [number, number];
        root: readonly [number, number];
        wash: string;
      }
    >
  >;
  /** The hand's silhouette, filled under the lines. */
  paper: string;
  /** The drawing's lines, as filled shapes. */
  lines: string;
}

/** The drawings, and the units they give a white key. */
export interface HandPoseLibrary {
  key: number;
  poses: readonly HandPoseArt[];
}
