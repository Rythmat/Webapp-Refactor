import { format } from 'date-fns';
import { Link2, Pencil, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import {
  Link,
  Navigate,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom';
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
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';
import {
  useContentItems,
  useValidateContent,
  type ContentStatus,
} from '@/hooks/data/admin/useAdminContent';
import { useCapabilities } from '@/hooks/data/admin/useCapabilities';
import { isContentEditor } from '../consoleRoles';
// The first table: the bare /console/table now opens Cortex's graph.
import { firstTableHref } from '../table/tablePaths';
import { CONTENT_STATUS_TONE, ConsoleBadge } from '../ui/ConsoleBadge';
import { ConsoleCallout } from '../ui/ConsoleCallout';
import { ConsolePageHeader } from '../ui/ConsolePageHeader';
import { ConsoleTabs } from '../ui/ConsoleTabs';
import { CONSOLE_TABLE_HEAD } from '../ui/styles';
import { CONTENT_KINDS } from './kinds';
import {
  isOtherRecordKind,
  OTHER_RECORD_KINDS,
  type OtherRecordKind,
} from './otherRecords';
import {
  repoNotServedNote,
  repoReadOnlyFile,
  repoReadOnlyNote,
} from './repo/repoCopy';
import { useRepoMode } from './repo/useRepoMode';
import { EditStateBadge } from './review/EditReview';

/**
 * A lesson item's slug is `<genre>-l<level>`, and lessons are edited a whole
 * course at a time rather than a level at a time — so a lesson row links to the
 * course page for its genre with that level selected.
 */
const lessonCourseLink = (slug: string) => {
  const match = slug.match(/^(.*)-l(\d+)$/);
  return match
    ? AdminRoutes.lessonCourse({ genre: match[1] }, { level: match[2] })
    : null;
};

/**
 * "Other records": the lists of the content kinds the Table has no category
 * for — lessons, fundamentals, artist locations. The other kinds' lists
 * redirect into the Table before they get here (`RecordsKindRoute`), and
 * anything else that arrives is sent to the Table too, visibly, rather than
 * quietly opening some other kind's list.
 */
export const AdminContentListPage = () => {
  const { kind } = useParams();
  if (!isOtherRecordKind(kind))
    return <Navigate replace to={firstTableHref()} />;
  return <OtherRecords kind={kind} />;
};

/** The other records' tabs, the same over a list and over a notice. */
const OtherRecordsTabs = () => (
  <ConsoleTabs
    items={OTHER_RECORD_KINDS.map((entry) => ({
      to: AdminRoutes.contentKind({ kind: entry }),
      label: CONTENT_KINDS[entry].label,
    }))}
  />
);

/**
 * Repo mode (DEV only) serves neither lessons nor fundamentals: they live
 * in the content API alone. Their tabs then say so, rather than showing a
 * list that failed to load.
 */
const OtherRecords = ({ kind }: { kind: OtherRecordKind }) => {
  const repoMode = useRepoMode();
  const repo = import.meta.env.DEV && repoMode;
  const caps = useCapabilities();
  if (repo && caps.capabilities && !caps.isServed(kind)) {
    return (
      <div className="flex flex-col gap-6">
        <OtherRecordsTabs />
        <ConsolePageHeader title="Other records" />
        <ConsoleCallout tone="info">
          {repoNotServedNote(CONTENT_KINDS[kind].label)}
        </ConsoleCallout>
      </div>
    );
  }
  return <OtherRecordsList kind={kind} repo={repo} />;
};

const OtherRecordsList = ({
  kind,
  repo,
}: {
  kind: OtherRecordKind;
  /** Repo mode: what it serves of these kinds (the artist locations) is read-only. */
  repo: boolean;
}) => {
  const navigate = useNavigate();
  const spec = CONTENT_KINDS[kind];
  const isLessons = kind === 'activity_flow';
  const { role } = useAuthContext();
  const isEditor = isContentEditor(role);
  const readOnlyFile = repo ? repoReadOnlyFile(kind) : null;

  // `?q=` so a list can be linked to, not only browsed to. The repair
  // worklist points at a song by title, and the item route wants a content
  // id nobody has to hand — a search the page arrives already holding is the
  // only deep link there is.
  const [query, setQuery] = useSearchParams();
  const search = query.get('q') ?? '';
  const setSearch = (next: string) =>
    setQuery(
      (prev) => {
        const out = new URLSearchParams(prev);
        if (next) out.set('q', next);
        else out.delete('q');
        return out;
      },
      { replace: true },
    );
  const [status, setStatus] = useState<ContentStatus | 'all'>('all');
  const [newGenre, setNewGenre] = useState('');

  const { token } = useAuthContext();
  const { data, isLoading, isError, error } = useContentItems({
    kind,
    status: status === 'all' ? undefined : status,
    search: search.trim() || undefined,
  });
  const validation = useValidateContent(kind);

  const items = data?.items ?? [];

  return (
    <div className="flex flex-col gap-6">
      <OtherRecordsTabs />

      <ConsolePageHeader
        title="Other records"
        description={
          <>
            <p>{spec.blurb}</p>
            <p>
              {readOnlyFile
                ? repoReadOnlyNote(readOnlyFile)
                : isEditor
                  ? 'Your edits are submitted for review. The live version is unchanged until an admin approves them, and reaches students at the next publish.'
                  : 'Edits save to the database immediately, but only reach students when you publish from the Publishing page.'}
            </p>
            <p>
              <Link
                to={firstTableHref()}
                className="text-white/80 underline-offset-4 hover:text-white hover:underline"
              >
                Everything else is in the Table
              </Link>
              : songs, events, artists, places, records and the rest.
            </p>
          </>
        }
        actions={
          isLessons ? (
            // A course is addressed by genre, not by item id, so creating one
            // starts with the genre rather than with a blank item.
            <form
              className="flex items-end gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                const genre = newGenre
                  .trim()
                  .toLowerCase()
                  .replace(/[\s_-]/g, '');
                if (genre) navigate(AdminRoutes.lessonCourse({ genre }));
              }}
            >
              <div>
                <label
                  className="mb-1 block text-xs text-muted-foreground"
                  htmlFor="new-course-genre"
                >
                  New course
                </label>
                <Input
                  id="new-course-genre"
                  className="w-44"
                  placeholder="Genre, e.g. funk"
                  value={newGenre}
                  onChange={(event) => setNewGenre(event.target.value)}
                />
              </div>
              <Button type="submit" disabled={!newGenre.trim()}>
                <Plus className="mr-2 size-4" />
                Open
              </Button>
            </form>
          ) : readOnlyFile ? null : (
            <Button asChild>
              <Link to={AdminRoutes.contentItem({ kind, id: 'new' })}>
                <Plus className="mr-2 size-4" />
                New {spec.singular}
              </Link>
            </Button>
          )
        }
      />

      {validation.data && !validation.data.ok && (
        <ConsoleCallout
          tone="warning"
          title={
            <span>
              {validation.data.problems.length} problem
              {validation.data.problems.length === 1 ? '' : 's'} would block a
              publish
            </span>
          }
        >
          <ul className="space-y-1">
            {validation.data.problems.slice(0, 5).map((problem) => (
              <li key={`${problem.code}-${problem.slug}`}>
                <span className="text-white/90">{problem.slug}</span> —{' '}
                {problem.detail}
              </li>
            ))}
            {validation.data.problems.length > 5 && (
              <li>…and {validation.data.problems.length - 5} more</li>
            )}
          </ul>
        </ConsoleCallout>
      )}

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-64 flex-1">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search title, slug or details…"
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

      {!token ? (
        <ConsoleCallout tone="neutral" className="p-6 text-center">
          Sign in as an admin to load content. This page reads from the content
          database — a blank list here means either you’re not authenticated or
          the database has no {spec.label.toLowerCase()} yet.
        </ConsoleCallout>
      ) : isError ? (
        <ConsoleCallout
          tone="danger"
          title={<span>Couldn’t load {spec.label.toLowerCase()}</span>}
        >
          <p>
            {error instanceof Error
              ? error.message
              : 'The content API request failed.'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            This is a backend/connectivity issue — the list can’t be populated
            from the app.
          </p>
        </ConsoleCallout>
      ) : isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <Table>
          <TableHeader className={CONSOLE_TABLE_HEAD}>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Details</TableHead>
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
                <TableCell className="text-xs text-muted-foreground">
                  {item.slug}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {[item.subtitle, item.sortYear].filter(Boolean).join(' · ')}
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <ConsoleBadge tone={CONTENT_STATUS_TONE[item.status]}>
                      {item.status}
                    </ConsoleBadge>
                    {/* An unreviewed proposal sits beside the live body, so the
                        status alone would say nothing about it. */}
                    <EditStateBadge state={item.editState} />
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {format(new Date(item.updatedAt), 'MMM d, yyyy')}
                </TableCell>
                <TableCell>
                  <Button asChild size="icon" variant="ghost">
                    <Link
                      to={
                        (isLessons ? lessonCourseLink(item.slug) : null) ??
                        AdminRoutes.contentItem({ kind, id: item.id })
                      }
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
                  No {spec.label.toLowerCase()} match.{' '}
                  {isLessons
                    ? 'Start a course by typing its genre above.'
                    : `Create one with “New ${spec.singular}”.`}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      )}
    </div>
  );
};
