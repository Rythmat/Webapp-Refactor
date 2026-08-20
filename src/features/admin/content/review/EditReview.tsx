/* eslint-disable react/jsx-sort-props */
import { formatDistanceToNow } from 'date-fns';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  Loader2,
  RotateCcw,
  Undo2,
  X,
} from 'lucide-react';
import { useMemo, useState, type FC } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { ContentEditState } from '@/hooks/data/admin/useAdminContent';
import { diffBodies, formatDiffValue } from './bodyDiff';

/**
 * The shared vocabulary for a proposed content edit.
 *
 * An editor's save does not change the live body — it lands beside it and waits
 * for an admin. That state is invisible unless the console says so, and it has
 * to read differently depending on who is looking: the editor needs to know
 * their work is queued (or was sent back, and why), while the admin needs the
 * two verdicts. One component, two audiences, so the wording can never drift
 * apart between the list, the item editor and the lesson course page.
 */

/**
 * The proposed body against the live one.
 *
 * Load-bearing, not decorative: without it Approve applies content the reviewer
 * was never shown, and the whole point of the role is that an admin sees what
 * they are accepting. Collapsed by default so it does not bury the note, but
 * one click away from the button that applies it.
 */
export const ProposalDiff: FC<{
  before: Record<string, unknown> | null | undefined;
  after: Record<string, unknown> | null | undefined;
}> = ({ before, after }) => {
  const [open, setOpen] = useState(false);
  const { entries, truncated } = useMemo(
    () => diffBodies(before, after),
    [before, after],
  );

  if (!after) return null;

  return (
    <div className="mt-2">
      <button
        type="button"
        className="inline-flex items-center gap-1 text-xs text-sky-300/80 transition-colors hover:text-sky-200"
        onClick={() => setOpen((value) => !value)}
      >
        {open ? (
          <ChevronDown className="size-3.5" />
        ) : (
          <ChevronRight className="size-3.5" />
        )}
        {entries.length === 0
          ? 'No field-level changes'
          : `${entries.length}${truncated ? '+' : ''} change${
              entries.length === 1 ? '' : 's'
            }`}
      </button>

      {open && entries.length > 0 && (
        <div className="mt-1.5 max-h-72 overflow-auto rounded-md border border-white/10 bg-black/30 p-2">
          <ul className="flex flex-col gap-1 font-mono text-[11px]">
            {entries.map((entry, index) => (
              <li key={`${entry.path}-${index}`}>
                <span className="text-white/40">{entry.path}</span>
                <div className="pl-3">
                  {entry.kind !== 'added' && (
                    <div className="text-red-300/80">
                      − {formatDiffValue(entry.before)}
                    </div>
                  )}
                  {entry.kind !== 'removed' && (
                    <div className="text-emerald-300/80">
                      + {formatDiffValue(entry.after)}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
          {truncated && (
            <p className="mt-1 text-[11px] text-white/30">
              Only the first {entries.length} changes are listed — open the item
              to see the rest.
            </p>
          )}
        </div>
      )}
    </div>
  );
};

/** Compact marker for list rows and tabs. */
export const EditStateBadge: FC<{ state: ContentEditState }> = ({ state }) => {
  if (!state) return null;
  return state === 'pending' ? (
    <Badge className="border-sky-600/30 bg-sky-600/20 text-sky-300">
      <Clock className="mr-1 size-3" />
      In review
    </Badge>
  ) : (
    <Badge className="border-orange-600/30 bg-orange-600/20 text-orange-300">
      Changes requested
    </Badge>
  );
};

export interface EditReviewBannerProps {
  state: ContentEditState;
  /** The editor's note on what they changed. */
  pendingNote?: string | null;
  /** The admin's note when the edit was sent back. */
  reviewNote?: string | null;
  submittedAt?: Date | null;
  /** Switches the copy between the two audiences. */
  isEditor: boolean;
  /** The live body and the proposed one, for the diff. */
  liveBody?: Record<string, unknown> | null;
  pendingBody?: Record<string, unknown> | null;
  onApprove?: () => void;
  onReject?: (note: string) => void;
  onDiscard?: () => void;
  /** Reseed the editor's pane from the live body, abandoning their draft. */
  onRestartFromLive?: () => void;
  busy?: boolean;
}

export const EditReviewBanner: FC<EditReviewBannerProps> = ({
  state,
  pendingNote,
  reviewNote,
  submittedAt,
  isEditor,
  liveBody,
  pendingBody,
  onApprove,
  onReject,
  onDiscard,
  onRestartFromLive,
  busy,
}) => {
  const [rejecting, setRejecting] = useState(false);

  if (!state) return null;

  const submittedAgo =
    submittedAt && `${formatDistanceToNow(new Date(submittedAt))} ago`;

  if (state === 'rejected') {
    return (
      <div className="rounded-lg border border-orange-600/30 bg-orange-600/10 p-3 text-sm">
        <div className="font-medium text-orange-300">
          {isEditor ? 'Changes requested' : 'You sent this back'}
        </div>
        <p className="mt-1 text-orange-100/80">
          {reviewNote || 'No reason was given.'}
        </p>
        <p className="mt-2 text-xs text-orange-200/60">
          {isEditor
            ? 'You are editing your submitted version — revise it and submit again.'
            : 'The editor’s proposed version is preserved so they can revise it. The live content is unchanged.'}
        </p>

        <ProposalDiff before={liveBody} after={pendingBody} />

        <div className="mt-2 flex flex-wrap gap-2">
          {/* A proposal is sent back precisely when it should not be applied
              as-is, and an editor's pane starts from their own draft — so the
              way back to the current live version has to be offered, or the
              only route is to redo the edit by hand. */}
          {isEditor && onRestartFromLive && (
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={onRestartFromLive}
            >
              <RotateCcw className="mr-2 size-3.5" />
              Start from the current version
            </Button>
          )}
          {onDiscard && (
            <Button
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={onDiscard}
            >
              <Undo2 className="mr-2 size-3.5" />
              {isEditor ? 'Discard my draft' : 'Discard the proposal'}
            </Button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-sky-600/30 bg-sky-600/10 p-3 text-sm">
      <div className="flex flex-wrap items-center gap-2 font-medium text-sky-300">
        <Clock className="size-4" />
        {isEditor ? 'Submitted for review' : 'An editor proposed changes'}
        {submittedAgo && (
          <span className="text-xs font-normal text-sky-200/50">
            {submittedAgo}
          </span>
        )}
      </div>

      {pendingNote && <p className="mt-1 text-sky-100/80">“{pendingNote}”</p>}

      <p className="mt-2 text-xs text-sky-200/60">
        {isEditor
          ? 'The live version is unchanged until an admin approves this. You can keep editing and submit again — that replaces what is in the queue.'
          : 'Approving applies it to the item and marks the item published. It reaches students at the next Publish for this kind. Read the changes before you do.'}
      </p>

      <ProposalDiff before={liveBody} after={pendingBody} />

      <div className="mt-2 flex flex-wrap items-center gap-2">
        {onApprove && (
          <Button size="sm" disabled={busy} onClick={onApprove}>
            {busy ? (
              <Loader2 className="mr-2 size-3.5 animate-spin" />
            ) : (
              <Check className="mr-2 size-3.5" />
            )}
            Approve
          </Button>
        )}
        {onReject && !rejecting && (
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => setRejecting(true)}
          >
            <X className="mr-2 size-3.5" />
            Request changes
          </Button>
        )}
        {onDiscard && isEditor && (
          <Button size="sm" variant="ghost" disabled={busy} onClick={onDiscard}>
            <Undo2 className="mr-2 size-3.5" />
            Withdraw
          </Button>
        )}
      </div>

      {onReject && rejecting && (
        <RejectNoteForm
          busy={busy}
          onCancel={() => setRejecting(false)}
          onSubmit={(value) => {
            onReject(value);
            setRejecting(false);
          }}
        />
      )}
    </div>
  );
};

/**
 * The "why are you sending this back" prompt.
 *
 * Shared by the item banner and the Publishing page's queue — the same verdict
 * is reachable from both, and two copies of it would be two chances for the
 * empty-note guard to drift out of step with the API, which requires one.
 */
export const RejectNoteForm: FC<{
  busy?: boolean;
  onSubmit: (note: string) => void;
  onCancel: () => void;
}> = ({ busy, onSubmit, onCancel }) => {
  const [note, setNote] = useState('');

  return (
    <div className="mt-2">
      <Textarea
        autoFocus
        rows={2}
        className="text-sm"
        placeholder="What needs to change? The editor sees this."
        value={note}
        onChange={(event) => setNote(event.target.value)}
      />
      <div className="mt-2 flex gap-2">
        <Button
          size="sm"
          variant="secondary"
          // A rejection with no reason gives the editor nothing to act on,
          // which is also why the API requires a non-empty note.
          disabled={busy || note.trim().length === 0}
          onClick={() => onSubmit(note.trim())}
        >
          Send back
        </Button>
        <Button size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </div>
  );
};
