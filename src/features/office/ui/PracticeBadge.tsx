import { HardDrive } from 'lucide-react';
import { cn } from '@/components/utilities';
import { SERVER_CURRICULUM_ENABLED } from '@/constants/serverEndpoints';
import { Tooltip } from '@/daw/ui/Tooltip';

/**
 * NO SILENT MOCKS, on every Office page: until classroom sync ships, lessons,
 * sessions and assignments are kept in this browser. The badge says so where
 * a teacher can always see it, rather than letting a second laptop's empty
 * Office be the first sign. It disappears once the curriculum is on the
 * server.
 */
export const PracticeBadge = ({ className }: { className?: string }) => {
  if (SERVER_CURRICULUM_ENABLED) return null;
  return (
    <Tooltip
      side="bottom"
      content="Your lessons, sessions and assignments are saved in this browser until classroom sync arrives. Download a backup from a class's settings."
    >
      <span
        tabIndex={0}
        className={cn(
          'inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border border-amber-300/25 bg-amber-300/[0.06] px-2.5 text-[0.75rem] text-amber-100/85 outline-none focus-visible:ring-2 focus-visible:ring-white/50',
          className,
        )}
      >
        <HardDrive aria-hidden className="size-3.5" />
        <span className="hidden lg:inline">On this device</span>
        <span className="sr-only lg:hidden">Saved on this device</span>
      </span>
    </Tooltip>
  );
};
