import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
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
import { AdminRoutes } from '@/constants/routes';
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';
import {
  CONTENT_KEY,
  type ContentEditState,
  contentRequest,
} from '@/hooks/data/admin/useAdminContent';
import { useCapabilities } from '@/hooks/data/admin/useCapabilities';
import { isContentEditor } from '../../consoleRoles';
import { ConsoleBadge, type ConsoleBadgeTone } from '../../ui/ConsoleBadge';
import { ConsoleCallout } from '../../ui/ConsoleCallout';
import {
  CONSOLE_LABEL,
  CONSOLE_PANEL,
  CONSOLE_TABLE_HEAD,
  consoleTabClass,
} from '../../ui/styles';
import { useBulkWrite } from '../bulk/useBulkWrite';
import { EntityPicker } from '../entities/EntityPicker';
import {
  type LegacyGroup,
  type LinkTier,
  linkBody,
  linksBySong,
  resolveLegacyArtists,
  type SongLike,
} from '../entities/resolveLegacy';
import { useEntityIndex } from '../entities/useEntityIndex';
import { ProposalDiff } from '../review/EditReview';

/**
 * Link the songs' artist names to artist records, in bulk (design §3.4).
 *
 * Reads every song body the store holds, finds each artist name with no id
 * beside it (the billing line, each credit, each related recording), and
 * groups them by the text. The sure ones — a record's name, an alias, or the
 * same once folded — can be applied together after a dry run shows what
 * changes; the rest are linked one group at a time, with the picker. Only
 * the id fields are written; the text stays what the page shows. An editor's
 * writes are proposals, like any other save.
 */

const TIER_LABEL: Record<LinkTier, string> = {
  sure: 'Sure',
  close: 'Close',
  combined: 'Joint billing',
  none: 'No record',
};

const TIER_TONE: Record<LinkTier, ConsoleBadgeTone> = {
  sure: 'success',
  close: 'info',
  combined: 'warning',
  none: 'muted',
};

interface ExportedSong {
  slug: string;
  editState: ContentEditState;
  body: Record<string, unknown> | null;
  pendingBody?: Record<string, unknown>;
}

async function loadSongs(token: string): Promise<ExportedSong[]> {
  const out: ExportedSong[] = [];
  let cursor: string | null = null;
  do {
    const after: string = cursor ? `&cursor=${encodeURIComponent(cursor)}` : '';
    const page: { items: ExportedSong[]; nextCursor: string | null } =
      await contentRequest(`/export?kind=song&limit=500${after}`, token);
    out.push(...page.items);
    cursor = page.nextCursor;
  } while (cursor);
  return out;
}

