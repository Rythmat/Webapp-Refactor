/**
 * Where the open drum groove, bass line or comping pattern plays in lessons.
 * Lessons pair a style with a whole Band (console → Bands), so an item
 * reaches a lesson as a layer of the band its style plays; this lists those
 * styles and the band that carries the item there. Assigning happens in the
 * Band, once per style, not here item by item.
 *
 * A style still paired the old way — its drums, bass and comping named one
 * by one — shows as such until it is given a band.
 */

import { type FC } from 'react';
import { Link } from 'react-router-dom';
import { AdminRoutes } from '@/constants/routes';
import { lessonStyleLabel } from '@/curriculum/data/lessonStyles';
import { getBand } from '@/curriculum/engine/band/registry';
import {
  bandIdAt,
  getPairing,
  stylesUsing,
  type PairingKind,
} from '@/curriculum/engine/lessonPairings/registry';
import { usePairingList } from '../band/bandSession';
import { PlayerPicker } from '../players/PlayerPicker';
import { CONSOLE_LABEL } from '../ui/styles';

export const UseInLessons: FC<{
  kind: PairingKind;
  itemId: string;
  /** Only a published item reaches students. */
  live: boolean;
}> = ({ kind, itemId, live }) => {
  // Re-read when a band's assignments change.
  usePairingList();
  const using = stylesUsing(kind, itemId);
  const noun =
    kind === 'drums' ? 'groove' : kind === 'bass' ? 'line' : 'pattern';
  const via = (styleId: string) => {
    const pairing = getPairing(styleId);
    const bandId = pairing ? bandIdAt(pairing) : undefined;
    return bandId ? getBand(bandId) : undefined;
  };

  return (
    <>
      <PlayerPicker
        item={{
          kind:
            kind === 'drums'
              ? 'groove'
              : kind === 'bass'
                ? 'bassLine'
                : 'comping',
          id: itemId,
        }}
        instrument={
          kind === 'drums' ? 'drums' : kind === 'bass' ? 'bass' : 'keys'
        }
      />
      <div className="flex min-w-64 flex-1 flex-col gap-1">
        <span className={CONSOLE_LABEL}>Plays in lessons</span>
        <div className="flex flex-wrap items-center gap-1.5">
          {using.map((style) => {
            const band = via(style.id);
            return (
              <span
                key={style.id}
                className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-2.5 py-0.5 text-xs"
              >
                {lessonStyleLabel(style)}
                {band ? (
                  <Link
                    to={AdminRoutes.band({ id: band.id })}
                    className="text-white/55 hover:text-white hover:underline"
                  >
                    in {band.name}
                  </Link>
                ) : (
                  <span className="text-white/45">set on its own</span>
                )}
              </span>
            );
          })}
          {!using.length && (
            <span className="text-xs text-white/40">
              Not in a lesson yet. Add it to a band, and give the band a style.
            </span>
          )}
          <Link
            to={AdminRoutes.bands()}
            className="text-xs text-white/55 hover:text-white hover:underline"
          >
            Bands →
          </Link>
        </div>
        {using.length > 0 && !live && (
          <span className="text-xs text-amber-300/80">
            Draft: students hear this {noun} once it&apos;s published.
          </span>
        )}
      </div>
    </>
  );
};
