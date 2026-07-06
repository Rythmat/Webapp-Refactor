import { Check, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const INSTRUMENTS = ['Piano', 'Guitar', 'Bass', 'Ukulele'] as const;

/**
 * Instrument picker — visually complete, NOT WIRED.
 * Displays "Instrument: Piano ▾" and opens a menu of instrument options, but
 * selecting an item does not update state or persist. Real store + backend
 * wiring lives outside this pass.
 */
export const InstrumentSelector = () => {
  const value: (typeof INSTRUMENTS)[number] = 'Piano';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Instrument selector (not yet wired)"
        className="group flex items-center gap-1.5 rounded-md px-3 py-1.5 text-base outline-none transition-colors hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-white/40 md:gap-2 md:px-4 md:py-2 md:text-lg"
      >
        <span className="text-white/60">Instrument:</span>
        <span className="font-semibold text-white">{value}</span>
        <ChevronDown className="h-5 w-5 text-white/60 transition-transform group-data-[state=open]:rotate-180" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[180px]">
        {INSTRUMENTS.map((name) => (
          <DropdownMenuItem
            key={name}
            // Unwired: onSelect is a no-op until the instrument store lands.
            onSelect={() => {}}
            className="flex items-center justify-between"
          >
            <span>{name}</span>
            {name === value && <Check className="h-4 w-4 opacity-70" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
