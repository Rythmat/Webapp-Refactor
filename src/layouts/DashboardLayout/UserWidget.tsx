import { LogOut, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router';
import { ProfileRoutes } from '@/constants/routes';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { UserAvatarPattern } from '@/components/ui/UserAvatarPattern';
import { useAuthActions } from '@/contexts/AuthContext';
import { useMe } from '@/hooks/data';

export function UserWidget({
  className,
  isCollapsed,
  variant = 'sidebar',
  nameOverride,
}: {
  className?: string;
  isCollapsed?: boolean;
  variant?: 'sidebar' | 'header';
  nameOverride?: string;
}) {
  const { data: user, isLoading } = useMe();
  const { signOut } = useAuthActions();
  const navigate = useNavigate();

  const name = nameOverride || user?.nickname || user?.username || 'USER';

  if (variant === 'header') {
    return (
      <button
        type="button"
        onClick={() => navigate(ProfileRoutes.profile())}
        className={`flex items-center gap-3 cursor-pointer group ${className || ''}`}
      >
        <div className="text-right hidden md:block text-xs">
          {isLoading ? (
            <>
              <Skeleton className="mb-1 ml-auto h-3 w-24" />
              <Skeleton className="ml-auto h-2 w-20" />
            </>
          ) : (
            <div className="text-sm text-white leading-none">{name}</div>
          )}
        </div>

        <Avatar className="size-10 select-none border-2 border-white/10 shadow-lg shadow-purple-500/20 transition-all group-hover:border-white/50">
          <AvatarImage alt={name} src="/avatars/01.png" />
          <AvatarFallback className="relative overflow-hidden bg-[#E8DAB2] p-0">
            <UserAvatarPattern
              userName={name}
              className="h-[220%] w-[220%] -translate-x-[28%] -translate-y-[28%]"
            />
          </AvatarFallback>
        </Avatar>
      </button>
    );
  }

  if (isCollapsed) {
    return (
      <Button
        className="relative right-2 text-foreground/60 hover:text-foreground"
        disabled={isLoading}
        size="icon"
        variant="ghost"
        onClick={() => signOut()}
      >
        {isLoading ? (
          <Loader2 className="size-2 animate-spin" />
        ) : (
          <LogOut className="size-2" />
        )}
      </Button>
    );
  }

  return (
    <div
      className={`flex items-center justify-between ${className || ''} select-none`}
    >
      <div className="flex items-center gap-3 text-foreground/80">
        <Avatar className="size-8 select-none">
          <AvatarImage alt={name} src="/avatars/01.png" />
          <AvatarFallback className="relative overflow-hidden bg-[#E8DAB2] p-0">
            <UserAvatarPattern
              userName={name}
              className="h-[220%] w-[220%] -translate-x-[28%] -translate-y-[28%]"
            />
          </AvatarFallback>
        </Avatar>

        <div className="text-xs">
          {isLoading ? (
            <>
              <Skeleton className="mb-1 h-3 w-24" />
              <Skeleton className="h-2 w-20" />
            </>
          ) : (
            <>
              <div className="text-sm">{name}</div>
            </>
          )}
        </div>
      </div>

      <div
        className="cursor-pointer text-sm text-foreground/60 hover:text-primary"
        onClick={() => signOut()}
      >
        Log out
      </div>
    </div>
  );
}
