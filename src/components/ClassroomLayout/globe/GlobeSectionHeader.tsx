import { type FC, type ReactNode } from 'react';

/**
 * Section header for the Pathways list (the slide content picker's Globe tab) —
 * a lucide icon + title (`text-xl md:text-2xl font-medium`).
 */
export const GlobeSectionHeader: FC<{ icon: ReactNode; title: string }> = ({
  icon,
  title,
}) => (
  <div className="flex items-center gap-2 md:gap-3">
    {icon}
    <h2 className="text-xl font-medium text-white md:text-2xl">{title}</h2>
  </div>
);
