import { ArrowLeft, Info, Loader2, Save, Trash2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
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
import { AdminRoutes } from '@/constants/routes';
import {
  useContentItem,
  useContentTemplate,
  useDeleteContentItem,
  useSaveContentItem,
  type ContentKind,
  type ContentStatus,
} from '@/hooks/data/admin/useAdminContent';
import {
  CONTENT_KINDS,
  getPath,
  isContentKind,
  jsonRemainder,
  setPath,
  type FieldSpec,
} from './kinds';

/**
 * One editor for every content kind.
 *
 * Driven by the per-kind field spec in kinds.ts: the scalar fields an author
 * actually edits get a typed form, and whatever the spec does not claim —
 * a song's chart, a lesson's steps — stays in a JSON pane beside it. That split
 * is deliberate. A chord-chart or step-sequence builder is a real product
 * surface, and shipping a bad one is worse than shipping none; meanwhile the
 * JSON half means nothing is un-editable in the meantime.
 *
 * Creating from scratch works for every kind because the API hands back a valid
 * skeleton (see new-item-template.ts) rather than an empty object.
 */

const csvToArray = (value: string) =>
  value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

export const AdminContentEditPage = () => {
  const params = useParams();
  const navigate = useNavigate();
  const kind: ContentKind = isContentKind(params.kind)
    ? params.kind
    : 'globe_event';
  const spec = CONTENT_KINDS[kind];
  const isNew = params.id === 'new';

  const existing = useContentItem(isNew ? undefined : params.id);
  const template = useContentTemplate(isNew ? kind : undefined);
  const save = useSaveContentItem();
  const remove = useDeleteContentItem();

  const [status, setStatus] = useState<ContentStatus>('draft');
  const [body, setBody] = useState<Record<string, unknown> | null>(null);
  const [json, setJson] = useState('{}');
  const [jsonError, setJsonError] = useState<string | null>(null);

  // Seed from the loaded item, or from the API's template when creating.
  const seed = isNew ? template.data?.body : existing.data?.body;
  useEffect(() => {
    if (!seed) return;
    setBody(seed as Record<string, unknown>);
    setJson(
      JSON.stringify(
        jsonRemainder(seed as Record<string, unknown>, spec.formKeys),
        null,
        2,
      ),
    );
    if (!isNew && existing.data) setStatus(existing.data.status);
  }, [seed, spec.formKeys, isNew, existing.data]);

  const remainderKeys = useMemo(
    () => (body ? Object.keys(jsonRemainder(body, spec.formKeys)) : []),
    [body, spec.formKeys],
  );

  const onSave = async () => {
    if (!body) return;

    let merged: Record<string, unknown> = body;
    if (remainderKeys.length > 0 || json.trim() !== '{}') {
      try {
        const parsed = JSON.parse(json) as Record<string, unknown>;
        // The typed form owns formKeys; the JSON pane owns the rest. Merging in
        // this order means the two halves can never fight over a field.
        merged = { ...parsed, ...pickKeys(body, spec.formKeys) };
      } catch {
        setJsonError('The JSON pane is not valid JSON.');
        return;
      }
    }
    setJsonError(null);

    const slug = String(merged.id ?? '').trim();
    if (!slug) {
      setJsonError('This item needs an "id" — it becomes the slug.');
      return;
    }

    await save.mutateAsync({ kind, slug, body: merged, status });
    navigate(AdminRoutes.contentKind({ kind }));
  };

  const loading = isNew ? template.isLoading : existing.isLoading;
  if (loading || !body) {
    return (
      <div className="space-y-3 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
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
          <Select
            value={status}
            onValueChange={(value) => setStatus(value as ContentStatus)}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Published</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
          {!isNew && existing.data && (
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Delete ${spec.singular}`}
              onClick={async () => {
                await remove.mutateAsync(existing.data!.id);
                navigate(AdminRoutes.contentKind({ kind }));
              }}
            >
              <Trash2 className="size-4" />
            </Button>
          )}
          <Button onClick={onSave} disabled={save.isPending}>
            {save.isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Save className="mr-2 size-4" />
            )}
            Save
          </Button>
        </div>
      </div>

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

      <div className="grid gap-4 md:grid-cols-2">
        {spec.fields.map((field) => (
          <Field
            key={field.path}
            field={field}
            value={getPath(body, field.path)}
            onChange={(value) => setBody(setPath(body, field.path, value))}
          />
        ))}
      </div>

      {remainderKeys.length > 0 && (
        <div>
          <Label className="mb-1.5 block text-xs text-muted-foreground">
            {spec.jsonLabel ?? 'Remaining fields'} ({remainderKeys.join(', ')})
          </Label>
          <Textarea
            rows={24}
            className="font-mono text-xs"
            value={json}
            onChange={(event) => setJson(event.target.value)}
          />
        </div>
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
