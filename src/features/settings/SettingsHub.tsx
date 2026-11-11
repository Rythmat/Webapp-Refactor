import { Outlet } from 'react-router-dom';
import './settings.css';

/**
 * The Account area's frame (owner, 2026-11-10: samply.app/profile's): one
 * 700px column, centred, right under the app's toolbar. Its menu is the app
 * rail's own, which turns into the Account's here (AppRail), so there's no
 * second one on the page.
 */
export const SettingsHub = () => (
  <div className="settings-root flex w-full justify-center px-2 pb-24">
    <div className="w-full max-w-[39.77rem]">
      <Outlet />
    </div>
  </div>
);
