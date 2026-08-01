import { format } from 'date-fns';
import {
  CloudUpload,
  Loader2,
  MapPinOff,
  RotateCcw,
  XCircle,
} from 'lucide-react';
import { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  useCancelRelease,
  useContentOverview,
  useContentReleases,
  useDerivationHealth,
  usePublishContent,
  useRollbackContent,
  type ContentKind,
  type ContentReleaseStatus,
} from '@/hooks/data/admin/useAdminContent';
import { CONTENT_KINDS } from './kinds';

// Labels come from the shared kind spec so the Publishing page cannot drift
// from the Content pages when a kind is added.
const KIND_LABELS = Object.fromEntries(
  Object.entries(CONTENT_KINDS).map(([kind, spec]) => [kind, spec.label]),
) as Record<ContentKind, string>;

const RELEASE_STATUS_STYLES: Record<ContentReleaseStatus, string> = {
  live: 'bg-emerald-600/20 text-emerald-400 border-emerald-600/30',
  building: 'bg-blue-600/20 text-blue-400 border-blue-600/30',
  superseded: 'bg-zinc-600/20 text-zinc-400 border-zinc-600/30',
  rolled_back: 'bg-amber-600/20 text-amber-400 border-amber-600/30',
  failed: 'bg-red-600/20 text-red-400 border-red-600/30',
};

