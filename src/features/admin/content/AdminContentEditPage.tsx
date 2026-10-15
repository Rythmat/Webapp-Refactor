import { Eye, Loader2, Save, SlidersHorizontal, Trash2 } from 'lucide-react';
import { useMemo, useState, type ReactNode } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
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
import {
  type ContentKind,
  type ContentStatus,
} from '@/hooks/data/admin/useAdminContent';
import { ConsoleBadge } from '../ui/ConsoleBadge';
import { ConsoleCallout } from '../ui/ConsoleCallout';
import { ConsolePageHeader } from '../ui/ConsolePageHeader';
import { CONSOLE_LABEL, consoleTabClass } from '../ui/styles';
import { INSTRUMENT_PAGES, isInstrumentPageKind } from './instrumentPages';
import { ContentItemEditor } from './itemEditor/ContentItemEditor';
import { useContentItemEditor } from './itemEditor/useContentItemEditor';
import {
  getPath,
  isContentKind,
  jsonRemainder,
  setPath,
  type FieldSpec,
} from './kinds';
import {
  deleteQuestion,
  REPO_NO_STATUS_LABEL,
  REPO_READ_ONLY_LABEL,
  repoReadOnlyFile,
  repoReadOnlyNote,
  repoStatusNote,
  statusChoices,
} from './repo/repoCopy';
import { useRepoMode } from './repo/useRepoMode';
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
  // An unknown kind used to open silently as a globe event — a typo in a URL
  // became an editor for the wrong thing, and saving it wrote there.
  if (!isContentKind(params.kind)) return <UnknownKind kind={params.kind} />;
  // Grooves and parts are edited on their own pages.
  if (isInstrumentPageKind(params.kind)) {
    const pages = INSTRUMENT_PAGES[params.kind];
    return (
      <Navigate
        replace
        to={
          params.id && params.id !== 'new'
            ? pages.item(params.id)
            : pages.list()
        }
      />
    );
  }
  return <KindEditPage kind={params.kind} />;
};

const UnknownKind = ({ kind }: { kind: string | undefined }) => (
  <div className="space-y-6">
    <ConsolePageHeader
      title="Nothing to edit here"
      backTo={AdminRoutes.contentKind({ kind: 'song' })}
      backLabel="Records"
    />
    <ConsoleCallout
      tone="warning"
      title={`“${kind ?? ''}” is not a content kind`}
    >
      The console has no editor for this kind, or the content API does not serve
      it yet. Open the item from the content list instead.
    </ConsoleCallout>
  </div>
);

