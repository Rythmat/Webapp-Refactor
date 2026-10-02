import { ArrowLeft, Loader2, Save, Trash2 } from 'lucide-react';
import { type CSSProperties, type ReactNode, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/components/utilities';
import type { ContentStatus } from '@/hooks/data/admin/useAdminContent';
import { ConsoleBadge } from '../../ui/ConsoleBadge';
import { ConsoleCallout } from '../../ui/ConsoleCallout';
import {
  deleteQuestion,
  REPO_NO_STATUS_LABEL,
  REPO_READ_ONLY_LABEL,
  repoReadOnlyFile,
  repoReadOnlyNote,
  repoStatusNote,
  statusChoices,
} from '../repo/repoCopy';
import { useRepoMode } from '../repo/useRepoMode';
import { EditReviewBanner } from '../review/EditReview';
import type { ContentItemEditorState } from './useContentItemEditor';

/**
 * A full editor for one item: a slim sticky bar (back, title, status, save)
 * over the kind's own editor, which owns the whole body — a song's page, say.
 *
 * Used by the records table's editor and by the mirror's song page in Edit
 * mode, so the two save, review and warn about unsaved work identically. The
 * bar's live height is published as `--full-editor-bar-h`, so toolbars
 * inside the editor (the chord chart's) can stick just below it rather than
 * over the Save button.
 */

interface ContentItemEditorProps {
  editor: ContentItemEditorState;
  backTo: string;
  backLabel: string;
  /** Called after a save lands (the table's editor returns to the list). */
  onSaved?: () => void;
  onDeleted?: () => void;
  /**
   * `console-page`: inside ConsolePage's padding, which the bar bleeds out
   * of to span the page. `none`: the editor already fills its frame.
   */
  bleed?: 'console-page' | 'none';
  /** Beside the title: the mirror's Preview | Edit. */
  leading?: ReactNode;
}

export const ContentItemEditor = ({
  editor,
  backTo,
  backLabel,
  onSaved,
  onDeleted,
  bleed = 'console-page',
  leading,
}: ContentItemEditorProps) => {
  const {
    spec,
    isNew,
    isEditor,
    existing,
    body,
    loading,
    dirty,
    status,
    setStatus,
    submitNote,
    setSubmitNote,
    jsonError,
    saving,
    saveError,
    review,
  } = editor;
  const FullEditor = spec.FullEditor;
  // The literal DEV gate here, not only in the hook, lets the build drop
  // every repo branch below (useRepoMode.ts).
  const repoMode = useRepoMode();
  const repo = import.meta.env.DEV && repoMode;
  const statuses = statusChoices(editor.kind, repo);
  // A kind repo mode serves but never writes: no status, Save or Delete.
  const readOnlyFile = repo ? repoReadOnlyFile(editor.kind) : null;

  const [bar, setBar] = useState<HTMLDivElement | null>(null);
  const [barHeight, setBarHeight] = useState(0);
  useEffect(() => {
    if (!bar) return;
    const update = () => setBarHeight(bar.offsetHeight);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(bar);
    return () => observer.disconnect();
  }, [bar]);

  if (loading || !body || !FullEditor) {
    return (
      <div className="space-y-3 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const onSave = async () => {
    const result = await editor.save().catch(() => null);
    if (result) onSaved?.();
  };

  const title = isNew
    ? `New ${spec.singular}`
    : (existing.data?.title ?? `Edit ${spec.singular}`);

  return (
    <div
      className="flex flex-col"
      style={{ '--full-editor-bar-h': `${barHeight}px` } as CSSProperties}
    >
      <div
        ref={setBar}
        className={cn(
          'sticky top-0 z-30 flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] bg-background px-6 py-2 md:px-10',
          bleed === 'console-page' && '-mx-6 -mt-8 md:-mx-10',
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          <Button asChild size="icon" variant="ghost">
            <Link to={backTo} aria-label={backLabel}>
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <h1 className="truncate text-[15px] text-white">{title}</h1>
          {leading}
        </div>
        <div className="flex items-center gap-2">
          {editor.stale ? (
            // Changed elsewhere, in a field changed here too: the author
            // chooses before anything is saved (useItemSession).
            <span className="flex items-center gap-1 text-xs text-amber-300">
              <span
                className="max-w-56 truncate"
                title={`Changed since you opened it: ${editor.stale.overlap.join(', ')}`}
              >
                Changed elsewhere: {editor.stale.overlap.join(', ')}
              </span>
              <Button size="sm" variant="ghost" onClick={editor.discardChanges}>
                Reload
              </Button>
              <Button size="sm" variant="ghost" onClick={editor.keepMine}>
                Keep mine
              </Button>
            </span>
          ) : (
            (saveError || jsonError) && (
              <span className="max-w-64 truncate text-xs text-red-400">
                {jsonError ?? saveError?.message}
              </span>
            )
          )}
          {dirty && (
            <span className="text-xs font-medium text-amber-400">Unsaved</span>
          )}
          {isEditor && (
            <Input
              className="w-56"
              aria-label="What changed"
              placeholder="What changed? (optional)"
              value={submitNote}
              onChange={(event) => setSubmitNote(event.target.value)}
            />
          )}
          {/* Publishing status is an admin's call; an editor proposes. In
              repo mode only a song has one (repoCopy.ts). */}
          {!isEditor &&
            (readOnlyFile ? (
              <ConsoleBadge tone="muted" title={repoReadOnlyNote(readOnlyFile)}>
                {REPO_READ_ONLY_LABEL}
              </ConsoleBadge>
            ) : statuses ? (
              <Select
                value={status}
                onValueChange={(value) => setStatus(value as ContentStatus)}
              >
                <SelectTrigger
                  className="w-32"
                  aria-label="Status"
                  title={repo ? repoStatusNote(editor.kind) : undefined}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statuses.map((choice) => (
                    <SelectItem key={choice.value} value={choice.value}>
                      {choice.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <ConsoleBadge tone="muted" title={repoStatusNote(editor.kind)}>
                {REPO_NO_STATUS_LABEL}
              </ConsoleBadge>
            ))}
          {/* Deleting is admin-only and unreviewable, so it asks first. */}
          {!isNew && !isEditor && !readOnlyFile && existing.data && (
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Delete ${spec.singular}`}
              onClick={async () => {
                if (!window.confirm(deleteQuestion(existing.data!.title, repo)))
                  return;
                if (await editor.remove()) onDeleted?.();
              }}
            >
              <Trash2 className="size-4" />
            </Button>
          )}
          {!readOnlyFile && (
            <Button onClick={() => void onSave()} disabled={saving}>
              {saving ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Save className="mr-2 size-4" />
              )}
              {isEditor ? 'Submit for review' : 'Save'}
            </Button>
          )}
        </div>
      </div>

      {!isNew && existing.data?.editState && (
        <div className="flex flex-col gap-2 px-6 pt-3 md:px-10">
          <EditReviewBanner
            state={existing.data.editState}
            pendingNote={existing.data.pendingNote}
            reviewNote={existing.data.reviewNote}
            submittedAt={existing.data.pendingAt}
            isEditor={isEditor}
            liveBody={existing.data.body}
            pendingBody={existing.data.pendingBody}
            busy={review.busy}
            onRestartFromLive={isEditor ? review.restartFromLive : undefined}
            onApprove={isEditor ? undefined : () => void review.approve()}
            onReject={isEditor ? undefined : (note) => void review.reject(note)}
            onDiscard={() => void review.discard()}
          />
          {review.error && (
            <ConsoleCallout tone="danger">
              {review.error.message}
            </ConsoleCallout>
          )}
        </div>
      )}

      <FullEditor body={body} onChange={editor.applyBody} />
    </div>
  );
};
