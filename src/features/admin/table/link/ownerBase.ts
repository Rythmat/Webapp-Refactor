import type { ContentItemDetail } from '@/hooks/data/admin/useAdminContent';
import type { Body } from './links';

/**
 * What a write to an item is built on: the item's live body, or an editor's
 * own proposal — and for the latter, whether it was sent back (a write
 * resubmits it). Or why nothing may be written there at all.
 *
 * Link… (ConfirmConnectionDialog) asks it of the owner it writes, on open
 * and again just before the save; the Table's cell writes will ask it of
 * every item they write. Tiny and pure, so neither chunk pulls in the other.
 */
export type OwnerBase = { body: Body; sentBack: boolean } | { blocked: string };

/**
 * As the server's own rule has it (the decisions endpoint's `baseFor`):
 * someone else's proposal on the owner stops the write, waiting or sent
 * back — an admin's save would slide under it, to be overwritten when it
 * is approved; an editor's would replace another person's work.
 */
export function baseOf(
  detail: ContentItemDetail,
  editor: boolean,
  userId: string | null | undefined,
  name: string,
): OwnerBase {
  const own =
    editor && !!detail.pendingBody && !!userId && detail.pendingById === userId;
  if (own)
    return {
      body: detail.pendingBody!,
      sentBack: detail.editState !== 'pending',
    };
  if (detail.pendingBody || detail.pendingById || detail.editState) {
    const sentBack = detail.editState === 'rejected';
    if (!editor)
      return {
        blocked: sentBack
          ? `${name} has a proposal that was sent back: its editor resubmits or withdraws it, or you discard it in its row, before anything else is written there.`
          : `Review the pending proposal on ${name} first: approve or send it back in its row, then link.`,
      };
    return {
      blocked: sentBack
        ? `Another editor’s proposal on ${name} was sent back to them. It has to be resubmitted, withdrawn or discarded before anything else is sent for it.`
        : `Another editor’s proposal is waiting on ${name}. It has to be reviewed before anything else is sent for it.`,
    };
  }
  return { body: detail.body, sentBack: false };
}
