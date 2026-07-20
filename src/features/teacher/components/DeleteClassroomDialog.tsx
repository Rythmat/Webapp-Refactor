import { AlertTriangle } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useDeleteClassroom } from '@/hooks/data';

interface DeleteClassroomDialogProps {
  classroom: {
    id: string;
    name: string;
  } | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}

export const DeleteClassroomDialog = ({
  classroom,
  isOpen,
  onOpenChange,
  onDeleted,
}: DeleteClassroomDialogProps) => {
  const deleteClassroom = useDeleteClassroom();
  const [confirmText, setConfirmText] = useState('');

  const targetName = classroom?.name ?? '';
  const canDelete =
    Boolean(classroom) && confirmText.trim() === targetName.trim();

  const handleOpenChange = (open: boolean) => {
    if (!open) setConfirmText('');
    onOpenChange(open);
  };

  const handleDelete = async () => {
    if (!classroom) return;
    try {
      await deleteClassroom.mutateAsync(classroom.id);
      toast.success(`Deleted "${targetName}"`);
      setConfirmText('');
      onOpenChange(false);
      onDeleted?.();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : 'Failed to delete classroom',
      );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="border-red-500/20 bg-[#141416] text-white sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <AlertTriangle className="h-5 w-5 text-red-400" />
            Delete Classroom
          </DialogTitle>
          <DialogDescription className="text-white/60">
            This permanently deletes{' '}
            <span className="font-medium text-white">{targetName}</span> along
            with its students, published Days, assignments, and sessions. This
            cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2 py-2">
          <label htmlFor="confirm-name" className="text-sm text-white/85">
            Type the classroom name{' '}
            <span className="font-medium text-white">{targetName}</span> to
            confirm.
          </label>
          <Input
            id="confirm-name"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            className="border-white/10 bg-white/[0.02] text-white placeholder:text-white/40 focus-visible:border-white/25 focus-visible:ring-0"
            placeholder={targetName}
            autoComplete="off"
          />
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="rounded-full border-white/10 bg-transparent text-white/80 hover:bg-white/[0.04] hover:text-white"
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            disabled={!canDelete || deleteClassroom.isPending}
            onClick={handleDelete}
            className="rounded-full bg-red-500 text-white hover:bg-red-400 disabled:cursor-not-allowed disabled:bg-red-500/40"
          >
            {deleteClassroom.isPending ? 'Deleting…' : 'Delete Classroom'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
