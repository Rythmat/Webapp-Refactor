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
import { useRemoveTeacher } from '@/hooks/data';

interface RemoveTeacherDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  teacherId?: string;
  teacherName?: string;
}

export const RemoveTeacherDialog = ({
  isOpen,
  onOpenChange,
  teacherId,
  teacherName,
}: RemoveTeacherDialogProps) => {
  const removeTeacher = useRemoveTeacher();

  const handleRemoveTeacher = async () => {
    if (!teacherId) return;

    try {
      await removeTeacher.mutateAsync(teacherId);
      toast.success(`${teacherName || 'Teacher'} removed successfully`);
      onOpenChange(false);
    } catch (error) {
      toast.error('Failed to remove teacher');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Remove Teacher</DialogTitle>
          <DialogDescription>
            Are you sure you want to remove {teacherName}? They will no longer
            be able to access the system, but their data will be preserved.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={removeTeacher.isPending}
            variant="destructive"
            onClick={handleRemoveTeacher}
          >
            {removeTeacher.isPending ? 'Removing...' : 'Remove Teacher'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
