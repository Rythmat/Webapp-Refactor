import type { ContentKind } from '@/hooks/data/admin/useAdminContent';

/**
 * A kind's name on Publishing and in the edit bar.
 *
 * A table of its own rather than read from the kind specs: the edit bar is
 * part of the content area's frame, which loads with the console's routes,
 * and `kinds.ts` brings every kind's editor with it — the song page editor,
 * the chart editor, the lesson editor. Reading one label from it put all of
 * that in the bundle every student downloads. A test holds this table to
 * the specs' labels, so the two cannot drift.
 */
const KIND_LABELS: Record<ContentKind, string> = {
  globe_event: 'Globe events',
  globe_city: 'Globe cities',
  song: 'Songs',
  artist_location: 'Artist locations',
  activity_flow: 'Lessons',
  fundamentals_flow: 'Fundamentals',
  artist: 'Artists',
  release: 'Records',
  studio: 'Studios',
  label: 'Labels',
  chord_progression: 'Progressions',
  genre: 'Genres',
  subgenre: 'Subgenres',
  instrument: 'Instruments',
  drum_groove: 'Drum grooves',
  instrument_part: 'Parts',
  feel_profile: 'Feels',
};

export const kindLabel = (kind: ContentKind): string =>
  KIND_LABELS[kind] ?? kind;
