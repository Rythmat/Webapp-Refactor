import { ArrowLeft, Loader2, Save, Trash2 } from 'lucide-react';
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
  useDeleteContentItem,
  useSaveContentItem,
  type ContentKind,
  type ContentStatus,
} from '@/hooks/data/admin/useAdminContent';

/**
 * Editor for one content item.
 *
 * Globe events get a real typed form — the shape is seven flat fields. Every
 * other kind falls back to a JSON editor over `body`, which is deliberate for
 * v1: a song's sections → bars → chord-hits structure needs a purpose-built
 * chart editor, and shipping a bad one is worse than shipping none. The API
 * validates per-kind with zod on both write and publish either way, so an
 * invalid body is rejected with a specific message rather than silently stored.
 */

const EMPTY_EVENT = {
  id: '',
  year: new Date().getFullYear(),
  location: { lat: 0, lng: 0, city: '', country: '' },
  genre: [] as string[],
  title: '',
  description: '',
  tags: [] as string[],
  videoId: undefined as string | undefined,
};

type EventBody = typeof EMPTY_EVENT;

const csv = (values: string[]) => values.join(', ');
const parseCsv = (value: string) =>
  value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

export const AdminContentEditPage = () => {
  const params = useParams();
  const navigate = useNavigate();
  const kind = (params.kind ?? 'globe_event') as ContentKind;
  const isNew = params.id === 'new';

  const { data, isLoading } = useContentItem(isNew ? undefined : params.id);
  const save = useSaveContentItem();
  const remove = useDeleteContentItem();

  const [status, setStatus] = useState<ContentStatus>('draft');
  const [event, setEvent] = useState<EventBody>(EMPTY_EVENT);
  const [json, setJson] = useState('{}');
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    if (!data) return;
    setStatus(data.status);
    setJson(JSON.stringify(data.body, null, 2));
    if (kind === 'globe_event') {
      setEvent({ ...EMPTY_EVENT, ...(data.body as unknown as EventBody) });
    }
  }, [data, kind]);

  const body = useMemo(() => {
    if (kind === 'globe_event') return event;
    try {
      const parsed = JSON.parse(json);
      return parsed as Record<string, unknown>;
    } catch {
      return null;
    }
  }, [kind, event, json]);

  const onSave = async () => {
    if (!body) {
      setJsonError('Body is not valid JSON.');
      return;
    }
    setJsonError(null);

    const slug =
      kind === 'globe_event' ? event.id : ((body as { id?: string }).id ?? '');
    if (!slug) {
      setJsonError('The body needs an "id" — it becomes the item slug.');
      return;
    }

    await save.mutateAsync({ kind, slug, body, status });
    navigate(AdminRoutes.contentKind({ kind }));
  };

  if (!isNew && isLoading) {
    return (
      <div className="space-y-3 p-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center justify-between gap-4">
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
            {isNew ? 'New item' : (data?.title ?? 'Edit item')}
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
          {!isNew && data && (
            <Button
              variant="ghost"
              size="icon"
              aria-label="Delete item"
              onClick={async () => {
                await remove.mutateAsync(data.id);
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

      {(save.error || jsonError) && (
        <div className="rounded-lg border border-red-600/30 bg-red-600/10 p-3 text-sm text-red-300">
          {jsonError ?? save.error?.message}
        </div>
      )}

      {kind === 'globe_event' ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Id / slug">
            <Input
              value={event.id}
              disabled={!isNew}
              onChange={(e) => setEvent({ ...event, id: e.target.value })}
              placeholder="evt-jazz-nola-1923"
            />
          </Field>
          <Field label="Year">
            <Input
              type="number"
              value={event.year}
              onChange={(e) =>
                setEvent({ ...event, year: Number(e.target.value) })
              }
            />
          </Field>
          <Field label="Title" className="md:col-span-2">
            <Input
              value={event.title}
              onChange={(e) => setEvent({ ...event, title: e.target.value })}
            />
          </Field>
          <Field label="City">
            <Input
              value={event.location.city}
              onChange={(e) =>
                setEvent({
                  ...event,
                  location: { ...event.location, city: e.target.value },
                })
              }
            />
          </Field>
          <Field label="Country">
            <Input
              value={event.location.country}
              onChange={(e) =>
                setEvent({
                  ...event,
                  location: { ...event.location, country: e.target.value },
                })
              }
            />
          </Field>
          <Field label="Latitude">
            <Input
              type="number"
              step="any"
              value={event.location.lat}
              onChange={(e) =>
                setEvent({
                  ...event,
                  location: {
                    ...event.location,
                    lat: Number(e.target.value),
                  },
                })
              }
            />
          </Field>
          <Field label="Longitude">
            <Input
              type="number"
              step="any"
              value={event.location.lng}
              onChange={(e) =>
                setEvent({
                  ...event,
                  location: {
                    ...event.location,
                    lng: Number(e.target.value),
                  },
                })
              }
            />
          </Field>
          <Field label="Genres (comma separated)">
            <Input
              value={csv(event.genre)}
              onChange={(e) =>
                setEvent({ ...event, genre: parseCsv(e.target.value) })
              }
            />
          </Field>
          <Field label="YouTube video id">
            <Input
              value={event.videoId ?? ''}
              onChange={(e) =>
                setEvent({ ...event, videoId: e.target.value || undefined })
              }
            />
          </Field>
          <Field label="Tags (comma separated)" className="md:col-span-2">
            <Input
              value={csv(event.tags)}
              onChange={(e) =>
                setEvent({ ...event, tags: parseCsv(e.target.value) })
              }
            />
          </Field>
          <Field label="Description" className="md:col-span-2">
            <Textarea
              rows={6}
              value={event.description}
              onChange={(e) =>
                setEvent({ ...event, description: e.target.value })
              }
            />
          </Field>
        </div>
      ) : (
        <Field label="Body (JSON)">
          <Textarea
            rows={28}
            className="font-mono text-xs"
            value={json}
            onChange={(e) => setJson(e.target.value)}
          />
        </Field>
      )}

      {!isNew && data && data.Revisions.length > 0 && (
        <div>
          <h2 className="mb-2 text-sm font-medium text-muted-foreground">
            Recent revisions
          </h2>
          <ul className="space-y-1 text-sm text-muted-foreground">
            {data.Revisions.map((revision) => (
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

const Field = ({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) => (
  <div className={className}>
    <Label className="mb-1.5 block text-xs text-muted-foreground">
      {label}
    </Label>
    {children}
  </div>
);
