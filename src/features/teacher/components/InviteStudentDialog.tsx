import { Copy } from 'lucide-react';
import QRCode from 'react-qr-code';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { AuthRoutes } from '@/constants/routes';

interface InviteStudentDialogProps {
  classroomId: string;
  classroomCode: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export const InviteStudentDialog = ({
  classroomCode,
  isOpen,
  onOpenChange,
}: InviteStudentDialogProps) => {
  const handleCopyCode = () => {
    navigator.clipboard.writeText(classroomCode);
    toast.success('Classroom code copied to clipboard');
  };

  const url = new URL(window.location.href);
  url.pathname = AuthRoutes.signUpAsStudent();
  url.searchParams.set('code', classroomCode);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(url.toString());
    toast.success('Join link copied to clipboard');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Invite Students</DialogTitle>
          <DialogDescription>
            Share this classroom code or link with your students
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div>
            <h3 className="mb-2 text-sm font-medium">Classroom Code</h3>
            <div className="flex items-center space-x-2">
              <div className="flex-1 rounded-md border bg-muted p-3 text-center font-mono text-lg">
                {classroomCode}
              </div>
              <Button size="icon" variant="outline" onClick={handleCopyCode}>
                <Copy className="size-4" />
              </Button>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Students can enter this code when signing up
            </p>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium">Join Link</h3>
            <div className="flex items-center space-x-2">
              <Input
                readOnly
                className="font-mono text-xs"
                value={url.toString()}
              />
              <Button size="icon" variant="outline" onClick={handleCopyLink}>
                <Copy className="size-4" />
              </Button>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Share this link directly with students
            </p>
          </div>

          <div>
            <h3 className="mb-2 text-sm font-medium">QR Code</h3>
            <div className="flex justify-center rounded-md bg-white p-4">
              <QRCode size={180} value={url.toString()} />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Students can scan this QR code to join directly
            </p>
          </div>

          <div className="rounded-md bg-muted p-4">
            <h3 className="mb-2 text-sm font-medium">
              Instructions for Students
            </h3>
            <ol className="list-decimal pl-5 text-sm">
              <li>Go to Music Atlas website</li>
              <li>Click &quot;Sign Up&quot; and select &quot;Student&quot;</li>
              <li>Enter the classroom code when prompted</li>
              <li>Complete the registration form to join your class</li>
            </ol>
          </div>
        </div>

        <div className="flex justify-end">
          <DialogClose asChild>
            <Button>Done</Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
};
