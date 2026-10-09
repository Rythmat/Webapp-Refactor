// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';
import { TopRail } from '@/components/ClassroomLayout/TopRail';
import {
  setTopRailSlot,
  useTopRailSlot,
} from '@/components/ClassroomLayout/topRailSlot';
import {
  INITIAL_SESSION_STATE,
  useSessionStore,
} from '@/daw/session/sessionStore';
import { useStore } from '@/daw/store';
import type { PracticeSession } from '@/daw/store/uiSlice';
import { installDomShims } from '@/daw/ui/__tests__/dom';
import { EditorTopRailSlot } from '../EditorTopRailSlot';
import { PracticeHeader } from '../PracticeHeader';

vi.mock('@/daw/commands/saveProject', () => ({ saveProject: vi.fn() }));

// TopRail's data hooks, stubbed: only its layout is under test.
vi.mock('@/hooks/data', () => ({ useMe: () => ({ data: undefined }) }));
vi.mock('@/hooks/data/experience', () => ({
  useExperienceSummary: () => ({ data: undefined }),
}));
vi.mock('@/hooks/data/useAwards', () => ({
  useAwards: () => ({ unlockedCount: 0 }),
}));
vi.mock('@/hooks/data/useStreak', () => ({
  useStreak: () => ({ data: undefined }),
}));
vi.mock('@/hooks/useAvatarConfig', () => ({
  useAvatarConfig: () => ({ config: undefined }),
}));
vi.mock('@/components/ui/UserAvatarPattern', () => ({
  UserAvatarPattern: () => null,
}));
vi.mock('@/components/ClassroomLayout/ChordNotationSwitcher', () => ({
  ChordNotationSwitcher: () => null,
}));

const PRACTICE = { kind: 'theory' } as unknown as PracticeSession;

beforeAll(installDomShims);
beforeEach(() => {
  useStore.setState({ currentView: 'arrange', practiceSession: null });
  useSessionStore.setState({ ...INITIAL_SESSION_STATE, phase: 'ready' });
});
afterEach(() => {
  cleanup();
  setTopRailSlot(null);
});

function Slot() {
  return <div data-slot="toprail-leading" ref={setTopRailSlot} />;
}

describe('the TopRail leading slot', () => {
  it('is the TopRail’s first child, empty outside the editor', () => {
    render(
      <MemoryRouter>
        <TopRail />
      </MemoryRouter>,
    );
    const header = document.querySelector('header')!;
    const slot = header.firstElementChild as HTMLElement;
    expect(slot.dataset.slot).toBe('toprail-leading');
    expect(slot.className).toContain('mr-auto');
    expect(slot.childElementCount).toBe(0);
  });

  it('registers and clears the slot element', () => {
    let seen: HTMLElement | null = null;
    function Reader() {
      seen = useTopRailSlot();
      return null;
    }
    render(<Reader />);
    expect(seen).toBeNull();
    const el = document.createElement('div');
    act(() => setTopRailSlot(el));
    expect(seen).toBe(el);
    act(() => setTopRailSlot(null));
    expect(seen).toBeNull();
  });
});

describe('EditorTopRailSlot', () => {
  it('renders nothing without a slot', () => {
    const { container } = render(<EditorTopRailSlot />);
    expect(container.childElementCount).toBe(0);
    expect(screen.queryByTestId('save-chip')).toBeNull();
  });

  it('portals chip · Undo · Redo into the TopRail slot', () => {
    render(
      <>
        <Slot />
        <EditorTopRailSlot />
      </>,
    );
    const slot = document.querySelector('[data-slot="toprail-leading"]')!;
    const chip = screen.getByTestId('save-chip');
    expect(slot.contains(chip)).toBe(true);
    const undo = screen.getByTestId('undo-button');
    const redo = screen.getByTestId('redo-button');
    expect(slot.contains(undo) && slot.contains(redo)).toBe(true);
    // In that order.
    expect(
      chip.compareDocumentPosition(undo) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      undo.compareDocumentPosition(redo) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy(); // The live region sits outside the rail (hidden below md), in the body.
    const announcer = screen.getByTestId('save-chip-announcer');
    expect(slot.contains(announcer)).toBe(false);
    expect(announcer.parentElement).toBe(document.body);
    expect(screen.getAllByRole('status')).toHaveLength(1);
  });

  it('shows nothing on the practice screen, which has its own header', () => {
    render(
      <>
        <Slot />
        <EditorTopRailSlot />
      </>,
    );
    act(() =>
      useStore.setState({ currentView: 'practice', practiceSession: PRACTICE }),
    );
    expect(screen.queryByTestId('save-chip')).toBeNull();
    // Practice view without its screen: the chip, but no undo (Cmd+Z is off).
    act(() => useStore.setState({ practiceSession: null }));
    expect(screen.getByTestId('save-chip')).toBeInTheDocument();
    expect(screen.queryByTestId('undo-button')).toBeNull();
    act(() => useStore.setState({ currentView: 'score' }));
    expect(screen.getByTestId('undo-button')).toBeInTheDocument();
  });
});

describe('PracticeHeader', () => {
  it('keeps Back, the name and Take it to the Studio, with the chip before it', () => {
    const onBack = vi.fn();
    const onTakeToStudio = vi.fn();
    render(
      <PracticeHeader
        projectName="C Ionian Practice"
        onBack={onBack}
        onTakeToStudio={onTakeToStudio}
      />,
    );
    const header = screen.getByTestId('practice-header');
    expect(header.tagName).toBe('HEADER');
    expect(header).toHaveTextContent('C Ionian Practice');
    const chip = screen.getByTestId('save-chip');
    const take = screen.getByRole('button', { name: /Take it to the Studio/ });
    expect(header.contains(chip)).toBe(true);
    expect(
      chip.compareDocumentPosition(take) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(chip.parentElement).toBe(take.parentElement);
    // No Undo/Redo on the practice screen.
    expect(screen.queryByRole('button', { name: 'Undo' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Back to lesson/ }));
    expect(onBack).toHaveBeenCalledTimes(1);
    fireEvent.click(take);
    expect(onTakeToStudio).toHaveBeenCalledTimes(1);
  });
});
