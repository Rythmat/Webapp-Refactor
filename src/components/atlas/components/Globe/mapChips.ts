import { ATLAS_SCENE } from '@/components/atlas/theme/tokens';

/**
 * The rounded chips the map writes a place's name on: images drawn here, as
 * pixels, and stretched by MapLibre round the text (`icon-text-fit`), so no
 * sprite file is needed. Pure: the pixels are tested without a map.
 */

/** The chip's size and corner, in CSS px (it is stretched to the text). */
const SIZE = 24;
const RADIUS = 8;

type Rgba = readonly [number, number, number, number];

export interface ChipImage {
  width: number;
  height: number;
  /** Straight (not premultiplied) RGBA, row by row. */
  data: Uint8Array;
  pixelRatio: number;
  /** The parts that stretch, and the part the text sits in, in image px. */
  stretchX: [number, number][];
  stretchY: [number, number][];
  content: [number, number, number, number];
}

/** The signed distance from `(x, y)` to a rounded rectangle's edge. */
function roundedRectDistance(
  x: number,
  y: number,
  half: number,
  radius: number,
): number {
  const qx = Math.abs(x) - (half - radius);
  const qy = Math.abs(y) - (half - radius);
  const outside = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
  return outside + Math.min(Math.max(qx, qy), 0) - radius;
}

const over = (top: Rgba, bottom: Rgba): Rgba => {
  const a = top[3] + bottom[3] * (1 - top[3]);
  if (a === 0) return [0, 0, 0, 0];
  const mix = (i: number) =>
    (top[i] * top[3] + bottom[i] * bottom[3] * (1 - top[3])) / a;
  return [mix(0), mix(1), mix(2), a];
};

/**
 * A chip: `fill` inside, a 1 px `border` round it, its edge anti-aliased,
 * drawn at `pixelRatio` (2 keeps it crisp on dense screens).
 */
export function chipImage(fill: Rgba, border: Rgba, pixelRatio = 2): ChipImage {
  const px = SIZE * pixelRatio;
  const data = new Uint8Array(px * px * 4);
  const half = SIZE / 2;
  for (let row = 0; row < px; row++) {
    for (let col = 0; col < px; col++) {
      // The pixel's centre, in CSS px from the chip's centre.
      const x = (col + 0.5) / pixelRatio - half;
      const y = (row + 0.5) / pixelRatio - half;
      const d = roundedRectDistance(x, y, half - 0.5, RADIUS);
      // Coverage of the shape and of its 1 px edge band, anti-aliased.
      const inside = Math.min(1, Math.max(0, 0.5 - d * pixelRatio));
      const edge = Math.min(1, Math.max(0, 1 - Math.abs(d + 0.5)));
      const base: Rgba = [fill[0], fill[1], fill[2], fill[3] * inside];
      const ring: Rgba = [
        border[0],
        border[1],
        border[2],
        border[3] * edge * inside,
      ];
      const [r, g, b, a] = over(ring, base);
      const i = (row * px + col) * 4;
      data[i] = Math.round(r);
      data[i + 1] = Math.round(g);
      data[i + 2] = Math.round(b);
      data[i + 3] = Math.round(a * 255);
    }
  }
  const corner = RADIUS * pixelRatio;
  return {
    width: px,
    height: px,
    data,
    pixelRatio,
    stretchX: [[corner, px - corner]],
    stretchY: [[corner, px - corner]],
    content: [
      6 * pixelRatio,
      4 * pixelRatio,
      px - 6 * pixelRatio,
      px - 4 * pixelRatio,
    ],
  };
}

/** The chips' image names, as the label layer asks for them. */
export const CHIP = { plain: 'atlas-chip', on: 'atlas-chip-on' } as const;

/** Add the chips to a map once its style is up (and again if it reloads). */
export function addChipImages(map: {
  hasImage(id: string): boolean;
  addImage(id: string, image: ChipImage, options: object): void;
}) {
  const make: [string, Rgba, Rgba][] = [
    [CHIP.plain, ATLAS_SCENE.chip, ATLAS_SCENE.chipBorder],
    [CHIP.on, ATLAS_SCENE.chipOn, ATLAS_SCENE.chipOnBorder],
  ];
  for (const [id, fill, border] of make) {
    if (map.hasImage(id)) continue;
    const image = chipImage(fill, border);
    map.addImage(
      id,
      { width: image.width, height: image.height, data: image.data } as never,
      {
        pixelRatio: image.pixelRatio,
        stretchX: image.stretchX,
        stretchY: image.stretchY,
        content: image.content,
      },
    );
  }
}
