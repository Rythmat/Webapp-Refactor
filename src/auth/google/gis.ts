/**
 * Thin wrapper over Google Identity Services (`google.accounts.id`): loads the
 * script once, keeps one `initialize` call per config, and guards the One Tap
 * prompt. Local types cover the handful of calls we make (the DefinitelyTyped
 * package lags on FedCM fields).
 *
 * One Tap now always runs through the browser's FedCM API, so:
 * - `use_fedcm_for_prompt` is ignored and not passed;
 * - the "display" moment methods are unsupported, so only skipped and
 *   dismissed moments are read, and nothing in the UI depends on whether the
 *   prompt actually showed;
 * - a second prompt while one is open is rejected by the browser, hence the
 *   in-flight guard.
 */

const GIS_SRC = 'https://accounts.google.com/gsi/client';
const LOAD_TIMEOUT_MS = 8_000;

export interface GisCredentialResponse {
  /** The Google ID token (a JWT). */
  credential: string;
  /** How the account was picked: 'auto' / 'fedcm_auto' for auto sign-in, else a user action. */
  select_by?: string;
  state?: string;
}

export interface GisIdConfiguration {
  client_id: string;
  callback?: (response: GisCredentialResponse) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
  context?: 'signin' | 'signup' | 'use';
  itp_support?: boolean;
  state_cookie_domain?: string;
  ux_mode?: 'popup' | 'redirect';
  log_level?: 'debug' | 'info' | 'warn';
}

export type GisConfig = Omit<GisIdConfiguration, 'callback'>;

export interface GisButtonConfiguration {
  type?: 'standard' | 'icon';
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  logo_alignment?: 'left' | 'center';
  /** Pixels, at most 400. */
  width?: number;
  locale?: string;
  click_listener?: () => void;
}

export interface GisPromptMomentNotification {
  isSkippedMoment: () => boolean;
  isDismissedMoment: () => boolean;
  getDismissedReason: () => string;
  getMomentType: () => string;
}

export interface GisId {
  initialize: (config: GisIdConfiguration) => void;
  prompt: (
    listener?: (notification: GisPromptMomentNotification) => void,
  ) => void;
  cancel: () => void;
  renderButton: (parent: HTMLElement, options: GisButtonConfiguration) => void;
  disableAutoSelect: () => void;
}

declare global {
  interface Window {
    google?: { accounts?: { id?: GisId } };
  }
}

let loadPromise: Promise<GisId> | null = null;
let lastConfigKey: string | null = null;
let currentHandler: ((response: GisCredentialResponse) => void) | null = null;
let promptInFlight = false;

export const getLoadedGis = (): GisId | null =>
  typeof window === 'undefined' ? null : (window.google?.accounts?.id ?? null);

/**
 * Loads the GIS script once (concurrent callers share the request). Rejects
 * if it errors or hasn't arrived after `timeoutMs` (blockers, Brave shields);
 * a later call then tries again.
 */
export const loadGis = ({
  timeoutMs = LOAD_TIMEOUT_MS,
}: { timeoutMs?: number } = {}): Promise<GisId> => {
  const loaded = getLoadedGis();
  if (loaded) return Promise.resolve(loaded);
  if (loadPromise) return loadPromise;

  const promise = new Promise<GisId>((resolve, reject) => {
    let script = document.querySelector<HTMLScriptElement>(
      `script[src="${GIS_SRC}"]`,
    );
    if (!script) {
      script = document.createElement('script');
      script.src = GIS_SRC;
      script.async = true;
      document.head.appendChild(script);
    }
    const el = script;

    const settle = (error?: Error) => {
      window.clearTimeout(timer);
      el.removeEventListener('load', onLoad);
      el.removeEventListener('error', onError);
      const gis = getLoadedGis();
      if (!error && gis) {
        resolve(gis);
        return;
      }
      // Drop the failed tag so a retry injects a fresh one.
      el.remove();
      reject(error ?? new Error('Google Identity Services did not load.'));
    };
    const onLoad = () => settle();
    const onError = () =>
      settle(new Error('Google Identity Services failed to load.'));
    const timer = window.setTimeout(
      () => settle(new Error('Google Identity Services timed out.')),
      timeoutMs,
    );

    el.addEventListener('load', onLoad);
    el.addEventListener('error', onError);
  });

  loadPromise = promise;
  promise.catch(() => {
    if (loadPromise === promise) loadPromise = null;
  });
  return promise;
};

/** The one callback GIS ever gets; it forwards to whichever handler is current. */
const dispatch = (response: GisCredentialResponse) => {
  promptInFlight = false;
  currentHandler?.(response);
};

/**
 * Points GIS at `onCredential`, calling `initialize` again only when `config`
 * changed (the last call wins). Returns a release function that detaches the
 * handler if it is still the current one.
 */
export const configureGis = (
  config: GisConfig,
  onCredential: (response: GisCredentialResponse) => void,
): (() => void) => {
  const gis = getLoadedGis();
  if (!gis) return () => {};

  const key = JSON.stringify(config);
  if (key !== lastConfigKey) {
    gis.initialize({ ...config, callback: dispatch });
    lastConfigKey = key;
  }
  currentHandler = onCredential;

  return () => {
    if (currentHandler === onCredential) currentHandler = null;
  };
};

/** Shows the One Tap prompt unless one is already open. */
export const promptOneTap = (
  onMoment?: (notification: GisPromptMomentNotification) => void,
) => {
  const gis = getLoadedGis();
  if (!gis || promptInFlight) return;
  promptInFlight = true;
  gis.prompt((notification) => {
    if (notification.isSkippedMoment() || notification.isDismissedMoment()) {
      promptInFlight = false;
    }
    onMoment?.(notification);
  });
};

export const cancelOneTap = () => {
  getLoadedGis()?.cancel();
  promptInFlight = false;
};

/** Renders the official button into `el`, replacing any earlier render. */
export const renderGisButton = (
  el: HTMLElement,
  options: GisButtonConfiguration,
) => {
  const gis = getLoadedGis();
  if (!gis) return;
  el.replaceChildren();
  gis.renderButton(el, options);
};

/** Stops GIS auto-selecting an account on this origin (no-op if GIS isn't loaded). */
export const disableGisAutoSelect = () => {
  getLoadedGis()?.disableAutoSelect();
};

export const __resetGisForTests = () => {
  loadPromise = null;
  lastConfigKey = null;
  currentHandler = null;
  promptInFlight = false;
};
