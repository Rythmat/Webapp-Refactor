import { type ReactNode, type Ref, useId } from 'react';
import { cn } from '@/components/utilities';
import { CONSOLE_LABEL } from '../../ui/styles';

/**
 * One section of the row panel: its label (and count), a note or what can
 * be done to the whole section, its body. With `headingRef`, the heading
 * takes focus from code (never from Tab): where the keyboard goes when what
 * it was on is gone.
 */
export const PanelSection = ({
  title,
  count,
  note,
  actions,
  headingRef,
  children,
}: {
  title: string;
  count?: number;
  note?: string;
  actions?: ReactNode;
  headingRef?: Ref<HTMLHeadingElement>;
  children: ReactNode;
}) => {
  const id = useId();
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h3
          id={id}
          ref={headingRef}
          tabIndex={headingRef ? -1 : undefined}
          className={cn(CONSOLE_LABEL, headingRef && 'outline-none')}
        >
          {title}
          {count !== undefined && (
            <span className="tabular-nums"> · {count}</span>
          )}
        </h3>
        {note && <span className="text-xs text-white/50">{note}</span>}
        {actions}
      </div>
      {children}
    </section>
  );
};
