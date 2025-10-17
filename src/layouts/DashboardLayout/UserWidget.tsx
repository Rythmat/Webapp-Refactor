import { LogOut, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthActions } from '@/contexts/AuthContext';
import { useMe } from '@/hooks/data';

export function UserWidget({
  className,
  isCollapsed,
}: {
  className?: string;
  isCollapsed?: boolean;
}) {
  const { data: user, isLoading } = useMe();
  const { signOut } = useAuthActions();

  const name = user?.nickname || user?.username || 'USER';
  const initials = name.substring(0, 2).toUpperCase();

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
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
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
