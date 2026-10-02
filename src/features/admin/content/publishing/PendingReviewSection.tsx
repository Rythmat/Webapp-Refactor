import { formatDistanceToNow } from 'date-fns';
import { Check, Eye, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/components/utilities';
import {
  useApproveContentEdit,
  useContentItem,
  usePendingEdits,
  useRejectContentEdit,
} from '@/hooks/data/admin/useAdminContent';
import { ConsoleBadge } from '../../ui/ConsoleBadge';
import { ConsoleCallout } from '../../ui/ConsoleCallout';
import { CONSOLE_LABEL } from '../../ui/styles';
import { ProposalDiff, RejectNoteForm } from '../review/EditReview';
import { kindLabel } from './kindLabels';
import { reviewHref } from './reviewHref';

/**
 * Editors' proposed edits, waiting on a verdict.
 *
 * It lives beside the Publish buttons because approving is the step that
 * decides what the next release contains — the queue and Publish are two
 * halves of the same decision, and splitting them across pages would let an
 * admin publish while unreviewed work sat somewhere else.
 *
 * Approving applies the proposal and marks the item published; it does NOT
 * publish by itself, so a batch of approvals still ships as one release. Each
 * row can show its changes first: the queue carries no bodies, so the diff is
 * fetched when asked for — otherwise Approve applies content no one saw.
 */
export const PendingReviewSection = () => {
  const pending = usePendingEdits();
  const approve = useApproveContentEdit();
  const reject = useRejectContentEdit();
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [showingId, setShowingId] = useState<string | null>(null);

  const rows = pending.data ?? [];
  const busy = approve.isPending || reject.isPending;

  if (pending.isLoading) return <Skeleton className="h-24 w-full" />;

  return (
    <section>
      <h2 className={cn(CONSOLE_LABEL, 'mb-3')}>
        Awaiting review{rows.length > 0 && ` (${rows.length})`}
      </h2>

      {(approve.error || reject.error) && (
        <ConsoleCallout tone="danger" className="mb-3">
          {approve.error?.message ?? reject.error?.message}
        </ConsoleCallout>
      )}

      {rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nothing submitted by an editor is waiting. Editors&rsquo; saves land
          here instead of changing live content.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((row) => (
            <li key={row.id}>
              <ConsoleCallout tone="info" icon={null} className="p-3">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-white">
                        {row.title}
                      </span>
                      {row.isNew && (
                        <ConsoleBadge tone="success">New</ConsoleBadge>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {kindLabel(row.kind)} · {row.slug}
                      </span>
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {row.submittedBy?.name ?? 'Unknown editor'}
                      {row.submittedAt &&
                        ` · ${formatDistanceToNow(new Date(row.submittedAt))} ago`}
                    </div>
                    {row.note && (
                      <p className="mt-1 text-sm">&ldquo;{row.note}&rdquo;</p>
                    )}
                    <button
                      type="button"
                      aria-expanded={showingId === row.id}
                      onClick={() =>
                        setShowingId(showingId === row.id ? null : row.id)
                      }
                      className="mt-1 text-xs text-white/55 underline-offset-2 hover:text-white hover:underline"
                    >
                      {showingId === row.id ? 'Hide changes' : 'Show changes'}
                    </button>
                    {showingId === row.id && <ProposalChanges id={row.id} />}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Button asChild size="sm" variant="ghost">
                      <Link to={reviewHref(row)}>
                        <Eye className="mr-1 size-3.5" />
                        Review
                      </Link>
                    </Button>
                    <Button
                      size="sm"
                      disabled={busy}
                      onClick={() => approve.mutate(row.id)}
                    >
                      <Check className="mr-1 size-3.5" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={busy}
                      onClick={() =>
                        setRejectingId(rejectingId === row.id ? null : row.id)
                      }
                    >
                      <X className="mr-1 size-3.5" />
                      Request changes
                    </Button>
                  </div>
                </div>

                {rejectingId === row.id && (
                  <RejectNoteForm
                    busy={busy}
                    onCancel={() => setRejectingId(null)}
                    onSubmit={(value) => {
                      reject.mutate({ id: row.id, note: value });
                      setRejectingId(null);
                    }}
                  />
                )}
              </ConsoleCallout>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

/** One proposal against the live body, fetched when asked for. */
const ProposalChanges = ({ id }: { id: string }) => {
  const item = useContentItem(id);
  if (item.isLoading) return <Skeleton className="mt-2 h-6 w-40" />;
  if (!item.data) {
    return (
      <p className="mt-1 text-xs text-red-300">Could not load this proposal.</p>
    );
  }
  return (
    <ProposalDiff
      before={item.data.body}
      after={item.data.pendingBody}
      defaultOpen
    />
  );
};
