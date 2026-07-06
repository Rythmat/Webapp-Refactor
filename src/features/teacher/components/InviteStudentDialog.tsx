import { Copy } from 'lucide-react';
import QRCode from 'react-qr-code';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
      <DialogContent className="max-h-[90vh] overflow-y-auto border-white/[0.06] bg-[#141416] text-white sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-white">Invite Students</DialogTitle>
          <DialogDescription className="text-white/60">
            Share this classroom code or link with your students
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6 py-4">
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium text-white/85">
              Classroom Code
            </h3>
            <div className="flex items-center gap-2">
              <div className="flex-1 rounded-xl border border-white/10 bg-white/[0.04] p-3 text-center font-mono text-lg tracking-widest text-white">
                {classroomCode}
              </div>
              <Button
                size="icon"
                variant="outline"
                className="rounded-full border-white/10 bg-transparent text-white/80 hover:bg-white/[0.04] hover:text-white"
                onClick={handleCopyCode}
                aria-label="Copy classroom code"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-white/50">
              Students can enter this code when signing up
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium text-white/85">Join Link</h3>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={url.toString()}
                className="border-white/10 bg-white/[0.02] font-mono text-xs text-white placeholder:text-white/40 focus-visible:border-white/25 focus-visible:ring-0"
              />
              <Button
                size="icon"
                variant="outline"
                className="rounded-full border-white/10 bg-transparent text-white/80 hover:bg-white/[0.04] hover:text-white"
                onClick={handleCopyLink}
                aria-label="Copy join link"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-white/50">
              Share this link directly with students
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium text-white/85">QR Code</h3>
            <div className="flex justify-center rounded-xl bg-white p-4">
              <QRCode size={180} value={url.toString()} />
            </div>
            <p className="text-xs text-white/50">
              Students can scan this QR code to join directly
            </p>
          </div>

          <div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
            <h3 className="mb-2 text-sm font-medium text-white/85">
              Instructions for Students
            </h3>
            <ol className="list-decimal pl-5 text-sm text-white/70">
              <li>Go to Music Atlas website</li>
              <li>Click &quot;Sign Up&quot; and select &quot;Student&quot;</li>
              <li>Enter the classroom code when prompted</li>
              <li>Complete the registration form to join your class</li>
            </ol>
          </div>
        </div>

        <div className="flex justify-end">
          <DialogClose asChild>
            <Button className="rounded-full bg-white text-black hover:bg-white/85">
              Done
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
};
