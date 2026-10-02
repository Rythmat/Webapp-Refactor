import { Link } from 'react-router-dom';
import { songIdForEvent } from '@/components/atlas/data/songEventAliases';
import { AdminRoutes } from '@/constants/routes';
import {
  type ContentKind,
  useValidateContent,
  type ValidationProblem,
} from '@/hooks/data/admin/useAdminContent';
import { useCapabilities } from '@/hooks/data/admin/useCapabilities';
import { useContentExports } from '@/hooks/data/admin/useContentExport';
import { ConsoleCallout } from '../ui/ConsoleCallout';
import type { TableDef } from './model/types';
import { tableHref, tableRowForNode } from './tablePaths';

/**
 * What would block a publish of the table's kind, above its rows — as the
 * per-kind lists said it before they redirected here (`/validate/:kind`).
 * Each problem names its item by slug, which is its row's key here, so each
 * links to its row (a song's own globe event to the song's) — except a
 * song's globe event whose song is gone: its row is the missing song, which
 * has nothing to edit, so it links to the event's full editor, where it is
 * archived or deleted.
 *
 * Only for a kind the API serves: a code table has nothing to publish, and
 * asking about a kind the server lacks is a 404 every time the table opens.
 */
export const ValidationNotice = ({ def }: { def: TableDef }) => {
  const caps = useCapabilities();
  const kind = def.contentKind;
  return kind && caps.isServed(kind) ? (
    <Problems def={def} kind={kind} />
  ) : null;
};

/** How many problems are listed before "…and N more". */
const SHOWN = 5;

const NONE: readonly ContentKind[] = [];
const EVENTS: readonly ContentKind[] = ['globe_event'];

/**
 * A song's globe event (`song-<id>`, or a second recording's event with its
 * alias) whose song is gone.
 */
export const isOrphanSongEvent = (
  kind: ContentKind,
  problem: Pick<ValidationProblem, 'code' | 'slug' | 'target'>,
): boolean => {
  const song = songIdForEvent(problem.slug);
  return (
    kind === 'globe_event' &&
    problem.code === 'DANGLING_REFERENCE' &&
    song !== null &&
    problem.target === `song:${song}`
  );
};

const Problems = ({ def, kind }: { def: TableDef; kind: ContentKind }) => {
  const validation = useValidateContent(kind);
  const problems =
    validation.data && !validation.data.ok ? validation.data.problems : [];
  const shown = problems.slice(0, SHOWN);
  const orphans = shown.some((problem) => isOrphanSongEvent(kind, problem));
  // The events' ids, for the full editor: read only while one is listed.
  const events = useContentExports(orphans ? EVENTS : NONE);
  const eventIds = new Map(
    (events.byKind.get('globe_event')?.rows ?? []).map((row) => [
      row.slug,
      row.id,
    ]),
  );
  const rowOf = (slug: string) => {
    const target = tableRowForNode(`${def.rows.kind}:${slug}`);
    return target
      ? tableHref(target.table, target.row)
      : tableHref(def.id, slug);
  };
  if (problems.length === 0) return null;
  return (
    <ConsoleCallout
      tone="warning"
      className="px-3 py-2 text-xs"
      title={
        <span>
          {problems.length} problem{problems.length === 1 ? '' : 's'} would
          block a publish
        </span>
      }
    >
      <ul className="space-y-1">
        {shown.map((problem, index) => {
          const id = isOrphanSongEvent(kind, problem)
            ? eventIds.get(problem.slug)
            : undefined;
          return (
            // One item can have the same problem twice (two references).
            <li
              key={`${problem.code}-${problem.slug}-${problem.path ?? problem.target ?? ''}-${index}`}
            >
              <Link
                to={
                  id
                    ? AdminRoutes.contentItem({ kind, id })
                    : rowOf(problem.slug)
                }
                className="text-white/90 underline-offset-2 hover:underline"
              >
                {problem.slug}
              </Link>{' '}
              — {problem.detail}
              {id && ' Open it to archive or delete it.'}
            </li>
          );
        })}
        {problems.length > SHOWN && (
          <li>…and {problems.length - SHOWN} more</li>
        )}
      </ul>
    </ConsoleCallout>
  );
};
