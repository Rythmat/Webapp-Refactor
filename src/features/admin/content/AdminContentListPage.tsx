import { format } from 'date-fns';
import { AlertTriangle, Link2, Pencil, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AdminRoutes } from '@/constants/routes';
import {
  useContentItems,
  useValidateContent,
  type ContentKind,
  type ContentStatus,
} from '@/hooks/data/admin/useAdminContent';

const KIND_LABELS: Record<ContentKind, string> = {
  globe_event: 'Globe events',
  globe_city: 'Globe cities',
  song: 'Songs',
  artist_location: 'Artist locations',
};

const STATUS_STYLES: Record<ContentStatus, string> = {
  published: 'bg-emerald-600/20 text-emerald-400 border-emerald-600/30',
  draft: 'bg-amber-600/20 text-amber-400 border-amber-600/30',
  archived: 'bg-zinc-600/20 text-zinc-400 border-zinc-600/30',
};

const isContentKind = (value: string | undefined): value is ContentKind =>
  value !== undefined && value in KIND_LABELS;

export const AdminContentListPage = () => {
  const params = useParams();
  const kind: ContentKind = isContentKind(params.kind)
    ? params.kind
    : 'globe_event';

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<ContentStatus | 'all'>('all');

  const { data, isLoading } = useContentItems({
    kind,
    status: status === 'all' ? undefined : status,
    search: search.trim() || undefined,
  });
  const validation = useValidateContent(kind);

  const items = data?.items ?? [];

  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{KIND_LABELS[kind]}</h1>
          <p className="text-sm text-muted-foreground">
            Edits are saved to the database immediately, but only reach students
            when you publish from the Releases page.
          </p>
        </div>
        <Button asChild>
          <Link to={AdminRoutes.contentItem({ kind, id: 'new' })}>
            <Plus className="mr-2 size-4" />
            New {KIND_LABELS[kind].replace(/s$/, '').toLowerCase()}
          </Link>
        </Button>
      </div>

      {validation.data && !validation.data.ok && (
        <div className="rounded-lg border border-amber-600/30 bg-amber-600/10 p-4">
          <div className="flex items-center gap-2 font-medium text-amber-400">
            <AlertTriangle className="size-4" />
            {validation.data.problems.length} problem
            {validation.data.problems.length === 1 ? '' : 's'} would block a
            publish
          </div>
          <ul className="mt-2 space-y-1 text-sm text-amber-200/80">
            {validation.data.problems.slice(0, 5).map((problem) => (
              <li key={`${problem.code}-${problem.slug}`}>
                <span className="font-mono">{problem.slug}</span> —{' '}
                {problem.detail}
              </li>
            ))}
            {validation.data.problems.length > 5 && (
              <li>…and {validation.data.problems.length - 5} more</li>
            )}
          </ul>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-64 flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search title or slug…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <Select
          value={status}
          onValueChange={(value) => setStatus(value as ContentStatus | 'all')}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="published">Published</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Where / when</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Updated</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">
                  {item.title}
                  {item.derivedFromSlug && (
                    <span
                      className="ml-2 inline-flex items-center text-xs text-muted-foreground"
                      title={`Generated from song "${item.derivedFromSlug}"`}
                    >
                      <Link2 className="mr-1 size-3" />
                      derived
                    </span>
                  )}
                </TableCell>
                <TableCell className="font-mono text-xs text-muted-foreground">
                  {item.slug}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {[item.subtitle, item.sortYear].filter(Boolean).join(' · ')}
                </TableCell>
                <TableCell>
                  <Badge className={STATUS_STYLES[item.status]}>
                    {item.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(new Date(item.updatedAt), 'MMM d, yyyy')}
                </TableCell>
                <TableCell>
                  <Button asChild size="icon" variant="ghost">
                    <Link
                      to={AdminRoutes.contentItem({ kind, id: item.id })}
                      aria-label={`Edit ${item.title}`}
                    >
                      <Pencil className="size-4" />
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {items.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="py-10 text-center text-muted-foreground"
                >
                  No items match.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
};
