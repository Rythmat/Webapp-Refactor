import { useId, useRef, useState, type ReactNode, type RefObject } from 'react';
import { DialogClose } from '@/components/ui/dialog';
import { cn } from '@/components/utilities';
import { Button } from './Button';
import { DawDialog } from './DawDialog';
import { FOCUS_RING, TRANSITION, TYPE_CLASS } from './styles';

export interface PromptDialogProps {
  open: boolean;
  onOpenChange(open: boolean): void;
  title: string;
  /** The field's label ('Marker name'). Required: it names the field. */
  label: string;
  description?: ReactNode;
  defaultValue?: string;
  placeholder?: string;
  /** The action's name ('Rename', 'Add'). Default 'OK'. */
  confirmLabel?: string;
  cancelLabel?: string;
  /**
   * What is wrong with `value`, or null when it will do. Checked on submit;
   * the message shows under the field and the dialog stays open.
   */
  validate?(value: string): string | null;
  onSubmit(value: string): void;
  /** Cancel, Escape, the close button. */
  onCancel?(): void;
  maxLength?: number;
}

/**
 * Asks for a short text (a name, a label) in a DawDialog. The field has
 * focus with its text selected when it opens, Enter submits, Escape cancels.
 * A value `validate` turns down keeps the dialog open with the reason under
 * the field. It replaces window.prompt in the editor (milestone 2.3).
 */
export function PromptDialog({
  open,
  onOpenChange,
  title,
  description,
  onCancel,
  ...form
}: PromptDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <DawDialog
      open={open}
      // Only the dialog's own ways out arrive here (Cancel, Escape, the close
      // button, the scrim); a submit closes through `open` instead.
      onOpenChange={(next) => {
        if (!next) onCancel?.();
        onOpenChange(next);
      }}
      title={title}
      description={description}
      size="sm"
      initialFocus={inputRef}
    >
      {/* Mounted only while open, so each opening starts from defaultValue. */}
      <PromptForm
        {...form}
        inputRef={inputRef}
        onDone={(value) => {
          form.onSubmit(value);
          onOpenChange(false);
        }}
      />
    </DawDialog>
  );
}

function PromptForm({
  label,
  defaultValue = '',
  placeholder,
  confirmLabel = 'OK',
  cancelLabel = 'Cancel',
  validate,
  maxLength,
  inputRef,
  onDone,
}: Omit<
  PromptDialogProps,
  'open' | 'onOpenChange' | 'title' | 'description' | 'onCancel'
> & {
  inputRef: RefObject<HTMLInputElement>;
  onDone(value: string): void;
}) {
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState<string | null>(null);
  const inputId = useId();
  const errorId = useId();

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const problem = validate?.(value) ?? null;
        setError(problem);
        if (problem) {
          inputRef.current?.focus();
          return;
        }
        onDone(value);
      }}
    >
      <label
        htmlFor={inputId}
        className={cn(TYPE_CLASS.label, 'mb-1 block text-daw-text-2')}
      >
        {label}
      </label>
      <input
        id={inputId}
        ref={inputRef}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        autoComplete="off"
        spellCheck={false}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        onChange={(event) => {
          setValue(event.target.value);
          if (error) setError(null);
        }}
        className={cn(
          'h-7 w-full rounded-[var(--daw-radius-sm)] border border-daw-outline bg-daw-surface-2 px-2 text-daw-text placeholder:text-daw-text-3',
          'aria-[invalid=true]:border-daw-danger-text',
          TYPE_CLASS.body,
          TRANSITION,
          FOCUS_RING,
        )}
      />
      {error && (
        <p
          id={errorId}
          role="alert"
          className={cn(TYPE_CLASS.label, 'mt-1 text-daw-danger-text')}
        >
          {error}
        </p>
      )}
      <div className="mt-4 flex justify-end gap-2 pb-2">
        <DialogClose asChild>
          <Button variant="secondary">{cancelLabel}</Button>
        </DialogClose>
        <Button type="submit" variant="primary">
          {confirmLabel}
        </Button>
      </div>
    </form>
  );
}
