import { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { FRAME_PX } from '@/components/atlas/layout/frameGeometry';
import { DashboardContentSkeleton } from '@/layouts/DashboardLayout';
import { OfficeInspector } from '../inspector/OfficeInspector';
import { OfficeCommandPalette } from '../palette/OfficeCommandPalette';
import { OfficeBottomRail } from './OfficeBottomRail';
import { OfficeTopRail } from './OfficeTopRail';
import { officeNav } from './officeNav';
import { RailSlotContext } from './railSlot';

// ── The Office in the Studio's frame (owner, 2026-11-09) ───────────────────
// The rails, gutters and Inspector of the Studio and the Globe, so the
// teacher's tools read as the same app: the top rail says where (and holds
// search and Go Live), the stage card holds the page, the Inspector opens
// beside it on whatever's selected, and the bottom rail holds the pages.
// The app's left rail stays (ClassroomDashboard keeps it for Office paths).

const GRID: React.CSSProperties = {
  gridTemplateAreas: '"top top" "stage insp" "bottom bottom"',
  gridTemplateRows: `${FRAME_PX.top}px minmax(0,1fr) ${FRAME_PX.bottom}px`,
  gridTemplateColumns: 'minmax(0,1fr) auto',
};

export const OfficeFrame = () => {
  const { pathname } = useLocation();
  const nav = officeNav(pathname) ?? officeNav('/office');
  const [paletteOpen, setPaletteOpen] = useState(false);
  const stageRef = useRef<HTMLElement>(null);
  const [railSlot, setRailSlot] = useState<HTMLElement | null>(null);
  const [topSlot, setTopSlot] = useState<HTMLElement | null>(null);
  const [topClaims, claimTop] = useState(0);
  const slots = useMemo(
    () => ({ bottom: railSlot, top: topSlot, claimTop }),
    [railSlot, topSlot],
  );

  // ⌘K / Ctrl-K opens search from anywhere in the Office.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // The stage scrolls, not the window: a new page starts at its top.
  useEffect(() => {
    stageRef.current?.scrollTo({ top: 0 });
  }, [pathname]);

  if (!nav) return null;

  return (
    <div
      data-testid="office-frame"
      className="grid h-full min-h-0 w-full"
      style={GRID}
    >
      <OfficeTopRail
        nav={nav}
        onSearch={() => setPaletteOpen(true)}
        actionsRef={setTopSlot}
        pageHasActions={topClaims > 0}
        style={{ gridArea: 'top' }}
      />
      <main
        ref={stageRef}
        id="office-stage"
        className="relative mx-2 min-h-0 overflow-y-auto overflow-x-hidden rounded-[var(--daw-radius-lg)] bg-daw-surface-1 [scrollbar-width:thin]"
        style={{ gridArea: 'stage' }}
      >
        <RailSlotContext.Provider value={slots}>
          <Suspense fallback={<DashboardContentSkeleton />}>
            <Outlet />
          </Suspense>
        </RailSlotContext.Provider>
      </main>
      <OfficeInspector style={{ gridArea: 'insp' }} />
      <OfficeBottomRail
        nav={nav}
        slotRef={setRailSlot}
        style={{ gridArea: 'bottom' }}
      />
      <OfficeCommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        classroomId={nav.scope === 'class' ? nav.classroomId : null}
      />
    </div>
  );
};
