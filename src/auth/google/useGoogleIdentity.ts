import { useEffect, useRef, useState } from 'react';
import { GOOGLE_CLIENT_ID, gisStateCookieDomain } from './config';
import {
  cancelOneTap,
  configureGis,
  getLoadedGis,
  loadGis,
  promptOneTap,
  type GisCredentialResponse,
} from './gis';

/**
 * - `off`: GIS isn't used here (disabled, or skipped on save-data).
 * - `loading`: fetching the script or about to initialise it.
 * - `ready`: initialised; the button can render and One Tap may prompt.
 * - `failed`: the script didn't load (blocked or timed out).
 */
export type GisStatus = 'off' | 'loading' | 'ready' | 'failed';

interface UseGoogleIdentityOptions {
  /** Gate from the caller: GIS enabled, user signed out, nothing pending. */
  enabled: boolean;
  /** `now` for the sign-in page; `idle` after page load so marketing pages keep their load speed. */
  load: 'now' | 'idle';
  /** Show the One Tap prompt once ready. */
  oneTap: boolean;
  promptDelayMs?: number;
  autoSelect: boolean;
  context: 'signin' | 'use';
  itpSupport: boolean;
  cancelOnTapOutside: boolean;
  onCredential: (response: GisCredentialResponse) => void;
}

const prefersSaveData = () =>
  typeof navigator !== 'undefined' &&
  (navigator as Navigator & { connection?: { saveData?: boolean } }).connection
    ?.saveData === true;

/** Runs `fn` once the page has loaded and the main thread is idle. Returns a canceller. */
const runWhenIdle = (fn: () => void) => {
  let idle: number | undefined;
  let timer: number | undefined;
  const schedule = () => {
    idle = window.requestIdleCallback?.(fn, { timeout: 4000 });
    if (idle === undefined) timer = window.setTimeout(fn, 1500);
  };
  if (document.readyState === 'complete') schedule();
  else window.addEventListener('load', schedule, { once: true });
  return () => {
    window.removeEventListener('load', schedule);
    if (idle !== undefined) window.cancelIdleCallback?.(idle);
    if (timer !== undefined) window.clearTimeout(timer);
  };
};

/**
 * Loads and initialises Google Identity Services for one surface, and shows
 * One Tap when asked. Only one surface uses it at a time (the sign-in page or
 * a marketing page), and leaving it (unmount, route change) cancels any open
 * prompt. Safe under StrictMode: the dev-only remount clears the first prompt
 * timer before it fires.
 */
export const useGoogleIdentity = ({
  enabled,
  load,
  oneTap,
  promptDelayMs = 0,
  autoSelect,
  context,
  itpSupport,
  cancelOnTapOutside,
  onCredential,
}: UseGoogleIdentityOptions): GisStatus => {
  const active = enabled && !(load === 'idle' && prefersSaveData());

  const [script, setScript] = useState<'pending' | 'loaded' | 'failed'>(() =>
    getLoadedGis() ? 'loaded' : 'pending',
  );
  const [configured, setConfigured] = useState(false);

  // Always call the latest handler without re-initialising GIS.
  const handlerRef = useRef(onCredential);
  useEffect(() => {
    handlerRef.current = onCredential;
  });

  useEffect(() => {
    if (!active || script !== 'pending') return;
    let cancelled = false;
    const start = () => {
      loadGis().then(
        () => !cancelled && setScript('loaded'),
        () => !cancelled && setScript('failed'),
      );
    };
    if (load === 'now') {
      start();
      return () => {
        cancelled = true;
      };
    }
    const cancelIdle = runWhenIdle(start);
    return () => {
      cancelled = true;
      cancelIdle();
    };
  }, [active, load, script]);

  // `ready` only after initialize, so the button (a child, whose effects run
  // first) never renders into an uninitialised GIS.
  useEffect(() => {
    if (!active || script !== 'loaded' || !GOOGLE_CLIENT_ID) return;
    const release = configureGis(
      {
        client_id: GOOGLE_CLIENT_ID,
        auto_select: autoSelect,
        cancel_on_tap_outside: cancelOnTapOutside,
        context,
        itp_support: itpSupport,
        state_cookie_domain: gisStateCookieDomain(),
      },
      (response) => handlerRef.current(response),
    );
    setConfigured(true);
    return release;
  }, [active, script, autoSelect, context, itpSupport, cancelOnTapOutside]);

  const status: GisStatus = !active
    ? 'off'
    : script === 'failed'
      ? 'failed'
      : script === 'loaded' && configured
        ? 'ready'
        : 'loading';

  useEffect(() => {
    if (!oneTap || status !== 'ready') return;
    const timer = window.setTimeout(() => promptOneTap(), promptDelayMs);
    return () => {
      window.clearTimeout(timer);
      cancelOneTap();
    };
  }, [oneTap, status, promptDelayMs]);

  return status;
};
