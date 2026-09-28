import { Check, ChevronDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  instrumentOptions,
  useInstrumentStore,
  useLearnInstrument,
  type LearnInstrument,
} from '@/features/learn/useInstrumentStore';

/**
 * Instrument picker — "Instrument: Piano ▾". Choosing an instrument stores it
 * for Learn on this device (useInstrumentStore); the Technique tab then shows
 * that instrument's lessons. Instruments without lessons yet are listed but
 * disabled, with a "Coming soon" label.
 */
export const InstrumentSelector = ({
  onChange,
}: {
  /** Called after the stored instrument changes. */
  onChange?: (instrument: LearnInstrument) => void;
}) => {
  const value = useLearnInstrument();
  const setInstrument = useInstrumentStore((s) => s.setInstrument);
  const options = instrumentOptions();
  const label = options.find((o) => o.id === value)?.label ?? 'Piano';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`Instrument: ${label}`}
        className="group flex items-center gap-1.5 rounded-md px-3 py-1.5 text-base outline-none transition-colors hover:bg-white/5 focus-visible:ring-2 focus-visible:ring-white/40 md:gap-2 md:px-4 md:py-2 md:text-lg"
      >
        <span className="text-white/60">Instrument:</span>
        <span className="font-semibold text-white">{label}</span>
        <ChevronDown className="h-5 w-5 text-white/60 transition-transform group-data-[state=open]:rotate-180" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[180px]">
        {options.map((option) => (
          <DropdownMenuItem
            key={option.id}
            disabled={!option.available}
            onSelect={() => {
              if (option.id !== 'piano' && option.id !== 'guitar') return;
              if (option.id !== value) {
                setInstrument(option.id);
                onChange?.(option.id);
              }
            }}
            className="flex items-center justify-between gap-3"
          >
            <span>{option.label}</span>
            {option.available ? (
              option.id === value && <Check className="h-4 w-4 opacity-70" />
            ) : (
              <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] text-white/60">
                Coming soon
              </span>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
