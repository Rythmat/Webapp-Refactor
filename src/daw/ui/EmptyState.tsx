import { type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/components/utilities';
import { TYPE_CLASS } from './styles';

export interface EmptyStateProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  /** A 24 px line icon above the title. */
  icon?: ReactNode;
  /** What is empty, plainly ('No clips yet'). */
  title: string;
  /** What to do about it, in a sentence. */
  description?: ReactNode;
  /** Buttons that fill it: the first is usually the white pill. */
  actions?: ReactNode;
  /** The title's element, to fit the page's heading outline. Default h3. */
  titleAs?: 'h2' | 'h3' | 'h4' | 'p';
}

/**
 * What a region shows when it has nothing in it yet: a quiet icon, a short
 * title, the next step, and the buttons that take it. Centred in the space
 * it is given.
 */
export function EmptyState({
  icon,
  title,
  description,
  actions,
  titleAs: Title = 'h3',
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 px-6 py-8 text-center',
        className,
      )}
      {...props}
    >
      {icon && (
        <div aria-hidden className="mb-1 text-daw-text-3 [&_svg]:size-6">
          {icon}
        </div>
      )}
      <Title className={cn(TYPE_CLASS.title, 'text-daw-text')}>{title}</Title>
      {description && (
        <p className={cn(TYPE_CLASS.body, 'max-w-[36ch] text-daw-text-3')}>
          {description}
        </p>
      )}
      {actions && (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
          {actions}
        </div>
      )}
    </div>
  );
}
