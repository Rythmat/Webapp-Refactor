import { Suspense, useLayoutEffect } from 'react';
import { Outlet } from 'react-router';
import { Sidebar } from './Sidebar';
import './console.css';

/**
 * The /console shell: the app's sidebar (see Sidebar.tsx) beside a column the
 * routes fill. Each route group brings its own frame — `ConsolePage` for the
 * padded, scrolling console pages (Users, Telemetry, Records…), the content
 * area's layout for the mirrored app with its edit bar in the app's XP-bar
 * slot — so the mirrored app is exactly the size students see.
 */
export const DashboardLayout = (props: { fallback?: React.ReactNode }) => {
  // On <html> rather than this root so Radix portals (selects, dialogs,
  // tooltips) mounted on <body> get the console theme too. A layout effect so
  // the first paint is already themed.
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.add('console-theme');
    return () => root.classList.remove('console-theme');
  }, []);

  return (
    <div className="flex h-screen w-screen bg-background text-foreground">
      <Sidebar className="shrink-0" />
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Suspense fallback={props.fallback}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
};