const formatBytes = (bytes: number) =>
  bytes > 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${(bytes / 1024).toFixed(0)} KB`;

export const AdminReleasesPage = () => {
  const overview = useContentOverview();
  const releases = useContentReleases();
  const rollback = useRollbackContent();
  const cancel = useCancelRelease();

  const [progress, setProgress] = useState<{ done: number; total: number }>();
  const [publishingKind, setPublishingKind] = useState<ContentKind>();

  const publish = usePublishContent((done, total) =>
    setProgress({ done, total }),
  );

  const onPublish = async (kind: ContentKind) => {
    setPublishingKind(kind);
    setProgress(undefined);
    try {
      await publish.mutateAsync(kind);
    } finally {
      setPublishingKind(undefined);
      setProgress(undefined);
    }
  };

  return (
    <div className="flex flex-col gap-8 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Publishing</h1>
        <p className="text-sm text-muted-foreground">
          Publishing compiles the current database state into immutable
          versioned bundles on the CDN. Students read those bundles, never the
          database. Rollback re-points at an earlier version and takes effect
          within a minute.
        </p>
      </div>

      {publish.error && (
        <div className="rounded-lg border border-red-600/30 bg-red-600/10 p-3 text-sm text-red-300">
          {publish.error.message}
        </div>
      )}

      <section>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">
          Content kinds
        </h2>
        {overview.isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kind</TableHead>
                <TableHead>Published items</TableHead>
                <TableHead>Unpublished changes</TableHead>
                <TableHead>Live version</TableHead>
                <TableHead className="w-40" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(overview.data ?? []).map((row) => (
                <TableRow key={row.kind}>
                  <TableCell className="font-medium">
                    {KIND_LABELS[row.kind]}
                  </TableCell>
                  <TableCell>
                    {row.published}
                    <span className="text-muted-foreground">
                      {' '}
                      / {row.total}
                    </span>
                  </TableCell>
                  <TableCell>
                    {row.changedSincePublish > 0 ? (
                      <Badge className="bg-amber-600/20 text-amber-400 border-amber-600/30">
                        {row.changedSincePublish} pending
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">Up to date</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {row.liveVersion ? (
                      <>
                        v{row.liveVersion}
                        {row.livePublishedAt &&
                          ` · ${format(new Date(row.livePublishedAt), 'MMM d')}`}
                      </>
                    ) : (
                      'Never published'
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      disabled={publish.isPending || row.published === 0}
                      onClick={() => onPublish(row.kind)}
                    >
                      {publishingKind === row.kind ? (
                        <>
                          <Loader2 className="mr-2 size-4 animate-spin" />
                          {progress
                            ? `${progress.done}/${progress.total}`
                            : 'Starting…'}
                        </>
                      ) : (
                        <>
                          <CloudUpload className="mr-2 size-4" />
                          Publish
                        </>
                      )}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </section>

      <DerivationHealthSection />

      <section>
        <h2 className="mb-3 text-sm font-medium text-muted-foreground">
          Release history
        </h2>
        {releases.isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kind</TableHead>
                <TableHead>Version</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Items</TableHead>
                <TableHead>Size</TableHead>
                <TableHead>Published</TableHead>
                <TableHead className="w-32" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {(releases.data ?? []).map((release) => (
                <TableRow key={release.id}>
                  <TableCell>{KIND_LABELS[release.kind]}</TableCell>
                  <TableCell className="font-mono">
                    v{release.version}
                  </TableCell>
                  <TableCell>
                    <Badge className={RELEASE_STATUS_STYLES[release.status]}>
                      {release.status}
                    </Badge>
                    {release.error && (
                      <div className="mt-1 text-xs text-red-400">
                        {release.error}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{release.itemCount}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {release.totalBytes ? formatBytes(release.totalBytes) : '—'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {release.publishedAt
                      ? format(new Date(release.publishedAt), 'MMM d, HH:mm')
                      : '—'}
                  </TableCell>
                  <TableCell>
                    {release.status === 'building' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => cancel.mutate(release.id)}
                      >
                        <XCircle className="mr-1 size-4" />
                        Cancel
                      </Button>
                    )}
                    {(release.status === 'superseded' ||
                      release.status === 'rolled_back') && (
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={rollback.isPending}
                        onClick={() =>
                          rollback.mutate({
                            kind: release.kind,
                            version: release.version,
                          })
                        }
                      >
                        <RotateCcw className="mr-1 size-4" />
                        Restore
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {(releases.data ?? []).length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="py-10 text-center text-muted-foreground"
                  >
                    Nothing published yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </section>
    </div>
  );
};

/**
 * Artists with no globe location.
 *
 * These songs are silently pinned to New York on the globe. The generator that
 * produced the original data counted them and discarded the number, so this
 * list has never been visible to anyone — each row is a concrete fix.
 */
const DerivationHealthSection = () => {
  const health = useDerivationHealth();

  if (health.isLoading) return <Skeleton className="h-32 w-full" />;
  if (!health.data) return null;

  const { defaultedToNewYork, totalSongs, unmatchedArtists } = health.data;

  return (
    <section>
      <h2 className="mb-3 text-sm font-medium text-muted-foreground">
        Globe placement
      </h2>
      {defaultedToNewYork === 0 ? (
        <p className="text-sm text-muted-foreground">
          All {totalSongs} songs resolve to a real artist location.
        </p>
      ) : (
        <div className="rounded-lg border border-amber-600/30 bg-amber-600/10 p-4">
          <div className="flex items-center gap-2 font-medium text-amber-400">
            <MapPinOff className="size-4" />
            {defaultedToNewYork} of {totalSongs} songs default to New York
          </div>
          <p className="mt-1 text-sm text-amber-200/70">
            These artists have no entry in the location map, so their songs are
            pinned to New York on the globe. Add an artist location to fix.
          </p>
          <ul className="mt-3 grid gap-1 text-sm text-amber-200/80 sm:grid-cols-2">
            {unmatchedArtists.slice(0, 20).map((entry) => (
              <li key={entry.artist} className="flex justify-between gap-3">
                <span className="truncate">{entry.artist}</span>
                <span className="shrink-0 text-amber-200/50">
                  {entry.songCount} song{entry.songCount === 1 ? '' : 's'}
                </span>
              </li>
            ))}
          </ul>
          {unmatchedArtists.length > 20 && (
            <p className="mt-2 text-xs text-amber-200/60">
              …and {unmatchedArtists.length - 20} more artists
            </p>
          )}
        </div>
      )}
    </section>
  );
};
