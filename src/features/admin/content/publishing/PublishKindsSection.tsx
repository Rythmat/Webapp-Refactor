import { format } from 'date-fns';
import { CloudUpload, Loader2 } from 'lucide-react';
import { lazy, Suspense, useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import { cn } from '@/components/utilities';
import {
  type ContentKind,
  useContentOverview,
} from '@/hooks/data/admin/useAdminContent';
import { ConsoleBadge } from '../../ui/ConsoleBadge';
import { ConsoleCallout } from '../../ui/ConsoleCallout';
import { CONSOLE_LABEL, CONSOLE_TABLE_HEAD } from '../../ui/styles';
import { kindLabel } from './kindLabels';
import {
  dismissPublishRun,
  kindsToPublish,
  usePublishActions,
  usePublishRun,
} from './publishRun';

// The bulk-accept counts read the suggestions: loaded with the table, not
// with the console's eager code (eagerBoundary.test.ts).
const BulkUnreviewedFor = lazy(() =>
  import('./BulkUnreviewed').then(({ BulkUnreviewedFor }) => ({
    default: BulkUnreviewedFor,
  })),
);

// The pin-move report reads every song and its pin: loaded, and read, only
// while artists have changes to publish.
const ArtistPinMovesSection = lazy(() =>
  import('./ArtistPinMoves').then(({ ArtistPinMovesSection }) => ({
    default: ArtistPinMovesSection,
  })),
);
const ArtistPinMovesReport = lazy(() =>
  import('./ArtistPinMoves').then(({ ArtistPinMovesReport }) => ({
    default: ArtistPinMovesReport,
  })),
);

/**
 * Every content kind: what is live, what changed since, and Publish — per
 * kind, or everything that changed in dependency order, once confirmed.
 * Beside what changed, the facts accepted in bulk that nobody has reviewed
 * yet (C29), each count a way to them in the Table.
 *
 * An artist release moves the song pins of every act whose City it changes
 * (design §5.1), so while artists have changes the tab lists each pin that
 * moves, and so does the confirmation — which waits until that is known.
 */
export const PublishKindsSection = () => {
  const overview = useContentOverview();
  const run = usePublishRun();
  const { publish } = usePublishActions();
  const running = run.status === 'running';
  const changed = kindsToPublish(overview.data ?? []);
  const artistsChanged = (overview.data ?? []).some(
    (row) => row.kind === 'artist' && row.changedSincePublish > 0,
  );

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className={CONSOLE_LABEL}>Content kinds</h2>
        <PublishEverything
          kinds={changed}
          disabled={running}
          onPublish={() => void publish(changed)}
        />
      </div>

      <RunSummary />

      {overview.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : (
        <Table>
          <TableHeader className={CONSOLE_TABLE_HEAD}>
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
                  {kindLabel(row.kind)}
                </TableCell>
                <TableCell>
                  {row.published}
                  <span className="text-muted-foreground"> / {row.total}</span>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {row.changedSincePublish > 0 ? (
                      <ConsoleBadge tone="warning">
                        {row.changedSincePublish} pending
                      </ConsoleBadge>
                    ) : (
                      <span className="text-muted-foreground">Up to date</span>
                    )}
                    {/* Proposals are NOT part of that count — they have not
                        touched the live body, so publishing would not ship
                        them. Shown separately so the two never read as one. */}
                    {row.pendingReview > 0 && (
                      <ConsoleBadge tone="info">
                        {row.pendingReview} in review
                      </ConsoleBadge>
                    )}
                    <Suspense fallback={null}>
                      <BulkUnreviewedFor kind={row.kind} />
                    </Suspense>
                  </div>
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
                    disabled={running || row.published === 0}
                    onClick={() => void publish([row.kind])}
                  >
                    {run.current === row.kind ? (
                      <>
                        <Loader2 className="mr-2 size-4 animate-spin" />
                        {run.progress
                          ? `${run.progress.done}/${run.progress.total}`
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

      {artistsChanged && (
        <Suspense fallback={null}>
          <ArtistPinMovesSection />
        </Suspense>
      )}
    </section>
  );
};

/**
 * "Publish everything that changed", and the question before it: what
 * publishes, in which order, and — when artists do — every song pin that
 * moves. Publish waits until the pins are worked out (or cannot be).
 */
const PublishEverything = ({
  kinds,
  disabled,
  onPublish,
}: {
  kinds: readonly ContentKind[];
  disabled: boolean;
  onPublish(): void;
}) => {
  const [open, setOpen] = useState(false);
  const withArtists = kinds.includes('artist');
  const [pinsKnown, setPinsKnown] = useState(false);
  const names = kinds.map(kindLabel).join(', then ');
  return (
    <>
      <Button
        size="sm"
        disabled={disabled || kinds.length === 0}
        onClick={() => {
          setPinsKnown(false);
          setOpen(true);
        }}
        title={
          kinds.length
            ? `Publishes ${names}`
            : 'Nothing has changed since the last publish'
        }
      >
        <CloudUpload className="mr-2 size-4" />
        Publish everything that changed
        {kinds.length > 0 && ` (${kinds.length})`}
      </Button>
      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent className="max-w-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Publish everything that changed?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {kinds.length > 1
                ? `Publishes ${names}, in that order, stopping at the first that fails.`
                : `Publishes ${names}.`}{' '}
              Students see {kinds.length > 1 ? 'each' : 'it'} within a minute of
              it going live.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {withArtists && (
            <div className="max-h-[50vh] overflow-y-auto rounded-lg border border-white/[0.08] px-3 py-3">
              <Suspense
                fallback={
                  <p aria-busy className="text-sm text-white/70">
                    Working out which song pins the artist publish moves…
                  </p>
                }
              >
                <ArtistPinMovesReport run={kinds} onKnown={setPinsKnown} />
              </Suspense>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Not now</AlertDialogCancel>
            <AlertDialogAction
              disabled={withArtists && !pinsKnown}
              onClick={onPublish}
            >
              Publish {kinds.length === 1 ? kindLabel(kinds[0]) : 'all'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

/** How the last run went, until dismissed; nothing while idle. */
export const RunSummary = ({ className }: { className?: string }) => {
  const run = usePublishRun();
  if (run.status === 'idle') return null;
  const names = (kinds: typeof run.kinds) => kinds.map(kindLabel).join(', ');
  if (run.status === 'running') {
    return (
      <ConsoleCallout tone="info" className={className}>
        Publishing {run.current ? kindLabel(run.current) : '…'}
        {run.progress && ` (${run.progress.done}/${run.progress.total})`}
        {run.kinds.length > 1 &&
          ` — ${run.published.length + 1} of ${run.kinds.length}`}
        . You can leave this page; it carries on.
      </ConsoleCallout>
    );
  }
  return (
    <ConsoleCallout
      tone={run.status === 'failed' ? 'danger' : 'success'}
      className={cn('flex items-start justify-between gap-3', className)}
    >
      <span>
        {run.status === 'failed' ? (
          <>
            Publishing {run.current ? kindLabel(run.current) : ''} failed:{' '}
            {run.error}.
            {run.published.length > 0 &&
              ` Published before it: ${names(run.published)}.`}{' '}
            Nothing after it was published.
          </>
        ) : (
          <>
            Published {names(run.published)}. Students see it within a minute.
          </>
        )}
      </span>
      <button
        type="button"
        onClick={dismissPublishRun}
        className="shrink-0 text-xs underline-offset-2 hover:underline"
      >
        Dismiss
      </button>
    </ConsoleCallout>
  );
};
