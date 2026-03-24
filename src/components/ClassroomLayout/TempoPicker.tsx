import { Minus, Plus } from 'lucide-react';
import { type FC, useEffect, useRef, useState } from 'react';

interface TempoPickerProps {
  selected: number | null;
  onSelect: (bpm: number | null) => void;
  onClose: () => void;
}

export const TempoPicker: FC<TempoPickerProps> = ({
  selected,
  onSelect,
  onClose,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [value, setValue] = useState(selected ?? 120);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const clamp = (v: number) => Math.max(40, Math.min(300, v));

  const apply = () => {
    onSelect(value);
    onClose();
  };

  const clear = () => {
    onSelect(null);
    onClose();
  };

  return (
    <div
      ref={ref}
      className="absolute bottom-full mb-2 left-0 z-50 bg-[#1a1a1a] border border-white/10 rounded-xl p-3 shadow-xl min-w-[180px]"
    >
      <div className="text-[10px] text-gray-500 mb-2 uppercase tracking-wider">
        Tempo (BPM)
      </div>

      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={() => setValue((v) => clamp(v - 5))}
          className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10"
        >
          <Minus size={12} />
        </button>
        <input
          type="number"
          min={40}
          max={300}
          value={value}
          onChange={(e) => setValue(clamp(parseInt(e.target.value, 10) || 120))}
          className="flex-1 bg-white/5 border border-white/10 rounded-lg px-2 py-1.5 text-center text-sm text-white outline-none focus:border-white/30 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />
        <button
          onClick={() => setValue((v) => clamp(v + 5))}
          className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10"
        >
          <Plus size={12} />
        </button>
      </div>

      <div className="flex gap-1">
        <button
          onClick={clear}
          className="flex-1 px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:bg-white/10 transition-all"
        >
          Clear
        </button>
        <button
          onClick={apply}
          className="flex-1 px-3 py-1.5 rounded-lg text-xs bg-white text-black font-medium transition-all hover:bg-gray-200"
        >
          Set
        </button>
      </div>
    </div>
  );
};
