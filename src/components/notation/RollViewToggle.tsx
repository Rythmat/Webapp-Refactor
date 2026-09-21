import { ChartNoAxesGantt, Music } from 'lucide-react';
import type { RollView } from '@/lib/notation';

/** Two-icon switch between the piano roll and the grand staff. */
export function RollViewToggle({
  view,
  onChange,
}: {
  view: RollView;
  onChange: (view: RollView) => void;
}) {
  const options = [
    { id: 'roll' as const, label: 'Piano roll', Icon: ChartNoAxesGantt },
    { id: 'notation' as const, label: 'Notation', Icon: Music },
  ];
  return (
    <div
      role="radiogroup"
      aria-label="Note view"
      className="flex shrink-0 items-center gap-0.5 rounded-md border border-white/10 bg-black/30 p-0.5"
    >
      {options.map(({ id, label, Icon }) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={view === id}
          aria-label={label}
          title={label}
          onClick={() => onChange(id)}
          className={`flex size-6 items-center justify-center rounded transition-colors ${
            view === id
              ? 'bg-white/15 text-white'
              : 'text-white/40 hover:bg-white/5 hover:text-white/70'
          }`}
        >
          <Icon className="size-3.5" />
        </button>
      ))}
    </div>
  );
}
