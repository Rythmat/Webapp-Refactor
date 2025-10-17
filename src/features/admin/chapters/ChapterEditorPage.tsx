import { ArrowLeft, TrashIcon } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useParams, useNavigate } from 'react-router-dom';
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
import { Button } from '@/components/ui/button';
import { ColorPicker } from '@/components/ui/color-picker';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog';
import { EditIcon } from '@/components/ui/icons/edit-icon';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { AdminRoutes } from '@/constants/routes';
import { useUpdateChapter, useChapter, useDeletePage } from '@/hooks/data';
import { useDebounce } from '@/hooks/useDebounce';
import { AddPageDialog } from './components/AddPageDialog';
import { PageEditor } from './components/PageEditor';
import { PagesList } from './components/PagesList';

const TOAST_ID = 'chapter-save';

export const ChapterEditorPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const updateChapter = useUpdateChapter();
  const deletePage = useDeletePage();

  const { data: chapter, isLoading, error } = useChapter(id);

  const [name, setNameInternal] = useState('');
  const [description, setDescriptionInternal] = useState('');
  const [color, setColorInternal] = useState<string | undefined>(undefined);
  const [isAddPageDialogOpen, setIsAddPageDialogOpen] = useState(false);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [hasChanges, setHasChanges] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [pageToDelete, setPageToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  // Initialize form values with chapter data when loaded
  useEffect(() => {
    if (chapter?.id) {
      setNameInternal(chapter.name || '');
      setDescriptionInternal(chapter.description || '');
      setColorInternal(chapter.color || undefined);
    }
  }, [chapter]);

  const saveChapter = useCallback(
    async (data: { name: string; description?: string; color?: string }) => {
      if (!id) return;
      setHasChanges(true);
      try {
        await updateChapter.mutateAsync({
          id,
          ...data,
        });
        setHasChanges(false);
        toast.success('Chapter saved', { id: TOAST_ID });
      } catch (error) {
        toast.error('Failed to save chapter', { id: TOAST_ID });
      }
    },
    [id, updateChapter],
  );

  const debouncedSave = useDebounce(saveChapter, 3000);

  const triggerSave = useCallback(
    (payload: { name: string; description: string; color?: string }) => {
      if (!chapter) return;

      debouncedSave(payload);
    },
    [chapter, debouncedSave],
  );

  const setName = useCallback(
    (value: string) => {
      setNameInternal(value);
      triggerSave({ name: value, description, color });
    },
    [triggerSave, color, description],
  );

  const setDescription = useCallback(
    (value: string) => {
      setDescriptionInternal(value);
      triggerSave({ name, description: value, color });
    },
    [triggerSave, color, name],
  );

  const setColor = useCallback(
    (value: string | undefined) => {
      setColorInternal(value);
      triggerSave({ name, description, color: value });
    },
    [triggerSave, name, description],
  );

  const handleBack = () => {
    navigate(AdminRoutes.chapters());
  };

  const handleEditPage = (pageId: string) => {
    setSelectedPageId(pageId);
    setIsEditorOpen(true);
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
  };

  const handleDescriptionChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    setDescription(e.target.value);
  };

  const handleColorChange = (newColor: string | null) => {
    setColor(newColor || undefined);
  };

  const handleDeletePage = async () => {
    if (!pageToDelete) return;

    try {
      await deletePage.mutateAsync(pageToDelete.id);
      toast.success(`Page deleted successfully`);
      setPageToDelete(null);

      // If we deleted the selected page, reset selection
      if (selectedPageId === pageToDelete.id) {
        setIsEditorOpen(false);
        setSelectedPageId(null);
      }
    } catch (error) {
      toast.error('Failed to delete page');
    }
  };

  if (isLoading) {
    return (
      <div className="container py-8">
        <div className="mb-8 flex items-center gap-4">
          <Button disabled size="icon" variant="outline">
            <ArrowLeft className="size-4" />
          </Button>
          <Skeleton className="h-10 w-[300px]" />
        </div>
        <div className="grid grid-cols-1 gap-8">
          <div className="space-y-4">
            <Skeleton className="h-10 w-[200px]" />
            <Skeleton className="h-24 w-full" />
          </div>
          <Separator />
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Skeleton className="h-8 w-[100px]" />
              <Skeleton className="h-8 w-[100px]" />
            </div>
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-16 w-full" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container py-8">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <h2 className="mb-4 text-2xl font-bold">Failed to load chapter</h2>
          <p className="mb-6 text-muted-foreground">
            There was an error loading the chapter. Please try again.
          </p>
          <Button onClick={handleBack}>Go Back</Button>
        </div>
      </div>
    );
  }

  const selectedPage = chapter?.pages.find(
    (page) => page.id === selectedPageId,
  );

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="container py-8">
        <div className="mb-8 flex items-center justify-between gap-4">
          <Button
            className="shrink-0"
            size="icon"
            variant="outline"
            onClick={handleBack}
          >
            <ArrowLeft className="size-4" />
          </Button>
          <ColorPicker value={color || null} onChange={handleColorChange} />
          <div className="relative top-3 flex-1 space-y-1">
            <Input
              className="text-2xl font-bold"
              placeholder="Chapter Name"
              value={name}
              onChange={handleNameChange}
            />
            <div className="ml-auto flex items-center gap-2">
              {updateChapter.isPending ? (
                <div className="text-sm text-muted-foreground">
                  Saving changes...
                </div>
              ) : hasChanges ? (
                <div className="text-sm text-muted-foreground">
                  Unsaved changes...
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Saved</div>
              )}
            </div>
          </div>
          <Button onClick={() => setIsAddPageDialogOpen(true)}>Add Page</Button>
        </div>

        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-4">
            <div>
              <Label>Description</Label>
              <Textarea
                className="min-h-[60px]"
                disabled={updateChapter.isPending}
                placeholder="Chapter Description"
                value={description}
                onChange={handleDescriptionChange}
              />
            </div>
          </div>

          <Separator />

          <div className="space-y-4">
            <div className="w-full">
              <PagesList
                chapterId={id!}
                color={color}
                renderActions={(page) => (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditPage(page.id);
                      }}
                    >
                      <EditIcon className="size-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        setPageToDelete({
                          id: page.id,
                          name: `Page ${page.order + 1}`,
                        });
                      }}
                    >
                      <TrashIcon className="size-4 text-muted-foreground" />
                    </Button>
                  </>
                )}
                selectedPageId={null}
                onSelectPage={() => {}}
              />
            </div>
          </div>
        </div>

        <AddPageDialog
          chapterId={id!}
          open={isAddPageDialogOpen}
          onOpenChange={setIsAddPageDialogOpen}
        />

        {/* Fullscreen editor modal */}
        <Dialog open={isEditorOpen} onOpenChange={setIsEditorOpen}>
          <DialogContent className="h-screen max-w-[100vw] !rounded-none p-0">
            <DialogClose className="absolute right-4 top-4 z-50 p-2 shadow-md" />
            {selectedPage && (
              <div className="h-full overflow-hidden">
                <PageEditor
                  key={selectedPage.id}
                  chapterColor={color || null}
                  className="h-full"
                  page={{
                    ...selectedPage,
                    chapterId: id!,
                  }}
                />
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Delete confirmation dialog */}
        <AlertDialog
          open={!!pageToDelete}
          onOpenChange={(open) => !open && setPageToDelete(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Page</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this page? This action cannot be
                undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive hover:bg-destructive/90"
                onClick={handleDeletePage}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </DndProvider>
  );
};
