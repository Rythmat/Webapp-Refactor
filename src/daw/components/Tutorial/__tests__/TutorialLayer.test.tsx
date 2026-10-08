// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

vi.mock('@/features/classroom/msp', () => ({
  useMspModuleCompletion: () => ({ reportCompletion: () => {} }),
}));

import { installDawCss, resolvedBackground } from '@/daw/__tests__/dawTokens';
import { useStore } from '@/daw/store';
import { TutorialLayer } from '../TutorialLayer';

// ── The lesson overlay inherits the DAW tokens (practice-tutorial-24) ───────
// The overlay portals to <body>. It used to copy seven --color-* values from
// .daw-root onto itself in an effect, so its first frame had none and a theme
// change mid-lesson never reached it. It now holds body.daw-active itself
// (useDawBodyTokens) and inherits the palette from there, so the coach card
// never depends on anything else in the editor having set the class.

let removeCss: () => void;
beforeAll(() => {
  removeCss = installDawCss();
});
afterAll(() => removeCss());
afterEach(() => {
  act(() => useStore.getState().quitTutorial());
  cleanup();
});

describe('TutorialLayer', () => {
  it('holds the DAW tokens itself and copies none onto its portal', () => {
    // As in the editor: DawApp's .daw-root holds the layer, which portals out
    // of it. Nothing else in this test sets body.daw-active.
    const dawRoot = document.createElement('div');
    dawRoot.className = 'daw-root';
    document.body.appendChild(dawRoot);

    act(() => useStore.getState().startTutorial('make-first-track'));
    const { unmount } = render(<TutorialLayer />, { container: dawRoot });
    expect(document.body).toHaveClass('daw-active');

    const card = screen
      .getByRole('button', { name: 'Quit tutorial' })
      .closest<HTMLElement>('div[style*="position: fixed"]')!;
    const overlay = card.parentElement!;
    expect(overlay.closest('.daw-root')).toBeNull();
    expect(overlay.parentElement).toBe(document.body);

    const inlineTokens = Array.from(overlay.style).filter((name) =>
      name.startsWith('--'),
    );
    expect(inlineTokens).toEqual([]);
    expect(resolvedBackground(card)).toBe('#1a1a1a');

    // Leaving the editor takes the class off the rest of the app.
    unmount();
    expect(document.body).not.toHaveClass('daw-active');
    dawRoot.remove();
  });
});
