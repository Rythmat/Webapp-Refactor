import * as RadioGroup from '@radix-ui/react-radio-group';
import { useRef, useState, type ReactNode } from 'react';
import { cn } from '@/components/utilities';
import { FOCUS_RING, TRANSITION, TYPE_CLASS } from './styles';
import { TIP_GAP_PX, Tooltip, type TooltipProps } from './Tooltip';

export interface SegmentedOption<T extends string> {
  value: T;
  /** The option in words; with an icon it is the name and tooltip. */
  label: string;
  icon?: ReactNode;
  disabled?: boolean;
  /** A lesson anchor on the segment (its data-tutorial-id). */
  anchor?: string;
  /** For a test or the harness (its data-testid). */
  testId?: string;
}

export interface SegmentedProps<T extends string> {
  /** What the choice is about ('Snap', 'Scale to show'). The group's name. */
  label: string;
  options: readonly SegmentedOption<T>[];
  value: T;
  onValueChange(value: T): void;
  /** Show icons only (each option's label becomes its name and tooltip). */
  iconOnly?: boolean;
  /**
   * Where an icon's tooltip opens (above by default). To the right or the
   * left it opens past the group's end, clear of the other segments.
   */
  tooltipSide?: TooltipProps['side'];
  disabled?: boolean;
  className?: string;
  /** For a test or the harness: the group's data-testid. */
  testId?: string;
}

/**
 * Pick one of a few: a radio group drawn as joined segments, 28 px high
 * with 24 px segments, and white/10 on the chosen one. Radix's radio group
 * gives it the radio semantics: one tab stop, and arrow keys move the
 * choice. One option is always on. It replaces the seven hand-made
 * segmented controls (audit design-system-13).
 */
export function Segmented<T extends string>({
  label,
  options,
  value,
  onValueChange,
  iconOnly = false,
  tooltipSide = 'top',
  disabled = false,
  className,
  testId,
}: SegmentedProps<T>) {
  const rootRef = useRef<HTMLDivElement>(null);
  const items = useRef(new Map<string, HTMLButtonElement>());
  // A tip beside the group opens past its end: each segment's distance to
  // that end, measured as the pointer or the focus comes in, before a tip
  // opens.
  const beside = tooltipSide === 'right' || tooltipSide === 'left';
  const [past, setPast] = useState<Record<string, number>>({});
  const measure = () => {
    const root = rootRef.current?.getBoundingClientRect();
    if (!beside || !root) return;
    const next: Record<string, number> = {};
    for (const [value, el] of items.current) {
      const box = el.getBoundingClientRect();
      next[value] =
        tooltipSide === 'right' ? root.right - box.right : box.left - root.left;
    }
    setPast(next);
  };
  return (
    <RadioGroup.Root
      ref={rootRef}
      onPointerEnter={beside ? measure : undefined}
      onFocus={beside ? measure : undefined}
      aria-label={label}
      data-testid={testId}
      value={value}
      onValueChange={(next) => onValueChange(next as T)}
      disabled={disabled}
      orientation="horizontal"
      className={cn(
        // 1 px border and 1 px padding round 24 px segments: 28 px, the
        // height of the Buttons, Selects and Toggles beside it.
        'inline-flex items-center gap-0.5 rounded-full border border-daw-hairline p-px',
        disabled && 'opacity-40',
        className,
      )}
    >
      {options.map((option) => {
        const item = (
          <RadioGroup.Item
            key={option.value}
            ref={(el) => {
              if (el) items.current.set(option.value, el);
              else items.current.delete(option.value);
            }}
            value={option.value}
            disabled={option.disabled}
            data-tutorial-id={option.anchor}
            data-testid={option.testId}
            aria-label={iconOnly ? option.label : undefined}
            className={cn(
              'inline-flex items-center justify-center gap-1.5 rounded-full font-bold text-daw-text-3',
              'hover:text-daw-text disabled:pointer-events-none disabled:opacity-40',
              'data-[state=checked]:bg-daw-selected data-[state=checked]:text-daw-text',
              '[&_svg]:size-4 [&_svg]:shrink-0',
              'h-6 min-w-6 px-2.5',
              TYPE_CLASS.label,
              TRANSITION,
              FOCUS_RING,
            )}
          >
            {option.icon}
            {!iconOnly && option.label}
          </RadioGroup.Item>
        );
        return iconOnly ? (
          <Tooltip
            key={option.value}
            content={option.label}
            side={tooltipSide}
            sideOffset={TIP_GAP_PX + (past[option.value] ?? 0)}
          >
            {item}
          </Tooltip>
        ) : (
          item
        );
      })}
    </RadioGroup.Root>
  );
}
