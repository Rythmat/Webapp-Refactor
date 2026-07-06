import { Outlet } from 'react-router-dom';
import { SettingsNav } from './SettingsNav';
import './settings.css';

/**
 * Top-level Settings hub — two-column layout inside the app chrome.
 * Left = grouped nav (SettingsNav), right = the routed section (Outlet).
 */
export const SettingsHub = () => {
  return (
    <div className="settings-root flex h-full min-h-0 w-full">
      <SettingsNav />
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[880px] px-6 py-8 md:px-8 md:py-10">
          <Outlet />
        </div>
      </div>
    </div>
  );
};
