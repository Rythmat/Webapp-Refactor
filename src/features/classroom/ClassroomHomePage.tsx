import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ClassroomLayout } from '@/components/ClassroomLayout/ClassroomLayout';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
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
      <h1 className="mb-1 text-4xl font-medium">{classroom?.name}</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        {classroom?.description}
      </p>
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {collections?.map((collection) => (
          <Card
            key={collection.id}
            className="flex flex-col justify-between overflow-hidden transition-all hover:shadow-md"
            style={{
              borderLeftColor: collection.color || undefined,
              borderLeftWidth: collection.color ? '4px' : undefined,
            }}
          >
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="line-clamp-1">
                    {collection.name}
                  </CardTitle>
                  {collection.description && (
                    <CardDescription className="line-clamp-3">
                      {collection.description}
                    </CardDescription>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardFooter>
              <Button asChild className="w-full" variant="outline">
                <Link
                  to={ClassroomRoutes.collection({
                    classroomId: classroomId!,
                    collectionId: collection.id,
                  })}
                >
                  View
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </ClassroomLayout>
  );
};
