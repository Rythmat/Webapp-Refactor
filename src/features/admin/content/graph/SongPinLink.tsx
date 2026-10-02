import { Link } from 'react-router-dom';
import { AdminRoutes } from '@/constants/routes';
import type { EdgeVia } from '@/content/graph/types';

/**
 * A song pin as the source of a connection, named and linked the same way
 * wherever the console lists sources — the mind map's connections table,
 * the Table's row panel, Integrity's fixes.
 *
 * The globe's song pins state a guessed city for the act they pin: an
 * Artist locations item's `city`, filed under the artist (deriveGraph's
 * `edgesForArtistLocation`), not the artist's own field. The source names
 * the pin itself (`EdgeVia.statedBy`, keyed by the act's name in lowercase),
 * and the link opens that item — never the artist, whose City it is not.
 *
 * The item route wants the store's id, which the graph does not know; the
 * pins' own rows do (`useWorkingGraph().pins`). Where the API does not list
 * the pin (or its rows have not loaded), the link falls back to the Artist
 * locations list, searched for the key — a search, so a short key can also
 * find longer ones (`chic` finds `chicago`).
 */

/** The pin that states a source, when a song pin does. */
export const songPinOf = (via: EdgeVia) =>
  via.statedBy?.kind === 'artist_location' ? via.statedBy : null;

export type SongPin = NonNullable<ReturnType<typeof songPinOf>>;

/** Where a pin is edited: its item, or the list searched for its key. */
export const songPinHref = (
  key: string,
  pins: ReadonlyMap<string, string> | undefined,
): string => {
  const id = pins?.get(key);
  return id
    ? AdminRoutes.contentItem({ kind: 'artist_location', id })
    : AdminRoutes.contentKind({ kind: 'artist_location' }, { q: key });
};

export const SongPinLink = ({
  pin,
  path,
  pins,
  className = 'text-white/75 hover:text-white hover:underline',
}: {
  pin: SongPin;
  /** The pin's field that states it (`city`). */
  path?: string;
  /** A pin's key → its item's id (`useWorkingGraph().pins`). */
  pins: ReadonlyMap<string, string> | undefined;
  className?: string;
}) => {
  const title = !pins
    ? 'The Artist locations list, searched for this key'
    : pins.has(pin.id)
      ? undefined
      : 'The Artist locations list, searched for this key: the content API does not list this pin';
  return (
    <Link to={songPinHref(pin.id, pins)} className={className} title={title}>
      Song pins ‘{pin.id}’
      {path && (
        <>
          {' '}
          <span className="text-white/40">{path}</span>
        </>
      )}
    </Link>
  );
};
