import { createContext } from 'react';

/**
 * The genres in the order the page's Best Of row shows them (owner,
 * 2026-11-05): a genre course's sigil takes its Best Of tile's colours, which
 * run round the spectrum by place in that row. Outside a page with the row,
 * the library's genre order.
 */
export const GenreOrderContext = createContext<readonly string[] | null>(null);
