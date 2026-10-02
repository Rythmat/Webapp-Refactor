import type { ContentKind } from '@/hooks/data/admin/useAdminContent';

/**
 * The content kinds that are in none of the Table's categories: lessons,
 * fundamentals and the globe's artist locations. Their lists stay in the
 * content area as "Other records" (`records/:kind`); every other kind's list
 * now redirects into the Table (`TABLE_FOR_CONTENT_KIND` in tableIds.ts), so
 * between them the two cover every kind (RecordsRedirects.test.tsx holds
 * this).
 *
 * A file of its own because the content area's bar lists them too, and the
 * bar loads with the console's eager routes, which may not bring the kind
 * specs (kinds.ts) with them.
 */
export const OTHER_RECORD_KINDS = [
  'activity_flow',
  'fundamentals_flow',
  'artist_location',
] as const satisfies readonly ContentKind[];

export type OtherRecordKind = (typeof OTHER_RECORD_KINDS)[number];

/** Is this URL segment one of the other records' kinds? */
export const isOtherRecordKind = (
  value: string | undefined,
): value is OtherRecordKind =>
  (OTHER_RECORD_KINDS as readonly string[]).includes(value ?? '');
