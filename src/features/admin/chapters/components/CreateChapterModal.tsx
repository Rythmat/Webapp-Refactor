import { Plus } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AdminRoutes } from '@/constants/routes';
import { useCreateChapter } from '@/hooks/data';

interface CreateChapterModalProps {
  children: React.ReactNode;
}

export const CreateChapterModal = ({ children }: CreateChapterModalProps) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const createChapter = useCreateChapter();

  const handleCreateChapter = async () => {
    if (!name.trim()) return;

    try {
      const newChapter = await createChapter.mutateAsync({
        name,
        // content: `# ${name}\n\nStart writing your chapter here...\n\n## Example Note Sequence\n\nYou can embed note sequences using the following syntax:\n\n*component:sequence(sequenceId, piano)*\n\nOr with a view mode parameter:\n\n*component:sequence(sequenceId, piano, preview)*\n\nAvailable view modes:\n- preview: Shows all notes highlighted initially\n- play_along: Keeps all keys blank by default (default if not specified)\n`,
      });

      setOpen(false);
      setName('');
      navigate(AdminRoutes.chapter({ id: newChapter.id }));
    } catch (error) {
      console.error('Failed to create chapter:', error);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create New Chapter</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="chapter-name">Chapter Name</Label>
            <Input
              id="chapter-name"
              placeholder="Enter chapter name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <Button
            className="w-full"
            disabled={!name.trim() || createChapter.isPending}
            onClick={handleCreateChapter}
          >
            <Plus className="mr-2 size-4" />
            Create Chapter
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
