/**
 * Films the harness can mount, selected with ?film=<id>.
 *
 * Each is a plain RisoFilm, so the same page serves live viewing, tools/verify.ts, tools/render.ts
 * and tools/parity.ts without any of them knowing what they are looking at.
 */
import type { RisoFilm } from '../src/film/contract.ts';
import { studiesFilm } from '../src/studies/index.ts';
import { paperOnly } from './proof-paper-only.ts';
import { paperProof } from './proof-paper.ts';

const canvasEl = (): HTMLCanvasElement =>
  document.getElementById('c') as HTMLCanvasElement;

export const FILMS: Record<string, () => RisoFilm> = {
  studies: () => studiesFilm(canvasEl()),
  paper: paperProof,
  'paper-only': paperOnly,
};

export function pickFilm(): { id: string; film: RisoFilm } {
  const want = new URLSearchParams(location.search).get('film') ?? 'studies';
  const make = FILMS[want];
  if (!make) {
    throw new Error(
      `riso harness: unknown film "${want}" (have: ${Object.keys(FILMS).join(', ')})`,
    );
  }
  return { id: want, film: make() };
}
