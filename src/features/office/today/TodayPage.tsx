import { GraduationCap, Plus } from 'lucide-react';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCountryFeatures } from '@/components/ClassroomLayout/globe/RegionPolygonThumb';
import { useTopRailStats } from '@/components/ClassroomLayout/useTopRailStats';
import { SHELF_ITEM, Shelf } from '@/components/explore/Shelf';
import { MicroLabel } from '@/components/kit';
import { OfficeRoutes } from '@/constants/routes';
import { Button } from '@/daw/ui/Button';
import { EmptyState } from '@/daw/ui/EmptyState';
import { useSongsReady } from '@/features/classroom/plan/useSongsReady';
import { useMyClassrooms } from '@/hooks/data';
import { LessonCard } from '../ui/LessonCard';
import { OFFICE_CARD, OFFICE_PAGE, OFFICE_PAGE_TITLE } from '../ui/styles';
import { NextUpCard } from './NextUpCard';
import { TodayItems } from './TodayItems';
import { lessonInspectHref } from './officeLinks';
import {
  buildTodayModel,
  isoDay,
  relativeDay,
  type ClassDigest,
} from './todayModel';
import { useClassDigest, type DigestClassroom } from './useClassDigest';

/** Reads one class through its own hooks and hands its digest up. */
const DigestProbe = memo(function DigestProbe({
  classroom,
  onDigest,
}: {
  classroom: DigestClassroom;
  onDigest: (digest: ClassDigest) => void;
}) {
  const digest = useClassDigest(classroom);
  useEffect(() => onDigest(digest), [digest, onDigest]);
  return null;
});

const greeting = (now: Date) => {
  const h = now.getHours();
  return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * Today — where the Office opens (owner, 2026-11-09): the class that's live
 * or the next lesson to teach, what's waiting on the teacher, heads-ups for
 * the days ahead, and the week's lessons across every class.
 */
export const TodayPage = () => {
  const { pathname } = useLocation();
  const { classrooms, isLoading, coTaughtAvailable } = useMyClassrooms();
  const { userName } = useTopRailStats();
  const countryFeatures = useCountryFeatures();
  const songsReady = useSongsReady();
  const [digests, setDigests] = useState<Record<string, ClassDigest>>({});
  const now = useMemo(() => new Date(), []);
  const todayIso = isoDay(now);

  const onDigest = useCallback(
    (d: ClassDigest) =>
      setDigests((prev) =>
        prev[d.classroomId] === d ? prev : { ...prev, [d.classroomId]: d },
      ),
    [],
  );

  const model = useMemo(
    () =>
      buildTodayModel(
        classrooms.flatMap((c) => (digests[c.id] ? [digests[c.id]] : [])),
        now,
      ),
    [classrooms, digests, now],
  );

  // useTopRailStats says 'friend' when it has no name; Today then says none.
  const firstName =
    userName && userName !== 'friend' ? userName.split(' ')[0] : null;
  const dateLine = now.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className={OFFICE_PAGE}>
      {classrooms.map((c) => (
        <DigestProbe key={c.id} classroom={c} onDigest={onDigest} />
      ))}

      <header className="flex flex-col gap-1.5">
        <MicroLabel>{dateLine}</MicroLabel>
        <h1 className={OFFICE_PAGE_TITLE}>
          {greeting(now)}
          {firstName ? `, ${firstName}` : ''}
        </h1>
      </header>

      {isLoading ? (
        <div aria-busy className="flex flex-col gap-6">
          <div className={`${OFFICE_CARD} h-44 animate-pulse`} />
          <div className="grid gap-6 lg:grid-cols-2">
            <div className={`${OFFICE_CARD} h-40 animate-pulse`} />
            <div className={`${OFFICE_CARD} h-40 animate-pulse`} />
          </div>
        </div>
      ) : classrooms.length === 0 ? (
        <div className={OFFICE_CARD}>
          <EmptyState
            className="py-16"
            titleAs="h2"
            icon={<GraduationCap />}
            title="Make your first class"
            description={
              coTaughtAvailable
                ? 'Create a class to invite students, plan lessons and teach live.'
                : 'Create a class to invite students, plan lessons and teach live. Classes you co-teach will appear here once co-teaching sync arrives.'
            }
            actions={
              <Button asChild variant="primary" size="lg">
                <Link to={`${OfficeRoutes.classes()}?new=1`}>
                  <Plus aria-hidden />
                  New class
                </Link>
              </Button>
            }
          />
        </div>
      ) : (
        <>
          <NextUpCard
            model={model}
            todayIso={todayIso}
            firstClassroomId={classrooms[0]?.id ?? null}
            countryFeatures={countryFeatures}
            songsReady={songsReady}
          />

          <div className="grid items-start gap-6 lg:grid-cols-2">
            <TodayItems
              title="Needs you"
              items={model.needsYou}
              empty="You're all caught up."
            />
            <TodayItems
              title="Heads up"
              items={model.headsUp}
              empty="Nothing to flag this week."
            />
          </div>

          {model.week.length > 0 && (
            <Shelf
              id="office-week"
              title="This week"
              reason="Across your classes"
              seeAll={OfficeRoutes.planner()}
              count={model.week.length}
            >
              {model.week.map((l) => (
                <li key={`${l.classroomId}/${l.day.id}`} className={SHELF_ITEM}>
                  <LessonCard
                    day={l.day}
                    status={l.status}
                    eyebrow={`${capitalize(relativeDay(l.date, todayIso))} — ${l.className}`}
                    to={lessonInspectHref(pathname, l.classroomId, l.day.id)}
                    countryFeatures={countryFeatures}
                    songsReady={songsReady}
                  />
                </li>
              ))}
            </Shelf>
          )}
        </>
      )}
    </div>
  );
};
