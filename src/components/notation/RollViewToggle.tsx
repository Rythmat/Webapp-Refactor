import { ChartNoAxesGantt, Music, type LucideIcon } from 'lucide-react';
import { useRollView, type RollView } from '@/lib/notation';

/**
 * Two-icon (Learn: three-icon) switch between the app's own note picture and the staff. The
 * left-hand icon names whichever picture that surface draws — a piano roll in
 * Learn and Studio, a keyboard in the song library's chord popup. When other
 * instruments get their own iconic notation, this is where their icon goes.
 * `cascade` adds Learn's third picture: notes falling into the keys.
 */
export function RollViewToggle({
  view,
  onChange,
  iconicIcon = ChartNoAxesGantt,
  iconicLabel = 'Piano roll',
  cascade = false,
}: {
  view: RollView;
  onChange: (view: RollView) => void;
  iconicIcon?: LucideIcon;
  iconicLabel?: string;
  cascade?: boolean;
}) {
  const options: {
    id: RollView;
    label: string;
    Icon: LucideIcon;
    iconClassName?: string;
  }[] = [
    { id: 'roll', label: iconicLabel, Icon: iconicIcon },
    { id: 'notation', label: 'Notation', Icon: Music },
    ...(cascade
      ? [
          {
            id: 'cascade' as const,
            label: 'Falling notes',
            // The roll's own bars stood upright: the same picture, falling.
            Icon: ChartNoAxesGantt,
            iconClassName: 'rotate-90',
          },
        ]
      : []),
  ];
  return (
    <div
      role="radiogroup"
      aria-label="Note view"
      className="flex shrink-0 items-center gap-0.5 rounded-md border border-white/10 bg-black/30 p-0.5"
    >
      {options.map(({ id, label, Icon, iconClassName }) => (
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
          <Icon className={`size-3.5 ${iconClassName ?? ''}`} />
        </button>
      ))}
    </div>
  );
}

/**
 * The same switch at a lesson's nav-row size, beside the section pills and
 * ♪ Practice Track: an icon and a word per view, the choice a white pill, on
 * the device's saved Learn view (so the roll it drives follows).
 */
export function SavedRollViewSwitch() {
  const [view, setView] = useRollView('learn');
  const options: {
    id: RollView;
    label: string;
    Icon: LucideIcon;
    iconClassName?: string;
  }[] = [
    { id: 'roll', label: 'Roll', Icon: ChartNoAxesGantt },
    { id: 'notation', label: 'Notation', Icon: Music },
    {
      id: 'cascade',
      label: 'Falling',
      Icon: ChartNoAxesGantt,
      iconClassName: 'rotate-90',
    },
  ];
  return (
    <div
      role="radiogroup"
      aria-label="Note view"
      data-roll-view-switch
      className="flex h-9 shrink-0 items-center rounded-full ring-1 ring-inset ring-white/10 max-[639px]:h-11"
    >
      {options.map(({ id, label, Icon, iconClassName }) => (
        <button
          key={id}
          type="button"
          role="radio"
          aria-checked={view === id}
          title={id === 'cascade' ? 'Falling notes' : label}
          onClick={() => setView(id)}
          className={`inline-flex h-full items-center gap-2 rounded-full px-4 text-sm font-normal transition-colors duration-150 ${
            view === id
              ? 'bg-white text-[#101012]'
              : 'text-white/55 hover:text-[#e8e8f0]'
          }`}
        >
          <Icon
            aria-hidden
            className={`size-4 shrink-0 ${iconClassName ?? ''}`}
          />
          {label}
        </button>
      ))}
    </div>
  );
}
