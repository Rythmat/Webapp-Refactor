// @vitest-environment jsdom
/**
 * The project a student offers to the class comes from the Studio they have
 * open in another tab, not only from this tab's Studio store.
 */
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { writeStudioCurrentProject } from '@/lib/studioCurrentProject';
import type { Interaction } from '../../types';
import { ShowcaseInput } from './ShowcaseInput';

vi.mock('@/hooks/data', () => ({
  useMe: () => ({ data: { id: 'acct-1' } }),
}));

// This tab's own Studio store: what the offer used to read, and still does
// when there is no note.
vi.mock('@/daw/store', () => ({
  useStore: {
    getState: () => ({
      projectId: 'proj-in-this-tab',
      roomId: null,
      projectName: 'This Tab',
    }),
  },
}));

const SHOWCASE: Interaction = {
  id: 'ix-show',
  type: 'showcase',
  question: { en: 'Share your project with the class.' },
  shareable: false,
};

beforeEach(() => {
  window.localStorage.clear();
});
afterEach(cleanup);

describe('ShowcaseInput', () => {
  it('offers the project open in the Studio tab', async () => {
    writeStudioCurrentProject('acct-1', {
      projectId: 'proj-9',
      roomId: 'cls0123456789ab',
      name: 'Night Drive',
    });
    const onSubmit = vi.fn();
    render(
      <ShowcaseInput
        interaction={SHOWCASE}
        language="en"
        onSubmit={onSubmit}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Offer to share/ }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        kind: 'showcase',
        artifact: {
          projectId: 'proj-9',
          roomId: 'cls0123456789ab',
          name: 'Night Drive',
        },
      }),
    );
  });

  it("falls back to this tab's Studio when there is no note", async () => {
    const onSubmit = vi.fn();
    render(
      <ShowcaseInput
        interaction={SHOWCASE}
        language="en"
        onSubmit={onSubmit}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Offer to share/ }));
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        kind: 'showcase',
        artifact: { projectId: 'proj-in-this-tab', name: 'This Tab' },
      }),
    );
  });
});
