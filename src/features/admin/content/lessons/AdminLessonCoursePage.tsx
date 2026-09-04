/* eslint-disable react/jsx-sort-props */
import { ArrowLeft, Braces, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { AdminRoutes } from '@/constants/routes';
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';
import { SCALES } from '@/curriculum/engine/genreGeneration/scaleRegistry';
import {
  useApproveContentEdit,
  useContentItem,
  useContentItems,
  useDeleteContentItem,
  useDiscardContentEdit,
  useRejectContentEdit,
  useSaveContentItem,
  type ContentStatus,
} from '@/hooks/data/admin/useAdminContent';
import { isContentEditor } from '../../consoleRoles';
import { EditReviewBanner } from '../review/EditReview';
import {
  LessonLevelEditor,
  type LessonFlowBody,
} from '../visual/LessonLevelEditor';

/**
 * A genre's lessons, all levels in one place.
 *
 * Levels are separate content items — a lesson's slug is `<genre>-l<level>` and
 * that is how the app looks one up — so "add a level" here creates a sibling
 * item and "remove a level" deletes one. Editing stays scoped to the level in
 * front of you: one item is loaded and saved at a time, which keeps a save
 * atomic and means an interrupted edit can never leave two levels half-written.
 */

/** Mirrors canonicalGenre in the API: one lookup token per genre spelling. */
const canonicalGenre = (genre: string) =>
  genre.toLowerCase().replace(/[\s_-]/g, '');

const levelSlug = (genre: string, level: number) =>
  `${canonicalGenre(genre)}-l${level}`;

/** The content schema caps levels at 3. */
const MAX_LEVEL = 3;

const SECTION_SEEDS = [
  { id: 'A', name: 'Melody' },
  { id: 'B', name: 'Chords' },
  { id: 'C', name: 'Bass' },
  { id: 'D', name: 'Play-Along' },
] as const;

const titleCase = (value: string) =>
  value.replace(/(^|\s)\S/g, (char) => char.toUpperCase());

const newLevelBody = (
  genre: string,
  level: number,
  from?: LessonFlowBody,
): LessonFlowBody => ({
  id: levelSlug(genre, level),
  genre: from?.genre ?? genre,
  level,
  title: `${titleCase(from?.genre ?? genre)} Level ${level}`,
  version: 'v2',
  // Carrying the previous level's musical settings over is nearly always what
  // an author wants — a course rarely changes key or groove between levels.
  params: from?.params
    ? { ...from.params, grooves: [...(from.params.grooves ?? [])] }
    : {
        defaultKey: 'C',
        tempoRange: [80, 110],
        swing: 0,
        grooves: [],
        defaultScale: SCALES.major,
        defaultScaleId: 'major',
      },
  sections: SECTION_SEEDS.map((section) => ({ ...section, steps: [] })),
});

export const AdminLessonCoursePage = () => {
  const params = useParams();
  const [search, setSearch] = useSearchParams();
  const genre = params.genre ?? '';

  const { role } = useAuthContext();
  const isEditor = isContentEditor(role);

  const list = useContentItems({ kind: 'activity_flow' });
  const save = useSaveContentItem();
  const remove = useDeleteContentItem();
  const approve = useApproveContentEdit();
  const reject = useRejectContentEdit();
  const discard = useDiscardContentEdit();
  const reviewBusy = approve.isPending || reject.isPending || discard.isPending;

  // Every item whose slug belongs to this genre, ordered by level.
  const levels = useMemo(() => {
    const prefix = `${canonicalGenre(genre)}-l`;
    return (list.data?.items ?? [])
      .filter((item) => item.slug.startsWith(prefix))
      .map((item) => ({
        item,
        level: Number(item.slug.slice(prefix.length)) || 0,
      }))
      .filter((entry) => entry.level > 0)
      .sort((a, b) => a.level - b.level);
  }, [list.data, genre]);

  const requestedLevel = Number(search.get('level')) || 0;
  const activeEntry =
    levels.find((entry) => entry.level === requestedLevel) ?? levels[0];

  const detail = useContentItem(activeEntry?.item.id);

  const [draft, setDraft] = useState<LessonFlowBody | null>(null);
  const [status, setStatus] = useState<ContentStatus>('draft');
  const [dirty, setDirty] = useState(false);
  const [showJson, setShowJson] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Editors only: abandon a sent-back draft and start again from the live body.
  const [restartFromLive, setRestartFromLive] = useState(false);

  /**
   * Re-seed when the level in front of you changes, or when the server's copy
   * of it moves — and not otherwise.
   *
   * Keyed on updatedAt/editState rather than the query result's identity (which
   * changes on every refetch, so a background invalidation would wipe unsaved
   * work) and rather than the id alone (which would leave the pane showing the
   * pre-approval body after an approve, one "Save level" away from reverting
   * it).
   *
   * An editor picks up their own submitted version rather than the live one:
   * resubmitting from the live body would silently discard whatever is already
   * sitting in the review queue.
   */
  const seededKey = useRef<string | null>(null);
  useEffect(() => {
    const loaded = detail.data;
    if (!loaded) return;
    const key = `${loaded.id}:${new Date(loaded.updatedAt).getTime()}:${
      loaded.editState ?? ''
    }:${restartFromLive ? 'live' : ''}`;
    if (seededKey.current === key) return;
    seededKey.current = key;
    const source =
      isEditor && loaded.pendingBody && !restartFromLive
        ? loaded.pendingBody
        : loaded.body;
    setDraft(source as unknown as LessonFlowBody);
    setStatus(loaded.status);
    setDirty(false);
    setError(null);
  }, [detail.data, isEditor, restartFromLive]);

  const edit = (next: LessonFlowBody) => {
    setDraft(next);
    setDirty(true);
  };

  const confirmDiscard = () =>
    !dirty || window.confirm('This level has unsaved changes. Discard them?');

  const selectLevel = (level: number) => {
    if (!confirmDiscard()) return;
    setDirty(false);
    setSearch({ level: String(level) }, { replace: true });
  };

  const onSave = async () => {
    if (!draft) return;
    setError(null);
    try {
      await save.mutateAsync({
        kind: 'activity_flow',
        slug: levelSlug(draft.genre || genre, draft.level),
        body: draft,
        // An editor's save is a proposal; status is the admin's to set.
        status: isEditor ? undefined : status,
      });
      setDirty(false);
    } catch (cause) {
      setError((cause as Error).message);
    }
  };

  const addLevel = async () => {
    if (!confirmDiscard()) return;
    const nextLevel = (levels[levels.length - 1]?.level ?? 0) + 1;
    if (nextLevel > MAX_LEVEL) return;
    const body = newLevelBody(genre, nextLevel, draft ?? undefined);
    setError(null);
    try {
      await save.mutateAsync({
        kind: 'activity_flow',
        slug: body.id,
        body,
        status: 'draft',
      });
      setDirty(false);
      setSearch({ level: String(nextLevel) }, { replace: true });
    } catch (cause) {
      setError((cause as Error).message);
    }
  };

  const deleteLevel = async () => {
    if (!activeEntry) return;
    if (
      !window.confirm(
        `Delete level ${activeEntry.level} of ${genre}? This removes the lesson item entirely.`,
      )
    )
      return;
    await remove.mutateAsync(activeEntry.item.id);
    setDirty(false);
    setDraft(null);
    setSearch({}, { replace: true });
  };

  const displayGenre = titleCase(draft?.genre ?? genre);

  return (
    <div className="flex flex-col gap-5 p-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button asChild size="icon" variant="ghost">
            <Link
              to={AdminRoutes.contentKind({ kind: 'activity_flow' })}
              aria-label="Back to lessons"
            >
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-semibold">{displayGenre}</h1>
            <p className="text-xs text-muted-foreground">
              Course slug{' '}
              <span className="font-mono">
                {canonicalGenre(genre)}-l&lt;level&gt;
              </span>{' '}
              · edits reach students only after you publish.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowJson((value) => !value)}
          >
            <Braces className="mr-2 size-4" />
            {showJson ? 'Hide JSON' : 'JSON'}
          </Button>
          {/* Publishing status and deletion are admin calls — an editor's work
              becomes live through approval, not through either of these. */}
          {!isEditor && (
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value as ContentStatus);
                setDirty(true);
              }}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="published">Published</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          )}
          {activeEntry && !isEditor && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Delete this level"
              onClick={deleteLevel}
            >
              <Trash2 className="size-4" />
            </Button>
          )}
          <Button onClick={onSave} disabled={!draft || save.isPending}>
            {save.isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Save className="mr-2 size-4" />
            )}
            {isEditor ? 'Submit level' : 'Save level'}
            {dirty ? ' •' : ''}
          </Button>
        </div>
      </div>

      {(error || save.error) && (
        <div className="rounded-lg border border-red-600/30 bg-red-600/10 p-3 text-sm text-red-300">
          {error ?? save.error?.message}
        </div>
      )}

      {detail.data?.editState && (
        <EditReviewBanner
          state={detail.data.editState}
          pendingNote={detail.data.pendingNote}
          reviewNote={detail.data.reviewNote}
          submittedAt={detail.data.pendingAt}
          isEditor={isEditor}
          liveBody={detail.data.body}
          pendingBody={detail.data.pendingBody}
          busy={reviewBusy}
          onApprove={
            isEditor
              ? undefined
              : () => void approve.mutateAsync(detail.data!.id)
          }
          onReject={
            isEditor
              ? undefined
              : (note) => void reject.mutateAsync({ id: detail.data!.id, note })
          }
          onDiscard={() => void discard.mutateAsync(detail.data!.id)}
          onRestartFromLive={
            isEditor ? () => setRestartFromLive(true) : undefined
          }
        />
      )}

      {/* ── Level tabs ── */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.08] pb-3">
        {levels.map(({ item, level }) => {
          const isActive = activeEntry?.level === level;
          return (
            <button
              key={item.id}
              type="button"
              className={`rounded-lg px-3.5 py-1.5 text-sm transition-colors ${
                isActive
                  ? 'bg-white/10 font-medium text-white'
                  : 'text-muted-foreground hover:bg-white/5 hover:text-white'
              }`}
              onClick={() => selectLevel(level)}
            >
              Level {level}
              {/* Three states, not two: a level with an unreviewed proposal
                  would otherwise be indistinguishable from an untouched
                  draft. */}
              <span
                className={`ml-2 inline-block size-1.5 rounded-full ${
                  item.editState === 'pending'
                    ? 'bg-sky-400'
                    : item.editState === 'rejected'
                      ? 'bg-orange-400'
                      : item.status === 'published'
                        ? 'bg-emerald-400'
                        : 'bg-amber-400'
                }`}
                title={
                  item.editState === 'pending'
                    ? 'In review'
                    : item.editState === 'rejected'
                      ? 'Changes requested'
                      : item.status
                }
              />
            </button>
          );
        })}

        {levels.length < MAX_LEVEL ? (
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-lg border border-dashed border-white/20 px-3 py-1.5 text-sm text-white/40 transition-colors hover:border-white/40 hover:text-white disabled:opacity-40"
            disabled={save.isPending}
            onClick={addLevel}
          >
            <Plus className="size-3.5" />
            Level {(levels[levels.length - 1]?.level ?? 0) + 1}
          </button>
        ) : (
          <span className="text-xs text-muted-foreground">
            Levels are capped at {MAX_LEVEL}.
          </span>
        )}
      </div>

      {/* ── Active level ── */}
      {list.isLoading || (activeEntry && detail.isLoading) ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      ) : !activeEntry ? (
        <div className="rounded-xl border border-dashed border-white/10 p-10 text-center">
          <p className="text-sm text-muted-foreground">
            No lessons exist for “{genre}” yet.
          </p>
          <Button className="mt-4" onClick={addLevel} disabled={save.isPending}>
            <Plus className="mr-2 size-4" />
            Create level 1
          </Button>
        </div>
      ) : draft ? (
        <>
          <LessonLevelEditor flow={draft} onChange={edit} />
          {showJson && (
            <div>
              <p className="mb-1.5 text-xs text-muted-foreground">
                Raw body — the escape hatch for fields the visual editor doesn’t
                surface. Edits here apply on blur.
              </p>
              <Textarea
                rows={20}
                className="font-mono text-xs"
                defaultValue={JSON.stringify(draft, null, 2)}
                onBlur={(event) => {
                  try {
                    edit(JSON.parse(event.target.value) as LessonFlowBody);
                    setError(null);
                  } catch {
                    setError('The JSON pane is not valid JSON.');
                  }
                }}
              />
            </div>
          )}
        </>
      ) : null}
    </div>
  );
};
