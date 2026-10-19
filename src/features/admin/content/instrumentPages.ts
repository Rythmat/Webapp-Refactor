import { AdminRoutes } from '@/constants/routes';
import type { ContentKind } from '@/hooks/data/admin/useAdminContent';

/**
 * The content kinds whose editors are pages of their own: drum grooves (the
 * Drum Grooves designer), parts (the Parts Library's piano roll and staff
 * editor) and Music Literacy lessons (the Music Literacy editor). Their
 * `records/:kind[/:id]` URLs hand over to those pages, so there is one
 * editor per kind. Feel profiles have no page of their own and stay among
 * the other records.
 *
 * A file of its own, import-light, because the records routes load with the
 * console's eager code (eagerBoundary.test.ts).
 */
export const INSTRUMENT_PAGES = {
  drum_groove: {
    list: () => AdminRoutes.drumGrooves(),
    item: (id: string) => AdminRoutes.drumGroove({ id }),
  },
  instrument_part: {
    list: () => AdminRoutes.parts(),
    item: (id: string) => AdminRoutes.part({ id }),
  },
  music_literacy: {
    list: () => AdminRoutes.musicLiteracy(),
    item: (id: string) => AdminRoutes.musicLiteracyLesson({ id }),
  },
} as const satisfies Partial<
  Record<ContentKind, { list: () => string; item: (id: string) => string }>
>;

export type InstrumentPageKind = keyof typeof INSTRUMENT_PAGES;

export const isInstrumentPageKind = (
  kind: string | undefined,
): kind is InstrumentPageKind =>
  // Own keys only: `constructor` is "in" every object.
  !!kind && Object.prototype.hasOwnProperty.call(INSTRUMENT_PAGES, kind);
