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

// This class's work, as the lesson's places left it.
vi.mock('../workspace/useClassWork', () => ({
  useClassWork: () => ({
    loading: false,
    work: [
      {
        key: 'learn:lesson:pop-1',
        place: 'learn',
        projectId: 'lesson:pop-1',
        name: 'Pop — Level 1',
        touchedAt: Date.parse('2026-11-11T10:20:00Z'),
        deepLink: '/learn/keyboard/genre/pop/1',
      },
      {
        key: 'songs:song:thriller',
        place: 'songs',
        projectId: 'song:thriller',
        name: 'Thriller',
        touchedAt: Date.parse('2026-11-11T10:05:00Z'),
        deepLink: '/songs/thriller',
      },
    ],
  }),
}));

const LIVE = {
  state: { startedAt: '2026-11-11T10:00:00Z' },
  clock: {},
  slideId: 's-share',
} as never;

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

  it('in a live session, lets the student pick this class’s work and send it to the teacher', () => {
    const onSubmit = vi.fn();
    render(
      <ShowcaseInput
        interaction={SHOWCASE}
        language="en"
        onSubmit={onSubmit}
        live={LIVE}
      />,
    );
    expect(screen.getAllByRole('radio').map((r) => r.textContent)).toEqual([
      expect.stringContaining('Pop — Level 1'),
      expect.stringContaining('Thriller'),
    ]);
    fireEvent.click(screen.getByRole('radio', { name: /Thriller/ }));
    fireEvent.click(screen.getByRole('button', { name: /Send to my teacher/ }));
    expect(onSubmit).toHaveBeenCalledWith({
      kind: 'showcase',
      artifact: {
        projectId: 'song:thriller',
        name: 'Thriller',
        place: 'songs',
        deepLink: '/songs/thriller',
        audience: 'teacher',
      },
    });
  });

  it('shows the class what they picked, and says so', () => {
    const onSubmit = vi.fn();
    const { rerender } = render(
      <ShowcaseInput
        interaction={SHOWCASE}
        language="en"
        onSubmit={onSubmit}
        live={LIVE}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Show the class/ }));
    const payload = onSubmit.mock.calls[0][0];
    expect(payload.artifact).toMatchObject({
      place: 'learn',
      audience: 'class',
    });
    rerender(
      <ShowcaseInput
        interaction={SHOWCASE}
        language="en"
        onSubmit={onSubmit}
        live={LIVE}
        submittedPayload={payload}
      />,
    );
    expect(screen.getByText(/Offered to the class/)).toBeTruthy();
  });
});
