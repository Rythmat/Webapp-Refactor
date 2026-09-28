import { Printer } from 'lucide-react';
import { useEffect, useMemo, type FC } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { ChordChart } from '@/components/songLibrary/ChordChart';
import type { Song } from '@/curriculum/types/songLibrary';
import { entryChart } from '../entryChart';
import { getStavesPerPage } from '../setViewPreference';
import type { SetListEntry } from '../types';
import { useSetLists } from '../useSetLists';
import './setlist-print.css';

/**
 * A set, ready for the stand: every chart in the key this set plays it in,
 * one to a page, with the player's text pages in their place.
 */

export const SetListPrintPage: FC = () => {
  const { setListId = '' } = useParams<{ setListId: string }>();
  const [params] = useSearchParams();
  const { blob, status } = useSetLists();
  const list = blob.setLists[setListId];
  // Paper pages hold the same number of staves as the stand's pages, so what
  // the player rehearsed from and what comes out of the printer turn together.
  const staves = getStavesPerPage();

  type Page = { entry: SetListEntry; song: Song | null };
  const pages = useMemo<Page[]>(
    () =>
      (list?.entries ?? []).flatMap((entry): Page[] => {
        if (entry.kind === 'text')
          return entry.text.trim() ? [{ entry, song: null }] : [];
        const chart = entryChart(entry);
        // A chart that cannot be drawn is left out rather than printed blank.
        return chart?.song ? [{ entry, song: chart.song }] : [];
      }),
    [list],
  );

  // ?auto=1 prints as soon as the charts are on the page.
  useEffect(() => {
    if (params.get('auto') !== '1' || pages.length === 0) return;
    const id = setTimeout(() => window.print(), 600);
    return () => clearTimeout(id);
  }, [params, pages.length]);

  if (!list)
    return (
      <div className="setlist-print p-10">
        {status === 'loading' ? 'Loading…' : 'That set list is gone.'}
      </div>
    );

  return (
    <div className="setlist-print p-6 md:p-10">
      <div className="setlist-print-toolbar mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold">{list.title}</h1>
          <p className="text-sm text-white/45">
            {pages.length} {pages.length === 1 ? 'page' : 'pages'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#7ecfcf] px-3 py-1.5 text-sm font-semibold text-[#191919]"
        >
          <Printer size={15} /> Print
        </button>
      </div>

      {pages.map(({ entry, song }) =>
        song ? (
          <section
            key={entry.id}
            className="setlist-print-page setlist-print-chart"
          >
            <header className="mb-2">
              <h2 className="text-lg font-semibold">
                {(entry.kind === 'song' && entry.title) || song.title}
                <span className="ml-2 text-sm font-normal text-white/50">
                  {song.key}
                </span>
              </h2>
              <p className="text-sm text-white/45">{song.artist}</p>
              {entry.kind === 'song' && entry.notes && (
                <p className="mt-1 text-xs italic text-white/60">
                  {entry.notes}
                </p>
              )}
            </header>
            <ChordChart song={song} systemsPerPage={staves} />
          </section>
        ) : (
          <section
            key={entry.id}
            className="setlist-print-page setlist-print-text"
          >
            {entry.kind === 'text' ? entry.text : ''}
          </section>
        ),
      )}

      {pages.length === 0 && (
        <p className="text-white/50">This set list is empty.</p>
      )}
    </div>
  );
};
