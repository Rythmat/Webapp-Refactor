import { CalendarDays } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ClassroomLayout } from '@/components/ClassroomLayout/ClassroomLayout';
import { ClassroomRoutes, TeacherRoutes } from '@/constants/routes';
import { useClassroom, useCollections, useMe } from '@/hooks/data';

export const ClassroomHomePage = () => {
  const { classroomId } = useParams<{ classroomId: string }>();

  const {
    data: classroom,
    isLoading: isClassroomLoading,
    error: classroomError,
  } = useClassroom(classroomId);

  const {
    data: collections,
    isLoading: isCollectionsLoading,
    error: collectionsError,
  } = useCollections();

  const { data: user, isLoading: isUserLoading, error: userError } = useMe();

  const isLoading = isClassroomLoading || isUserLoading || isCollectionsLoading;
  const isError = classroomError || userError || collectionsError;

  const back = useMemo(() => {
    if (user?.role === 'teacher') {
      return { label: 'All classrooms', to: TeacherRoutes.root() };
    }

    return { label: 'All classrooms', to: ClassroomRoutes.picker() };
  }, [user?.role]);

  return (
    <ClassroomLayout
      back={back}
      classroomId={classroomId}
      isEmpty={false}
      isLoading={isLoading}
      isNotFound={!!isError}
    >
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-4xl font-medium leading-tight text-white md:text-5xl">
            {classroom?.name}
          </h1>
          {classroom?.description && (
            <p className="text-base text-white/60">{classroom.description}</p>
          )}
        </div>
        {user?.role === 'teacher' && classroomId && (
          <Link
            to={ClassroomRoutes.plan({ classroomId })}
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-medium text-black transition-colors hover:bg-white/85"
          >
            <CalendarDays className="h-4 w-4" />
            Plan Days
          </Link>
        )}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {collections?.map((collection) => (
          <div
            key={collection.id}
            className="flex flex-col gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5 transition-colors hover:border-white/15 hover:bg-white/[0.04]"
            style={{
              borderLeftColor: collection.color || undefined,
              borderLeftWidth: collection.color ? '4px' : undefined,
            }}
          >
            <div className="flex flex-col gap-1">
              <h2 className="line-clamp-1 text-lg font-medium text-white">
                {collection.name}
              </h2>
              {collection.description && (
                <p className="line-clamp-3 text-sm text-white/60">
                  {collection.description}
                </p>
              )}
            </div>
            <Link
              to={ClassroomRoutes.collection({
                classroomId: classroomId!,
                collectionId: collection.id,
              })}
              className="mt-auto inline-flex items-center justify-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/80 transition-colors hover:border-white/25 hover:text-white"
            >
              View
            </Link>
          </div>
        ))}
      </div>
    </ClassroomLayout>
  );
};
