import { Check, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/components/utilities';
import { PROMPT_PILL, PROMPT_PILL_OFF, PROMPT_PILL_ON } from './PromptBoxParts';

export interface PromptFilterOption<T extends string> {
  value: T;
  label: string;
}

/**
 * A filter as a prompt-box pill (owner, 2026-10-25: the Songs pages' filters
 * moved into the Learn page's prompt bar). Unset, it names the filter
 * ("Difficulty"); set, it shows the choice ("Lvl. 2") and lights up as a
 * chosen pill does. Its menu is the prompt box's glass, as Home's search
 * results are: 20px corners, hairline edge, soft shadow, frosted.
 */
export function PromptFilterPill<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  /** The filter's name, shown while it is unset. */
  label: string;
  value: T;
  /** The first option is the unset one ("All Genres"). */
  options: readonly PromptFilterOption<T>[];
  onChange: (value: T) => void;
}) {
  const unset = options[0]?.value;
  const chosen = value !== unset;
  const shown = chosen
    ? (options.find((o) => o.value === value)?.label ?? label)
    : label;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={chosen ? `${label}: ${shown}` : label}
        className={cn(
          PROMPT_PILL,
          'group',
          chosen ? PROMPT_PILL_ON : PROMPT_PILL_OFF,
          'data-[state=open]:border-white/20 data-[state=open]:text-white',
        )}
      >
        {shown}
        <ChevronDown
          aria-hidden
          className="size-3.5 opacity-70 transition-transform group-data-[state=open]:rotate-180"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={8}
        className="max-h-80 min-w-44 overflow-y-auto rounded-[1.25rem] border border-white/10 bg-white/10 p-1.5 text-white shadow-[0_8px_28px_rgba(0,0,0,0.36)] backdrop-blur-xl [scrollbar-width:thin]"
      >
        {options.map((option) => {
          const selected = option.value === value;
          return (
            <DropdownMenuItem
              key={option.value}
              onSelect={() => onChange(option.value)}
              className={cn(
                'flex cursor-pointer items-center justify-between gap-3 rounded-xl px-3 py-2 text-[0.8125rem] outline-none',
                'focus:bg-white/10 data-[highlighted]:bg-white/10',
                selected ? 'text-white' : 'text-white/70',
              )}
            >
              {option.label}
              {selected && <Check aria-hidden className="size-3.5" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
