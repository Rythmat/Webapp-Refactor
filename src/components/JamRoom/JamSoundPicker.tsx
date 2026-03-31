// ── Jam Sound Picker ──────────────────────────────────────────────────────
// Compact popover for selecting a GM instrument in the Jam Room.
// Categories on the left, instruments on the right.

import { ChevronDown, X } from 'lucide-react';
import { useState } from 'react';
import {
  GM_PROGRAMS,
  GM_CATEGORIES,
  type GMCategory,
} from '@/daw/instruments/gmPrograms';

interface JamSoundPickerProps {
  currentProgram: number;
  onSelect: (program: number) => void;
}

export function JamSoundPicker({
  currentProgram,
  onSelect,
}: JamSoundPickerProps) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<GMCategory>(() => {
    const current = GM_PROGRAMS.find((p) => p.number === currentProgram);
    return (current?.category as GMCategory) ?? 'Piano';
  });

  const currentName =
    GM_PROGRAMS.find((p) => p.number === currentProgram)?.name ?? 'Piano';

  const programsInCategory = GM_PROGRAMS.filter((p) => p.category === category);

  return (
    <div className="relative">
      {/* Trigger button */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium transition-colors bg-zinc-800/50 text-zinc-300 hover:text-white hover:bg-zinc-800"
      >
        <span className="max-w-[120px] truncate">{currentName}</span>
        <ChevronDown
          size={10}
          className={`transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Popover */}
      {open && (
        <div
          className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 z-50 flex rounded-lg border border-zinc-800 overflow-hidden"
          style={{
            backgroundColor: '#111113ee',
            backdropFilter: 'blur(16px)',
            width: 380,
            maxHeight: 320,
          }}
        >
          {/* Categories */}
          <div
            className="shrink-0 overflow-y-auto border-r border-zinc-800"
            style={{ width: 120 }}
          >
            {GM_CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`block w-full text-left px-2.5 py-1.5 text-[10px] transition-colors ${
                  category === cat
                    ? 'bg-zinc-800 text-white font-medium'
                    : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Instruments */}
          <div className="flex-1 overflow-y-auto">
            <div className="flex items-center justify-between px-2.5 py-1.5 border-b border-zinc-800">
              <span className="text-[9px] text-zinc-600 uppercase tracking-wider font-medium">
                {category}
              </span>
              <button
                onClick={() => setOpen(false)}
                className="text-zinc-600 hover:text-white transition-colors"
              >
                <X size={12} />
              </button>
            </div>
            {programsInCategory.map((prog) => (
              <button
                key={prog.number}
                onClick={() => {
                  onSelect(prog.number);
                  setOpen(false);
                }}
                className={`block w-full text-left px-2.5 py-1.5 text-[11px] transition-colors ${
                  currentProgram === prog.number
                    ? 'bg-white/10 text-white font-medium'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                }`}
              >
                {prog.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
