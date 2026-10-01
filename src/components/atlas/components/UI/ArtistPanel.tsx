import { useMemo } from 'react';
import { AtlasVideo } from '@/components/atlas/components/UI/AtlasVideo';
import {
  PanelRow,
  SidePanel,
} from '@/components/atlas/components/UI/SidePanel';
import {
  getArtistHit,
  type ArtistHit,
} from '@/components/atlas/data/artistHits';
import { getArtist, getEventsForArtist } from '@/components/atlas/data/artists';
import { describeStop } from '@/components/atlas/navigation/describeStop';
import { useAtlasNavigate } from '@/components/atlas/navigation/useAtlasNavigate';

/**
 * Everything on the globe about one artist, in the order it happened.
 *
 * Opened by clicking an artist's name anywhere — in an event title, on a chip,
 * or from search — and addressed as `?artist=<name>`, so "Wes Montgomery on
 * the globe" is a link a teacher can hand out. The globe lights up each place
 * in the list, and the timeline along the bottom becomes this artist's.
 *
 * An artist with a featured hit (artistHits.ts) plays it at the top — that is
 * where a genre Overview's Globe icon lands, so the card opens even for an
 * artist the globe has no moments for yet.
 */
export function ArtistPanel({ name }: { name: string }) {
  const navigate = useAtlasNavigate();
  const artist = useMemo(() => getArtist(name), [name]);
  const events = useMemo(() => getEventsForArtist(name), [name]);
  const hit = useMemo(() => getArtistHit(name), [name]);

  // The distinct places, in the order the career reached them.
  const places = useMemo(() => {
    const seen: string[] = [];
    for (const e of events) {
      if (!seen.includes(e.location.city)) seen.push(e.location.city);
    }
    return seen;
  }, [events]);

  if (!artist && hit) {
    return (
      <SidePanel title={hit.artist} onClose={navigate.home}>
        <FeaturedHit hit={hit} />
        <p className="p-2 text-sm text-white/60">
          No moments on the globe for {hit.artist} yet.
        </p>
      </SidePanel>
    );
  }

  if (!artist) {
    return (
      <SidePanel title={name} onClose={navigate.home}>
        <div className="space-y-3 p-2 text-sm text-white/60">
          <p>No artist by that name is on the globe yet.</p>
          <button
            className="text-[#60a5fa] hover:underline"
            type="button"
            onClick={() => navigate.toSearch(name)}
          >
            Search the globe for “{name}”
          </button>
        </div>
      </SidePanel>
    );
  }

  const first = events[0]?.year;
  const last = events[events.length - 1]?.year;

  return (
    <SidePanel
      subtitle={
        <>
          {events.length} moment{events.length === 1 ? '' : 's'}
          {first !== undefined && (
            <> · {first === last ? first : `${first}–${last}`}</>
          )}
          {places.length > 0 && <> · {places.join(' → ')}</>}
        </>
      }
      title={artist.name}
      onClose={navigate.home}
    >
      {hit && <FeaturedHit hit={hit} />}
      <ol className="space-y-0.5">
        {events.map((event) => (
          <li key={event.id}>
            <PanelRow
              badge={event.id.startsWith('song-') ? 'Song' : undefined}
              presentation={describeStop({ kind: 'event', eventId: event.id })}
              subtitle={`${event.year} · ${event.location.city}`}
              title={event.title}
              onClick={() => navigate.toEvent(event)}
            />
          </li>
        ))}
      </ol>
    </SidePanel>
  );
}

/** The artist's featured hit, playable in place. */
function FeaturedHit({ hit }: { hit: ArtistHit }) {
  return (
    <div className="mb-3 space-y-1.5">
      <AtlasVideo title={hit.song} videoId={hit.videoId} />
      <p className="px-1 text-xs text-white/60">{hit.song}</p>
    </div>
  );
}
