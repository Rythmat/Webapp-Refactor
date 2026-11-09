import { X } from 'lucide-react';
import type { ReactNode, RefObject } from 'react';
import { StopThumb } from '@/components/atlas/components/UI/StopThumb';
import {
  ATLAS_ROW,
  AtlasChip,
  AtlasIconButton,
  AtlasPanel,
  AtlasPanelBody,
} from '@/components/atlas/components/UI/primitives';
import type { StopPresentation } from '@/components/atlas/navigation/describeStop';

/**
 * The left-hand panel shell the artist and search views share — the same
 * panel, zone, and close control as the region DetailsCard, so moving
 * between a place, an artist, and a search feels like one surface changing
 * rather than three different ones.
 */
export function SidePanel({
  title,
  subtitle,
  onClose,
  children,
  bodyRef,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  /** The scrolling body, for lists that virtualize inside it. */
  bodyRef?: RefObject<HTMLDivElement>;
}) {
  return (
    <AtlasPanel
      actions={
        <AtlasIconButton aria-label="Close" size="sm" onClick={onClose}>
          <X aria-hidden className="size-4" />
        </AtlasIconButton>
      }
      className="w-[440px]"
      subtitle={subtitle}
      title={title}
    >
      <AtlasPanelBody ref={bodyRef} className="px-2 py-2">
        {children}
      </AtlasPanelBody>
    </AtlasPanel>
  );
}

/** One clickable row: thumbnail, title, subtitle, optional badge. */
export function PanelRow({
  presentation,
  title,
  subtitle,
  badge,
  badgeDot,
  tile = false,
  onClick,
}: {
  presentation: StopPresentation;
  title: string;
  subtitle: string;
  badge?: string;
  /** A CSS colour for the dot leading the badge: its entity kind's. */
  badgeDot?: string;
  /** An event's floating tile, as in the details card. */
  tile?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`flex w-full items-center gap-3 text-left ${ATLAS_ROW} ${
        tile
          ? 'rounded-2xl border border-white/10 bg-white/[0.04] p-2 [box-shadow:var(--daw-shadow-float)] hover:bg-white/[0.08]'
          : 'px-2 py-1.5'
      }`}
      type="button"
      onClick={onClick}
    >
      <span className="w-20 shrink-0">
        <StopThumb presentation={presentation} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="line-clamp-2 text-sm leading-snug text-atlas-text">
          {title}
        </span>
        <span className="mt-0.5 flex items-center gap-1.5 text-xs text-atlas-text-2">
          {subtitle}
          {badge && <AtlasChip dot={badgeDot}>{badge}</AtlasChip>}
        </span>
      </span>
    </button>
  );
}
