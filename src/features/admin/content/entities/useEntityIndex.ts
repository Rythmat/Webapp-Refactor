import { useMemo } from 'react';
import type { EntityId } from '@/content/graph/types';
import type {
  ContentEditState,
  ContentStatus,
} from '@/hooks/data/admin/useAdminContent';
import { useCapabilities } from '@/hooks/data/admin/useCapabilities';
import {
  type ContentExport,
  useContentExports,
} from '@/hooks/data/admin/useContentExport';
import {
  CONTENT_KIND_OF,
  NAME_FIELD,
  type PickerKind,
  repoEntries,
} from './entityKinds';
import type { EntityEntry, EntitySource } from './rankEntities';
import { useSessionEntities } from './sessionEntities';

/**
 * Every record a picker can offer, for some kinds (design §3.4, decision 15).
 *
 * Three sources, merged by id with the most recent winning: the repo's code
 * registries, the content API's items, and records created in this session.
 * A kind the server marks authoritative drops the repo's copy — the store
 * holds the whole set, and a code entry the store deleted must not come back
 * through a picker. Until then the repo fills in whatever the API lacks.
 *
 * The API's items come from the console's shared export loader
 * (`useContentExports`): `/export` where the server has it, aliases
 * included, else the `/items` list, which has names and slugs but no
 * aliases. The same rows serve the Table and the working graph, so a picker
 * costs no request of its own once either has loaded.
 *
 * An archived item is not offered, and neither is its repo copy: the API has
 * the last word on that id, as in the working graph, which leaves it out —
 * a link to it would name a node nothing draws.
 */

interface ServedItem {
  slug: string;
  name: string;
  aliases?: string[];
  /** Null for an archived item: not offered, and hides the repo's copy. */
  source: EntitySource | null;
}

const sourceOf = (
  status: ContentStatus,
  editState: ContentEditState,
): EntitySource =>
  editState === 'pending'
    ? 'pending'
    : status === 'published'
      ? 'published'
      : 'draft';

const strings = (value: unknown): string[] | undefined =>
  Array.isArray(value)
    ? value.filter((v): v is string => typeof v === 'string')
    : undefined;

/** One kind's served rows as picker entries: the body's name, else the list's title. */
function servedItems(
  kind: PickerKind,
  exported: ContentExport | undefined,
): ServedItem[] {
  const nameField = NAME_FIELD[kind] ?? 'name';
  return (exported?.rows ?? []).map((item) => {
    // A new item that exists only as a proposal has no body yet; a row from
    // the list has none at all.
    const body = item.body ?? item.pendingBody;
    const name = body?.[nameField];
    return {
      slug: item.slug,
      name: typeof name === 'string' && name ? name : item.title || item.slug,
      aliases: strings(body?.aliases),
      source:
        item.status === 'archived'
          ? null
          : sourceOf(item.status, item.editState),
    };
  });
}

export function useEntityIndex(kinds: readonly PickerKind[]) {
  const caps = useCapabilities();
  const session = useSessionEntities();
  const kindsKey = kinds.join(',');
  const contentKinds = useMemo(
    () => kinds.flatMap((kind) => CONTENT_KIND_OF[kind] ?? []),
    // Keyed on kindsKey: callers may pass a fresh array each render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [kindsKey],
  );
  const served = useContentExports(contentKinds);

  const entries = useMemo(() => {
    const byId = new Map<EntityId, EntityEntry>();
    const archived = new Set<EntityId>();
    kinds.forEach((kind) => {
      const contentKind = CONTENT_KIND_OF[kind];
      const authoritative = !!contentKind && caps.isAuthoritative(contentKind);
      if (!authoritative) {
        for (const e of repoEntries(kind)) byId.set(e.id, e);
      }
      const exported = contentKind ? served.byKind.get(contentKind) : undefined;
      for (const item of servedItems(kind, exported)) {
        const id = `${kind}:${item.slug}` as EntityId;
        if (item.source === null) {
          byId.delete(id);
          archived.add(id);
          continue;
        }
        const repo = byId.get(id);
        byId.set(id, {
          id,
          kind,
          slug: item.slug,
          name: item.name,
          aliases: item.aliases ?? repo?.aliases,
          hint: repo?.hint,
          source: item.source,
        });
      }
    });
    const wanted = new Set<string>(kinds);
    for (const e of session) {
      // Served copies replace the session's once they arrive.
      const existing = byId.get(e.id);
      if (archived.has(e.id)) continue;
      if (wanted.has(e.kind) && (!existing || existing.source === 'repo')) {
        byId.set(e.id, e);
      }
    }
    return [...byId.values()];
    // Keyed on kindsKey and the exports' fingerprint (it changes exactly when
    // a served list's content does), not on the arrays.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kindsKey, served.fingerprint, caps.isAuthoritative, session]);

  return { entries, loading: served.loading };
}
