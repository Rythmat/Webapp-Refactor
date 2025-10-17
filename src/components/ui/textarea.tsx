import * as React from 'react';
import TextareaAutosizeBase, {
  TextareaAutosizeProps,
} from 'react-textarea-autosize';
import { cn } from '../utilities';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const textareaClassname =
  'flex min-h-[60px] w-full bg-shade-5 rounded-md border text-foreground border-input px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(textareaClassname, className)}
        {...props}
      />
    );
  },
);
Textarea.displayName = 'Textarea';

const TextareaAutosize = React.forwardRef<
  HTMLTextAreaElement,
  TextareaAutosizeProps
>(({ className, ...props }, ref) => {
  return (
    <TextareaAutosizeBase
      ref={ref}
      className={cn(textareaClassname, className)}
      {...props}
    />
  );
});
TextareaAutosize.displayName = 'TextareaAutosize';

export { Textarea, TextareaAutosize };
