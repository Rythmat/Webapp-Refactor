import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { ClassroomLayout } from '@/components/ClassroomLayout/ClassroomLayout';
import { ClassroomRoutes } from '@/constants/routes';
import { useCollection } from '@/hooks/data';

export const ClassroomLessonPage = () => {
  const { classroomId, collectionId } = useParams<{
    classroomId: string;
    collectionId: string;
  }>();

  const {
    data: collection,
    isLoading,
    error: collectionError,
  } = useCollection(collectionId);

  const back = useMemo(
    () => ({
      label: collection?.name
        ? `Back to ${collection.name}`
        : 'Back to collection',
      to: ClassroomRoutes.collection({
        classroomId: classroomId!,
        collectionId: collectionId!,
      }),
    }),
    [collection?.name, classroomId, collectionId],
  );

  const color = collection?.color || undefined;

  return (
    <>
      <div
        className="prose max-w-none flex-1 border-t-8 text-white"
        style={{ borderColor: color }}
      >
        <ClassroomLayout
          back={back}
          classroomId={classroomId}
          isEmpty={false}
          isLoading={isLoading}
          isNotFound={!!collectionError}
        >
          <h1 className="mb-1 text-4xl font-medium text-white">
            {collection?.name}
          </h1>
        </ClassroomLayout>
      </div>
    </>
  );
};
