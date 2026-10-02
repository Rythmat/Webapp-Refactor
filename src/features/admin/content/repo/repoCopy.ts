import type {
  ContentKind,
  ContentStatus,
} from '@/hooks/data/admin/useAdminContent';

/**
 * What the status control and the delete question say, by where saves land.
 *
 * Against the content API a status is the publishing state: a draft waits,
 * a published item goes out with the next publish, an archived one leaves.
 * In repo mode (the dev server writes the repo's data files) there are no
 * drafts, releases or archive: a save goes into its file as it is, and the
 * change goes out with the next commit and deploy (students see it if the
 * kind is one they read). The one draft left is a song `bundled.ts` does
 * not register, which students never see.
 *
 * Shared by the content area's editors (`ContentItemEditor`, and
 * `AdminContentEditPage` for the kinds without a full editor) and, when it
 * takes it up, the Table's row panel, so all of them say the same.
 */

export interface StatusChoice {
  value: ContentStatus;
  label: string;
}

const API_CHOICES: readonly StatusChoice[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
];

const REPO_SONG_CHOICES: readonly StatusChoice[] = [
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
];

/**
 * The statuses an admin can choose for a kind; null when there is no
 * choice to make (repo mode, anything but a song: always published).
 */
export function statusChoices(
  kind: ContentKind,
  repo: boolean,
): readonly StatusChoice[] | null {
  if (!repo) return API_CHOICES;
  return kind === 'song' ? REPO_SONG_CHOICES : null;
}

/**
 * The status control's tooltip in repo mode. Kind-neutral but for a song:
 * students never read a studio, label, release or genre, so "students see
 * it" would be wrong for most kinds that land here.
 */
export function repoStatusNote(kind: ContentKind): string {
  return kind === 'song'
    ? 'Published registers the song in bundled.ts, so students see it once that is committed and deployed. Draft keeps it to its own file.'
    : 'Repo mode has no drafts: a save goes into its file as it is, and the change goes out with the next commit and deploy.';
}

/** The badge that stands in for the status control in repo mode. */
export const REPO_NO_STATUS_LABEL = 'Saves to repo';

/** The question before a delete. */
export function deleteQuestion(title: string, repo: boolean): string {
  return repo
    ? `Delete “${title}”? It is taken out of its repo file at once; the change goes out with the next commit and deploy.`
    : `Delete “${title}”? It drops out of the next publish for this kind.`;
}

/**
 * Kinds repo mode serves but never writes, by the file that holds them
 * (403 `REPO_READ_ONLY` on a save): the artist locations, which decide the
 * song pins students see. The owner's rule is that pins never move from the
 * console, so the editors show them read-only rather than offering a Save
 * that is refused.
 */
const REPO_READ_ONLY_FILES: Partial<Record<ContentKind, string>> = {
  artist_location: 'src/scripts/artistLocations.json',
};

/** The file a read-only kind lives in, in repo mode; null for a kind it writes. */
export const repoReadOnlyFile = (kind: ContentKind): string | null =>
  REPO_READ_ONLY_FILES[kind] ?? null;

/** The badge that stands in for Save on a read-only kind in repo mode. */
export const REPO_READ_ONLY_LABEL = 'Read-only in repo mode';

/** Its tooltip, and the list page's words, for a read-only kind. */
export const repoReadOnlyNote = (file: string): string =>
  `Read-only in repo mode: ${file} sets the song pins students see, and pins never move from the console. Change the file by hand if one must.`;

/**
 * What a page of a kind repo mode does not serve says (lessons and
 * fundamentals, which live in the content API alone): no list, no editor,
 * and how to get one.
 */
export const repoNotServedNote = (label: string): string =>
  `${label} are not in repo mode: this dev server saves only the content that lives in the repo’s files. Restart it with repo mode off to edit them against the content API.`;
