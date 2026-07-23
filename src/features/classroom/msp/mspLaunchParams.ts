/**
 * Pure helpers for the classroom "app-route" launch handshake.
 *
 * The student's live tab appends these params when opening a module route; the
 * module reads them on mount and reports completion back to the MSP inbox.
 * Because some modules (e.g. Learn's ActivityFlow) `navigate()` internally and
 * drop the query string, the module stashes the params in sessionStorage on
 * first mount and reads them from there thereafter.
 */
import type { AtlasExpects, AtlasModule } from './capabilities';

export interface MspLaunchParams {
  /** Absent offline (mint has no backend in local-mock sessions). */
  token?: string;
  interactionId: string;
  enrollmentId: string;
  module: AtlasModule;
  activityRef: string;
  expects: AtlasExpects;
}

const STASH_KEY = 'msp:launch:v1';
const isBrowser = typeof window !== 'undefined';

/** Append the launch handshake params to an in-SPA href, preserving existing query (e.g. `?activity=`). */
export const appendMspLaunchParams = (
  href: string,
  p: MspLaunchParams,
): string => {
  const [path, existing = ''] = href.split('?');
  const search = new URLSearchParams(existing);
  if (p.token) search.set('msp', p.token);
  search.set('interactionId', p.interactionId);
  search.set('enrollmentId', p.enrollmentId);
  search.set('module', p.module);
  search.set('activityRef', p.activityRef);
  search.set('expects', p.expects);
  const qs = search.toString();
  return qs ? `${path}?${qs}` : path;
};

/** Parse launch params out of a `location.search` string, or null if incomplete. */
export const readMspLaunchParams = (search: string): MspLaunchParams | null => {
  const q = new URLSearchParams(search);
  const interactionId = q.get('interactionId');
  const enrollmentId = q.get('enrollmentId');
  const module = q.get('module') as AtlasModule | null;
  const activityRef = q.get('activityRef');
  const expects = q.get('expects') as AtlasExpects | null;
  if (!interactionId || !enrollmentId || !module || !activityRef || !expects)
    return null;
  const token = q.get('msp');
  return {
    ...(token ? { token } : {}),
    interactionId,
    enrollmentId,
    module,
    activityRef,
    expects,
  };
};

export const stashMspLaunchParams = (p: MspLaunchParams): void => {
  if (!isBrowser) return;
  try {
    window.sessionStorage.setItem(STASH_KEY, JSON.stringify(p));
  } catch {
    // No-op on quota / privacy mode.
  }
};

export const readStashedMspLaunchParams = (): MspLaunchParams | null => {
  if (!isBrowser) return null;
  try {
    const raw = window.sessionStorage.getItem(STASH_KEY);
    return raw ? (JSON.parse(raw) as MspLaunchParams) : null;
  } catch {
    return null;
  }
};

export const clearStashedMspLaunchParams = (): void => {
  if (!isBrowser) return;
  try {
    window.sessionStorage.removeItem(STASH_KEY);
  } catch {
    // No-op.
  }
};

/** Deterministic fallback inbox token when no minted `msp` token exists (offline). */
export const fallbackInboxToken = (
  interactionId: string,
  enrollmentId: string,
): string => `local:${interactionId}:${enrollmentId}`;
