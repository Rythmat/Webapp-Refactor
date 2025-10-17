import { format } from 'date-fns';
import { Copy, Check, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { AuthRoutes } from '@/constants/routes';
import {
  useTeacherInvitations,
  useCancelTeacherInvitation,
} from '@/hooks/data';

const DATE_FORMAT = 'MMM d, yyyy';

type InvitationStatus = 'active' | 'expired' | 'consumed' | 'all';

interface CopyButtonProps {
  value: string;
}

const CopyButton = ({ value }: CopyButtonProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      const url = new URL(window.location.href);
      url.pathname = AuthRoutes.signUpAsTeacher({ code: value });
      await navigator.clipboard.writeText(url.toString());
      setCopied(true);
      toast.success('Invitation link copied to clipboard');

      // Reset copied state after a delay
      setTimeout(() => {
        setCopied(false);
      }, 2000);
    } catch (error) {
      toast.error('Failed to copy code');
    }
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button size="icon" variant="ghost" onClick={handleCopy}>
            {copied ? (
              <Check className="size-4 text-green-500" />
            ) : (
              <Copy className="size-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Copy invitation link</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export const InvitationsList = () => {
  const [status, setStatus] = useState<InvitationStatus>('active');

  const { data: invitations = [], isLoading } = useTeacherInvitations({
    status,
  });

  const cancelInvitation = useCancelTeacherInvitation();

  const handleCancelInvitation = async (invitationId: string) => {
    try {
      await cancelInvitation.mutateAsync(invitationId);
      toast.success('Invitation cancelled successfully');
    } catch (error) {
      toast.error('Failed to cancel invitation');
    }
  };

  const getStatusLabel = (status: InvitationStatus) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'expired':
        return 'Expired';
      case 'consumed':
        return 'Used';
      case 'all':
        return 'All';
    }
  };

  return (
    <div>
      <CardHeader className="px-0">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Teacher Invitations</CardTitle>
            <CardDescription>
              Manage invitations for new teachers
            </CardDescription>
          </div>
          <Select
            value={status}
            onValueChange={(value) => setStatus(value as InvitationStatus)}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="consumed">Used</SelectItem>
              <SelectItem value="all">All</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="px-0">
        {isLoading && invitations.length === 0 ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="flex space-x-2">
                <Skeleton className="h-12 w-full" />
              </div>
            ))}
          </div>
        ) : invitations.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">
            No {status !== 'all' ? getStatusLabel(status).toLowerCase() : ''}{' '}
            invitations found
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Code</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Views</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invitations.map((invitation) => {
                const isConsumed = !!invitation.consumedAt;
                const isExpired =
                  !isConsumed &&
                  invitation.expiresAt &&
                  new Date(invitation.expiresAt) < new Date();
                const isActive = !isConsumed && !isExpired;

                return (
                  <TableRow key={invitation.id}>
                    <TableCell>{invitation.email}</TableCell>
                    <TableCell className="flex items-center">
                      <span className="font-mono text-sm">
                        {invitation.code}
                      </span>
                      <CopyButton value={invitation.code} />
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${
                          isConsumed
                            ? 'bg-green-100 text-green-800'
                            : isExpired
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {isConsumed ? 'Used' : isExpired ? 'Expired' : 'Active'}
                      </span>
                    </TableCell>
                    <TableCell>
                      {format(new Date(invitation.createdAt), DATE_FORMAT)}
                    </TableCell>
                    <TableCell>
                      {invitation.expiresAt
                        ? format(new Date(invitation.expiresAt), DATE_FORMAT)
                        : 'Never'}
                    </TableCell>
                    <TableCell>{invitation.viewCount}</TableCell>
                    <TableCell>
                      <Button
                        disabled={!isActive}
                        size="icon"
                        variant="ghost"
                        onClick={() => handleCancelInvitation(invitation.id)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </div>
  );
};
