import { Outlet } from 'react-router-dom';
import { DashboardFooter } from '@/components/ClassroomLayout/dashboard/DashboardFooter';
import { SettingsNav } from './SettingsNav';
import './settings.css';

/**
 * Top-level Settings hub — two-column layout inside the app chrome.
 * Left = grouped nav (SettingsNav), right = the routed section (Outlet)
 * followed by the shared Home-dashboard footer for legal + social links.
 */
export const SettingsHub = () => {
  return (
    <div className="settings-root flex h-full min-h-0 w-full">
      <SettingsNav />
      <div className="flex-1 overflow-y-auto">
        <div className="flex min-h-full flex-col">
          <div className="mx-auto w-full max-w-[880px] px-6 py-8 md:px-8 md:py-10">
            <Outlet />
          </div>
          <div className="mx-auto mt-auto w-full max-w-[1720px] px-6 pb-6 md:px-10 md:pb-10">
            <DashboardFooter />
          </div>
        </div>
      </div>
    </div>
  );
};
