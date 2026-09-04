import {
  ArrowLeft,
  Eye,
  Info,
  Loader2,
  Save,
  SlidersHorizontal,
  Trash2,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/components/utilities';
import { AdminRoutes } from '@/constants/routes';
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';
import {
  useApproveContentEdit,
  useContentItem,
  useContentTemplate,
  useDeleteContentItem,
  useDiscardContentEdit,
  useRejectContentEdit,
  useSaveContentItem,
  type ContentKind,
  type ContentStatus,
} from '@/hooks/data/admin/useAdminContent';
import { isContentEditor } from '../consoleRoles';
import {
  CONTENT_KINDS,
  getPath,
  isContentKind,
  jsonRemainder,
  setPath,
  type FieldSpec,
} from './kinds';
import { EditReviewBanner } from './review/EditReview';
import {
  GlobeEventVisualEditor,
  type GlobeEventBody,
} from './visual/GlobeEventVisualEditor';

/**
 * One editor for every content kind, in two views.
 *
 * The default view renders the item the way a student meets it — a song as its
 * chord chart, a globe event as its card — and makes every part of that
 * clickable. It is the view an author should live in, because what they are
 * looking at while they type is what they are shipping.
 *
 * The second view is the original typed form plus a JSON pane for the fields no
 * visual surface covers. Kinds with no visual editor yet (artist locations,
 * globe cities, fundamentals) open straight into it. Lessons are edited on
 * their own course page, which spans several items — see AdminLessonCoursePage.
 *
 * `body` is the single source of truth in both views. The JSON pane writes into
 * it on blur rather than being merged at save time, so a change made visually
 * can never be overwritten by a stale copy of the text.
 */

const csvToArray = (value: string) =>
  value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

/** Kinds whose student-facing surface the console can render for editing. */
const VISUAL_KINDS: ContentKind[] = ['song', 'globe_event'];

type View = 'visual' | 'fields';

export const AdminContentEditPage = () => {
  const params = useParams();
  const navigate = useNavigate();
  const kind: ContentKind = isContentKind(params.kind)
    ? params.kind
    : 'globe_event';
  const spec = CONTENT_KINDS[kind];
  const isNew = params.id === 'new';
  const hasVisual = VISUAL_KINDS.includes(kind);
  // A "full editor" owns the whole body and replaces the form + JSON pane.
  const FullEditor = spec.FullEditor;

  const { role } = useAuthContext();
  // An editor's save is a proposal: the API decides that from the session, so
  // this only changes what the page offers and what it calls things.
  const isEditor = isContentEditor(role);

  const existing = useContentItem(isNew ? undefined : params.id);
  const template = useContentTemplate(isNew ? kind : undefined);
  const save = useSaveContentItem();
  const remove = useDeleteContentItem();
  const approve = useApproveContentEdit();
  const reject = useRejectContentEdit();
  const discard = useDiscardContentEdit();
  const reviewBusy = approve.isPending || reject.isPending || discard.isPending;

  const [status, setStatus] = useState<ContentStatus>('draft');
  const [body, setBody] = useState<Record<string, unknown> | null>(null);
  const [view, setView] = useState<View>(hasVisual ? 'visual' : 'fields');
  // Bumped to re-seed the uncontrolled JSON textarea from the current body.
  const [jsonSeed, setJsonSeed] = useState(0);
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  // Editors only: a one-line "what I changed", shown to whoever reviews it.
  const [submitNote, setSubmitNote] = useState('');
  // Editors only: abandon a sent-back draft and start again from the live body.
  const [restartFromLive, setRestartFromLive] = useState(false);

  // The typed form and the visual editor each own a slice of the body; the JSON
  // pane owns whatever is left. Splitting on the union keeps all three from ever
  // claiming the same key.
  const ownedKeys = useMemo(
    () => [...spec.formKeys, ...(spec.structuralKeys ?? [])],
    [spec],
  );

  /** Edit the in-memory body and flag unsaved changes. */
  const applyBody = (next: Record<string, unknown>) => {
    setBody(next);
    setDirty(true);
  };

  // For "New …", prefer the kind's local default (e.g. a song's 4-bar starter)
  // over the backend template, so new items are deterministic and don't depend
  // on the remote skeleton. Memoized (keyed only on isNew/spec) so its identity
  // is stable and the seeding effect runs once. Kinds without a local default
  // still seed from the template.
  const defaultBody = useMemo(
    () => (isNew ? (spec.makeDefault?.() ?? null) : null),
    [isNew, spec],
  );
  // An editor opening an item they have already submitted must pick up THEIR
  // proposed version, not the live one — otherwise resubmitting would silently
  // throw away the work sitting in the queue. An admin always sees the live
  // body; the proposal is something they act on through the banner instead.
  const seed = isNew
    ? (defaultBody ?? template.data?.body)
    : isEditor && existing.data?.pendingBody && !restartFromLive
      ? existing.data.pendingBody
      : existing.data?.body;

  /**
   * Re-seed only when the server's version of this item actually moved.
   *
   * Keyed on updatedAt/editState rather than on the query result's identity,
   * which changes on every refetch: react-query hands back a fresh object each
   * time (SuperJSON revives Dates, so structural sharing cannot dedupe it), and
   * an effect keyed on that would wipe unsaved edits whenever anything
   * invalidated the content queries. Keying on the id ALONE has the opposite
   * failure — approving an edit rewrites the body server-side and the pane
   * would keep showing the pre-approval version, one Save away from reverting
   * it. The version key covers both.
   */
  const seedKey = isNew
    ? 'new'
    : `${existing.data?.id ?? ''}:${
        existing.data?.updatedAt
          ? new Date(existing.data.updatedAt).getTime()
          : ''
      }:${existing.data?.editState ?? ''}:${restartFromLive ? 'live' : ''}`;
  const seededKey = useRef<string | null>(null);
  useEffect(() => {
    if (!seed || seededKey.current === seedKey) return;
    seededKey.current = seedKey;
    setBody(seed as Record<string, unknown>);
    setJsonSeed((value) => value + 1);
    if (!isNew && existing.data) setStatus(existing.data.status);
    setDirty(false);
  }, [seed, seedKey, isNew, existing.data]);

  // Warn before losing unsaved edits on a hard navigation / tab close.
  useEffect(() => {
    if (!dirty) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, [dirty]);

  const remainderKeys = useMemo(
    () => (body ? Object.keys(jsonRemainder(body, ownedKeys)) : []),
    [body, ownedKeys],
  );

  const showView = (next: View) => {
    // The pane is uncontrolled, so it has to be re-seeded whenever the body may
    // have moved on underneath it.
    if (next === 'fields') setJsonSeed((value) => value + 1);
    setView(next);
  };

  const onSave = async () => {
    if (!body) return;

    setJsonError(null);

    const slug = String(body.id ?? '').trim();
    if (!slug) {
      setJsonError('This item needs an "id" — it becomes the slug.');
      return;
    }
    setJsonError(null);

    await save.mutateAsync({
      kind,
      slug,
      body,
      // An editor never sets status — the API ignores it for them, and sending
      // one would only make the button lie about what it does.
      status: isEditor ? undefined : status,
      note: isEditor ? submitNote.trim() || undefined : undefined,
    });
    setDirty(false);
    navigate(AdminRoutes.contentKind({ kind }));
  };

  /** The review banner's props, shared by both layouts below. */
  const reviewBanner = !isNew && existing.data?.editState && (
    <EditReviewBanner
      state={existing.data.editState}
      pendingNote={existing.data.pendingNote}
      reviewNote={existing.data.reviewNote}
      submittedAt={existing.data.pendingAt}
      isEditor={isEditor}
      liveBody={existing.data.body}
      pendingBody={existing.data.pendingBody}
      busy={reviewBusy}
      onRestartFromLive={isEditor ? () => setRestartFromLive(true) : undefined}
      onApprove={
        isEditor ? undefined : () => void approve.mutateAsync(existing.data!.id)
      }
      onReject={
        isEditor
          ? undefined
          : (note) => void reject.mutateAsync({ id: existing.data!.id, note })
      }
      onDiscard={() => void discard.mutateAsync(existing.data!.id)}
    />
  );

  const loading = isNew
    ? defaultBody
      ? false
      : template.isLoading
    : existing.isLoading;
  if (loading || !body) {
    return (
      <div className="space-y-3 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  // Capitalized locals so the per-kind components can be used as JSX elements.
  const StructuredEditor = spec.StructuredEditor;
  const Preview = spec.Preview;

  // Publishing status is an admin's call. An editor proposes content; whether
  // it goes live is decided by the approval, so showing them a control that
  // cannot take effect would only mislead.
  const statusSelect = isEditor ? null : (
    <Select
      value={status}
      onValueChange={(value) => {
        setStatus(value as ContentStatus);
        setDirty(true);
      }}
    >
      <SelectTrigger className="w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="draft">Draft</SelectItem>
        <SelectItem value="published">Published</SelectItem>
        <SelectItem value="archived">Archived</SelectItem>
      </SelectContent>
    </Select>
  );

  const noteField = isEditor && (
    <Input
      className="w-56"
      aria-label="What changed"
      placeholder="What changed? (optional)"
      value={submitNote}
      onChange={(event) => setSubmitNote(event.target.value)}
    />
  );

  const saveButton = (
    <Button onClick={onSave} disabled={save.isPending}>
      {save.isPending ? (
        <Loader2 className="mr-2 size-4 animate-spin" />
      ) : (
        <Save className="mr-2 size-4" />
      )}
      {isEditor ? 'Submit for review' : 'Save'}
    </Button>
  );

  // Deleting is admin-only and unreviewable — a soft delete drops a published
  // item out of the next release with no proposal shape to review first, which
  // is exactly what the editor role exists to prevent. The confirm is here
  // because this button used to fire on a single click.
  const deleteButton = !isNew && !isEditor && existing.data && (
    <Button
      variant="ghost"
      size="icon"
      aria-label={`Delete ${spec.singular}`}
      onClick={async () => {
        if (
          !window.confirm(
            `Delete “${existing.data!.title}”? It drops out of the next publish for this kind.`,
          )
        )
          return;
        await remove.mutateAsync(existing.data!.id);
        navigate(AdminRoutes.contentKind({ kind }));
      }}
    >
      <Trash2 className="size-4" />
    </Button>
  );

  // Full-editor kinds (e.g. Song) render only their editor under a slim bar —
  // no scalar form, no JSON pane.
  if (FullEditor) {
    return (
      <div className="flex flex-col">
        <div
          className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.08] px-4 py-2"
          style={{ background: '#101012' }}
        >
          <div className="flex items-center gap-2">
            <Button asChild size="icon" variant="ghost">
              <Link
                to={AdminRoutes.contentKind({ kind })}
                aria-label="Back to list"
              >
                <ArrowLeft className="size-4" />
              </Link>
            </Button>
            <h1 className="text-sm font-semibold">
              {isNew
                ? `New ${spec.singular}`
                : (existing.data?.title ?? `Edit ${spec.singular}`)}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {(save.error || jsonError) && (
              <span className="max-w-64 truncate text-xs text-red-400">
                {jsonError ?? save.error?.message}
              </span>
            )}
            {dirty && (
              <span className="text-xs font-medium text-amber-400">
                Unsaved
              </span>
            )}
            {noteField}
            {statusSelect}
            {deleteButton}
            {saveButton}
          </div>
        </div>
        {reviewBanner && <div className="px-4 pt-3">{reviewBanner}</div>}
        <FullEditor body={body} onChange={applyBody} />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button asChild size="icon" variant="ghost">
            <Link
              to={AdminRoutes.contentKind({ kind })}
              aria-label="Back to list"
            >
              <ArrowLeft className="size-4" />
            </Link>
          </Button>
          <h1 className="text-2xl font-semibold">
            {isNew
              ? `New ${spec.singular}`
              : (existing.data?.title ?? `Edit ${spec.singular}`)}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {hasVisual && (
            <div className="flex rounded-lg border border-white/10 p-0.5">
              <ViewTab
                active={view === 'visual'}
                onClick={() => showView('visual')}
                icon={<Eye className="size-3.5" />}
                label="Editor"
              />
              <ViewTab
                active={view === 'fields'}
                onClick={() => showView('fields')}
                icon={<SlidersHorizontal className="size-3.5" />}
                label="Fields & JSON"
              />
            </div>
          )}
          {noteField}
          {statusSelect}
          {deleteButton}
          {saveButton}
        </div>
      </div>

      {reviewBanner}

      {isNew && template.data && (
        <div className="flex gap-2 rounded-lg border border-blue-600/30 bg-blue-600/10 p-3 text-sm text-blue-200/90">
          <Info className="mt-0.5 size-4 shrink-0" />
          <span>{template.data.hint}</span>
        </div>
      )}

      {(save.error || jsonError) && (
        <div className="rounded-lg border border-red-600/30 bg-red-600/10 p-3 text-sm text-red-300">
          {jsonError ?? save.error?.message}
        </div>
      )}

      {StructuredEditor && (
        <div className="border-t border-white/[0.08] pt-6">
          <StructuredEditor body={body} onChange={applyBody} />
        </div>
      )}

      {Preview && (
        <div className="border-t border-white/[0.08] pt-6">
          <Preview body={body} />
        </div>
      )}

      {view === 'visual' && kind === 'globe_event' && (
        <GlobeEventVisualEditor
          event={body as unknown as GlobeEventBody}
          onChange={(next) =>
            applyBody(next as unknown as Record<string, unknown>)
          }
        />
      )}

      {view === 'fields' && (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {spec.fields.map((field) => (
              <Field
                key={field.path}
                field={field}
                value={getPath(body, field.path)}
                onChange={(value) =>
                  applyBody(setPath(body, field.path, value))
                }
              />
            ))}
          </div>

          {remainderKeys.length > 0 && (
            <div>
              <Label className="mb-1.5 block text-xs text-muted-foreground">
                {spec.jsonLabel ?? 'Remaining fields'} (
                {remainderKeys.join(', ')})
              </Label>
              <Textarea
                key={`json-${jsonSeed}`}
                rows={24}
                className="font-mono text-xs"
                defaultValue={JSON.stringify(
                  jsonRemainder(body, spec.formKeys),
                  null,
                  2,
                )}
                onBlur={(event) => {
                  try {
                    const parsed = JSON.parse(event.target.value) as Record<
                      string,
                      unknown
                    >;
                    // The typed form owns formKeys; the pane owns the rest.
                    applyBody({ ...parsed, ...pickKeys(body, spec.formKeys) });
                    setJsonError(null);
                  } catch {
                    setJsonError('The JSON pane is not valid JSON.');
                  }
                }}
              />
            </div>
          )}
        </>
      )}

      {!isNew && existing.data && existing.data.Revisions.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">
            Recent revisions
          </h2>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {existing.data.Revisions.map((revision) => (
              <li key={revision.id}>
                r{revision.revision} — {revision.title}
                {revision.note ? ` (${revision.note})` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

const ViewTab = ({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
}) => (
  <button
    type="button"
    aria-pressed={active}
    className={cn(
      'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-colors',
      active
        ? 'bg-white/10 text-white'
        : 'text-muted-foreground hover:text-white',
    )}
    onClick={onClick}
  >
    {icon}
    {label}
  </button>
);

const pickKeys = (body: Record<string, unknown>, keys: string[]) =>
  Object.fromEntries(
    Object.entries(body).filter(([key]) => keys.includes(key)),
  );

const Field = ({
  field,
  value,
  onChange,
}: {
  field: FieldSpec;
  value: unknown;
  onChange: (value: unknown) => void;
}) => {
  const control = () => {
    switch (field.type) {
      case 'textarea':
        return (
          <Textarea
            rows={5}
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      case 'number':
        return (
          <Input
            type="number"
            step="any"
            value={typeof value === 'number' ? value : ''}
            onChange={(e) =>
              // Empty clears an optional numeric field rather than writing NaN.
              onChange(
                e.target.value === '' ? undefined : Number(e.target.value),
              )
            }
          />
        );
      case 'csv':
        return (
          <Input
            value={Array.isArray(value) ? value.join(', ') : ''}
            onChange={(e) => onChange(csvToArray(e.target.value))}
          />
        );
      case 'select':
        return (
          <Select
            value={typeof value === 'string' ? value : ''}
            onValueChange={onChange}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(field.options ?? []).map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      default:
        return (
          <Input
            value={typeof value === 'string' ? value : ''}
            onChange={(e) => onChange(e.target.value || undefined)}
          />
        );
    }
  };

  return (
    <div className={field.wide ? 'md:col-span-2' : undefined}>
      <Label className="mb-1.5 block text-xs text-muted-foreground">
        {field.label}
      </Label>
      {control()}
      {field.help && (
        <p className="mt-1 text-xs text-muted-foreground/70">{field.help}</p>
      )}
    </div>
  );
};
