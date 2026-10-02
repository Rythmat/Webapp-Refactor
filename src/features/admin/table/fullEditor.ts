import type { ContentKind } from '@/hooks/data/admin/useAdminContent';

/**
 * What the Table edits itself, and where it sends the rest: the content
 * area's full editor (`records/:kind/:id`) and the song's page editor.
 *
 * The row panel edits every content kind a table holds (its Details): the
 * records through their record editors, a song's title, year, popularity
 * and connections, an event's card and who and where it is about. Only a
 * song keeps "Full editor ↗", since its chart and key belong to its page. A
 * new item of each of these kinds is made in the panel too (`makesNewRows`).
 * The grid's cells edit the scalars in place (Amendment 6); the rest opens
 * the row at the field.
 *
 * Tiny and pure, so the grid's toolbar ("New song") and the row panel
 * ("Full editor") share it without either chunk pulling in the other. The
 * kind specs (kinds.ts) are not imported here — they bring every editor with
 * them; TableDetailPanel.test.tsx holds these sets to them.
 */

/** The content kinds the row panel edits: each a table holds. */
export const PANEL_EDIT_KINDS: ReadonlySet<ContentKind> = new Set([
  'artist',
  'song',
  'globe_city',
  'globe_event',
  'release',
  'studio',
  'label',
  'chord_progression',
]);

/**
 * Kinds the row panel edits only in part, so it links to the full editor for
 * the rest: a song's chart and key are its page's.
 */
export const FULL_EDITOR_KINDS: ReadonlySet<ContentKind> = new Set(['song']);

/**
 * Whether a table makes new rows in its panel ("New …"): every table whose
 * rows a content item stores. The new item is made create-only, looked up
 * first (an item with its id is opened, not made again); an editor's is a
 * proposal.
 */
export const makesNewRows = (kind: ContentKind | undefined): boolean =>
  !!kind && PANEL_EDIT_KINDS.has(kind);
