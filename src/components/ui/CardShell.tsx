/**
 * CardShell — universal scrollable card primitive for the dashboard.
 * See docs/dashboard-responsive.md for the architecture this fits into.
 *
 * Structure:
 *   <CardShell header={<HeaderRow icon={Clock} title="May 2026" />}>
 *     {body — scrolls internally via Radix ScrollArea}
 *   </CardShell>
 *
 * Guarantees:
 * - Body never crops; long content scrolls inside the rounded card.
 * - Body is a CSS container — children can react to the CARD's width
 *   with `@sm:flex-col`, `@md:gap-3` etc. (Tailwind @tailwindcss/container-queries).
 * - Glass-panel chrome + rounded corners + grain texture come for free.
 *
 * Pitfalls:
 * - Don't add `overflow-hidden` to the body — defeats ScrollArea.
 * - If you need to skip the ScrollArea (e.g., card is content-sized inline),
 *   pass `scroll={false}` and the body renders as a plain div.
 */
import type { ReactNode } from 'react';
import { cn } from '@/components/utilities';
import { ScrollArea } from './scroll-area';

interface CardShellProps {
  header?: ReactNode;
  /** Body content. Wrapped in a CSS container ('card') by default. */
  children: ReactNode;
  /**
   * Disable the internal scroll wrapper. Use for cards that should grow
   * to their natural height (e.g., when rendered in a content-sized parent
   * with no height constraint).
   */
  scroll?: boolean;
  /** Override the default `container-name`. Default: 'card'. */
  containerName?: string;
  /** Extra classes on the outer shell. */
  className?: string;
  /** Extra classes on the body (inside the scroll viewport). */
  bodyClassName?: string;
  /** Extra inline styles on the outer shell. */
  style?: React.CSSProperties;
}

export const CardShell = ({
  header,
  children,
  scroll = true,
  containerName = 'card',
  className,
  bodyClassName,
  style,
}: CardShellProps) => {
  const containerStyle: React.CSSProperties = {
    containerType: 'inline-size',
    containerName,
  };

  const bodyContent = (
    <div
      className={cn('size-full', bodyClassName)}
      style={{ padding: 'var(--dash-card-pad, 1rem)', ...containerStyle }}
    >
      {children}
    </div>
  );

  return (
    <div
      className={cn(
        'glass-panel-sm relative flex h-full flex-col overflow-hidden rounded-2xl',
        className,
      )}
      style={{
        background: 'rgba(26, 26, 26, 0.7)',
        ...style,
      }}
    >
      {header && (
        <div
          className="flex flex-shrink-0 items-center gap-2"
          style={{
            padding: 'var(--dash-card-pad, 1rem)',
            paddingBottom: 0,
          }}
        >
          {header}
        </div>
      )}
      {scroll ? (
        <ScrollArea className="flex-1">{bodyContent}</ScrollArea>
      ) : (
        <div className="flex-1">{bodyContent}</div>
      )}
    </div>
  );
};

/**
 * HeaderRow — convenience component for the standard "icon + title" header
 * shared by XpCalendar, RecentProjects, ChallengesCard. Pass to CardShell's
 * `header` prop.
 */
interface HeaderRowProps {
  icon: React.ComponentType<{
    className?: string;
    style?: React.CSSProperties;
  }>;
  title: string;
}

export const HeaderRow = ({ icon: Icon, title }: HeaderRowProps) => (
  <>
    <Icon
      className="text-white/85"
      style={{
        width: 'var(--dash-icon-sz, 1.15rem)',
        height: 'var(--dash-icon-sz, 1.15rem)',
      }}
    />
    <span
      className="font-medium text-white"
      style={{ fontSize: 'var(--dash-label-fz, 1rem)' }}
    >
      {title}
    </span>
  </>
);
