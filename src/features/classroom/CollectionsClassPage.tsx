import { ChevronDown, ChevronRight } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ClassroomLayout } from '@/components/ClassroomLayout/ClassroomLayout';
import { cn } from '@/components/utilities';
import { LearnRoutes } from '@/constants/routes';
import { useCollections, useCollectionChapters } from '@/hooks/data';

export const CollectionsClassPage = () => {
  const { classroomId } = useParams<{
    classroomId: string;
  }>();

  const {
    data: collections = [],
    isLoading: isCollectionsLoading,
    error: isCollectionsError,
  } = useCollections({ includeEmpty: true });



  const isLoading = isCollectionsLoading ;
  const isError = isCollectionsError;

  const [expandedCollection, setExpandedCollection] = useState<string | null>(null);

  const back = useMemo(
    () => ({
      label: 'Back to classroom',
      to: LearnRoutes.root(),
    }),
    [classroomId],
  );

  return (
    <ClassroomLayout
      back={back}
      classroomId={classroomId}
      isEmpty={false}
      isLoading={isLoading}
      isNotFound={!!isError}
    >
      <h1 className="mb-1 text-4xl font-medium">Collections</h1>
      <div className="flex flex-col gap-4">
        {collections?.map((collect) => (
          <div
            key={collect.id}
            className="relative block w-full overflow-hidden rounded-xl bg-zinc-900 p-8 text-left"
          >
            <div
              className="absolute inset-y-0 left-0 w-1"
              style={{ backgroundColor: collect.color ?? undefined }}
            />

            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-medium">{collect.name}</h2>
                <p className="flex-1 text-sm text-muted-foreground">
                  {collect.description}
                </p>
              </div>
              <button
                onClick={() =>{
                  setExpandedCollection(
                    expandedCollection === collect.id ? null : collect.id,
                  );
                  }
                }
              >
                <ChevronDown
                  className={cn(
                    'size-8 transition-transform duration-100',
                    expandedCollection === collect.id ? 'rotate-180' : undefined,
                  )}
                />
              </button>
            </div>
            {expandedCollection === collect.id && (
              <CollectChapters
                collectionId={collect.id}
                collectionName={collect.name}
              />
            )}
          </div>
        ))}
      </div>
    </ClassroomLayout>
  );
};

interface CollectChaptersProps {
  collectionId: string;
  collectionName: string;
}

const CollectChapters = ({
  collectionId,
  collectionName,
}: CollectChaptersProps) => {
  const { data: chapters, isLoading } = useCollectionChapters(collectionId);

  if (isLoading || !chapters) {
    return <div className="pt-6">Loading pages...</div>;
  }

  return (
    <div className="flex flex-col pt-6">
      {chapters.map((chapter) => (
        <div>
          <div className="flex-1">{chapter.name || 'Untitled page'}</div>
          <div className="flex items-center gap-2 opacity-60 transition-opacity duration-100 group-hover/lesson:opacity-100">
            <Link
              key={chapter.id}
              className="group/lesson flex items-center gap-2 py-2"
              to={LearnRoutes.flow({
                flowType:'theory',
                nameOf: collectionName+'-'+chapter.id,
              })}
            >
              <div className="flex-1">{chapter.name || 'Untitled page'}</div>
              <div className="flex items-center gap-2 opacity-60 transition-opacity duration-100 group-hover/lesson:opacity-100">
                Open <ChevronRight className="size-4" />
              </div>
            </Link>
          </div>
        </div>
        
          
        
      ))}
    </div>
  );
};

