import { format } from 'date-fns';
import { RotateCcw, XCircle } from 'lucide-react';
import { useState } from 'react';
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
import {
  type ContentRelease,
  useCancelRelease,
  useContentReleases,
  useRollbackContent,
} from '@/hooks/data/admin/useAdminContent';
import { ConsoleBadge, RELEASE_STATUS_TONE } from '../../ui/ConsoleBadge';
import { ConsoleCallout } from '../../ui/ConsoleCallout';
import { CONSOLE_TABLE_HEAD } from '../../ui/styles';
import { kindLabel } from './kindLabels';

const formatBytes = (bytes: number) =>
  bytes > 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
    : `${(bytes / 1024).toFixed(0)} KB`;

/**
 * Every release: cancel one still building, restore an earlier one.
 *
 * Restore asks first. It re-points what students read, within a minute, and
 * it used to fire on a single click beside a Cancel button.
 */
export const PublishHistorySection = () => {
  const releases = useContentReleases();
  const rollback = useRollbackContent();
  const cancel = useCancelRelease();
  const [restoring, setRestoring] = useState<ContentRelease | null>(null);

  if (releases.isLoading) return <Skeleton className="h-40 w-full" />;

  return (
    <section className="flex flex-col gap-3">
      {(rollback.error || cancel.error) && (
        <ConsoleCallout tone="danger">
          {rollback.error?.message ?? cancel.error?.message}
        </ConsoleCallout>
      )}
      <Table>
        <TableHeader className={CONSOLE_TABLE_HEAD}>
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
              <TableCell>{kindLabel(release.kind)}</TableCell>
              <TableCell>v{release.version}</TableCell>
              <TableCell>
                <ConsoleBadge tone={RELEASE_STATUS_TONE[release.status]}>
                  {release.status}
                </ConsoleBadge>
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
                    disabled={cancel.isPending}
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
                    onClick={() => setRestoring(release)}
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

      <AlertDialog
        open={!!restoring}
        onOpenChange={(open) => !open && setRestoring(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Restore {restoring && kindLabel(restoring.kind)} v
              {restoring?.version}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Students will see this version instead of the live one within a
              minute. Nothing is deleted: the live version stays in the history
              and can be restored in turn.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep the live version</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (restoring) {
                  rollback.mutate({
                    kind: restoring.kind,
                    version: restoring.version,
                  });
                }
                setRestoring(null);
              }}
            >
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
};
