// @vitest-environment jsdom
import { Profiler } from 'react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import {
  INITIAL_SESSION_STATE,
  useSessionStore,
} from '@/daw/session/sessionStore';
import { useStore } from '@/daw/store';
import { installDomShims } from '@/daw/ui/__tests__/dom';
import { UndoRedoButtons } from '../UndoRedoButtons';

// The undo stacks, faked: two flags, a version and its listeners.
const undo = vi.hoisted(() => {
  const listeners = new Set<() => void>();
  const state = { canUndo: false, canRedo: false, version: 0 };
  return {
    state,
    listeners,
    set(next: { canUndo?: boolean; canRedo?: boolean }) {
      Object.assign(state, next);
      state.version += 1;
      for (const l of listeners) l();
    },
  };
});

vi.mock('@/daw/store/undoMiddleware', () => ({
  subscribeUndo: (listener: () => void) => {
    undo.listeners.add(listener);
    return () => undo.listeners.delete(listener);
  },
  undoVersion: () => undo.state.version,
  smartCanUndo: () => undo.state.canUndo,
  smartCanRedo: () => undo.state.canRedo,
  smartUndo: vi.fn(() => true),
  smartRedo: vi.fn(() => true),
}));

const { smartUndo, smartRedo } = await import('@/daw/store/undoMiddleware');

const undoButton = () => screen.getByRole('button', { name: 'Undo' });
const redoButton = () => screen.getByRole('button', { name: 'Redo' });

beforeAll(installDomShims);
beforeEach(() => {
  undo.state.canUndo = false;
  undo.state.canRedo = false;
  useSessionStore.setState({ ...INITIAL_SESSION_STATE, phase: 'ready' });
  useStore.setState({ isRecording: false });
  vi.mocked(smartUndo).mockClear();
  vi.mocked(smartRedo).mockClear();
});
afterEach(cleanup);

describe('UndoRedoButtons', () => {
  it('names the buttons and gives them test ids', () => {
    render(<UndoRedoButtons />);
    expect(undoButton()).toHaveAttribute('data-testid', 'undo-button');
    expect(redoButton()).toHaveAttribute('data-testid', 'redo-button');
    expect(undoButton().className).toContain('size-7');
  });

  it('follows the undo stacks', () => {
    render(<UndoRedoButtons />);
    expect(undoButton()).toBeDisabled();
    expect(redoButton()).toBeDisabled();
    act(() => undo.set({ canUndo: true }));
    expect(undoButton()).toBeEnabled();
    expect(redoButton()).toBeDisabled();
    act(() => undo.set({ canUndo: false, canRedo: true }));
    expect(undoButton()).toBeDisabled();
    expect(redoButton()).toBeEnabled();
  });

  it('runs smartUndo and smartRedo', () => {
    undo.state.canUndo = true;
    undo.state.canRedo = true;
    render(<UndoRedoButtons />);
    fireEvent.click(undoButton());
    expect(smartUndo).toHaveBeenCalledTimes(1);
    fireEvent.click(redoButton());
    expect(smartRedo).toHaveBeenCalledTimes(1);
  });

  it('is off while a session opens', () => {
    undo.state.canUndo = true;
    undo.state.canRedo = true;
    render(<UndoRedoButtons />);
    act(() => useSessionStore.setState({ phase: 'keeping' }));
    expect(undoButton()).toBeDisabled();
    expect(redoButton()).toBeDisabled();
    act(() => useSessionStore.setState({ phase: 'ready' }));
    expect(undoButton()).toBeEnabled();
  });

  it('is off while recording', () => {
    undo.state.canUndo = true;
    undo.state.canRedo = true;
    render(<UndoRedoButtons />);
    act(() => useStore.setState({ isRecording: true }));
    expect(undoButton()).toBeDisabled();
    expect(redoButton()).toBeDisabled();
    act(() => useStore.setState({ isRecording: false }));
    expect(undoButton()).toBeEnabled();
    expect(redoButton()).toBeEnabled();
  });

  it('re-renders only when canUndo or canRedo flips, not per undo push', () => {
    let commits = 0;
    render(
      <Profiler id="undo" onRender={() => (commits += 1)}>
        <UndoRedoButtons />
      </Profiler>,
    );
    act(() => undo.set({ canUndo: true })); // a flip
    const settled = commits;
    // Twenty undoable edits that flip neither flag: no commit at all.
    for (let i = 0; i < 20; i++) act(() => undo.set({ canUndo: true }));
    expect(commits).toBe(settled);
    act(() => undo.set({ canRedo: true })); // another flip
    expect(commits).toBeGreaterThan(settled);
  });

  it('declares its keyboard shortcuts for this platform', () => {
    render(<UndoRedoButtons />);
    const aria = undoButton().getAttribute('aria-keyshortcuts');
    expect(['Meta+Z', 'Control+Z']).toContain(aria);
    expect(redoButton().getAttribute('aria-keyshortcuts')).toBe(
      aria === 'Meta+Z' ? 'Meta+Shift+Z' : 'Control+Shift+Z',
    );
  });
});
