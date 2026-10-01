import { Music } from 'lucide-react';
import type { GuitarView } from '@/lib/notation';

/**
 * TAB | Notation switch for guitar lessons, styled like RollViewToggle. There
 * is deliberately no piano-roll option: guitar reads from TAB.
 */
export function GuitarViewToggle({
  view,
  onChange,
}: {
  view: GuitarView;
  onChange: (view: GuitarView) => void;
}) {
  const options = [
    {
      id: 'tab' as const,
      label: 'Tablature',
      // The word itself, as a TAB clef reads — no icon says "tablature".
      glyph: <span className="text-[9px] font-bold leading-none">TAB</span>,
    },
    {
      id: 'notation' as const,
      label: 'Notation',
      glyph: <Music className="size-3.5" />,
    },
  ];
  return (
    <div
      role="radiogroup"
      aria-label="Guitar note view"
      className="flex shrink-0 items-center gap-0.5 rounded-md border border-white/10 bg-black/30 p-0.5"
    >
      {options.map(({ id, label, glyph }) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={view === id}
          aria-label={label}
          title={label}
          onClick={() => onChange(id)}
          className={`flex h-6 min-w-6 items-center justify-center rounded px-1 transition-colors ${
            view === id
              ? 'bg-white/15 text-white'
              : 'text-white/40 hover:bg-white/5 hover:text-white/70'
          }`}
        >
          {glyph}
        </button>
      ))}
    </div>
  );
}
