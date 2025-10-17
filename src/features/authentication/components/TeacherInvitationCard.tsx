import { format } from 'date-fns';
import { AlertCircle } from 'lucide-react';
import { useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/components/utilities';
import { GetTeachersInvitationsByCodeData } from '@/contexts/MusicAtlasContext';
import { useTeacherInvitationDetails } from '@/hooks/data';

interface TeacherInvitationCardProps {
  code: string;
  onLoad?: (invite: GetTeachersInvitationsByCodeData) => void;
}

export const TeacherInvitationCard = ({
  code,
  onLoad,
}: TeacherInvitationCardProps) => {
  const {
    data: invitation,
    error,
    isLoading,
  } = useTeacherInvitationDetails(code);

  useEffect(() => {
    if (invitation) {
      onLoad?.(invitation);
    }
  }, [invitation, onLoad]);

  if (isLoading) {
    return (
      <div className="relative max-w-md overflow-hidden rounded-md bg-primary/10">
        {/* Decorative tear edge with code skeleton */}
        <div className="absolute left-0 top-0 h-full w-10 bg-primary/10">
          <div className="absolute -right-px top-0 h-full w-[2px]">
            {[...Array(50)].map((_, i) => (
              <div
                key={i}
                className="relative bottom-1 mt-0.5 h-1 w-px bg-white"
              />
            ))}
          </div>
          <div className="absolute -left-3 top-1/2 -translate-y-1/2 -rotate-90">
            <div className="h-4 w-16 animate-pulse rounded bg-primary/20" />
          </div>
        </div>

        <div className="ml-10 px-6 py-5">
          <div>
            <div className="h-3 w-20 animate-pulse rounded bg-primary/20" />
            <div className="mt-1 h-4 w-32 animate-pulse rounded bg-primary/20" />
          </div>

          <div className="mt-2 flex items-start justify-between">
            <div>
              <div className="h-2.5 w-12 animate-pulse rounded bg-primary/20" />
              <div className="mt-1 h-4 w-40 animate-pulse rounded bg-primary/20" />
            </div>
            <div className="text-right">
              <div className="h-2.5 w-16 animate-pulse rounded bg-primary/20" />
              <div className="mt-1 h-4 w-24 animate-pulse rounded bg-primary/20" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="size-4" />
        <AlertDescription>
          {error instanceof Error
            ? error.message
            : 'Failed to load invitation details'}
        </AlertDescription>
      </Alert>
    );
  }

  if (!invitation) {
    return null;
  }

  const expiryDate = invitation.expiresAt
    ? new Date(invitation.expiresAt)
    : null;
  const isExpiringSoon =
    expiryDate && expiryDate.getTime() - Date.now() < 1000 * 60 * 60 * 24; // 1 day

  return (
    <div className="relative max-w-md overflow-hidden rounded-md bg-primary/10">
      {/* Decorative tear edge with code */}
      <div className="absolute left-0 top-0 h-full w-10 bg-primary/10">
        <div className="absolute -right-px top-0 h-full w-[2px]">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="relative bottom-1 mt-0.5 h-1 w-px bg-white"
            />
          ))}
        </div>
        <div className="absolute -left-7 top-1/2 -translate-y-1/2 -rotate-90 select-none">
          <div className="font-mono text-lg tracking-wider text-primary/70 opacity-50">
            {code}
          </div>
        </div>
      </div>

      <div className="ml-10 px-6 py-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-primary/80">
            Music Atlas
          </p>
          <h3 className="text-base font-bold uppercase">Teacher Invitation</h3>
        </div>

        <div className="mt-2 flex items-start justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-primary/80">
              Invited
            </div>
            <div className="text-sm font-medium tracking-tight">
              {invitation.email}
            </div>
          </div>
          {expiryDate && (
            <div className="text-right">
              <div className="text-[10px] font-bold uppercase tracking-wider text-primary/80">
                Valid Until
              </div>
              <div
                className={cn(
                  'text-xs font-medium text-zinc-800',
                  isExpiringSoon && 'text-red-600',
                )}
              >
                {format(expiryDate, 'MMM do, yyyy')}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
