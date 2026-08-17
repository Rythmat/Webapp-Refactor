/**
 * InviteTeacherDialog — invite another Teacher User to co-teach this classroom.
 *
 * Mirrors InviteStudentDialog's shell, but teachers are invited by email (each
 * invite mints its own `/join/teacher/:code` link, so the link + QR are
 * per-invitation rather than a persistent classroom code). Wired to the
 * classroom-scoped invitation hooks; the create/list network calls are backed
 * by a backend contract that is still being implemented, so the pending list
 * degrades to empty when the endpoint 404s.
 */
import { Copy, Loader2, Send, X } from 'lucide-react';
import { useState } from 'react';
import QRCodeImport from 'react-qr-code';
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
import {
  useCancelClassroomInvitation,
  useClassroomInvitations,
  useCreateClassroomInvitation,
} from '@/hooks/data';

// Vite's CJS interop hands back the module namespace instead of the default
// export for react-qr-code 2.x — unwrap defensively so both shapes render.
const QRCode = ((QRCodeImport as unknown as { default?: unknown }).default ??
  QRCodeImport) as React.ComponentType<{ size?: number; value: string }>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface InviteTeacherDialogProps {
  classroomId: string;
  classroomName?: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const joinLinkForCode = (code: string) => {
  const url = new URL(window.location.href);
  url.pathname = AuthRoutes.signUpAsTeacher({ code });
  url.search = '';
  return url.toString();
};

export const InviteTeacherDialog = ({
  classroomId,
  classroomName,
  isOpen,
  onOpenChange,
}: InviteTeacherDialogProps) => {
  const [email, setEmail] = useState('');
  const [lastCode, setLastCode] = useState<string | null>(null);

  const createInvitation = useCreateClassroomInvitation();
  const cancelInvitation = useCancelClassroomInvitation();
  const { data: invitations = [] } = useClassroomInvitations(classroomId, {
    enabled: isOpen,
  });

  const trimmedEmail = email.trim();
  const isValidEmail = EMAIL_RE.test(trimmedEmail);

  const handleSend = () => {
    if (!isValidEmail || createInvitation.isPending) return;
    createInvitation.mutate(
      { classroomId, email: trimmedEmail },
      {
        onSuccess: (invite) => {
          setLastCode(invite.code);
          setEmail('');
          toast.success(`Invitation sent to ${invite.email}`);
        },
        onError: () => {
          toast.error('Could not send the invitation. Please try again.');
        },
      },
    );
  };

  const handleCopyLink = (code: string) => {
    navigator.clipboard.writeText(joinLinkForCode(code));
    toast.success('Teacher join link copied to clipboard');
  };

  const handleCancel = (invitationId: string) => {
    cancelInvitation.mutate(
      { classroomId, invitationId },
      {
        onSuccess: () => toast.success('Invitation revoked'),
        onError: () => toast.error('Could not revoke the invitation.'),
      },
    );
  };

  const lastLink = lastCode ? joinLinkForCode(lastCode) : null;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto border-white/[0.06] bg-[#141416] text-white sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-white">Invite Teachers</DialogTitle>
          <DialogDescription className="text-white/60">
            {classroomName
              ? `Invite a co-teacher to help run ${classroomName}`
              : 'Invite a co-teacher to help run this classroom'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-6 py-4">
          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-medium text-white/85">
              Invite by email
            </h3>
            <div className="flex items-center gap-2">
              <Input
                type="email"
                inputMode="email"
                autoComplete="off"
                placeholder="teacher@school.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSend();
                }}
                className="border-white/10 bg-white/[0.02] text-white placeholder:text-white/40 focus-visible:border-white/25 focus-visible:ring-0"
              />
              <Button
                onClick={handleSend}
                disabled={!isValidEmail || createInvitation.isPending}
                className="rounded-full bg-white text-black hover:bg-white/85"
              >
                {createInvitation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Send
              </Button>
            </div>
            <p className="text-xs text-white/50">
              They&rsquo;ll get a link to join this classroom as a co-teacher.
            </p>
          </div>

          {lastCode && lastLink && (
            <>
              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-medium text-white/85">Join Link</h3>
                <div className="flex items-center gap-2">
                  <Input
                    readOnly
                    value={lastLink}
                    className="border-white/10 bg-white/[0.02] font-mono text-xs text-white placeholder:text-white/40 focus-visible:border-white/25 focus-visible:ring-0"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    className="rounded-full border-white/10 bg-transparent text-white/80 hover:bg-white/[0.04] hover:text-white"
                    onClick={() => handleCopyLink(lastCode)}
                    aria-label="Copy teacher join link"
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-white/50">
                  Share this link directly with the teacher you invited
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <h3 className="text-sm font-medium text-white/85">QR Code</h3>
                <div className="flex justify-center rounded-xl bg-white p-4">
                  <QRCode size={180} value={lastLink} />
                </div>
                <p className="text-xs text-white/50">
                  They can scan this to open the invite on another device
                </p>
              </div>
            </>
          )}

          {invitations.length > 0 && (
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-medium text-white/85">
                Pending Invitations
              </h3>
              <ul className="flex flex-col gap-2">
                {invitations.map((invite) => (
                  <li
                    key={invite.id}
                    className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3"
                  >
                    <span className="min-w-0 flex-1 truncate text-sm text-white/85">
                      {invite.email}
                    </span>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="rounded-full text-white/70 hover:bg-white/5 hover:text-white"
                        onClick={() => handleCopyLink(invite.code)}
                        aria-label={`Copy join link for ${invite.email}`}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="rounded-full text-white/70 hover:bg-white/5 hover:text-white"
                        onClick={() => handleCancel(invite.id)}
                        disabled={cancelInvitation.isPending}
                        aria-label={`Revoke invitation for ${invite.email}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
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
