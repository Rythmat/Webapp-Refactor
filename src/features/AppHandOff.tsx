import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { APP_ORIGIN } from '@/constants/hosts';

/**
 * Catch-all on the marketing host: any route that isn't a public page
 * belongs to the app, so reload it on the app host (same path and query).
 * Vercel already redirects direct loads; this covers in-page navigation.
 */
export const AppHandOff = () => {
  const { pathname, search, hash } = useLocation();

  useEffect(() => {
    window.location.replace(`${APP_ORIGIN}${pathname}${search}${hash}`);
  }, [pathname, search, hash]);

  return null;
};
