// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

// ── Where focus goes when a section's menu closes (milestone 2.13) ─────────
// The sections lane with the canvas's one menu: a section deleted from its
// menu (or by someone else while the menu was open) hands the focus to the
// section after it, else the one before, else + Section, so the next key
// still acts in the lane instead of on the selected clip. Run:
// npx vitest run src/daw/shell/canvas/sections/__tests__/sectionMenuFocus.test.tsx

vi.mock('@/hooks/useIsPremium', () => ({
  useIsPremium: () => ({ isPremium: true, isLoading: false }),
}));

import { installKeyDispatcher } from '@/daw/commands/dispatcher';
import type { SongSection } from '@/daw/model/sections';
import { useStore } from '@/daw/store';
import { historyLabels, resetHistory, startHistory } from '@/daw/store/history';
import { installDomShims } from '@/daw/ui/__tests__/dom';
import { CanvasMenu } from '../../clipMenu/CanvasMenu';
import { useCanvasMenuStore } from '../../clipMenu/canvasMenuStore';
import { SectionsLane } from '../SectionsLane';

const s = () => useStore.getState();
const BAR = 1920;

const SECTIONS: SongSection[] = [
  {
    id: 'intro',
    type: 'intro',
    label: 'Intro',
    startTick: 0,
    endTick: 4 * BAR,
  },
  {
    id: 'verse',
    type: 'verse',
    label: 'Verse',
    startTick: 4 * BAR,
    endTick: 12 * BAR,
  },
  {
    id: 'chorus',
    type: 'chorus',
    label: 'Chorus',
    startTick: 12 * BAR,
    endTick: 20 * BAR,
  },
];

const blocks = () => screen.queryAllByTestId('section-block');
const block = (id: string) => blocks().find((b) => b.dataset.sectionId === id)!;
const item = (id: string) =>
  document.querySelector<HTMLElement>(`[data-item="${id}"]`);

/** Opens the section's menu from its block with Alt+Return. */
async function openMenuOn(id: string) {
  act(() => block(id).focus());
  fireEvent.keyDown(block(id), { key: 'Enter', code: 'Enter', altKey: true });
  await waitFor(() => expect(item('renameSection')).toHaveFocus());
}

/** Deletes the section from its open menu, and waits for the menu to go. */
async function deleteFromMenu() {
  fireEvent.click(item('deleteSection')!);
  await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
}

const clientWidth = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  'clientWidth',
);
const hadCss = typeof globalThis.CSS !== 'undefined';
let uninstallKeys: () => void;
beforeAll(() => {
  installDomShims();
  // jsdom has no CSS.escape, which the lane finds a block by.
  if (!hadCss) {
    (globalThis as { CSS?: unknown }).CSS = {
      escape: (value: string) => value.replace(/[^\w-]/g, (c) => `\\${c}`),
    };
  }
  Object.defineProperty(HTMLElement.prototype, 'clientWidth', {
    configurable: true,
    get: () => 1200,
  });
  uninstallKeys = installKeyDispatcher();
});
afterAll(() => {
  uninstallKeys();
  if (clientWidth) {
    Object.defineProperty(HTMLElement.prototype, 'clientWidth', clientWidth);
  } else {
    delete (HTMLElement.prototype as { clientWidth?: number }).clientWidth;
  }
  if (!hadCss) delete (globalThis as { CSS?: unknown }).CSS;
});

let stopHistory: () => void;
beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true);
  useStore.setState({ timelineZoom: 0.5, timelineScrollLeft: 0 });
  useCanvasMenuStore.setState({ request: null });
  s().setSections(SECTIONS);
  resetHistory();
  stopHistory = startHistory();
});
afterEach(() => {
  stopHistory();
  cleanup();
});

const renderLane = () =>
  render(
    <>
      <SectionsLane />
      <CanvasMenu />
    </>,
  );

describe('focus after a section’s menu closes', () => {
  it('goes back to the section, without scrolling, after an item that keeps it', async () => {
    renderLane();
    await openMenuOn('verse');
    const focus = vi.spyOn(block('verse'), 'focus');
    fireEvent.click(item('loopSection')!);
    await waitFor(() => expect(block('verse')).toHaveFocus());
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
  });

  it('goes to the section after one deleted from its menu, and the next key acts in the lane', async () => {
    renderLane();
    await openMenuOn('verse');
    await deleteFromMenu();
    expect(s().sections.map((x) => x.id)).toEqual(['intro', 'chorus']);
    await waitFor(() => expect(block('chorus')).toHaveFocus());

    fireEvent.keyDown(block('chorus'), { key: 'ArrowLeft', code: 'ArrowLeft' });
    await waitFor(() => expect(block('intro')).toHaveFocus());
    expect(historyLabels()).toEqual(['Delete section']);
  });

  it('goes to the one before when the last is deleted, and to + Section when none are left', async () => {
    renderLane();
    await openMenuOn('chorus');
    await deleteFromMenu();
    await waitFor(() => expect(block('verse')).toHaveFocus());

    act(() => s().setSections([SECTIONS[0]]));
    await openMenuOn('intro');
    await deleteFromMenu();
    expect(s().sections).toEqual([]);
    await waitFor(() =>
      expect(screen.getByTestId('add-section')).toHaveFocus(),
    );
  });

  it('goes to the section after one that goes while its menu is open', async () => {
    renderLane();
    await openMenuOn('verse');
    // A collaborator deletes it: the menu closes.
    act(() => s().removeSection('verse'));
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
    await waitFor(() => expect(block('chorus')).toHaveFocus());
  });
});
