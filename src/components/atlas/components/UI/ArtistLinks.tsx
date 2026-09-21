import { Mic2 } from 'lucide-react';
import { Fragment, useMemo } from 'react';
import {
  getArtistsForEvent,
  type AtlasArtist,
} from '@/components/atlas/data/artists';
import type { HistoricalEvent } from '@/components/atlas/types';

const LINK_CLASS =
  'rounded-sm underline decoration-white/30 decoration-dotted underline-offset-2 transition-colors hover:text-[#fbbf24] hover:decoration-[#fbbf24] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#60a5fa]';

/**
 * An event title with every artist it names turned into a link to that
 * artist's view — so under Indiana, "Wes Montgomery" in "Wes Montgomery records
 * The Incredible Jazz Guitar" is itself the thing to click.
 *
 * Only names that literally appear in the title become links; the rest of the
 * event's artists are offered by {@link ArtistChips} once the card is open.
 */
export function TitleWithArtists({
  event,
  onSelectArtist,
}: {
  event: HistoricalEvent;
  onSelectArtist: (artist: AtlasArtist) => void;
}) {
  const segments = useMemo(() => {
    const title = event.title;
    const lower = title.toLowerCase();
    // Earliest occurrence of each named artist, longest first on ties so
    // "Robert Glasper Experiment" wins over "Robert Glasper".
    const hits = getArtistsForEvent(event)
      .map((artist) => ({
        artist,
        start: lower.indexOf(artist.name.toLowerCase()),
        length: artist.name.length,
      }))
      .filter((h) => h.start >= 0)
      .sort((a, b) => a.start - b.start || b.length - a.length);

    const out: (string | { artist: AtlasArtist; text: string })[] = [];
    let cursor = 0;
    for (const hit of hits) {
      if (hit.start < cursor) continue; // overlaps a longer name already taken
      if (hit.start > cursor) out.push(title.slice(cursor, hit.start));
      out.push({
        artist: hit.artist,
        text: title.slice(hit.start, hit.start + hit.length),
      });
      cursor = hit.start + hit.length;
    }
    if (cursor < title.length) out.push(title.slice(cursor));
    return out;
  }, [event]);

  return (
    <>
      {segments.map((segment, i) =>
        typeof segment === 'string' ? (
          <Fragment key={i}>{segment}</Fragment>
        ) : (
          <button
            key={i}
            className={LINK_CLASS}
            title={`Everything on the globe about ${segment.artist.name}`}
            type="button"
            onClick={(e) => {
              // The card row is itself clickable (expand/collapse).
              e.stopPropagation();
              onSelectArtist(segment.artist);
            }}
          >
            {segment.text}
          </button>
        ),
      )}
    </>
  );
}

/** Every artist an open event names, as chips — including ones not in its title. */
export function ArtistChips({
  event,
  onSelectArtist,
}: {
  event: HistoricalEvent;
  onSelectArtist: (artist: AtlasArtist) => void;
}) {
  const artists = useMemo(() => getArtistsForEvent(event), [event]);
  if (artists.length === 0) return null;

  return (
    <div className="mt-2 flex flex-wrap items-center gap-1.5">
      {artists.map((artist) => (
        <button
          key={artist.slug}
          className="inline-flex items-center gap-1 rounded-full border border-[#fbbf24]/40 bg-[#fbbf24]/10 px-2 py-0.5 text-xs font-medium text-[#fde68a] transition-colors hover:bg-[#fbbf24]/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#60a5fa]"
          title={`Everything on the globe about ${artist.name}`}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onSelectArtist(artist);
          }}
        >
          <Mic2 aria-hidden className="size-3" />
          {artist.name}
          {artist.eventIds.length > 1 && (
            <span className="text-[#fde68a]/60">{artist.eventIds.length}</span>
          )}
        </button>
      ))}
    </div>
  );
}
