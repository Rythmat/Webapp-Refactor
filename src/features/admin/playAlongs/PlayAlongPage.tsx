import { zodResolver } from '@hookform/resolvers/zod';
import { TrashIcon, CheckIcon, MusicIcon, FileIcon } from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useParams, useNavigate } from 'react-router-dom';
import { z } from 'zod';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ColorPicker } from '@/components/ui/color-picker';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { AdminRoutes } from '@/constants/routes';
import {
  usePlayAlong,
  useUpdatePlayAlong,
  useDeletePlayAlong,
  useDeletePlayAlongFile,
} from '@/hooks/data';
import { UploadPlayAlongFilesModal } from './components/AddTrackToPlayAlongModal';
import { PlayAlongPlayer } from './components/PlayAlongPlayer';

const playAlongSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
});

type FormValues = z.infer<typeof playAlongSchema>;

export const PlayAlongPage = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Alert dialog states
  const isInitialized = useRef(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [fileDeleteConfirmOpen, setFileDeleteConfirmOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState<{
    id: string;
    type: 'midi' | 'audio';
  } | null>(null);

  // Data hooks
  const playAlongQuery = usePlayAlong({ id: id || '' });
  const updatePlayAlong = useUpdatePlayAlong({ id: id || '' });
  const deletePlayAlong = useDeletePlayAlong();
  const deletePlayAlongFile = useDeletePlayAlongFile({ playAlongId: id || '' });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
    watch,
  } = useForm<FormValues>({
    resolver: zodResolver(playAlongSchema),
    defaultValues: {
      name: '',
      description: null,
      color: null,
    },
  });

  // Set form values when data is loaded
  useEffect(() => {
    if (playAlongQuery.data && !isInitialized.current) {
      isInitialized.current = true;
      reset({
        name: playAlongQuery.data.name,
        description: playAlongQuery.data.description || null,
        color: playAlongQuery.data.color || null,
      });
    }
  }, [playAlongQuery.data, reset]);

  const color = watch('color');

  const onSubmit = useCallback(
    async (data: FormValues) => {
      try {
        await updatePlayAlong.mutateAsync({
          name: data.name,
          description: data.description,
          color: data.color,
        });
        // Refetch data
        playAlongQuery.refetch();
      } catch (error) {
        console.error('Error updating play along:', error);
      }
    },
    [updatePlayAlong, playAlongQuery],
  );

  const confirmDelete = useCallback(() => {
    setDeleteConfirmOpen(true);
  }, []);

  const handleDelete = useCallback(async () => {
    try {
      await deletePlayAlong.mutateAsync(id || '');
      navigate(AdminRoutes.playAlongs());
    } catch (error) {
      console.error('Error deleting play along:', error);
    } finally {
      setDeleteConfirmOpen(false);
    }
  }, [deletePlayAlong, id, navigate, setDeleteConfirmOpen]);

  const confirmDeleteFile = useCallback(
    (fileId: string, type: 'midi' | 'audio') => {
      setFileToDelete({ id: fileId, type });
      setFileDeleteConfirmOpen(true);
    },
    [],
  );

  const handleDeleteFile = useCallback(async () => {
    if (!fileToDelete) return;

    try {
      await deletePlayAlongFile.mutateAsync({
        type: fileToDelete.type,
      });
      // Refetch data is handled by the hook's onSuccess callback
    } catch (error) {
      console.error('Error deleting track:', error);
    } finally {
      setFileDeleteConfirmOpen(false);
      setFileToDelete(null);
    }
  }, [
    deletePlayAlongFile,
    fileToDelete,
    setFileDeleteConfirmOpen,
    setFileToDelete,
  ]);

  const handleUploadModalOpen = useCallback(() => {
    setIsUploadModalOpen(true);
  }, []);

  const handleUploadSuccess = useCallback(() => {
    setIsUploadModalOpen(false);
    playAlongQuery.refetch();
  }, [playAlongQuery]);

  // Extract MIDI and audio file data from the response
  const midiFile = playAlongQuery.data?.midiFilePath
    ? {
        id: playAlongQuery.data.id || '',
        name: 'MIDI Track',
        filePath: playAlongQuery.data.midiFilePath,
      }
    : null;

  const audioFile = playAlongQuery.data?.audioFilePath
    ? {
        id: playAlongQuery.data.id || '',
        name: 'Audio Track',
        filePath: playAlongQuery.data.audioFilePath,
      }
    : null;

  const hasFiles = !!midiFile || !!audioFile;

  if (playAlongQuery.isLoading) {
    return <div className="flex justify-center p-8">Loading play along...</div>;
  }

  if (playAlongQuery.isError) {
    return (
      <div className="flex justify-center p-8 text-red-500">
        Error loading play along
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Edit Play Along</h1>
        <div className="flex gap-2">
          <Button variant="destructive" onClick={confirmDelete}>
            <TrashIcon className="mr-2 size-4" />
            Delete
          </Button>
        </div>
      </div>

      {hasFiles && (
        <div className="mb-8">
          <PlayAlongPlayer color={playAlongQuery.data?.color} id={id || ''} />
        </div>
      )}

      <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
        <Card>
          <CardHeader>
            <CardTitle>Play Along Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <ColorPicker
                value={color || null}
                onChange={(color) => setValue('color', color)}
              />
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium" htmlFor="name">
                Name
              </label>
              <Input
                id="name"
                {...register('name')}
                placeholder="Enter play along name"
              />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label
                className="block text-sm font-medium"
                htmlFor="description"
              >
                Description
              </label>
              <Textarea
                id="description"
                {...register('description')}
                placeholder="Enter description (optional)"
                rows={3}
              />
            </div>

            <div className="pt-2">
              <Button disabled={isSubmitting} type="submit">
                <CheckIcon className="mr-2 size-4" />
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Play Along Files</CardTitle>
          <Button size="sm" onClick={handleUploadModalOpen}>
            Upload Files
          </Button>
        </CardHeader>
        <CardContent>
          {!hasFiles ? (
            <p className="text-muted-foreground">No files uploaded yet</p>
          ) : (
            <div className="space-y-4">
              {midiFile && (
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div className="flex items-center gap-3">
                    <MusicIcon className="size-5 text-blue-500" />
                    <div>
                      <p className="font-medium">MIDI Track</p>
                      <p className="text-xs text-muted-foreground">
                        MIDI file for playback
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => confirmDeleteFile(midiFile.id, 'midi')}
                  >
                    <TrashIcon className="size-4" />
                  </Button>
                </div>
              )}

              {audioFile && (
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div className="flex items-center gap-3">
                    <FileIcon className="size-5 text-green-500" />
                    <div>
                      <p className="font-medium">Audio Track</p>
                      <p className="text-xs text-muted-foreground">
                        Audio file for playback
                      </p>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => confirmDeleteFile(audioFile.id, 'audio')}
                  >
                    <TrashIcon className="size-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isUploadModalOpen} onOpenChange={setIsUploadModalOpen}>
        <DialogContent>
          <UploadPlayAlongFilesModal
            id={id || ''}
            onSuccess={handleUploadSuccess}
          />
        </DialogContent>
      </Dialog>

      {/* Delete play along confirmation dialog */}
      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Play Along</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this play along and all its files.
              This action cannot be undone.
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

      {/* Delete file confirmation dialog */}
      <AlertDialog
        open={fileDeleteConfirmOpen}
        onOpenChange={setFileDeleteConfirmOpen}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete File</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this file from the play along. This
              action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground"
              onClick={handleDeleteFile}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