const KindEditPage = ({ kind }: { kind: ContentKind }) => {
  const params = useParams();
  const navigate = useNavigate();
  const editor = useContentItemEditor({ kind, itemId: params.id ?? 'new' });
  const {
    spec,
    isNew,
    isEditor,
    existing,
    template,
    body,
    applyBody,
    loading,
    jsonSeed,
    jsonError,
    setJsonError,
    saving,
    saveError,
    review,
  } = editor;
  const hasVisual = VISUAL_KINDS.includes(kind);
  const [view, setView] = useState<View>(hasVisual ? 'visual' : 'fields');
  const listRoute = AdminRoutes.contentKind({ kind });
  // Repo mode (a save goes straight into the repo's files) has no drafts but
  // a song's, so the status control and the delete question say so, as the
  // full editor's do (repo/repoCopy.ts).
  // The literal DEV gate here, not only in the hook, lets the build drop
  // every repo branch below (useRepoMode.ts).
  const repoMode = useRepoMode();
  const repo = import.meta.env.DEV && repoMode;
  const statuses = statusChoices(kind, repo);
  // A kind repo mode serves but never writes (the artist locations): no
  // status, no Save and no Delete, since every one would be refused.
  const readOnlyFile = repo ? repoReadOnlyFile(kind) : null;

  // The typed form and the visual editor each own a slice of the body; the JSON
  // pane owns whatever is left. Splitting on the union keeps all three from ever
  // claiming the same key.
  const ownedKeys = useMemo(
    () => [...spec.formKeys, ...(spec.structuralKeys ?? [])],
    [spec],
  );

  const remainderKeys = useMemo(
    () => (body ? Object.keys(jsonRemainder(body, ownedKeys)) : []),
    [body, ownedKeys],
  );

  // A "full editor" owns the whole body and replaces the form + JSON pane.
  if (spec.FullEditor) {
    return (
      <ContentItemEditor
        editor={editor}
        backTo={listRoute}
        backLabel="Back to list"
        onSaved={() => navigate(listRoute)}
        onDeleted={() => navigate(listRoute)}
      />
    );
  }

  const showView = (next: View) => {
    // The pane is uncontrolled, so it has to be re-seeded whenever the body may
    // have moved on underneath it.
    if (next === 'fields') editor.reseedJson();
    setView(next);
  };

  const onSave = async () => {
    const result = await editor.save().catch(() => null);
    if (result) navigate(listRoute);
  };

  if (loading || !body) {
    return (
      <div className="space-y-3">
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
  // cannot take effect would only mislead. In repo mode only a song has one.
  const statusSelect = isEditor ? null : readOnlyFile ? (
    <ConsoleBadge tone="muted" title={repoReadOnlyNote(readOnlyFile)}>
      {REPO_READ_ONLY_LABEL}
    </ConsoleBadge>
  ) : statuses ? (
    <Select
      value={editor.status}
      onValueChange={(value) => editor.setStatus(value as ContentStatus)}
    >
      <SelectTrigger
        className="w-32"
        aria-label="Status"
        title={repo ? repoStatusNote(kind) : undefined}
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
    <ConsoleBadge tone="muted" title={repoStatusNote(kind)}>
      {REPO_NO_STATUS_LABEL}
    </ConsoleBadge>
  );

  const noteField = isEditor && (
    <Input
      className="w-56"
      aria-label="What changed"
      placeholder="What changed? (optional)"
      value={editor.submitNote}
      onChange={(event) => editor.setSubmitNote(event.target.value)}
    />
  );

  const saveButton = !readOnlyFile && (
    <Button onClick={() => void onSave()} disabled={saving}>
      {saving ? (
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
  const deleteButton = !isNew &&
    !isEditor &&
    !readOnlyFile &&
    existing.data && (
      <Button
        variant="ghost"
        size="icon"
        aria-label={`Delete ${spec.singular}`}
        onClick={async () => {
          if (!window.confirm(deleteQuestion(existing.data!.title, repo)))
            return;
          if (await editor.remove()) navigate(listRoute);
        }}
      >
        <Trash2 className="size-4" />
      </Button>
    );

  return (
    <div className="flex flex-col gap-6">
      <ConsolePageHeader
        backLabel="Back to list"
        backTo={listRoute}
        title={
          isNew
            ? `New ${spec.singular}`
            : (existing.data?.title ?? `Edit ${spec.singular}`)
        }
        actions={
          <>
            {hasVisual && (
              <div className="flex gap-1.5">
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
          </>
        }
      />

      {!isNew && existing.data?.editState && (
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
      )}

      {review.error && (
        <ConsoleCallout tone="danger">{review.error.message}</ConsoleCallout>
      )}

      {isNew && template.data && (
        <ConsoleCallout tone="info">{template.data.hint}</ConsoleCallout>
      )}

      {editor.stale ? (
        // Changed elsewhere, in a field changed here too: the author chooses
        // before anything is saved (useItemSession).
        <ConsoleCallout tone="warning" title="Changed since you opened it">
          <p>
            {editor.stale.overlap.join(', ')} changed elsewhere, and here too.
            Nothing is saved until you choose.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" variant="ghost" onClick={editor.discardChanges}>
              Reload theirs
            </Button>
            <Button size="sm" variant="ghost" onClick={editor.keepMine}>
              Keep mine for those fields
            </Button>
          </div>
        </ConsoleCallout>
      ) : (
        (saveError || jsonError) && (
          <ConsoleCallout tone="danger">
            {jsonError ?? saveError?.message}
          </ConsoleCallout>
        )
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
                className="text-xs"
                defaultValue={JSON.stringify(
                  jsonRemainder(body, ownedKeys),
                  null,
                  2,
                )}
                onBlur={(event) => {
                  try {
                    const parsed = JSON.parse(event.target.value) as Record<
                      string,
                      unknown
                    >;
                    // The typed form and the structured editor own their
                    // keys; the pane owns the rest, so a stale copy of an
                    // owned key in the pane never overwrites an edit.
                    applyBody({ ...parsed, ...pickKeys(body, ownedKeys) });
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
          <h2 className={cn(CONSOLE_LABEL, 'mb-2')}>Recent revisions</h2>
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

/**
 * Where the item is in the Table: its row, once it has a slug; the kind's
 * table for a new one. Null for a kind no table holds (lessons, fundamentals,
 * artist locations), whose list is the way back.
 */
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
    className={consoleTabClass(active, 'sm')}
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
