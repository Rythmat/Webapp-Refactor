import { lazyResource } from './lazyResource';

/**
 * The Globe's data that the first frame doesn't need, each in a chunk of its
 * own that loads on first use (see lazyResource.ts):
 *
 *  - `stateBoundariesData`: US state and Canadian province outlines (~100 kB),
 *    for placing an event in a state when its town isn't in CITIES. Needed to
 *    list a state's events and to resolve a US/CA event's region.
 *  - `connectionsData`: the influence graph (~130 kB), for the arcs of a
 *    pinned event and the Influence chains on its card.
 *  - `guidesData`: Guided Tours and Pathways, for starting and showing them.
 *
 * Components read them with useLazyResource; navigation waits for them with
 * afterLoad (navigation/pendingNavigation.ts).
 */
export const stateBoundariesData = lazyResource(() =>
  import('./stateBoundaries').then((m) => m.STATE_BOUNDARIES),
);

export const connectionsData = lazyResource(() => import('./eventConnections'));

export const guidesData = lazyResource(() => import('./guides'));
