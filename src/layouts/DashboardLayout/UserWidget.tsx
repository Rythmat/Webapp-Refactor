/* eslint-disable tailwindcss/classnames-order */
import { LogOut, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router';
import { UserAvatarPattern } from '@/components/ui/UserAvatarPattern';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ProfileRoutes } from '@/constants/routes';
import { useAuthActions } from '@/contexts/AuthContext';
import { useMe } from '@/hooks/data';
import { useAvatarConfig } from '@/hooks/useAvatarConfig';

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
  const { config: avatarConfig } = useAvatarConfig(user?.id);

  const name = nameOverride || user?.nickname || user?.username || 'USER';

  if (variant === 'header') {
    return (
      <button
        className={`flex items-center gap-3 cursor-pointer group ${className || ''}`}
        type="button"
        onClick={() => navigate(ProfileRoutes.profile())}
      >
        <div className="text-right hidden md:block text-xs">
          {isLoading ? (
            <>
              <Skeleton className="mb-1 ml-auto h-3 w-24" />
              <Skeleton className="ml-auto h-2 w-20" />
            </>
          ) : (
            <div className="text-sm leading-none text-white">{name}</div>
          )}
        </div>

        <Avatar className="size-10 select-none border-2 border-white/10 shadow-lg shadow-purple-500/20 transition-all group-hover:border-white/50">
          <AvatarFallback className="relative overflow-hidden p-0">
            <UserAvatarPattern
              className="size-full"
              userName={name}
              config={avatarConfig}
            />
          </AvatarFallback>
        </Avatar>
      </button>
    );
  }

  if (isCollapsed) {
    return (
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              className="flex w-full items-center justify-center py-2 text-foreground/60 transition-colors hover:text-white disabled:opacity-50"
              disabled={isLoading}
              onClick={() => signOut()}
            >
              <span className="flex size-6 items-center justify-center">
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <LogOut className="h-5 w-5" />
                )}
              </span>
            </button>
          </TooltipTrigger>
          <TooltipContent
            side="right"
            sideOffset={8}
            className="bg-black/20 backdrop-blur-2xl border border-white/[0.08] text-white shadow-2xl"
          >
            Log out
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return (
    <div
      className={`flex items-center justify-between ${className || ''} select-none`}
    >
      <div className="flex items-center gap-3 text-foreground/80">
        <Avatar className="size-8 select-none">
          <AvatarFallback className="relative overflow-hidden p-0">
            <UserAvatarPattern
              className="size-full"
              userName={name}
              config={avatarConfig}
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
