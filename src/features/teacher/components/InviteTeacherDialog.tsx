/**
 * InviteTeacherDialog — add another Teacher User as a co-teacher.
 *
 * PRIMARY PATH (live): `POST /classrooms/:id/teachers` with `{email, role}`.
 * This is a real, shipped endpoint. It attaches an EXISTING Music Atlas
 * account to the classroom as `editor` or `viewer`.
 *
 * LEGACY INVITE-BY-LINK (flag-gated, off): the QR + join-link half below POSTs
 * to `/classrooms/:id/invitations`, which does not exist — it 404s on every
 * use, which is why every invite silently failed. Worse, the code it minted
 * was resolved at sign-up against `GET /teachers/invitations/{code}`, a
 * PLATFORM-level table with no classroom binding, so even a successful mint
 * would have lost the classroom on arrival.
 *
 * That half is kept, behind `SERVER_CLASSROOM_INVITATIONS_ENABLED`, because
 * inviting someone who does NOT yet have an account is a real capability the
 * teachers endpoint cannot express. The flag is false, so the UI is hidden
 * until the P9 endpoint ships. See the P9 row in CONTRACT-DELTAS.md.
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AuthRoutes } from '@/constants/routes';
import { SERVER_CLASSROOM_INVITATIONS_ENABLED } from '@/constants/serverEndpoints';
import {
  useAddClassroomTeacher,
  useCancelClassroomInvitation,
  useClassroomInvitations,
  useCreateClassroomInvitation,
  type ClassroomTeacherRole,
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
  const [role, setRole] = useState<ClassroomTeacherRole>('editor');
  const [lastCode, setLastCode] = useState<string | null>(null);

  const addTeacher = useAddClassroomTeacher();

  // Legacy path only. The hooks are still constructed (hooks cannot be called
  // conditionally) but the query is DISABLED while the flag is off, so no
  // request is made to the route that 404s.
  const createInvitation = useCreateClassroomInvitation();
  const cancelInvitation = useCancelClassroomInvitation();
  const { data: invitations = [] } = useClassroomInvitations(classroomId, {
    enabled: isOpen && SERVER_CLASSROOM_INVITATIONS_ENABLED,
  });

  const trimmedEmail = email.trim();
  const isValidEmail = EMAIL_RE.test(trimmedEmail);

  const handleAdd = () => {
    if (!isValidEmail || addTeacher.isPending) return;
    addTeacher.mutate(
      { classroomId, email: trimmedEmail, role },
      {
        onSuccess: (added) => {
          setEmail('');
          toast.success(
            `${added.fullName || added.email || trimmedEmail} added as ${added.role}`,
          );
        },
        onError: (err) => {
          // Surface what the server actually said. An unregistered email is
          // the known open question on this endpoint (CONTRACT-DELTAS P1) —
          // claiming success would be the silent lie this renovation removes.
          const status =
            (err as { status?: number; response?: { status?: number } })
              ?.status ??
            (err as { response?: { status?: number } })?.response?.status;
          toast.error(
            status === 404
              ? `No Music Atlas account for ${trimmedEmail}. They need to sign up first.`
              : 'Could not add that co-teacher. Please try again.',
          );
        },
      },
    );
  };

  /**
   * Legacy invite-by-LINK. Only reachable while
   * `SERVER_CLASSROOM_INVITATIONS_ENABLED` is true, because the route it calls
   * does not exist yet. Kept whole so P9 can turn it on rather than rebuild it.
   */
  const handleLegacyInvite = () => {
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
                  if (e.key === 'Enter') handleAdd();
                }}
                className="border-white/10 bg-white/[0.02] text-white placeholder:text-white/40 focus-visible:border-white/25 focus-visible:ring-0"
              />
              <Select
                value={role}
                onValueChange={(v) => setRole(v as ClassroomTeacherRole)}
              >
                <SelectTrigger
                  aria-label="Co-teacher role"
                  className="w-[130px] shrink-0 border-white/10 bg-white/[0.02] text-white"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="editor">Editor</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={handleAdd}
                disabled={!isValidEmail || addTeacher.isPending}
                className="rounded-full bg-white text-black hover:bg-white/85"
              >
                {addTeacher.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Add
              </Button>
              {SERVER_CLASSROOM_INVITATIONS_ENABLED && (
                <Button
                  variant="outline"
                  onClick={handleLegacyInvite}
                  disabled={!isValidEmail || createInvitation.isPending}
                  className="rounded-full border-white/10 bg-transparent text-white/80 hover:bg-white/[0.04] hover:text-white"
                >
                  Invite by link
                </Button>
              )}
            </div>
            <p className="text-xs text-white/50">
              {role === 'editor'
                ? 'Editors can change lessons and run live sessions.'
                : 'Viewers can see everything but change nothing.'}{' '}
              They must already have a Music Atlas account.
            </p>
          </div>

          {SERVER_CLASSROOM_INVITATIONS_ENABLED && lastCode && lastLink && (
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

          {SERVER_CLASSROOM_INVITATIONS_ENABLED && invitations.length > 0 && (
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
