import { useMemo, useState, useCallback } from 'react';
import { useDrop } from 'react-dnd';
import { useNavigate } from 'react-router-dom';
import { useUpdateEffect } from 'react-use';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { AdminRoutes } from '@/constants/routes';
import {
  useUpdateCollection,
  useCollectionChapters,
  type CollectionChapter,
} from '@/hooks/data';
import { ChapterItemWrapper } from './ChapterItemWrapper';

interface CollectionChaptersListProps {
  collectionId: string;
}

export const CollectionChaptersList = ({
  collectionId,
}: CollectionChaptersListProps) => {
  const navigate = useNavigate();

  const {
    data: collectionChapters = [],
    isLoading,
    dataUpdatedAt,
  } = useCollectionChapters(collectionId);

  const updateCollection = useUpdateCollection();

  const [localChapters, setLocalChapters] = useState<CollectionChapter[]>([]);
  const [chapterToRemove, setChapterToRemove] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Update local state when data changes
  useUpdateEffect(() => {
    if (collectionChapters.length) {
      setLocalChapters(
        [...collectionChapters].sort((a, b) => (a.order || 0) - (b.order || 0)),
      );
    }
  }, [dataUpdatedAt]);

  // Using local state for rendering
  const sortedChapters = useMemo(() => {
    if (!localChapters.length && collectionChapters.length) {
      return [...collectionChapters].sort(
        (a, b) => (a.order || 0) - (b.order || 0),
      );
    }
    return localChapters;
  }, [localChapters, collectionChapters]);

  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: 'chapter',
    drop: () => ({ collectionId }),
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }));

  // This function only updates the local state during dragging
  const handleMoveChapter = useCallback(
    (dragIndex: number, hoverIndex: number) => {
      if (!sortedChapters.length) return;

      const newOrder = [...sortedChapters];
      const draggedItem = newOrder[dragIndex];

      // Remove the dragged item
      newOrder.splice(dragIndex, 1);
      // Insert it at the new position
      newOrder.splice(hoverIndex, 0, draggedItem);

      // Update local state immediately for UI feedback
      setLocalChapters(newOrder);
    },
    [sortedChapters],
  );

  // This function calls the API to update the order when dropping
  const handleChapterDrop = useCallback(() => {
    if (!sortedChapters.length) return;

    // Update the order property
    const updatedChapters = sortedChapters.map((chapter, index) => ({
      id: chapter.id,
      order: index,
    }));

    // Call API to update order
    updateCollection.mutate(
      {
        id: collectionId,
        chapters: updatedChapters.map((chapter) => ({
          chapterId: chapter.id,
          order: chapter.order,
        })),
      },
      {
        onError: (error) => {
          console.error('Failed to update chapter order:', error);
          toast.error('Failed to update chapter order. Please try again.');

          // Revert local state on error
          setLocalChapters(
            [...collectionChapters].sort(
              (a, b) => (a.order || 0) - (b.order || 0),
            ),
          );
        },
        onSuccess: () => {
          // No need for a toast on each successful drop
        },
      },
    );
  }, [collectionId, sortedChapters, updateCollection, collectionChapters]);

  const handleRemoveChapter = async () => {
    if (!chapterToRemove) return;

    // Update local state immediately
    setLocalChapters((prev) =>
      prev
        .filter((chapter) => chapter.id !== chapterToRemove.id)
        .map((chapter, index) => ({ ...chapter, order: index })),
    );

    try {
      await updateCollection.mutateAsync({
        id: collectionId,
        chapters: collectionChapters
          .filter((chapter) => chapter.id !== chapterToRemove.id)
          .map((chapter, index) => ({
            chapterId: chapter.id,
            order: index,
          })),
      });
      toast.success(
        `&ldquo;${chapterToRemove.name}&rdquo; removed from collection`,
      );
      setChapterToRemove(null);
    } catch (error) {
      toast.error('Failed to remove chapter from collection');

      // Revert local state on error
      setLocalChapters(
        [...collectionChapters].sort((a, b) => (a.order || 0) - (b.order || 0)),
      );
    }
  };

  const handleEditChapter = (chapterId: string) => {
    navigate(AdminRoutes.chapter({ id: chapterId }));
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={index}>
            <CardHeader className="p-4">
              <div className="flex items-center">
                <Skeleton className="mr-4 size-6" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  if (!sortedChapters.length) {
    return (
      <Card
        ref={drop}
        className="border-dashed transition-all hover:border-primary/50"
      >
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <p className="mb-4 text-muted-foreground">
            No chapters in this collection yet.
          </p>
          <p className="mb-4 text-sm text-muted-foreground">
            Add chapters to build your learning material.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div
      ref={drop}
      className={`space-y-4 rounded-lg p-4 transition-all ${
        isOver && canDrop
          ? 'bg-primary/5 ring-2 ring-primary ring-offset-2'
          : ''
      }`}
    >
      {sortedChapters.map((collectionChapter, index) => (
        <ChapterItemWrapper
          key={collectionChapter.id}
          chapterId={collectionChapter.id}
          index={index}
          moveChapter={handleMoveChapter}
          onDrop={handleChapterDrop}
          onEdit={handleEditChapter}
          onRemove={(id, name) => setChapterToRemove({ id, name })}
        />
      ))}

      <AlertDialog
        open={!!chapterToRemove}
        onOpenChange={(open) => !open && setChapterToRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Chapter from Collection</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove &ldquo;{chapterToRemove?.name}
              &rdquo; from this collection? This won&apos;t delete the chapter -
              it will only remove it from this collection.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={handleRemoveChapter}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
