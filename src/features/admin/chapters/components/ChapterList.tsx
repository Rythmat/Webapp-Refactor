import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
import { Button } from '@/components/ui/button';
import { DeleteIcon } from '@/components/ui/icons/delete-icon';
import { EditIcon } from '@/components/ui/icons/edit-icon';
import { AdminRoutes } from '@/constants/routes';
import { useDeleteChapter, type Chapter } from '@/hooks/data';

interface ChapterListProps {
  chapters: Chapter[];
  isLoading: boolean;
}

export const ChapterList = ({ chapters, isLoading }: ChapterListProps) => {
  const navigate = useNavigate();
  const deleteChapter = useDeleteChapter();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [chapterToDelete, setChapterToDelete] = useState<string | null>(null);

  const handleEditChapter = (chapterId: string) => {
    navigate(AdminRoutes.chapter({ id: chapterId }));
  };

  const handleDeleteClick = (chapterId: string) => {
    setChapterToDelete(chapterId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (chapterToDelete) {
      try {
        await deleteChapter.mutateAsync(chapterToDelete);
        setDeleteDialogOpen(false);
        setChapterToDelete(null);
      } catch (error) {
        console.error('Failed to delete chapter:', error);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-lg text-muted-foreground">Loading chapters...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-4">
        {chapters.map((chapter) => (
          <div
            key={chapter.id}
            className="flex items-center justify-between rounded-lg bg-shade-4/40 py-8 px-6 shadow-sm"
          >
            <div className="mr-2 flex flex-col">
              <span className="font-medium">{chapter.name}</span>
              {chapter.description && (
                <span className="text-sm text-white/70">
                  {chapter.description + chapter.order}
                </span>
              )}
            </div>
            <div className="flex items-center space-x-2">
              <div
                className="size-6 rounded-full border"
                style={{
                  backgroundColor: chapter.color || '#e5e7eb',
                  borderColor: chapter.color ? 'transparent' : '#d1d5db',
                }}
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleEditChapter(chapter.id)}
              >
                <EditIcon className="size-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleDeleteClick(chapter.id)}
              >
                <DeleteIcon className="size-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              chapter and all of its content.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={confirmDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
