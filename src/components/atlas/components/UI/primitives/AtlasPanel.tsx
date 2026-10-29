import { forwardRef, useId, type CSSProperties, type ReactNode } from 'react';
import { AtlasEyebrow } from '@/components/atlas/components/UI/primitives/AtlasEyebrow';
import {
  ATLAS_FOCUS,
  ATLAS_HEADING,
  ATLAS_SURFACE,
} from '@/components/atlas/components/UI/primitives/styles';
import {
  useAtlasZone,
  zoneIsSurface,
} from '@/components/atlas/layout/zoneContext';
import { cn } from '@/lib/utils';

/**
 * A panel over the globe: the shared surface, then an optional header (an
 * eyebrow, the title, a subtitle, actions at the right, and anything else
 * that belongs above the fold), then its children. Put a scrolling list in
 * an {@link AtlasPanelBody}. The zone it sits in places it
 * (layout/AtlasZones.tsx); `className` and `style` size it there.
 *
 * Inside the phone's bottom sheet the sheet is the surface, so the panel
 * drops its own, fills the sheet, and ignores `className`, `style` and
 * `edge` (a desktop resize handle).
 *
 * The title is where focus lands when the panel opens (layout/usePanelFocus):
 * it takes focus from script (tabIndex -1), never from Tab.
 */
export const AtlasPanel = forwardRef<
  HTMLDivElement,
  {
    as?: 'section' | 'div' | 'aside';
    eyebrow?: ReactNode;
    title?: ReactNode;
    subtitle?: ReactNode;
    /** Icon buttons at the header's right: collapse, close. */
    actions?: ReactNode;
    /** More header content, under the title, full width. */
    header?: ReactNode;
    /** Rendered first, before the header: a resize handle on an edge. */
    edge?: ReactNode;
    className?: string;
    style?: CSSProperties;
    'aria-label'?: string;
    children?: ReactNode;
  }
>(function AtlasPanel(
  {
    as: Tag = 'section',
    eyebrow,
    title,
    subtitle,
    actions,
    header,
    edge,
    className,
    style,
    'aria-label': ariaLabel,
    children,
  },
  ref,
) {
  const titleId = useId();
  const zone = useAtlasZone();
  const inSheet = zone.kind === 'sheet';
  // In the Inspector or the phone's sheet, the zone is the surface.
  const fills = zoneIsSurface(zone);
  const hasHeader = eyebrow || title || subtitle || actions || header;
  return (
    <Tag
      ref={ref}
      aria-label={ariaLabel}
      aria-labelledby={!ariaLabel && title ? titleId : undefined}
      className={
        fills
          ? 'flex min-h-0 flex-1 flex-col text-atlas-text'
          : cn(ATLAS_SURFACE, 'flex min-h-0 max-w-full flex-col', className)
      }
      style={fills ? undefined : style}
    >
      {!fills && edge}
      {hasHeader && (
        <header className={cn('shrink-0', inSheet ? 'px-4 pb-3 pt-1' : 'p-4')}>
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              {eyebrow && (
                <AtlasEyebrow className="mb-1">{eyebrow}</AtlasEyebrow>
              )}
              {title && (
                <h3
                  className={cn(ATLAS_HEADING, ATLAS_FOCUS, 'rounded-sm')}
                  data-atlas-panel-heading
                  id={titleId}
                  tabIndex={-1}
                >
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="mt-1 text-[0.8125rem] text-atlas-text-2">
                  {subtitle}
                </p>
              )}
            </div>
            {actions && (
              <div className="-mr-1.5 -mt-1.5 flex shrink-0 items-center gap-0.5">
                {actions}
              </div>
            )}
          </div>
          {header}
        </header>
      )}
      {children}
    </Tag>
  );
});

/** A panel's scrolling body, under a hairline. */
export const AtlasPanelBody = forwardRef<
  HTMLDivElement,
  { className?: string; children: ReactNode }
>(function AtlasPanelBody({ className, children }, ref) {
  return (
    <div
      ref={ref}
      className={cn(
        'relative min-h-0 overflow-y-auto border-t border-atlas-panel-border',
        className,
      )}
    >
      {children}
    </div>
  );
});
