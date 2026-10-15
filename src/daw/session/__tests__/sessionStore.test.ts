import { afterEach, describe, expect, it } from 'vitest';
import {
  adoptActiveDraft,
  BUSY_PHASES,
  INITIAL_SESSION_STATE,
  isBusyPhase,
  isOpening,
  useSessionStore,
} from '../sessionStore';
import type { OpenPhase } from '../types';

// ── The session store (milestone 1.4) ─────────────────────────────────────
// Run: npx vitest run src/daw/session/__tests__/sessionStore.test.ts

afterEach(() => {
  useSessionStore.setState(useSessionStore.getInitialState(), true);
});

describe('useSessionStore', () => {
  it('starts idle, with no overlay, at generation 0', () => {
    const s = useSessionStore.getState();
    expect(s.phase).toBe('idle');
    expect(s.overlay).toBe('none');
    expect(s.generation).toBe(0);
    expect(s.draftId).toBeNull();
    expect(s.userKey).toBeNull();
    expect(s.roomId).toBeNull();
    expect(s.cancellable).toBe(false);
    expect(s).toEqual(INITIAL_SESSION_STATE);
  });

  it('lists waiting through baselining as busy', () => {
    expect(BUSY_PHASES).toEqual([
      'waiting',
      'validating',
      'preparing',
      'keeping',
      'switching',
      'loading',
      'baselining',
    ]);
    for (const phase of ['idle', 'ready', 'failed'] as OpenPhase[]) {
      expect(isBusyPhase(phase)).toBe(false);
    }
  });

  it('is opening only in a busy phase', () => {
    expect(isOpening()).toBe(false);
    for (const phase of BUSY_PHASES) {
      useSessionStore.setState({ phase });
      expect(isOpening()).toBe(true);
    }
    useSessionStore.setState({ phase: 'ready' });
    expect(isOpening()).toBe(false);
    useSessionStore.setState({ phase: 'failed' });
    expect(isOpening()).toBe(false);
  });

  it('adopts a forked draft as the live one, leaving the rest', () => {
    useSessionStore.setState({
      phase: 'ready',
      draftId: 'old',
      userKey: 'me',
      generation: 4,
    });
    let writes = 0;
    const stop = useSessionStore.subscribe(() => writes++);
    adoptActiveDraft('fork', 'me');
    adoptActiveDraft('fork', 'me');
    stop();
    const s = useSessionStore.getState();
    expect(s.draftId).toBe('fork');
    expect(s.userKey).toBe('me');
    expect(s.generation).toBe(4);
    expect(s.phase).toBe('ready');
    expect(writes).toBe(1);
  });
});
