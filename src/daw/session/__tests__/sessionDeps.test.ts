import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  getSessionDeps,
  notifySessionDepsChanged,
  onSessionDepsChanged,
  registerSessionDeps,
  type SessionDeps,
} from '../sessionDeps';
import type { CollabPort, DraftSessionPort } from '../types';

// ── openSession's deps (milestone 1.4) ────────────────────────────────────
// Run: npx vitest run src/daw/session/__tests__/sessionDeps.test.ts

function fakeDeps(name: string): SessionDeps {
  return {
    user: () => ({ userId: name, userKey: name }),
    token: () => null,
    lessonAccess: () => 'open',
    collab: {} as CollabPort,
    drafts: {} as DraftSessionPort,
    navigate: () => {},
    openProjectsDialog: () => {},
  };
}

const stops: Array<() => void> = [];

afterEach(() => {
  stops.splice(0).forEach((stop) => stop());
  vi.restoreAllMocks();
});

describe('registerSessionDeps', () => {
  it('starts with none', () => {
    expect(getSessionDeps()).toBeNull();
  });

  it('returns the registered deps until unregistered', () => {
    const deps = fakeDeps('a');
    const unregister = registerSessionDeps(deps);
    expect(getSessionDeps()).toBe(deps);
    unregister();
    expect(getSessionDeps()).toBeNull();
  });

  it('lets a newer registration replace the old, whose unregister then does nothing', () => {
    const a = fakeDeps('a');
    const b = fakeDeps('b');
    const unregisterA = registerSessionDeps(a);
    const unregisterB = registerSessionDeps(b);
    expect(getSessionDeps()).toBe(b);
    unregisterA();
    expect(getSessionDeps()).toBe(b);
    unregisterB();
    expect(getSessionDeps()).toBeNull();
    // Unregistering twice is harmless.
    unregisterB();
    expect(getSessionDeps()).toBeNull();
  });

  it('tells listeners of registrations, unregistrations and changes', () => {
    const heard = vi.fn();
    stops.push(onSessionDepsChanged(heard));
    const unregister = registerSessionDeps(fakeDeps('a'));
    expect(heard).toHaveBeenCalledTimes(1);
    notifySessionDepsChanged();
    expect(heard).toHaveBeenCalledTimes(2);
    unregister();
    expect(heard).toHaveBeenCalledTimes(3);
    // A stale unregister is no change.
    unregister();
    expect(heard).toHaveBeenCalledTimes(3);
  });

  it('keeps calling the rest when a listener throws, and stops when unsubscribed', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const heard = vi.fn();
    stops.push(
      onSessionDepsChanged(() => {
        throw new Error('boom');
      }),
    );
    const stop = onSessionDepsChanged(heard);
    notifySessionDepsChanged();
    expect(heard).toHaveBeenCalledTimes(1);
    stop();
    notifySessionDepsChanged();
    expect(heard).toHaveBeenCalledTimes(1);
  });
});
