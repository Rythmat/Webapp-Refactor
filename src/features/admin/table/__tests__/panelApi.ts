import { useMutation } from '@tanstack/react-query';
import type {
  ContentItemDetail,
  ContentKind,
  SaveContentInput,
  SaveContentResult,
} from '@/hooks/data/admin/useAdminContent';

/**
 * A content API for the row panel's tests: the items an editing session
 * loads, and a record of every save and review verdict it sends. The test
 * files mock `useAdminContent` and `useCapabilities` with these (vi.mock's
 * factories import this module, so the tests and the mocks share one `api`).
 *
 * The auth context is mocked with no token, so nothing else — the pickers'
 * exports — ever reaches the network.
 */

export const api = {
  /** By item id, as `useContentItem` loads them. */
  items: new Map<string, ContentItemDetail>(),
  saves: [] as SaveContentInput[],
  approved: [] as string[],
  rejected: [] as { id: string; note: string }[],
  discarded: [] as string[],
  /** Thrown by the next saves, when set. */
  saveError: null as Error | null,
};

/** What the server serves, and at which body level. */
export const caps = {
  served: [] as string[],
  levels: {} as Partial<Record<string, number>>,
  create: false,
};

export const ALL_TABLE_KINDS: readonly ContentKind[] = [
  'artist',
  'song',
  'globe_city',
  'globe_event',
  'release',
  'studio',
  'label',
  'chord_progression',
];

export function resetPanelApi() {
  api.items.clear();
  api.saves.length = 0;
  api.approved.length = 0;
  api.rejected.length = 0;
  api.discarded.length = 0;
  api.saveError = null;
  caps.served = [...ALL_TABLE_KINDS];
  caps.levels = { song: 2, globe_event: 2, globe_city: 2, artist: 2 };
  caps.create = false;
}

const RECORD_KINDS: ReadonlySet<string> = new Set([
  'artist',
  'release',
  'studio',
  'label',
]);

/** A stored item's detail, as `/items/:id` answers. */
export function detail(
  id: string,
  kind: ContentKind,
  body: Record<string, unknown>,
  over: Partial<ContentItemDetail> = {},
): ContentItemDetail {
  const identity = RECORD_KINDS.has(kind) ? 'slug' : 'id';
  return {
    id,
    kind,
    slug: String(body[identity] ?? id),
    status: 'published',
    title: String(body.name ?? body.title ?? id),
    subtitle: null,
    sortYear: null,
    tags: [],
    derivedFromId: null,
    derivedFromSlug: null,
    updatedAt: new Date(0),
    updatedById: null,
    editState: null,
    pendingAt: null,
    pendingById: null,
    reviewNote: null,
    body,
    overrides: null,
    pendingBody: null,
    pendingOverrides: null,
    pendingNote: null,
    reviewedAt: null,
    createdAt: new Date(0),
    Revisions: [],
    ...over,
  };
}

/** `useAdminContent` with its item hooks over `api`. */
export function fakeItemHooks<T extends object>(actual: T) {
  return {
    ...actual,
    useContentItem: (id: string | undefined) => ({
      data: id ? api.items.get(id) : undefined,
      isLoading: false,
      error: null,
      // A save reads the item again first: as it stands in `api` now.
      refetch: async () => ({ data: id ? api.items.get(id) : undefined }),
    }),
    useContentTemplate: () => ({ data: undefined, isLoading: false }),
    useSaveContentItem: () =>
      useMutation<SaveContentResult, Error, SaveContentInput>({
        mutationFn: async (input) => {
          api.saves.push(input);
          if (api.saveError) throw api.saveError;
          const found = [...api.items.values()].find(
            (item) => item.kind === input.kind && item.slug === input.slug,
          );
          const item = detail(
            found?.id ?? `db-new-${input.slug}`,
            input.kind,
            input.body as Record<string, unknown>,
          );
          return { item, warnings: [] };
        },
      }),
    useDeleteContentItem: () =>
      useMutation<unknown, Error, string>({ mutationFn: async () => null }),
    useApproveContentEdit: () =>
      useMutation<unknown, Error, string>({
        mutationFn: async (id) => {
          api.approved.push(id);
          return null;
        },
      }),
    useRejectContentEdit: () =>
      useMutation<unknown, Error, { id: string; note: string }>({
        mutationFn: async (input) => {
          api.rejected.push(input);
          return null;
        },
      }),
    useDiscardContentEdit: () =>
      useMutation<unknown, Error, string>({
        mutationFn: async (id) => {
          api.discarded.push(id);
          return null;
        },
      }),
  };
}

/** `useCapabilities()` over `caps`. */
export const fakeCapabilities = () => ({
  capabilities: { kinds: [], features: {}, artifactsVersion: null },
  isServed: (kind: string) => caps.served.includes(kind),
  identityOf: (kind: string) => (RECORD_KINDS.has(kind) ? 'slug' : 'id'),
  schemaVersionOf: (kind: string) =>
    caps.levels[kind] ?? (caps.served.includes(kind) ? 1 : 0),
  songSchemaLevel: caps.levels.song ?? 0,
  feature: (name: string) => name === 'create' && caps.create,
  isAuthoritative: () => false,
  servedKinds: caps.served,
});
