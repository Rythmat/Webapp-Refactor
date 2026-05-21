import { Check, ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface FilterOption<T extends string> {
  value: T;
  label: string;
}

interface FilterDropdownProps<T extends string> {
  label: string;
  value: T;
  options: FilterOption<T>[];
  onChange: (value: T) => void;
  minWidth?: number;
  triggerWidth?: number;
  ariaLabel?: string;
  endAdornment?: ReactNode;
}

export function FilterDropdown<T extends string>({
  label,
  value,
  options,
  onChange,
  minWidth = 110,
  triggerWidth,
  ariaLabel,
}: FilterDropdownProps<T>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={ariaLabel ?? label}
          className="inline-flex items-center justify-between rounded-md outline-none focus-visible:ring-1 focus-visible:ring-white/40 transition-colors"
          style={{
            height: 32,
            minWidth,
            width: triggerWidth,
            padding: '0 12px',
            gap: 6,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: '#e4e4e4',
            fontSize: 12,
            fontWeight: 400,
          }}
        >
          <span className="truncate text-left">{label}</span>
          <ChevronDown
            width={12}
            height={12}
            style={{ color: 'rgba(255,255,255,0.5)', flexShrink: 0 }}
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={6}
        className="border-white/10"
        style={{
          background: 'rgba(20,20,22,0.96)',
          minWidth: Math.max(minWidth, 140),
          padding: 4,
          fontSize: 12,
        }}
      >
        {options.map((opt) => {
          const selected = opt.value === value;
          return (
            <DropdownMenuItem
              key={opt.value}
              onSelect={(e) => {
                e.preventDefault();
                onChange(opt.value);
              }}
              className="cursor-pointer rounded-sm focus:bg-white/10"
              style={{
                color: selected ? '#ffffff' : 'rgba(255,255,255,0.75)',
                padding: '6px 8px 6px 24px',
                fontSize: 12,
                position: 'relative',
              }}
            >
              {selected && (
                <Check
                  width={12}
                  height={12}
                  style={{
                    position: 'absolute',
                    left: 6,
                    top: '50%',
                    transform: 'translateY(-50%)',
                  }}
                />
              )}
              {opt.label}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
