import { ChartNoAxesGantt, Music, type LucideIcon } from 'lucide-react';
import type { RollView } from '@/lib/notation';

/**
 * Two-icon switch between the app's own note picture and the staff. The
 * left-hand icon names whichever picture that surface draws — a piano roll in
 * Learn and Studio, a keyboard in the song library's chord popup. When other
 * instruments get their own iconic notation, this is where their icon goes.
 */
export function RollViewToggle({
  view,
  onChange,
  iconicIcon = ChartNoAxesGantt,
  iconicLabel = 'Piano roll',
}: {
  view: RollView;
  onChange: (view: RollView) => void;
  iconicIcon?: LucideIcon;
  iconicLabel?: string;
}) {
  const options = [
    { id: 'roll' as const, label: iconicLabel, Icon: iconicIcon },
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
