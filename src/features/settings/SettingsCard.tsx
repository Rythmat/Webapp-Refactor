import type { ReactNode } from 'react';
import { cn } from '@/components/utilities';

interface SettingsCardProps {
  title?: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  className?: string;
}

/**
 * Universal container for a group of related settings. Wraps content in the
 * shared `.glass-panel-sm` chrome and stacks an optional title + description
 * row above the controls. Cards read as sub-sections inside a Settings
 * section; multiple cards can appear in one section.
 */
export const SettingsCard = ({
  title,
  description,
  children,
  className,
}: SettingsCardProps) => {
  return (
    <div
      className={cn(
        'glass-panel-sm rounded-2xl border border-white/[0.06]',
        'bg-white/[0.02] p-6',
        className,
      )}
    >
      {(title || description) && (
        <div className="mb-5 flex flex-col gap-1">
          {title && <h3 className="text-lg font-medium text-white">{title}</h3>}
          {description && (
            <p className="text-sm text-white/60">{description}</p>
          )}
        </div>
      )}
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  );
};
