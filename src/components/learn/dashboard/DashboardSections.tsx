import { ArrowRight, ClipboardList } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { artForGame, type ArcadeGame } from '@/components/Games/arcadeGames';
import { ArtCover } from '@/components/art/ArtCover';
import { SongThumb, songKeyColour } from '@/components/explore/songArt';
import { CoverTile } from '@/components/kit/CoverTile';
import { MicroLabel, microLabel } from '@/components/kit/MicroLabel';
import { WHITE_PILL } from '@/components/kit/pills';
import { cn } from '@/components/utilities';
import {
  ClassroomRoutes,
  GameRoutes,
  LearnRoutes,
  SongRoutes,
} from '@/constants/routes';
import type { Song } from '@/curriculum/types/songLibrary';
import { FOCUS_RING, TRANSITION } from '@/daw/ui/styles';
import type { Assignment } from '@/features/classroom/assignments/assignmentsStore';
import type { WebActivity } from '@/features/cortex/buildWeb';
import type { CortexRecords } from '@/features/cortex/ledger';
import type { RevisitItem } from '@/features/learn/dashboard/recommend';

// ── The dashboard's smaller sections ───────────────────────────────────────

function SectionHead({
  id,
  title,
  reason,
  action,
}: {
  id: string;
  title: string;
  reason?: string;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex items-end justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        {reason && <MicroLabel>{reason}</MicroLabel>}
        <h2 id={id} className="text-[1.125rem] text-daw-text">
          {title}
        </h2>
      </div>
      {action}
    </header>
  );
}

const DAY = 24 * 60 * 60_000;

/** "today", "in 3 days", "3 days ago". */
export function relativeDays(atMs: number, nowMs: number): string {
  const days = Math.round((atMs - nowMs) / DAY);
  if (days === 0) return 'today';
  if (days === 1) return 'tomorrow';
  if (days === -1) return 'yesterday';
  return days > 0 ? `in ${days} days` : `${-days} days ago`;
}

const assignmentRoute = (a: Assignment) =>
  a.kind === 'instructions'
    ? ClassroomRoutes.assignmentInstructions({
        classroomId: a.classroomId,
        assignmentId: a.id,
      })
    : ClassroomRoutes.assignmentDayRun({
        classroomId: a.classroomId,
        assignmentId: a.id,
      });

/**
 * The teacher's work, kept apart from the student's own (Khan Academy's
 * Learner Home): the open assignment due soonest, and how many more.
 */
