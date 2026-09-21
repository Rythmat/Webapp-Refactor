import { X } from 'lucide-react';
import type { ReactNode } from 'react';
import { StopThumb } from '@/components/atlas/components/UI/StopThumb';
import type { StopPresentation } from '@/components/atlas/navigation/describeStop';

/**
 * The left-hand panel shell the artist and search views share — the same glass
 * card, position, and close control as the region DetailsCard, so moving
 * between a place, an artist, and a search feels like one surface changing
 * rather than three different ones.
 */
export function SidePanel({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <section className="absolute left-4 top-4 z-[1000] flex max-h-[calc(100%-11rem)] w-[min(440px,calc(100%-2rem))] flex-col rounded-2xl border border-white/10 bg-black/20 shadow-2xl backdrop-blur-md">
      <header className="relative shrink-0 p-4 pr-10">
        <button
          aria-label="Close"
          className="absolute right-3 top-3 rounded text-white/40 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#60a5fa]"
          type="button"
          onClick={onClose}
        >
          <X className="size-4" />
        </button>
        <h3 className="text-xl font-medium text-white">{title}</h3>
        {subtitle && <p className="mt-0.5 text-sm text-white/50">{subtitle}</p>}
      </header>
      <div className="overflow-y-auto border-t border-white/10 px-2 py-2">
        {children}
      </div>
    </section>
  );
}

/** One clickable row: thumbnail, title, subtitle, optional badge. */
export function PanelRow({
  presentation,
  title,
  subtitle,
  badge,
  onClick,
}: {
  presentation: StopPresentation;
  title: string;
  subtitle: string;
  badge?: string;
  onClick: () => void;
}) {
  return (
    <button
      className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#60a5fa]"
      type="button"
      onClick={onClick}
    >
      <span className="w-20 shrink-0">
        <StopThumb presentation={presentation} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 text-sm leading-snug text-white">
          {title}
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 text-xs text-white/50">
          {subtitle}
          {badge && (
            <span className="rounded-full border border-white/15 px-1.5 text-[10px] uppercase tracking-wide text-white/50">
              {badge}
            </span>
          )}
        </span>
      </span>
    </button>
  );
}
