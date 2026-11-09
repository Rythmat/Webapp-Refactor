// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readMindMapHandoff } from '../../msp/mindMapHandoff';
import type { Interaction } from '../../types';
import { AppRouteLaunch } from './AppRouteLaunch';

vi.mock('@/curriculum/data/songs', () => ({ getSong: () => null }));
vi.mock('../../msp/useMspTokenMint', () => ({
  // Offline: no token, the launch goes tokenless.
  useMspTokenMint: () => ({
    mintToken: () => Promise.reject(new Error('offline')),
  }),
}));
vi.mock('../../msp/useMspReport', () => ({ useMspReport: () => {} }));

const PROMOTER: Interaction = {
  id: 'ix-promoter',
  type: 'atlas',
  question: { en: 'Find 1 connection to Ana Lux on the Globe.' },
  shareable: false,
  atlas: {
    module: 'globe',
    activityRef: 'globe:mindmap',
    expects: 'artifact',
    board: {
      focus: 'artist:ana-lux',
      goal: 1,
      nodes: [
        {
          id: 'artist:ana-lux',
          kind: 'artist',
          label: 'Ana Lux',
          stop: { artist: 'Ana Lux' },
        },
      ],
      edges: [],
    },
  },
};

let openSpy: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  window.localStorage.clear();
  openSpy = vi
    .spyOn(window, 'open')
    .mockImplementation(() => ({ opener: window }) as unknown as Window);
});
afterEach(() => {
  cleanup();
  openSpy.mockRestore();
});

describe('AppRouteLaunch', () => {
  it("hands the Promoter's board over, then opens the Globe's mind map", async () => {
    const onSubmit = vi.fn();
    render(
      <AppRouteLaunch
        interaction={PROMOTER}
        language="en"
        onSubmit={onSubmit}
        enrollmentId="enr-1"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Launch/ }));
    await vi.waitFor(() => expect(openSpy).toHaveBeenCalled());
    const [url, target] = openSpy.mock.calls[0] as [string, string];
    expect(url).toMatch(/^\/globe\?mindmap=1&/);
    expect(url).toContain('interactionId=ix-promoter');
    expect(target).toBe('_blank');
    expect(readMindMapHandoff('ix-promoter')?.board).toEqual(
      PROMOTER.atlas?.board,
    );
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ result: { status: 'launched' } }),
    );
    expect(screen.queryByText(/open here instead/)).not.toBeInTheDocument();
  });

  it('offers a link in this tab only when the browser really blocks the new one', async () => {
    openSpy.mockImplementation(() => null);
    render(
      <AppRouteLaunch
        interaction={PROMOTER}
        language="en"
        onSubmit={vi.fn()}
        enrollmentId="enr-1"
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /Launch/ }));
    expect(await screen.findByText(/open here instead/)).toBeInTheDocument();
  });
});
