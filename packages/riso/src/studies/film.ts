/**
 * The technique studies as a RisoFilm: `seek(t)` shows study floor(t).
 *
 * This is the demo AND the parity fixture, deliberately the same artifact. Between them the
 * studies exercise essentially the whole craft kit — cut/curve/ringPts (0), nib and its width
 * profiles (1), shade (2), plane/carve/bed and overprint (3), hatch/spray (4), ridge stacking and
 * haze (5), three complete compositions (6-8), settle and anticipation (9-10), and live
 * inkPass/bandPass/relight (11). A smaller fixture would leave the most float-fragile functions
 * unproven.
 *
 * Structure follows studies/index.html:1922-1945: paper first, then the baked scene multiplied
 * over it, then any live layer on top in source-over.
 */
import { paperOf } from '../canvas/paper.ts';
import { bakeScene, SCENES } from '../canvas/scene.ts';
import { ctx2d } from '../canvas/surface.ts';
import { clamp, W } from '../core/index.ts';
import type { RisoFilm, Shot } from '../film/contract.ts';

/** id and the A/B caption, in study order. From studies/index.html:1910-1923. */
export const STUDIES: [id: string, note: string][] = [
  ['silhouette', 'assembled primitives | one cut contour'],
  ['stroke', 'constant lineWidth | tapered nib ribbon'],
  ['ramp', 'flat screen | coverage gradient as a dot ramp'],
  ['form', 'flat silhouette | modelled, bedded, overprint core'],
  ['texture', 'one flat screen | ramp, hatch, spray, dry pass'],
  ['depth', 'subject on flat ground | four planes, haze, occluder'],
  ['kettle', 'exemplar — the moment it whistles, dot as the source'],
  ['wave', 'exemplar — a barrel is an opening, dot at the far end'],
  ['telescope', 'exemplar — scale, not detail; dot as the galaxy core'],
  ['weight', 'motion — one curve for everything | the curve each mass implies'],
  [
    'launch',
    'motion — it just leaves | anticipation, and what it leaves swinging',
  ],
  [
    'flame',
    'live element — one flat coverage | stepped bands, on an opened ground',
  ],
];

/** Only the studies whose scenes are actually registered — lets phases land incrementally. */
export const registered = (): [string, string][] =>
  STUDIES.filter(([id]) => id in SCENES);

export function studiesFilm(canvas: HTMLCanvasElement): RisoFilm {
  const list = STUDIES;
  const shots: Shot[] = list.map(([id, note], i) => ({
    id,
    start: i,
    readAt: i,
    end: i + 1,
    action: note,
    transition: 'cut',
  }));

  return {
    duration: list.length,
    ready: false,
    shots,
    seek(t: number): void {
      const i = clamp(Math.floor(t + 1e-6), 0, list.length - 1);
      const id = list[i][0];
      const ctx = ctx2d(canvas);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
      ctx.drawImage(paperOf(), 0, 0);
      if (id in SCENES) {
        ctx.globalCompositeOperation = 'multiply';
        ctx.drawImage(bakeScene(id, W), 0, 0);
      }
      ctx.globalCompositeOperation = 'source-over';
      const sc = SCENES[id];
      if (sc?.live) {
        ctx.save();
        sc.live(ctx, clamp(t - i, 0, 1));
        ctx.restore();
      }
    },
  };
}
