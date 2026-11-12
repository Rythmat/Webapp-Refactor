import { Radio } from 'lucide-react';
import { Link } from 'react-router-dom';
import { cn } from '@/components/utilities';
import { ClassroomRoutes } from '@/constants/routes';
import { Button } from '@/daw/ui/Button';

/**
 * "Your class is live" — the one thing a student must not miss, so it's the
 * page's white pill: the live dot, the class, and Join now.
 */
export const LiveNowBanner = ({
  classroomId,
  sessionId,
  className: name,
  compact = false,
}: {
  classroomId: string;
  sessionId: string;
  /** The class's name, when the page lists more than one class. */
  className?: string;
  compact?: boolean;
}) => (
  <div
    role="status"
    className={cn(
      'flex flex-wrap items-center justify-between gap-3 rounded-[1.25rem] border border-rose-400/30 bg-rose-400/[0.07]',
      compact ? 'px-4 py-3' : 'px-5 py-4',
    )}
  >
    <span className="inline-flex items-center gap-2.5 text-[0.9375rem] font-medium text-daw-text">
      <span className="relative flex size-2.5">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-rose-400 opacity-75 motion-reduce:animate-none" />
        <span className="relative inline-flex size-2.5 rounded-full bg-rose-400" />
      </span>
      {name ? `${name} is live right now` : 'Your class is live right now'}
    </span>
    <Button asChild variant="primary" size="lg">
      <Link to={ClassroomRoutes.live({ classroomId, sessionId })}>
        <Radio aria-hidden />
        Join now
      </Link>
    </Button>
  </div>
);
