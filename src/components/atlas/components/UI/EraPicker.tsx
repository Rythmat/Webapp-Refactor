import { Clock, X } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import {
  useAppState,
  useAppDispatch,
} from '@/components/atlas/context/AppContext';
import { MUSICAL_ERAS } from '@/components/atlas/data';

export function EraPicker() {
  const { selectedEra } = useAppState();
  const dispatch = useAppDispatch();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const activeEra = selectedEra
    ? MUSICAL_ERAS.find((e) => e.id === selectedEra)
    : null;

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const selectEra = (eraId: string | null) => {
    dispatch({ type: 'SET_ERA', payload: eraId });
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <button
        aria-label="Filter by musical era"
        aria-expanded={open}
        className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#60a5fa] ${
          activeEra
            ? `${activeEra.activeBg} ${activeEra.activeText} ${activeEra.activeBorder}`
            : 'border border-white/10 bg-white/5 text-white/70 hover:bg-white/10'
        }`}
        onClick={() => setOpen(!open)}
      >
        <Clock className="size-3.5" />
        {activeEra ? activeEra.label : 'Era'}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-2xl border border-white/10 bg-black/20 shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between border-b border-white/10 p-3">
            <h3 className="text-sm font-medium text-white">Musical Era</h3>
            <button
              aria-label="Close era filter"
              className="text-white/40 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#60a5fa]"
              onClick={() => setOpen(false)}
            >
              <X className="size-3.5" />
            </button>
          </div>
          <div className="space-y-0.5 p-2">
            <button
              className={`w-full rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors ${
                !selectedEra
                  ? 'bg-white/10 text-white'
                  : 'text-white/60 hover:bg-white/10 hover:text-white'
              }`}
              onClick={() => selectEra(null)}
            >
              All Eras
            </button>
            {MUSICAL_ERAS.map((era) => (
              <button
                key={era.id}
                className={`w-full rounded-lg px-3 py-2 text-left text-xs font-medium transition-colors ${
                  selectedEra === era.id
                    ? `${era.activeBg} ${era.activeText}`
                    : 'text-white/60 hover:bg-white/10 hover:text-white'
                }`}
                onClick={() => selectEra(era.id)}
              >
                <span>{era.label}</span>
                <span className="ml-1.5 text-[10px] text-white/40">
                  {era.yearStart}–{era.yearEnd}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
