import { ChevronDown, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ClassroomLayout } from '@/components/ClassroomLayout/ClassroomLayout';
import { cn } from '@/components/utilities';
import { ClassroomRoutes } from '@/constants/routes';
import { useCollection, useCollectionChapters, useChapter } from '@/hooks/data';

export const ClassroomCollectionPage = () => {
  const { classroomId, collectionId } = useParams<{
    classroomId: string;
    collectionId: string;
  }>();

  const {
    data: collection,
    isLoading: isCollectionLoading,
    error: isCollectionError,
  } = useCollection(collectionId);

  const {
    data: collectionChapters,
    isLoading: isCollectionChaptersLoading,
    error: isCollectionChaptersError,
  } = useCollectionChapters(collectionId);

  const isLoading = isCollectionLoading || isCollectionChaptersLoading;
  const isError = isCollectionError || isCollectionChaptersError;

  const [expandedChapter, setExpandedChapter] = useState<string | null>(null);

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
      isEmpty={!collectionChapters || collectionChapters.length === 0}
      isLoading={isLoading}
      isNotFound={!!isError}
    >
      <h1 className="mb-1 text-4xl font-medium">{collection?.name}</h1>
      <p className="mb-8 text-sm text-muted-foreground">
        {collection?.description}
      </p>
      <div className="flex flex-col gap-4">
        {collectionChapters?.map((chapter) => (
          <div
            key={chapter.id}
            className="relative block w-full overflow-hidden rounded-xl bg-zinc-900 p-8 text-left"
          >
            <div
              className="absolute inset-y-0 left-0 w-1"
              style={{ backgroundColor: chapter.color ?? undefined }}
            />

            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-medium">{chapter.name}</h2>
                <p className="flex-1 text-sm text-muted-foreground">
                  {chapter.description}
                </p>
              </div>
              <button
                onClick={() =>
                  setExpandedChapter(
                    expandedChapter === chapter.id ? null : chapter.id,
                  )
                }
              >
                <ChevronDown
                  className={cn(
                    'size-8 transition-transform duration-100',
                    expandedChapter === chapter.id ? 'rotate-180' : undefined,
                  )}
                />
              </button>
            </div>
            {expandedChapter === chapter.id && (
              <ChapterPages
                chapterId={chapter.id}
                classroomId={classroomId!}
                collectionId={collectionId!}
              />
            )}
          </div>
        ))}
      </div>
    </ClassroomLayout>
  );
};

interface ChapterPagesProps {
  chapterId: string;
  classroomId: string;
  collectionId: string;
}

const ChapterPages = ({
  chapterId,
  classroomId,
  collectionId,
}: ChapterPagesProps) => {
  const { data: chapter, isLoading } = useChapter(chapterId);

  if (isLoading || !chapter) {
    return <div className="pt-6">Loading pages...</div>;
  }

  return (
    <div className="flex flex-col pt-6">
      {chapter.pages.map((page) => (
        <Link
          key={page.id}
          className="group/lesson flex items-center gap-2 py-2"
          to={ClassroomRoutes.lesson({
            classroomId,
            collectionId,
            lessonId: page.id,
          })}
        >
          <div className="flex-1">{page.name || 'Untitled page'}</div>
          <div className="flex items-center gap-2 opacity-60 transition-opacity duration-100 group-hover/lesson:opacity-100">
            Open <ChevronRight className="size-4" />
          </div>
        </Link>
      ))}
    </div>
  );
};
