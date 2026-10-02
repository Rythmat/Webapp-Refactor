import { MapPinOff } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/components/utilities';
import { useDerivationHealth } from '@/hooks/data/admin/useAdminContent';
import { ConsoleCallout } from '../../ui/ConsoleCallout';
import { CONSOLE_LABEL } from '../../ui/styles';
import { repoReadOnlyFile } from '../repo/repoCopy';
import { useRepoMode } from '../repo/useRepoMode';

/**
 * Artists with no globe location.
 *
 * These songs are silently pinned to New York on the globe. The generator that
 * produced the original data counted them and discarded the number, so this
 * list has never been visible to anyone — each row is a concrete fix.
 *
 * In repo mode (DEV only) the artist locations are read-only, so the fix is
 * the file itself, by hand.
 */
export const GlobePlacementSection = () => {
  const health = useDerivationHealth();
  const repoMode = useRepoMode();
  const repo = import.meta.env.DEV && repoMode;
  const locationsFile = repo ? repoReadOnlyFile('artist_location') : null;

  if (health.isLoading) return <Skeleton className="h-32 w-full" />;
  if (!health.data) return null;

  const { defaultedToNewYork, totalSongs, unmatchedArtists } = health.data;

  return (
    <section>
      <h2 className={cn(CONSOLE_LABEL, 'mb-3')}>Globe placement</h2>
      {defaultedToNewYork === 0 ? (
        <p className="text-sm text-muted-foreground">
          All {totalSongs} songs resolve to a real artist location.
        </p>
      ) : (
        <ConsoleCallout
          tone="warning"
          icon={MapPinOff}
          title={
            <span>
              {defaultedToNewYork} of {totalSongs} songs default to New York
            </span>
          }
        >
          <p>
            These artists have no entry in the location map, so their songs are
            pinned to New York on the globe.{' '}
            {locationsFile ? (
              <>
                Repo mode does not edit the locations: add the artist to{' '}
                <code>{locationsFile}</code> by hand to fix.
              </>
            ) : (
              'Add an artist location to fix.'
            )}
          </p>
          <ul className="mt-3 grid gap-1 sm:grid-cols-2">
            {unmatchedArtists.slice(0, 20).map((entry) => (
              <li key={entry.artist} className="flex justify-between gap-3">
                <span className="truncate">{entry.artist}</span>
                <span className="shrink-0 text-white/45">
                  {entry.songCount} song{entry.songCount === 1 ? '' : 's'}
                </span>
              </li>
            ))}
          </ul>
          {unmatchedArtists.length > 20 && (
            <p className="mt-2 text-xs text-white/45">
              …and {unmatchedArtists.length - 20} more artists
            </p>
          )}
        </ConsoleCallout>
      )}
    </section>
  );
};
