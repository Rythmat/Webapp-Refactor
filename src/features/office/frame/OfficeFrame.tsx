import { Suspense, useEffect, useRef, useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { FRAME_PX } from '@/components/atlas/layout/frameGeometry';
import { DashboardContentSkeleton } from '@/layouts/DashboardLayout';
import { OfficeInspector } from '../inspector/OfficeInspector';
import { OfficeCommandPalette } from '../palette/OfficeCommandPalette';
import { OfficeBottomRail } from './OfficeBottomRail';
import { OfficeTopRail } from './OfficeTopRail';
import { officeNav } from './officeNav';

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
        style={{ gridArea: 'top' }}
      />
      <main
        ref={stageRef}
        id="office-stage"
        className="relative mx-2 min-h-0 overflow-y-auto overflow-x-hidden rounded-[var(--daw-radius-lg)] bg-daw-surface-1 [scrollbar-width:thin]"
        style={{ gridArea: 'stage' }}
      >
        <Suspense fallback={<DashboardContentSkeleton />}>
          <Outlet />
        </Suspense>
      </main>
      <OfficeInspector style={{ gridArea: 'insp' }} />
      <OfficeBottomRail nav={nav} style={{ gridArea: 'bottom' }} />
      <OfficeCommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        classroomId={nav.scope === 'class' ? nav.classroomId : null}
      />
    </div>
  );
};
