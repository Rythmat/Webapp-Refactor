import { useMemo } from 'react';
import Markdown from 'react-markdown';
import { useParams } from 'react-router-dom';
import { ClassroomLayout } from '@/components/ClassroomLayout/ClassroomLayout';
import { ClassroomRoutes } from '@/constants/routes';
import { useChapter, useCollection, usePage } from '@/hooks/data';
import { useMarkdownComponents } from '../admin/chapters/components';

export const ClassroomLessonPage = () => {
  const { classroomId, collectionId, lessonId } = useParams<{
    classroomId: string;
    collectionId: string;
    lessonId: string;
  }>();

  const {
    data: page,
    isLoading: isPageLoading,
    error: pageError,
  } = usePage(lessonId);

  const {
    data: chapter,
    isLoading: isChapterLoading,
    error: chapterError,
  } = useChapter(page?.chapterId);

  const {
    data: collection,
    isLoading: isCollectionLoading,
    error: collectionError,
  } = useCollection(collectionId);

  const isLoading = isPageLoading || isCollectionLoading || isChapterLoading;
  const isError = pageError || collectionError || chapterError;

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

  const color = page?.color || chapter?.color || collection?.color || undefined;

  const components = useMarkdownComponents(color);

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
          isNotFound={!!isError}
        >
          <h1 className="mb-1 text-4xl font-medium text-white">{page?.name}</h1>
          <Markdown
            className="prose-h2:text-white prose-h3:text-white prose-h4:text-white prose-h5:text-white prose-h6:text-white"
            components={components}
          >
            {page?.content}
          </Markdown>
        </ClassroomLayout>
      </div>
    </>
  );
};
