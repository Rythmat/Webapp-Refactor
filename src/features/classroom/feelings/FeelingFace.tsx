import type { ReactNode } from 'react';
import type { FaceKind } from './feelings';

// The faces, drawn in code after the owner's two references (the coloured
// 5-face scale and the hand-drawn 3×3 grid): a coloured disc with dark,
// round-capped line features. 100×100 units; scales to any size.

const INK = '#1C1C1F';

const heart = (cx: number, cy: number, s = 1): string =>
  `M${cx} ${cy + 5 * s} C${cx - 9 * s} ${cy - 2 * s} ${cx - 4 * s} ${cy - 9 * s} ${cx} ${cy - 3 * s} C${cx + 4 * s} ${cy - 9 * s} ${cx + 9 * s} ${cy - 2 * s} ${cx} ${cy + 5 * s}Z`;

const Dots = ({ y = 42 }: { y?: number }) => (
  <>
    <circle cx={36} cy={y} r={5} fill={INK} stroke="none" />
    <circle cx={64} cy={y} r={5} fill={INK} stroke="none" />
  </>
);

const FEATURES: Record<FaceKind, ReactNode> = {
  angry: (
    <>
      <path d="M24 31 L42 39 M76 31 L58 39" />
      <Dots y={47} />
      <path d="M33 73 Q50 59 67 73" />
    </>
  ),
  sad: (
    <>
      <Dots />
      <path d="M35 71 Q50 61 65 71" />
    </>
  ),
  okay: (
    <>
      <Dots />
      <path d="M36 67 L64 67" />
    </>
  ),
  good: (
    <>
      <Dots />
      <path d="M34 60 Q50 74 66 60" />
    </>
  ),
  great: (
    <>
      <path d={heart(36, 42, 0.9)} fill={INK} stroke="none" />
      <path d={heart(64, 42, 0.9)} fill={INK} stroke="none" />
      <path d="M31 58 Q50 80 69 58" />
    </>
  ),
  grumpy: (
    <>
      <path d="M22 35 Q32 25 45 36 M78 35 Q68 25 55 36" />
      <Dots y={45} />
      <path d="M35 72 Q50 61 65 72" />
    </>
  ),
  stressed: (
    <>
      <path d="M28 35 L41 42 L28 49 M72 35 L59 42 L72 49" />
      <path d="M33 72 Q50 59 67 72" />
    </>
  ),
  excited: (
    <>
      <path d="M28 45 Q35 33 42 45 M58 45 Q65 33 72 45" />
      <path d="M29 56 Q50 90 71 56 Z" fill={INK} />
    </>
  ),
  loving: (
    <>
      <Dots y={40} />
      <path d="M43 57 Q54 60 46 65.5 Q54 70 43 74" />
      <path d={heart(66, 67, 0.8)} />
    </>
  ),
  silly: (
    <>
      <Dots y={40} />
      <path d="M30 57 Q50 74 70 57" />
      <path d="M45 65 V73 A6.5 6.5 0 0 0 58 73 V64" />
    </>
  ),
  embarrassed: (
    <>
      <Dots y={40} />
      <path d="M33 68 l6 -9 M42 68 l6 -9 M51 68 l6 -9 M60 68 l6 -9" />
    </>
  ),
  confident: (
    <>
      <path d="M27 43 Q35 37 43 43 M57 43 Q65 37 73 43" />
      <path d="M35 63 Q51 74 68 57" />
    </>
  ),
  'wiped-out': (
    <>
      <path d="M29 35 L42 48 M42 35 L29 48 M58 35 L71 48 M71 35 L58 48" />
      <path d="M35 63 Q50 74 65 63" />
    </>
  ),
  nervous: (
    <>
      <path d="M26 35 L42 44 M74 35 L58 44" />
      <path d="M27 69 L33 62 L39 70 L45 62 L51 70 L57 62 L63 70 L69 62" />
    </>
  ),
};

export const FeelingFace = ({
  face,
  color,
  size = 64,
  className,
}: {
  face: FaceKind;
  color: string;
  /** Pixels; or pass a className sizing the svg. */
  size?: number;
  className?: string;
}) => (
  <svg
    viewBox="0 0 100 100"
    width={className ? undefined : size}
    height={className ? undefined : size}
    className={className}
    aria-hidden
  >
    <circle cx={50} cy={50} r={47} fill={color} />
    <g
      fill="none"
      stroke={INK}
      strokeWidth={5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {FEATURES[face]}
    </g>
  </svg>
);
