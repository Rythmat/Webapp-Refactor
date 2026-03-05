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
        className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
          activeEra
            ? `${activeEra.activeBg} ${activeEra.activeText} ${activeEra.activeBorder}`
            : 'border border-zinc-700/50 bg-zinc-800/80 text-zinc-300 hover:bg-zinc-700/80'
        }`}
        onClick={() => setOpen(!open)}
      >
        <Clock className="size-3.5" />
        {activeEra ? activeEra.label : 'Era'}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-zinc-700/50 bg-zinc-900/95 shadow-2xl backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-zinc-700/50 p-3">
            <h3 className="text-sm font-semibold text-white">Musical Era</h3>
            <button
              className="text-zinc-500 transition-colors hover:text-white"
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
                  : 'text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-200'
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
                    : 'text-zinc-400 hover:bg-zinc-800/70 hover:text-zinc-200'
                }`}
                onClick={() => selectEra(era.id)}
              >
                <span>{era.label}</span>
                <span className="ml-1.5 text-[10px] text-zinc-500">
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
