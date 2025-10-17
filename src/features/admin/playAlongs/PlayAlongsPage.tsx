import { TrashIcon, PencilIcon } from 'lucide-react';
import { useState, useCallback } from 'react';
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
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { PlayAlongIcon } from '@/components/ui/icons/play-along-icon';
import { AdminRoutes } from '@/constants/routes';
import { usePlayAlongs, useDeletePlayAlong } from '@/hooks/data';
import { CreatePlayAlongModal } from './components/CreatePlayAlongModal';

export const PlayAlongsPage = () => {
  const navigate = useNavigate();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [playAlongToDelete, setPlayAlongToDelete] = useState<string | null>(
    null,
  );

  // This is an infinite query, so we need to handle pagination
  const playAlongs = usePlayAlongs();
  const deletePlayAlong = useDeletePlayAlong();

  const confirmDelete = useCallback((id: string) => {
    setPlayAlongToDelete(id);
    setDeleteConfirmOpen(true);
  }, []);

  const handleDelete = useCallback(async () => {
    if (!playAlongToDelete) return;

    try {
      await deletePlayAlong.mutateAsync(playAlongToDelete);
      // Refresh the list
      await playAlongs.refetch();
    } catch (error) {
      console.error('Failed to delete play along:', error);
    } finally {
      setDeleteConfirmOpen(false);
      setPlayAlongToDelete(null);
    }
  }, [deletePlayAlong, playAlongToDelete, playAlongs]);

  const handleEdit = useCallback(
    (id: string) => {
      navigate(AdminRoutes.playAlong({ id }));
    },
    [navigate],
  );

  const playAloginsData = playAlongs.data?.pages || [];

  const renderPlayAlongs = () => {
    if (playAloginsData.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center">
          <div className="mb-2 rounded-full bg-black p-4">
            <PlayAlongIcon className="size-10 text-muted-foreground" />
          </div>
          <p className="text-3xl text-white">No play along yet</p>
          <p className="text-muted-foreground">
            Fire up the synths and add your first groove.
          </p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
        {playAloginsData?.map((page) =>
          page.data.map((playAlong) => (
            <Card
              key={playAlong.id}
              style={{
                borderLeftColor: playAlong.color || undefined,
                borderLeftWidth: playAlong.color ? '4px' : undefined,
              }}
            >
              <CardHeader>
                <CardTitle>{playAlong.name}</CardTitle>
                <CardDescription>
                  {playAlong.description || 'No description'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col gap-2">
                  <p>Created: {playAlong.createdAt.toLocaleDateString()}</p>
                  <p>
                    Last updated: {playAlong.updatedAt.toLocaleDateString()}
                  </p>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => confirmDelete(playAlong.id)}
                >
                  <TrashIcon className="size-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleEdit(playAlong.id)}
                >
                  <PencilIcon className="size-4" />
                </Button>
              </CardFooter>
            </Card>
          )),
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Play Along</h1>
        <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
          <DialogTrigger asChild>
            <Button>Create Play Along</Button>
          </DialogTrigger>
          <DialogContent>
            <CreatePlayAlongModal />
          </DialogContent>
        </Dialog>
      </div>

      {playAlongs.isLoading ? (
        <div className="flex justify-center">
          <p>Loading play along...</p>
        </div>
      ) : playAlongs.isError ? (
        <div className="flex justify-center">
          <p className="text-red-500">Error loading play along</p>
        </div>
      ) : (
        renderPlayAlongs()
      )}

      {playAlongs.hasNextPage && (
        <div className="mt-6 flex justify-center">
          <Button
            disabled={playAlongs.isFetchingNextPage}
            onClick={() => playAlongs.fetchNextPage()}
          >
            {playAlongs.isFetchingNextPage ? 'Loading more...' : 'Load more'}
          </Button>
        </div>
      )}

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the play along. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={handleDelete}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
