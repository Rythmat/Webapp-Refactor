import type { ContentKind } from '@/hooks/data/admin/useAdminContent';
import type { WorkingGraphMode } from '../../content/graph/useWorkingGraph';
import type { ProposalOwner } from '../../content/itemEditor/useItemSession';
import { kindLabel as contentKindLabel } from '../../content/publishing/kindLabels';
import type { SchemaStep } from '../model/types';

/**
 * Whether a row's item can be written here, and why not — one rule, so the
 * row panel's Details and the grid's cells (`editorFor.ts` `lockOf`) never
 * disagree about a row:
 *
 *  - `readOnlyReason` — the item as a whole: repo mode, a kind the API does
 *    not serve, someone else's proposal on it;
 *  - `waitingFor` — one field the contract does not take yet (a
 *    `SchemaStep`), until the server's body level for its kind reaches it;
 *    `SCHEMA_STEP` says each step in words. `useWaitingFor.ts` asks it of
 *    this server.
 *
 * Pure, so the grid's model-side modules can share it: the hook that reads
 * the server's capabilities lives in its own file.
 */

/**
 * Why the row cannot be saved here, or null when it can. An empty string is
 * "not yet, and nothing to say": the capabilities are still loading.
 */
export function readOnlyReason({
  mode,
  kind,
  served,
  known,
  proposal,
  sentBack,
  isEditor,
}: {
  mode: WorkingGraphMode;
  kind: ContentKind;
  served: boolean;
  known: boolean;
  /** Whose proposal the item carries (`useItemSession`). */
  proposal: ProposalOwner;
  /** It was sent back to its editor, rather than waiting on review. */
  sentBack: boolean;
  isEditor: boolean;
}): string | null {
  if (mode === 'repo') {
    return 'Read-only: the rows are the repo’s snapshot, not the working copy, so nothing here is saved.';
  }
  if (!known) return '';
  if (!served) {
    return `Read-only: the content API does not serve ${contentKindLabel(kind).toLowerCase()} yet.`;
  }
  // Someone else's proposal, waiting or sent back, stops every save here.
  if (proposal === 'other') {
    if (!isEditor)
      return sentBack
        ? 'Sent back to its editor: nothing else is saved here until they resubmit or withdraw it, or you discard it above.'
        : 'Review the pending proposal first: approve or reject it above.';
    return sentBack
      ? 'Read-only: another editor’s proposal on this item was sent back to them. It is resubmitted, withdrawn or discarded before anything else is sent for it.'
      : 'Read-only: another editor’s proposal is waiting for review on this item. Nothing else is sent for it until it has been reviewed.';
  }
  return null;
}

/** When a field the contract does not take yet becomes saveable. */
export const SCHEMA_STEP: Record<SchemaStep, string> = {
  'song-v2': 'song schema v2',
  'event-v2': 'the event body v2',
  'artist-born': 'the artist’s Born field',
};

/** The body level each step is, by the kind whose body it changes. */
const STEP_LEVEL: Record<SchemaStep, { kind: ContentKind; level: number }> = {
  'song-v2': { kind: 'song', level: 2 },
  'event-v2': { kind: 'globe_event', level: 2 },
  'artist-born': { kind: 'artist', level: 2 },
};

/**
 * The schema step a field still waits for on a server whose body levels
 * `schemaVersionOf` reads, or undefined once it validates the field (then
 * the field saves like any other).
 */
export function waitingFor(
  since: SchemaStep | undefined,
  schemaVersionOf: (kind: ContentKind) => number,
): SchemaStep | undefined {
  if (!since) return undefined;
  const step = STEP_LEVEL[since];
  return schemaVersionOf(step.kind) >= step.level ? undefined : since;
}
