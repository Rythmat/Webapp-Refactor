// ── The Library's filing tags ──────────────────────────────────────────────
// A saved project's genre and where it stands, kept on the project in the
// account (studioProjectsApi.patchMeta: libraryGenre, libraryStatus). Free
// text there; these are the words the Library offers.

export interface TagOption {
  value: string;
  label: string;
}

export const GENRE_TAGS: readonly TagOption[] = [
  { value: 'pop', label: 'Pop' },
  { value: 'rock', label: 'Rock' },
  { value: 'hip-hop', label: 'Hip Hop' },
  { value: 'rnb', label: 'R&B' },
  { value: 'soul', label: 'Soul' },
  { value: 'funk', label: 'Funk' },
  { value: 'jazz', label: 'Jazz' },
  { value: 'blues', label: 'Blues' },
  { value: 'gospel', label: 'Gospel' },
  { value: 'electronic', label: 'Electronic' },
  { value: 'lofi', label: 'Lo-fi' },
  { value: 'reggae', label: 'Reggae' },
  { value: 'latin', label: 'Latin' },
  { value: 'country', label: 'Country' },
  { value: 'folk', label: 'Folk' },
  { value: 'classical', label: 'Classical' },
  { value: 'other', label: 'Other' },
];

export const STATUS_TAGS: readonly TagOption[] = [
  { value: 'idea', label: 'Idea' },
  { value: 'in-progress', label: 'In progress' },
  { value: 'mixing', label: 'Mixing' },
  { value: 'finished', label: 'Finished' },
];

/** A tag's label; a word the list doesn't have shows as it was written. */
export function tagLabel(
  options: readonly TagOption[],
  value: string | null,
): string | null {
  if (!value) return null;
  return options.find((o) => o.value === value)?.label ?? value;
}
