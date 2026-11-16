import { useQuery } from '@tanstack/react-query';
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';
import {
  ContentApiError,
  type ContentItemDetail,
  type ContentListItem,
  contentStoreRead,
} from '@/hooks/data/admin/useAdminContent';
import { ConsoleCallout } from '../../ui/ConsoleCallout';

/**
 * Repo mode, a song's editor: the content store's own copy of the song, when
 * it differs from the repo's file (owner, 2026-11-15).
 *
 * The console saves to one place at a time. Edits saved while it saved to
 * the content store live there, and repo mode reads the repo's files, so
 * they look gone. This finds the store's copy and offers to load it into
 * the editor; Save then writes it into the file. Keys the store's copy
 * lacks (fields its schema cannot hold yet: the light, a rhythm, credits)
 * are kept from the file, not dropped.
 */

type Body = Record<string, unknown>;

/** The store's item for a song's slug, or null when it holds none. */
async function findStoreSong(
  slug: string,
  token: string,
): Promise<ContentItemDetail | null> {
  let id: string | null = null;
  try {
    const item = await contentStoreRead<ContentListItem>(
      `/items/lookup?kind=song&slug=${encodeURIComponent(slug)}`,
      token,
    );
    id = item?.id ?? null;
  } catch (error) {
    // A 404 is "no such song", or a server without lookup: read the list.
    if (!(error instanceof ContentApiError && error.status === 404))
      throw error;
    let cursor: string | null = null;
    do {
      const after: string = cursor
        ? `&cursor=${encodeURIComponent(cursor)}`
        : '';
      const page: { items: ContentListItem[]; nextCursor: string | null } =
        await contentStoreRead(`/items?kind=song&limit=200${after}`, token);
      id = page.items.find((item) => item.slug === slug)?.id ?? null;
      cursor = id ? null : page.nextCursor;
    } while (cursor);
  }
  if (!id) return null;
  return contentStoreRead<ContentItemDetail>(`/items/${id}`, token);
}

const same = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);

/** The store's keys whose values differ from the file's. */
export function differingKeys(file: Body, store: Body): string[] {
  return Object.keys(store).filter((key) => !same(file[key], store[key]));
}

/** The store's copy over the file: its keys win, the file keeps the rest. */
export const storeOverFile = (file: Body, store: Body): Body => ({
  ...file,
  ...store,
});

const when = (value: unknown) => {
  const date = value ? new Date(value as string) : null;
  return date && !Number.isNaN(date.getTime())
    ? date.toLocaleString(undefined, {
        dateStyle: 'medium',
        timeStyle: 'short',
      })
    : null;
};

export const StoreCopyBar = ({
  slug,
  body,
  dirty,
  onLoad,
}: {
  slug: string;
  /** The editor's body: the file's, with any unsaved edits. */
  body: Body | null;
  dirty: boolean;
  onLoad: (next: Body) => void;
}) => {
  const { token } = useAuthContext();
  const store = useQuery({
    queryKey: ['content-store-copy', 'song', slug],
    queryFn: () => findStoreSong(slug, token!),
    enabled: !!token,
    staleTime: 60_000,
    retry: false,
  });

  if (store.isError)
    return (
      <ConsoleCallout tone="warning" title="Couldn’t reach the content store">
        Its copy of this song could not be read: {String(store.error)}
      </ConsoleCallout>
    );
  const theirs = store.data?.body;
  if (!theirs || !body) return null;
  const differ = differingKeys(body, theirs);
  if (differ.length === 0) return null;
  const saved = when(store.data?.updatedAt);
  const revisions = store.data?.Revisions?.length ?? 0;

  return (
    <ConsoleCallout tone="info" title="The content store has a different copy">
      <span data-store-copy="">
        The content store holds its own copy of this song
        {saved ? `, last saved ${saved}` : ''}
        {revisions ? ` (${revisions} saved versions)` : ''}. It differs from
        this file in: {differ.join(', ')}.{' '}
        <button
          type="button"
          className="font-semibold underline underline-offset-2 hover:text-white"
          onClick={() => {
            if (
              dirty &&
              !window.confirm(
                'Replace your unsaved changes here with the content store’s copy?',
              )
            )
              return;
            onLoad(storeOverFile(body, theirs));
          }}
        >
          Load the content store’s copy
        </button>
        , check it, then Save to write it into the repo’s file.
      </span>
    </ConsoleCallout>
  );
};
