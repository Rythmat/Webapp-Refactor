import type { ContentKind } from '@/hooks/data/admin/useAdminContent';
import { CONTENT_KINDS } from '../kinds';
import { useItemSession } from './useItemSession';

/**
 * An item's editing session (`useItemSession`) with its kind's spec: for the
 * pages that render an item by its spec — the content area's editor and the
 * mirror's song page, whose editor is the spec's `FullEditor`.
 *
 * The spec comes from `kinds.ts`, which brings every kind's editor with it,
 * so code that must stay light (the Table's row panel) holds the session
 * itself instead.
 */

export interface ContentItemEditorOptions {
  kind: ContentKind;
  /** The item's DB id, or 'new'. */
  itemId: string;
  /** For a new item: the body to start from (else the kind's default). */
  newBody?: Record<string, unknown>;
}

export function useContentItemEditor({
  kind,
  itemId,
  newBody,
}: ContentItemEditorOptions) {
  const spec = CONTENT_KINDS[kind];
  const session = useItemSession({
    kind,
    itemId,
    newBody,
    makeDefault: spec.makeDefault,
  });
  return { ...session, spec };
}

export type ContentItemEditorState = ReturnType<typeof useContentItemEditor>;
