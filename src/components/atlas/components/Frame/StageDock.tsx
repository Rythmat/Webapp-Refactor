import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';
import { GuidedTourBar } from '@/components/atlas/components/UI/GuidedTourBar';
import { ModuleProgressBar } from '@/components/atlas/components/UI/ModuleProgressBar';
import { RegionTimeline } from '@/components/atlas/components/UI/RegionTimeline';
import {
  ATLAS_EYEBROW,
  AtlasIconButton,
} from '@/components/atlas/components/UI/primitives';
import type { BottomBarSlot } from '@/components/atlas/layout/AtlasZones';
import {
  AtlasZoneContext,
  type AtlasZone,
} from '@/components/atlas/layout/zoneContext';
import { useAtlasFrame } from '@/components/atlas/navigation/useAtlasNavigate';
import { useAtlasSelector } from '@/components/atlas/state/atlasStore';

const TIMELINE: BottomBarSlot = {
  label: 'timeline',
  maxWidth: 800,
  node: <RegionTimeline />,
};
const PATHWAY: BottomBarSlot = {
  label: 'pathway',
  maxWidth: 640,
  node: <ModuleProgressBar />,
};
const TOUR: BottomBarSlot = {
  label: 'tour',
  maxWidth: 640,
  node: <GuidedTourBar />,
};

/**
 * The bar under the map: a pathway's or a tour's progress, else the place's
 * timeline — on the map; the timeline view is a timeline already. The phone
 * rests it on its sheet (AtlasZones), the desktop docks it (StageDock).
 */
export function useBottomBar(): BottomBarSlot | null {
  const inModule = useAtlasSelector((s) => s.activeModule !== null);
  const inTour = useAtlasSelector((s) => s.activeTour !== null);
  const timeline = useAtlasFrame((frame) => frame.view === 'timeline');
  if (timeline) return null;
  return inTour ? TOUR : inModule ? PATHWAY : TIMELINE;
}

const DOCK: AtlasZone = { kind: 'dock' };

const titleOf = (label: string) =>
  label.charAt(0).toUpperCase() + label.slice(1);

/**
 * The stage's dock (owner, 2026-10-29: the Globe in the Studio's frame), as
 * the Studio's editor dock under its timeline: the bar under the map, in the
 * stage card itself, collapsible to its title row so the map can have the
 * room back.
 */
export function StageDock() {
  const bar = useBottomBar();
  const [open, setOpen] = useState(true);
  if (!bar) return null;
  return (
    <section
      aria-label={titleOf(bar.label)}
      className="shrink-0 border-t border-atlas-panel-border"
      data-atlas-zone-item="bottom-bar"
    >
      <div className="flex h-8 items-center gap-2 pl-4 pr-2">
        <span className={ATLAS_EYEBROW}>{titleOf(bar.label)}</span>
        <div className="flex-1" />
        <AtlasIconButton
          aria-expanded={open}
          aria-label={open ? `Hide the ${bar.label}` : `Show ${bar.label}`}
          size="sm"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? (
            <ChevronDown aria-hidden className="size-4" />
          ) : (
            <ChevronUp aria-hidden className="size-4" />
          )}
        </AtlasIconButton>
      </div>
      {open && (
        <AtlasZoneContext.Provider value={DOCK}>
          <div
            className="mx-auto w-full px-4 pb-3"
            style={{ maxWidth: bar.maxWidth }}
          >
            {bar.node}
          </div>
        </AtlasZoneContext.Provider>
      )}
    </section>
  );
}
