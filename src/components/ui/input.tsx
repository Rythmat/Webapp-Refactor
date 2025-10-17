import * as React from 'react';
import { cn } from '../utilities';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          'flex h-12 w-full rounded-lg bg-shade-5 p-4 text-foreground text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-zinc-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        type={type}
        {...props}
      />
    );
  },
);
Input.displayName = 'Input';

export interface InputAutosizeProps extends InputProps {
  minWidth?: number;
  charWidth?: number;
}

const InputAutosize = React.forwardRef<HTMLInputElement, InputAutosizeProps>(
  ({ className, value, minWidth = 60, charWidth = 7, ...props }, ref) => {
    const calculateInputWidth = (text: string) => {
      return Math.max(minWidth, String(text).length * charWidth);
    };

    return (
      <input
        ref={ref}
        className={cn(
          'flex h-12 rounded-lg bg-shade-5 p-4 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50',
          className,
        )}
        style={{
          width: `${calculateInputWidth(
            (value as string) || props.placeholder || '',
          )}px`,
        }}
        value={value}
        {...props}
      />
    );
  },
);
InputAutosize.displayName = 'InputAutosize';

export { Input, InputAutosize };