export const LegacyLinkPage = () => {
  const { token, role } = useAuthContext();
  const editor = isContentEditor(role);
  const caps = useCapabilities();
  const canExport = caps.feature('export');
  const bulk = useBulkWrite();
  const { progress } = bulk;
  const songs = useQuery({
    queryKey: [...CONTENT_KEY, 'legacy-links', 'songs'],
    queryFn: () => loadSongs(token!),
    enabled: !!token && canExport,
  });
  const artists = useEntityIndex(useMemo(() => ['artist' as const], []));

  // The body each song would be written from: an editor builds on their own
  // pending proposal, as the item editor does; an admin on the live body.
  const bodies = useMemo(() => {
    const map = new Map<string, Record<string, unknown>>();
    for (const s of songs.data ?? []) {
      const body = editor && s.pendingBody ? s.pendingBody : s.body;
      if (body) map.set(s.slug, body);
    }
    return map;
  }, [songs.data, editor]);

  const groups = useMemo(
    () =>
      resolveLegacyArtists(
        // The item is its slug, whatever the body's own id says.
        [...bodies].map(
          ([slug, body]) => ({ ...body, id: slug }) as unknown as SongLike,
        ),
        artists.entries,
      ),
    [bodies, artists.entries],
  );

  const [tier, setTier] = useState<LinkTier | 'all'>('all');
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [preview, setPreview] = useState<Map<
    string,
    Record<string, unknown>
  > | null>(null);

  const sure = groups.filter((g) => g.tier === 'sure');
  const counts = useMemo(() => {
    const out: Record<LinkTier, number> = {
      sure: 0,
      close: 0,
      combined: 0,
      none: 0,
    };
    for (const g of groups) out[g.tier]++;
    return out;
  }, [groups]);
  const shown = tier === 'all' ? groups : groups.filter((g) => g.tier === tier);

  /** The new bodies for a set of groups, keyed by song. */
  const plan = (chosen: { group: LegacyGroup; slug: string }[]) => {
    const next = new Map<string, Record<string, unknown>>();
    for (const [song, links] of linksBySong(chosen)) {
      const body = bodies.get(song);
      if (body) next.set(song, linkBody(body, links));
    }
    return next;
  };

  // One at a time: each is a save like any other, validated on its own.
  const write = (next: Map<string, Record<string, unknown>>) =>
    bulk.run(
      [...next].map(([slug, body]) => ({
        kind: 'song' as const,
        slug,
        body,
        note: 'Linked artist names to their records',
      })),
      // The dry run closes once the last song is written, not after the
      // refetch.
      { onWritten: () => setPreview(null) },
    );

  const applyGroup = (group: LegacyGroup, slug: string) =>
    void write(plan([{ group, slug }]));

  const busy = bulk.busy;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="flex flex-col gap-6 px-6 pb-10 pt-6 md:px-10">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl tracking-tight text-white">Cortex</h1>
          <nav aria-label="Graph views" className="flex gap-1">
            <Link
              to={AdminRoutes.cortex()}
              className={consoleTabClass(false, 'sm')}
            >
              Map
            </Link>
            <Link
              to={AdminRoutes.cortexIntegrity()}
              className={consoleTabClass(false, 'sm')}
            >
              Integrity
            </Link>
            <span aria-current="page" className={consoleTabClass(true, 'sm')}>
              Links
            </span>
          </nav>
        </div>

        {!canExport ? (
          <ConsoleCallout tone="warning">
            Linking in bulk reads every song at once through the content API's
            export, which this server does not offer yet. Link songs one at a
            time from each song's editor meanwhile.
          </ConsoleCallout>
        ) : songs.isError ? (
          <ConsoleCallout tone="danger">
            Could not read the songs: {String(songs.error)}
          </ConsoleCallout>
        ) : !songs.data ? (
          <Skeleton className="h-64 w-full rounded-xl" />
        ) : (
          <>
            <div
              className={`${CONSOLE_PANEL} flex flex-wrap items-center gap-4 p-4`}
            >
              <p className="text-sm text-white/75">
                {groups.length.toLocaleString()} artist names in{' '}
                {bodies.size.toLocaleString()} songs have no record linked.{' '}
                <span className="text-white">
                  {counts.sure} are sure matches
                </span>{' '}
                ({sure.reduce((n, g) => n + g.occurrences.length, 0)} places).
              </p>
              <Button
                size="sm"
                className="ml-auto"
                disabled={busy || sure.length === 0}
                onClick={() =>
                  setPreview(
                    plan(
                      sure.map((group) => ({
                        group,
                        slug: group.candidates[0].entry.slug,
                      })),
                    ),
                  )
                }
              >
                Apply the {counts.sure} sure matches…
              </Button>
            </div>

            {preview && (
              <ConsoleCallout tone="info" title="Dry run">
                <p>
                  {preview.size} songs change; only their artist id fields are
                  written.
                  {editor && ' Each goes to review as a proposal.'} The first
                  three:
                </p>
                <ul className="mt-2 flex flex-col gap-2">
                  {[...preview.entries()].slice(0, 3).map(([slug, body]) => (
                    <li key={slug}>
                      <span className="text-white">{slug}</span>
                      <ProposalDiff
                        before={bodies.get(slug)}
                        after={body}
                        defaultOpen
                      />
                    </li>
                  ))}
                </ul>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={() => void write(preview)}>
                    Write {preview.size} songs
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setPreview(null)}
                  >
                    Cancel
                  </Button>
                </div>
              </ConsoleCallout>
            )}

            {/* Always mounted, so a screen reader hears the run start and
                end; the count that ticks on screen would be read out song
                by song. */}
            <p role="status" className="sr-only">
              {!progress
                ? ''
                : bulk.busy
                  ? `Writing ${progress.total} songs…`
                  : `${progress.done - progress.failed.length} of ${progress.total} songs written${
                      progress.failed.length
                        ? `, ${progress.failed.length} failed`
                        : ''
                    }.`}
            </p>
            {progress && (
              <ConsoleCallout
                tone={progress.failed.length ? 'warning' : 'neutral'}
              >
                {bulk.busy ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="size-4 animate-spin" />
                    Writing {progress.done} of {progress.total}…
                    <button
                      type="button"
                      className="underline underline-offset-2"
                      onClick={bulk.stop}
                    >
                      Stop
                    </button>
                  </span>
                ) : (
                  <>
                    Wrote {progress.done - progress.failed.length} of{' '}
                    {progress.total}.
                    {progress.failed.length > 0 && (
                      <ul className="mt-1 text-xs">
                        {progress.failed.slice(0, 10).map((f) => (
                          <li key={f}>{f}</li>
                        ))}
                      </ul>
                    )}
                  </>
                )}
              </ConsoleCallout>
            )}

            <div
              role="group"
              aria-label="Show"
              className="flex flex-wrap gap-1"
            >
              {(['all', 'sure', 'close', 'combined', 'none'] as const).map(
                (t) => (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={tier === t}
                    onClick={() => setTier(t)}
                    className={consoleTabClass(tier === t, 'sm')}
                  >
                    {t === 'all' ? 'All' : TIER_LABEL[t]} ·{' '}
                    {t === 'all' ? groups.length : counts[t]}
                  </button>
                ),
              )}
            </div>

            <div className={`${CONSOLE_PANEL} overflow-x-auto`}>
              <Table>
                <TableHeader className={CONSOLE_TABLE_HEAD}>
                  <TableRow>
                    <TableHead>Written as</TableHead>
                    <TableHead>Where</TableHead>
                    <TableHead>Match</TableHead>
                    <TableHead>Record</TableHead>
                    <TableHead className="w-24" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shown.slice(0, 200).map((group) => {
                    const chosen =
                      picked[group.text] ??
                      (group.tier === 'sure' || group.tier === 'close'
                        ? group.candidates[0]?.entry.slug
                        : undefined);
                    return (
                      <TableRow key={group.text}>
                        <TableCell className="text-white">
                          {group.text}
                        </TableCell>
                        <TableCell className="text-xs text-white/55">
                          {group.occurrences.length} ·{' '}
                          {[...new Set(group.occurrences.map((o) => o.item))]
                            .slice(0, 3)
                            .join(', ')}
                          {new Set(group.occurrences.map((o) => o.item)).size >
                            3 && '…'}
                        </TableCell>
                        <TableCell>
                          <ConsoleBadge tone={TIER_TONE[group.tier]}>
                            {TIER_LABEL[group.tier]}
                          </ConsoleBadge>
                        </TableCell>
                        <TableCell>
                          <EntityPicker
                            kind="artist"
                            aria-label={`Record for ${group.text}`}
                            value={chosen ?? null}
                            suggestion={group.text}
                            allowCreate
                            onChange={(slug) =>
                              setPicked((p) => ({
                                ...p,
                                [group.text]: slug ?? '',
                              }))
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={busy || !chosen}
                            onClick={() => chosen && applyGroup(group, chosen)}
                          >
                            Link
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            {shown.length > 200 && (
              <p className="text-xs text-white/45">
                Showing 200 of {shown.length}; link some and the rest move up.
              </p>
            )}
            <p className={CONSOLE_LABEL}>
              A joint billing is two artists: link each in the song&rsquo;s
              credits, as primary.
            </p>
          </>
        )}
      </div>
    </div>
  );
};
