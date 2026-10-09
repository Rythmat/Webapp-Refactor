// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  __resetGisForTests,
  cancelOneTap,
  configureGis,
  loadGis,
  promptOneTap,
  renderGisButton,
  type GisCredentialResponse,
  type GisId,
  type GisPromptMomentNotification,
} from '../gis';

const SRC = 'https://accounts.google.com/gsi/client';
const scripts = () =>
  document.head.querySelectorAll<HTMLScriptElement>(`script[src="${SRC}"]`);

const fakeGis = () =>
  ({
    initialize: vi.fn(),
    prompt: vi.fn(),
    cancel: vi.fn(),
    renderButton: vi.fn(),
    disableAutoSelect: vi.fn(),
  }) satisfies GisId;

const install = (gis: GisId) => {
  window.google = { accounts: { id: gis } };
};

const moment = (kind: 'skipped' | 'dismissed' | 'other') =>
  ({
    isSkippedMoment: () => kind === 'skipped',
    isDismissedMoment: () => kind === 'dismissed',
    getDismissedReason: () => 'credential_returned',
    getMomentType: () => kind,
  }) satisfies GisPromptMomentNotification;

beforeEach(() => {
  __resetGisForTests();
  delete window.google;
  scripts().forEach((s) => s.remove());
});

afterEach(() => {
  vi.useRealTimers();
});

describe('loadGis', () => {
  it('injects the script once for concurrent callers and resolves on load', async () => {
    const a = loadGis();
    const b = loadGis();
    expect(scripts()).toHaveLength(1);

    const gis = fakeGis();
    install(gis);
    scripts()[0].dispatchEvent(new Event('load'));

    await expect(a).resolves.toBe(gis);
    await expect(b).resolves.toBe(gis);
  });

  it('resolves at once when GIS is already on the page', async () => {
    const gis = fakeGis();
    install(gis);
    await expect(loadGis()).resolves.toBe(gis);
    expect(scripts()).toHaveLength(0);
  });

  it('rejects on a script error, and a later call tries again', async () => {
    const first = loadGis();
    scripts()[0].dispatchEvent(new Event('error'));
    await expect(first).rejects.toThrow(/failed to load/);
    expect(scripts()).toHaveLength(0);

    void loadGis().catch(() => undefined);
    expect(scripts()).toHaveLength(1);
  });

  it('rejects when the script never arrives (blocked)', async () => {
    vi.useFakeTimers();
    const pending = loadGis({ timeoutMs: 1000 });
    vi.advanceTimersByTime(1000);
    await expect(pending).rejects.toThrow(/timed out/);
  });
});

describe('configureGis', () => {
  it('initialises again only when the config changes, routing to the latest handler', () => {
    const gis = fakeGis();
    install(gis);
    const config = { client_id: 'id', auto_select: true };

    const first = vi.fn();
    const releaseFirst = configureGis(config, first);
    const second = vi.fn();
    configureGis({ ...config }, second);
    expect(gis.initialize).toHaveBeenCalledOnce();

    const callback = gis.initialize.mock.calls[0][0].callback as (
      r: GisCredentialResponse,
    ) => void;
    callback({ credential: 'jwt' });
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith({ credential: 'jwt' });

    // A stale release doesn't detach the current handler.
    releaseFirst();
    callback({ credential: 'jwt2' });
    expect(second).toHaveBeenCalledTimes(2);

    configureGis({ ...config, auto_select: false }, second);
    expect(gis.initialize).toHaveBeenCalledTimes(2);
  });
});

describe('promptOneTap', () => {
  it('keeps one prompt open at a time, freeing the slot on skip, dismiss or cancel', () => {
    const gis = fakeGis();
    install(gis);

    promptOneTap();
    promptOneTap();
    expect(gis.prompt).toHaveBeenCalledOnce();

    const listener = gis.prompt.mock.calls[0][0] as (
      n: GisPromptMomentNotification,
    ) => void;
    listener(moment('other'));
    promptOneTap();
    expect(gis.prompt).toHaveBeenCalledOnce();

    listener(moment('dismissed'));
    promptOneTap();
    expect(gis.prompt).toHaveBeenCalledTimes(2);

    cancelOneTap();
    expect(gis.cancel).toHaveBeenCalledOnce();
    promptOneTap();
    expect(gis.prompt).toHaveBeenCalledTimes(3);
  });
});

describe('renderGisButton', () => {
  it('clears earlier renders before drawing', () => {
    const gis = fakeGis();
    install(gis);
    const el = document.createElement('div');
    el.innerHTML = '<iframe></iframe>';

    renderGisButton(el, { width: 320 });
    expect(el.childElementCount).toBe(0);
    expect(gis.renderButton).toHaveBeenCalledWith(el, { width: 320 });
  });
});
