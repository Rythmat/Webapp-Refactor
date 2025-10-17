import { ArrowLeft } from 'lucide-react';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ColorPicker } from '@/components/ui/color-picker';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { AdminRoutes } from '@/constants/routes';
import {
  useUpdateCollection,
  useCollection,
  useCollectionChapters,
} from '@/hooks/data';
import { useDebounce } from '@/hooks/useDebounce';
import { quickHash } from '@/util/quickHash';
import { AddChapterDialog } from './components/AddChapterDialog';
import { CollectionChaptersList } from './components/CollectionChaptersList';

const TOAST_ID = 'collection-save';

export const CollectionEditorPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const updateCollection = useUpdateCollection();

  const { data: collection, isLoading, error } = useCollection(id);
  const { refetch: refetchChapters, data: collectionChapters } =
    useCollectionChapters(id || '');

  const lastCollectionChaptersHash = useMemo(() => {
    return quickHash(collectionChapters);
  }, [collectionChapters]);

  const [name, setNameInternal] = useState('');
  const [description, setDescriptionInternal] = useState('');
  const [color, setColorInternal] = useState<string | null>(null);
  const [addChapterDialogOpen, setAddChapterDialogOpen] = useState(false);

  const [hasChanges, setHasChanges] = useState(false);

  // Initialize form values with collection data when loaded
  useEffect(() => {
    if (collection?.id) {
      setNameInternal(collection.name);
      setDescriptionInternal(collection.description || '');
      setColorInternal(collection.color);
    }
  }, [collection]);

  const saveCollection = useCallback(
    async (data: { name: string; description?: string; color?: string }) => {
      if (!id) return;
      setHasChanges(true);
      try {
        await updateCollection.mutateAsync({
          id,
          ...data,
        });
        setHasChanges(false);
        toast.success('Collection saved', { id: TOAST_ID });
      } catch (error) {
        toast.error('Failed to save collection', { id: TOAST_ID });
      }
    },
    [id, updateCollection],
  );

  const debouncedSave = useDebounce(saveCollection, 1000);

  const triggerSave = useCallback(
    (payload: { name: string; description: string; color: string }) => {
      if (!collection) return;

      debouncedSave(payload);
    },
    [collection, debouncedSave],
  );

  const setName = useCallback(
    (value: string) => {
      setNameInternal(value);
      triggerSave({ name: value, description, color: color || '' });
    },
    [triggerSave, color, description],
  );

  const setDescription = useCallback(
    (value: string) => {
      setDescriptionInternal(value);
      triggerSave({ name, description: value, color: color || '' });
    },
    [triggerSave, color, name],
  );

  const setColor = useCallback(
    (value: string | null) => {
      setColorInternal(value);
      triggerSave({ name, description, color: value || '' });
    },
    [triggerSave, name, description],
  );

  const handleBack = () => {
    navigate(AdminRoutes.collections());
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
  };

  const handleDescriptionChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    setDescription(e.target.value);
  };

  if (isLoading) {
    return (
      <div className="container py-6">
        <div className="mb-6 flex items-center justify-between">
          <Skeleton className="h-8 w-[150px]" />
          <Skeleton className="h-10 w-[100px]" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    );
  }

  if (!id) {
    return (
      <div className="container py-6">
        <div className="flex flex-col items-center justify-center py-12">
          <h2 className="text-2xl font-bold">Invalid Collection</h2>
          <p className="text-muted-foreground">No collection ID provided</p>
          <Button className="mt-4" onClick={handleBack}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  if (error || !collection) {
    return (
      <div className="container py-6">
        <div className="flex flex-col items-center justify-center py-12">
          <h2 className="text-2xl font-bold">Error loading collection</h2>
          <p className="text-muted-foreground">
            {error instanceof Error
              ? error.message
              : 'Failed to load collection'}
          </p>
          <Button className="mt-4" onClick={handleBack}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="container py-8">
        <div className="mb-8 flex items-center gap-4">
          <Button size="icon" variant="outline" onClick={handleBack}>
            <ArrowLeft className="size-4" />
          </Button>
          <h1 className="text-3xl font-bold">Edit Collection</h1>
          <div className="ml-auto">
            {updateCollection.isPending ? (
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

        <div className="space-y-6">
          <div className="flex items-start gap-3">
            <ColorPicker value={color} onChange={setColor} />
            <div className="flex-1 space-y-2">
              <Input
                className="text-2xl font-bold"
                placeholder="Collection Name"
                value={name}
                onChange={handleNameChange}
              />
              <Textarea
                className="resize-none"
                placeholder="Add a description for this collection..."
                value={description}
                onChange={handleDescriptionChange}
              />
            </div>
          </div>

          <Separator />

          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Chapters</h2>
              <Button onClick={() => setAddChapterDialogOpen(true)}>
                Add Chapter
              </Button>
            </div>

            <CollectionChaptersList
              key={lastCollectionChaptersHash}
              collectionId={id}
            />
          </div>
        </div>

        <AddChapterDialog
          collectionId={id}
          open={addChapterDialogOpen}
          onAddChapter={() => refetchChapters()}
          onOpenChange={setAddChapterDialogOpen}
        />
      </div>
    </DndProvider>
  );
};
