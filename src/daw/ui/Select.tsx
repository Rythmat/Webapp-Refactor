import { Fragment } from 'react';
import {
  Select as KitSelect,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/components/utilities';
import { FLOATING_SURFACE, FOCUS_RING, TRANSITION, TYPE_CLASS } from './styles';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectOptionGroup {
  /** The group's heading in the list ('Drums', 'Keys'). */
  label: string;
  options: readonly SelectOption[];
}

export interface SelectProps {
  /**
   * What is being chosen ('Grid', 'Input'). Required: it names the field,
   * and the chosen option is read as its value.
   */
  label: string;
  options: readonly (SelectOption | SelectOptionGroup)[];
  value?: string;
  defaultValue?: string;
  onValueChange?(value: string): void;
  placeholder?: string;
  /** Control the list's open state (the gallery shows it open). */
  open?: boolean;
  onOpenChange?(open: boolean): void;
  disabled?: boolean;
  /** 28 px by default; 24 px for dense rows. */
  size?: 'sm' | 'md';
  className?: string;
  /** For a tutorial anchor or a test. */
  id?: string;
}

const isGroup = (
  entry: SelectOption | SelectOptionGroup,
): entry is SelectOptionGroup => 'options' in entry;

const ITEM =
  'h-7 rounded-[var(--daw-radius-sm)] py-0 pl-2 pr-8 text-daw-text focus:bg-daw-hover focus:text-daw-text data-[state=checked]:font-bold';

/**
 * A pick-one list on the shared Radix kit: Enter, Space or the arrow keys
 * open it, typing jumps to an option, Escape closes it and focus returns to
 * the field. The list is an opaque floating surface (never glass), in the
 * popover layer so it opens above dialogs.
 */
export function Select({
  label,
  options,
  value,
  defaultValue,
  onValueChange,
  placeholder,
  open,
  onOpenChange,
  disabled,
  size = 'md',
  className,
  id,
}: SelectProps) {
  const item = (option: SelectOption) => (
    <SelectItem
      key={option.value}
      value={option.value}
      disabled={option.disabled}
      className={cn(ITEM, TYPE_CLASS.body)}
    >
      {option.label}
    </SelectItem>
  );

  return (
    <KitSelect
      value={value}
      defaultValue={defaultValue}
      onValueChange={onValueChange}
      open={open}
      onOpenChange={onOpenChange}
      disabled={disabled}
    >
      <SelectTrigger
        id={id}
        aria-label={label}
        className={cn(
          'w-auto min-w-24 gap-2 rounded-[var(--daw-radius-sm)] border-daw-outline bg-daw-surface-2 px-2 py-0 text-daw-text shadow-none',
          'hover:bg-daw-hover focus:ring-0 disabled:opacity-40 data-[placeholder]:text-daw-text-3',
          size === 'sm' ? 'h-6' : 'h-7',
          TYPE_CLASS.label,
          TRANSITION,
          FOCUS_RING,
          className,
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent
        collisionPadding={8}
        className={cn(
          FLOATING_SURFACE,
          'max-h-[min(var(--radix-select-content-available-height),320px)] min-w-[var(--radix-select-trigger-width)]',
        )}
      >
        {options.map((entry, index) =>
          isGroup(entry) ? (
            <Fragment key={`group-${entry.label}`}>
              {index > 0 && <SelectSeparator className="bg-daw-hairline" />}
              <SelectGroup>
                <SelectLabel
                  className={cn(TYPE_CLASS.micro, 'px-2 py-1 text-daw-text-3')}
                >
                  {entry.label}
                </SelectLabel>
                {entry.options.map(item)}
              </SelectGroup>
            </Fragment>
          ) : (
            item(entry)
          ),
        )}
      </SelectContent>
    </KitSelect>
  );
}
