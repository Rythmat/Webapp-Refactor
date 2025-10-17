// import { Pencil, Trash2, MoreVertical, Eye } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { DeleteIcon } from '@/components/ui/icons/delete-icon';
import { EditIcon } from '@/components/ui/icons/edit-icon';
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
import {
  Card,
  CardContent,
  // CardDescription,
  CardHeader,
  // CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { ColorPicker } from '@/components/ui/color-picker';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuTrigger,
// } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { AdminRoutes } from '@/constants/routes';
import {
  useCreateCollection,
  useDeleteCollection,
  useCollections,
} from '@/hooks/data';
import { NoCollections } from './NoCollections';

// Add a proper interface for collection shape

export const CollectionsPage = () => {
  const navigate = useNavigate();
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [collectionToDelete, setCollectionToDelete] = useState<string | null>(
    null,
  );
  const [newCollectionName, setNewCollectionName] = useState('');
  const [newCollectionDescription, setNewCollectionDescription] = useState('');
  const [newCollectionColor, setNewCollectionColor] = useState<string | null>(
    null,
  );

  // Fetch collections with infinite query
  const {
    data: collections = [],
    isLoading,
    error,
    refetch,
  } = useCollections({ includeEmpty: true });

  const createCollection = useCreateCollection();
  const deleteCollection = useDeleteCollection();

  useEffect(() => {
    if (error) {
      toast.error('Error loading collections');
    }
  }, [error]);

  const handleCreateCollection = async () => {
    if (!newCollectionName.trim()) {
      toast.error('Collection name is required');
      return;
    }

    try {
      await createCollection.mutateAsync({
        name: newCollectionName,
        description: newCollectionDescription || undefined,
        color: newCollectionColor || undefined,
      });

      toast.success('Collection created successfully');
      setCreateDialogOpen(false);

      // Reset form
      setNewCollectionName('');
      setNewCollectionDescription('');
      setNewCollectionColor(null);

      // Refresh the list
      refetch();
    } catch (error) {
      toast.error('Failed to create collection');
    }
  };

  const handleDeleteCollection = async () => {
    if (!collectionToDelete) return;

    try {
      await deleteCollection.mutateAsync(collectionToDelete);
      toast.success('Collection deleted successfully');
      setDeleteDialogOpen(false);
      setCollectionToDelete(null);
      refetch();
    } catch (error) {
      toast.error('Failed to delete collection');
    }
  };

  const confirmDelete = (id: string) => {
    setCollectionToDelete(id);
    setDeleteDialogOpen(true);
  };

  const navigateToCollection = (id: string) => {
    navigate(AdminRoutes.collection({ id }));
  };

  const renderCollectionCards = () => {
    if (isLoading) {
      return Array(4)
        .fill(0)
        .map((_, index) => (
          <Card key={index} className="overflow-hidden">
            <CardHeader className="pb-4">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-4 w-full" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-20 w-full" />
            </CardContent>
            <CardFooter className="flex justify-between">
              <Skeleton className="h-9 w-20" />
              <Skeleton className="h-9 w-20" />
            </CardFooter>
          </Card>
        ));
    }

    if (collections.length === 0) {
      return (
        <div className="col-span-full flex flex-col items-center justify-center py-8">
          <NoCollections openInviteDialog={() => setCreateDialogOpen(true)} />
        </div>
      );
    }

    return collections.map((collection) => (
              <div
                key={collection.id}
                className="flex items-center justify-between rounded-lg bg-shade-4/40 py-8 px-6 shadow-sm"
                style={{
                  borderLeftColor: collection.color || undefined,
                  borderLeftWidth: collection.color ? '4px' : undefined,
                }}
              >
                <div className="mr-2 flex flex-col">
                  <span className="font-medium">{collection.name}</span>
                  {collection.description && (
                    <span className="text-sm text-white/70">
                      {collection.description}
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigateToCollection(collection.id)}
                  >
                    <EditIcon className="size-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e) => {
                      e.stopPropagation();
                      confirmDelete(collection.id);
                    }}
                  >
                    <DeleteIcon className="size-4" />
                  </Button>
                </div>
              </div>
            ));
  };

  return (
    <div className="space-y-4">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Books</h1>
          <p className="text-muted-foreground">
            Manage learning collections for your users
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          Create Collection
        </Button>
      </div>

            <div className="space-y-4">
              {renderCollectionCards()}
            </div>
      

      {/* Create Collection Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Create Collection</DialogTitle>
            <DialogDescription>
              Add a new collection to organize learning content.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3">
              <ColorPicker
                value={newCollectionColor}
                onChange={(color) => setNewCollectionColor(color || null)}
              />
              <div className="flex-1 space-y-1">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  placeholder="Collection Name"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="description">Description (Optional)</Label>
              <Textarea
                className="resize-none"
                id="description"
                placeholder="Brief description of this collection"
                value={newCollectionDescription}
                onChange={(e) => setNewCollectionDescription(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Cancel</Button>
            </DialogClose>
            <Button
              disabled={!newCollectionName.trim() || createCollection.isPending}
              onClick={handleCreateCollection}
            >
              {createCollection.isPending ? 'Creating...' : 'Create Collection'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this collection and remove all
              chapter associations. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteCollection.isPending}
              onClick={handleDeleteCollection}
            >
              {deleteCollection.isPending ? 'Deleting...' : 'Delete Collection'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
