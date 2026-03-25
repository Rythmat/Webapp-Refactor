import { useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { ClassroomLayout } from '@/components/ClassroomLayout/ClassroomLayout';
import { ClassroomRoutes } from '@/constants/routes';
import { useCollection } from '@/hooks/data';

export const ClassroomCollectionPage = () => {
  const { classroomId, collectionId } = useParams<{
    classroomId: string;
    collectionId: string;
  }>();

  const {
    data: collection,
    isLoading,
    error: isCollectionError,
  } = useCollection(collectionId);

  const back = useMemo(
    () => ({
      label: 'Back to classroom',
      to: ClassroomRoutes.home({ classroomId: classroomId! }),
    }),
    [classroomId],
  );

  return (
    <ClassroomLayout
      back={back}
      classroomId={classroomId}
      isEmpty={false}
      isLoading={isLoading}
      isNotFound={!!isCollectionError}
    >
      <h1 className="mb-1 text-4xl font-medium">{collection?.name}</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        {collection?.description}
      </p>
    </ClassroomLayout>
  );
};
