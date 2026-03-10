import * as React from 'react';
import { cn } from '../utilities';

export interface RainbowBorderButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** Extra classes for the outer wrapper div */
  wrapperClassName?: string;
  /** Whether the rainbow border is active (default: true) */
  active?: boolean;
}

/**
 * Button with an animated rainbow border.
 * Ref is forwarded to the outer wrapper <div> (used for positioning/outside-click).
 */
const RainbowBorderButton = React.forwardRef<
  HTMLDivElement,
  RainbowBorderButtonProps
>(
  (
    {
      className,
      wrapperClassName,
      active = true,
      children,
      style,
      ...buttonProps
    },
    ref,
  ) => {
    return (
      <div
        ref={ref}
        className={cn(active && 'rainbow-border-wrapper', wrapperClassName)}
      >
        <button
          className={cn(
            'rainbow-border-inner flex items-center justify-center cursor-pointer transition-all duration-200',
            className,
          )}
          style={style}
          {...buttonProps}
        >
          {children}
        </button>
      </div>
    );
  },
);
RainbowBorderButton.displayName = 'RainbowBorderButton';

export { RainbowBorderButton };