export function TeacherCard({
  assignments,
  nowMs,
}: {
  assignments: readonly Assignment[];
  nowMs: number;
}) {
  const open = useMemo(
    () =>
      assignments
        .filter((a) => a.status === 'open')
        .sort(
          (a, b) =>
            (a.dueAt ? Date.parse(a.dueAt) : Infinity) -
            (b.dueAt ? Date.parse(b.dueAt) : Infinity),
        ),
    [assignments],
  );
  const first = open[0];
  if (!first) return null;
  const due = first.dueAt ? Date.parse(first.dueAt) : null;
  const late = due !== null && due < nowMs;
  return (
    <section
      aria-label="From your teacher"
      className="flex flex-wrap items-center gap-4 rounded-[1.25rem] border border-white/10 bg-white/[0.04] p-4 pr-5"
    >
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white/[0.08]">
        <ClipboardList aria-hidden className="size-5 text-daw-text" />
      </span>
      <div className="min-w-0 flex-1">
        <MicroLabel>
          {microLabel(
            'From your teacher',
            open.length > 1 && `${open.length - 1} more open`,
          )}
        </MicroLabel>
        <p className="truncate text-[0.9375rem] text-daw-text">{first.title}</p>
        {due !== null && (
          <p
            className={cn(
              'text-[0.8125rem]',
              late ? 'text-[#ff8a80]' : 'text-daw-text-3',
            )}
          >
            {late ? 'Was due ' : 'Due '}
            {relativeDays(due, nowMs)}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {open.length > 1 && (
          <Link
            to={ClassroomRoutes.assignments({ classroomId: first.classroomId })}
            className={cn(
              'rounded-full px-3 py-1.5 text-[0.8125rem] text-daw-text-3 hover:text-daw-text',
              FOCUS_RING,
            )}
          >
            All
          </Link>
        )}
        <Link to={assignmentRoute(first)} className={WHITE_PILL}>
          Open
        </Link>
      </div>
    </section>
  );
}

/**
 * Things finished a week or more ago, oldest first: worth another go
 * (spacing, Cepeda et al. 2006). Named lazily: the Cortex's describer loads
 * the catalogues.
 */
export function RevisitRow({
  items,
  records,
  nowMs,
}: {
  items: readonly RevisitItem[];
  records: CortexRecords;
  nowMs: number;
}) {
  const navigate = useNavigate();
  const [described, setDescribed] = useState<readonly WebActivity[]>([]);
  useEffect(() => {
    if (!items.length) {
      setDescribed([]);
      return undefined;
    }
    let live = true;
    void import('@/features/cortex/describe').then(({ describeActivity }) => {
      if (!live) return;
      setDescribed(
        items
          .map((item) => {
            const record = records[item.id];
            return record ? describeActivity(item.id, record, {}) : null;
          })
          .filter((a): a is WebActivity => Boolean(a?.route)),
      );
    });
    return () => {
      live = false;
    };
  }, [items, records]);

  if (!described.length) return null;
  return (
    <section aria-labelledby="learn-revisit" className="flex flex-col gap-3">
      <SectionHead
        id="learn-revisit"
        title="Revisit"
        reason="Worth another go"
      />
      <ul className="grid grid-cols-1 gap-3 @[40rem]:grid-cols-2 @[60rem]:grid-cols-3">
        {described.map((activity) => (
          <li key={activity.id}>
            <CoverTile
              layout="tray"
              fluid
              title={activity.label}
              eyebrow={activity.detail}
              sub={`Finished ${relativeDays(activity.doneAt, nowMs)}`}
              ariaLabel={`Revisit ${activity.label}`}
              onSelect={() => navigate(activity.route!)}
              art={
                <ArtCover
                  seed={activity.id}
                  aspect={1}
                  motion="none"
                  density="thumb"
                />
              }
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

const DIFFICULTY = ['Easy', 'Medium', 'Hard'] as const;

/** Songs in the styles they like, at about their level. */
export function SongsForYou({
  songs,
  reason,
}: {
  songs: readonly Song[];
  reason: string;
}) {
  const navigate = useNavigate();
  if (!songs.length) return null;
  return (
    <section
      aria-labelledby="learn-songs"
      data-learn-home="saved"
      className="flex min-w-0 flex-col gap-3"
    >
      <SectionHead
        id="learn-songs"
        title="Songs for you"
        reason={reason}
        action={
          <Link
            to={SongRoutes.root()}
            className={cn(
              'rounded-full px-2 py-1 text-[0.8125rem] font-bold text-daw-text-3 hover:text-daw-text',
              FOCUS_RING,
            )}
          >
            All songs
          </Link>
        }
      />
      <ul className="grid grid-cols-1 gap-3 @[34rem]:grid-cols-2">
        {songs.map((song) => (
          <li key={song.id}>
            <CoverTile
              layout="tray"
              fluid
              title={song.title}
              sub={microLabel(
                song.artist,
                DIFFICULTY[song.difficulty - 1] ?? null,
              ).replace(' — ', ' · ')}
              ariaLabel={`Open ${song.title} by ${song.artist}`}
              onSelect={() => navigate(SongRoutes.song({ songId: song.id }))}
              rimColors={[songKeyColour(song)]}
              art={<SongThumb song={song} />}
            />
          </li>
        ))}
      </ul>
    </section>
  );
}

/** One Arcade game that practises what they're learning. */
export function ArcadePick({ game }: { game: ArcadeGame }) {
  const navigate = useNavigate();
  const art = artForGame(game);
  const route = game.route
    ? (GameRoutes[game.route] as (p?: void) => string)
    : null;
  if (!route) return null;
  return (
    <section aria-labelledby="learn-arcade" className="flex flex-col gap-3">
      <SectionHead
        id="learn-arcade"
        title="Play to practise"
        reason="From the Arcade"
      />
      <CoverTile
        layout="wide"
        fluid
        title={game.title}
        eyebrow={game.category}
        sub={game.blurb}
        ariaLabel={`Play ${game.title}`}
        onSelect={() => navigate(route())}
        art={
          <ArtCover
            seed={art.seed}
            kind={art.kind}
            variant={art.variant}
            mode={art.mode}
            palette={art.palette}
            aspect={16 / 10}
            motion="hover"
          />
        }
      />
    </section>
  );
}

/** The way to everything else: Explore. */
export function BrowseAllCard() {
  return (
    <Link
      to={LearnRoutes.root()}
      className={cn(
        'group flex items-center justify-between gap-4 rounded-[1.25rem] border border-white/10 bg-white/[0.03] p-6 hover:bg-white/[0.06]',
        TRANSITION,
        FOCUS_RING,
      )}
    >
      <span className="flex min-w-0 flex-col gap-1">
        <MicroLabel>Explore</MicroLabel>
        <span className="text-[1.25rem] text-daw-text">
          Browse every course
        </span>
        <span className="text-[0.875rem] text-daw-text-3">
          Keyboard, guitar, bass, ukulele and audio: every theory, genre and
          technique course in one place.
        </span>
      </span>
      <ArrowRight
        aria-hidden
        className="size-5 shrink-0 text-daw-text-3 transition-transform group-hover:translate-x-1 group-hover:text-daw-text motion-reduce:transition-none"
      />
    </Link>
  );
}
