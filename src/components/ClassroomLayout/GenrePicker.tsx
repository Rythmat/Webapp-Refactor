import { type FC, useEffect, useRef } from 'react';

const STUDIO_GENRES = [
  'Pop',
  'Rock',
  'Jazz',
  'Funk',
  'Folk',
  'EDM',
  'Hip Hop',
  'R&B',
  'Reggae',
  'Latin',
  'Indie',
] as const;

interface GenrePickerProps {
  selected: string | null;
  onSelect: (genre: string | null) => void;
  onClose: () => void;
}

export const GenrePicker: FC<GenrePickerProps> = ({
  selected,
  onSelect,
  onClose,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute bottom-full mb-2 left-0 z-50 bg-[#1a1a1a] border border-white/10 rounded-xl p-2 shadow-xl min-w-[200px]"
    >
      <div className="grid grid-cols-2 gap-1">
        {STUDIO_GENRES.map((g) => {
          const isActive = selected === g;
          return (
            <button
              key={g}
              onClick={() => {
                onSelect(isActive ? null : g);
                onClose();
              }}
              className={`px-3 py-1.5 rounded-lg text-xs text-left transition-all ${
                isActive
                  ? 'bg-white text-black font-medium'
                  : 'text-gray-300 hover:bg-white/10'
              }`}
            >
              {g}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export { STUDIO_GENRES };
