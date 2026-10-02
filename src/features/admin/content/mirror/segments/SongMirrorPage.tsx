import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { getSong } from '@/content/songStore';
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';
import {
  CONTENT_KEY,
  ContentApiError,
  type ContentListItem,
  contentRequest,
} from '@/hooks/data/admin/useAdminContent';
import { useCapabilities } from '@/hooks/data/admin/useCapabilities';
import { ConsoleCallout } from '../../../ui/ConsoleCallout';
import { ContentItemEditor } from '../../itemEditor/ContentItemEditor';
import { useContentItemEditor } from '../../itemEditor/useContentItemEditor';
import { makeEmptySong } from '../../songEditor/songDefaults';

/**
 * `/songs/:songId` in the mirror: the app's page, or — with `?edit=1` — the
 * same page as its editor, in place (design §3.2, checkpoint 1e).
 *
 * Preview is the app's own route element, exactly what a student gets. Edit
 * finds the store's item for the slug — `/items/lookup` where the server has
 * it, else a scan of the list, because the list's search matches titles —
 * and opens it in the song editor, which is the song page with inputs. A song
 * the app shows but the store lacks opens as a new item seeded from the
 * app's copy, saved create-only so it can never overwrite anything.
 */
export const SongMirrorPage = ({ preview }: { preview: ReactNode }) => {
  const [params] = useSearchParams();
  const { songId } = useParams();
  if (params.get('edit') !== '1' || !songId) return <>{preview}</>;
  return <SongEditMirror slug={songId} />;
};

type Resolved = { itemId: string } | { itemId: null };

async function findSongItem(
  slug: string,
  token: string,
  lookup: boolean,
): Promise<Resolved> {
  if (lookup) {
    try {
      const item = await contentRequest<ContentListItem>(
        `/items/lookup?kind=song&slug=${encodeURIComponent(slug)}`,
        token,
      );
      return { itemId: item.id };
    } catch (error) {
      if (error instanceof ContentApiError && error.status === 404) {
        return { itemId: null };
      }
      throw error;
    }
  }
  let cursor: string | null = null;
  do {
    const after: string = cursor ? `&cursor=${encodeURIComponent(cursor)}` : '';
    const page: { items: ContentListItem[]; nextCursor: string | null } =
      await contentRequest(`/items?kind=song&limit=200${after}`, token);
    const hit = page.items.find((item) => item.slug === slug);
    if (hit) return { itemId: hit.id };
    cursor = page.nextCursor;
  } while (cursor);
  return { itemId: null };
}

const SongEditMirror = ({ slug }: { slug: string }) => {
  const { token } = useAuthContext();
  const caps = useCapabilities();
  const found = useQuery({
    queryKey: [...CONTENT_KEY, 'song-by-slug', slug, caps.feature('lookup')],
    queryFn: () => findSongItem(slug, token!, caps.feature('lookup')),
    enabled: !!token && !!caps.capabilities,
    staleTime: 60_000,
  });

  if (found.isError) {
    return (
      <div className="p-6">
        <ConsoleCallout tone="danger">
          Could not find this song in the content store: {String(found.error)}
        </ConsoleCallout>
      </div>
    );
  }
  if (!found.data) {
    return (
      <div className="space-y-3 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }
  return (
    <SongItemEditor
      // A new item becoming a stored one is a different session.
      key={found.data.itemId ?? 'new'}
      slug={slug}
      itemId={found.data.itemId}
    />
  );
};

const SongItemEditor = ({
  slug,
  itemId,
}: {
  slug: string;
  itemId: string | null;
}) => {
  const appCopy = getSong(slug);
  const editor = useContentItemEditor({
    kind: 'song',
    itemId: itemId ?? 'new',
    newBody: itemId
      ? undefined
      : ((appCopy ?? { ...makeEmptySong(), id: slug }) as unknown as Record<
          string,
          unknown
        >),
  });
  return (
    <div className="min-w-0">
      {!itemId && (
        <div className="px-6 pt-3 md:px-10">
          <ConsoleCallout tone="info">
            The content store has no “{slug}” yet
            {appCopy ? '; this starts from the copy the app shows' : ''}. Saving
            creates it.
          </ConsoleCallout>
        </div>
      )}
      <ContentItemEditor
        editor={editor}
        // Inside the mirror: the app's path, which the mirror rewrites.
        backTo={`/songs/${slug}`}
        backLabel="Back to the page"
        bleed="none"
      />
    </div>
  );
};
