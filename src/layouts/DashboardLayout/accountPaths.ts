import { ProfileRoutes, SettingsRoutes, UserRoutes } from '@/constants/routes';
import { isRouteActive } from './SidebarMainNavItem';

/**
 * The Account area (owner, 2026-11-10, as samply.app/profile's): while one
 * of these shows, the app rail holds the Account menu in place of the app's.
 */
export function isAccountPath(pathname: string): boolean {
  return (
    isRouteActive(pathname, SettingsRoutes.root()) ||
    isRouteActive(pathname, UserRoutes.root()) ||
    isRouteActive(pathname, ProfileRoutes.awards()) ||
    isRouteActive(pathname, ProfileRoutes.plan())
  );
}
