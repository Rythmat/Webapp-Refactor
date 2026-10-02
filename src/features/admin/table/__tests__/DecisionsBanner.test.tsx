// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SuggestionDecision } from '@/content/suggestions/types';
import {
  type DecisionCounts,
  type DecisionsFile,
  decisionsFileText,
} from '@/hooks/data/admin/useSuggestions';
import { DecisionsBanner } from '../DecisionsBanner';

/**
 * "n decisions not yet downloaded" (design §5.3): the count, the download in
 * the committed shape, the count after it, and a replay that could not
 * write some of the committed file again.
 */

const net = vi.hoisted(() => ({
  file: { artifactsVersion: 1, decisions: [] } as {
    artifactsVersion: number;
    decisions: unknown[];
  },
}));

vi.mock('@/contexts/AuthContext/hooks/useAuthContext', () => ({
  useAuthContext: () => ({ token: 'test', role: 'admin' }),
}));
vi.mock('@/hooks/data/admin/useCapabilities', () => ({
  useCapabilities: () => ({
    feature: (name: string) => name === 'suggestions',
  }),
}));
vi.mock('@/hooks/data/admin/useAdminContent', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  contentRequest: async (path: string) => {
    if (path !== '/suggestions/decisions') throw new Error(`asked ${path}`);
    return net.file;
  },
}));

const decision = (n: number): SuggestionDecision => ({
  suggestionId: `s${n}`,
  op: 'accept',
  target: { kind: 'globe_event', slug: `evt-${n}` },
  path: 'placeId',
  value: 'memphis',
  valueHash: '0123456789abcdef',
  method: 'bulk',
  by: 'admin-1',
  at: `2026-10-01T00:00:0${n}.000Z`,
});

const counts = (notDownloaded: number): DecisionCounts => ({
  total: notDownloaded,
  notDownloaded,
  proposed: 0,
});

/** What the browser was handed to save, as text. */
const saved: string[] = [];

beforeEach(() => {
  window.localStorage.clear();
  saved.length = 0;
  net.file = { artifactsVersion: 1, decisions: [1, 2, 3].map(decision) };
  URL.createObjectURL = vi.fn((blob: Blob) => {
    // jsdom's Blob has no text(); a FileReader reads it.
    const reader = new FileReader();
    reader.onload = () => saved.push(String(reader.result));
    reader.readAsText(blob);
    return 'blob:decisions';
  });
  URL.revokeObjectURL = vi.fn();
  HTMLAnchorElement.prototype.click = vi.fn();
});

afterEach(cleanup);

let client: QueryClient;

const banner = (notDownloaded: number, replay = null as never) => (
  <QueryClientProvider client={client}>
    <DecisionsBanner counts={counts(notDownloaded)} replay={replay} />
  </QueryClientProvider>
);

const mount = (notDownloaded: number, replay = null as never) => {
  client = new QueryClient();
  return render(banner(notDownloaded, replay));
};

describe('the decisions banner', () => {
  it('says nothing when everything is in the committed file', () => {
    const { container } = mount(0);
    expect(container.textContent).toBe('');
  });

  it('counts what is not downloaded, and downloads it in the committed shape', async () => {
    const { rerender } = mount(3);
    expect(
      await screen.findByText('3 decisions not yet downloaded'),
    ).toBeTruthy();
    fireEvent.click(
      screen.getByRole('button', { name: 'Download decisions.json' }),
    );
    await waitFor(() => expect(saved).toHaveLength(1));
    expect(saved[0]).toBe(decisionsFileText(net.file as DecisionsFile));
    const link = vi.mocked(HTMLAnchorElement.prototype.click).mock
      .contexts[0] as HTMLAnchorElement;
    expect(link.download).toBe('decisions.json');

    // Downloaded, not yet committed: said quietly.
    expect(
      await screen.findByText(
        /decisions\.json downloaded \(3 decisions not in/,
      ),
    ).toBeTruthy();

    // A decision made since is counted again (a decision refetches every
    // content query, this one included).
    net.file = { ...net.file, decisions: [...net.file.decisions, decision(4)] };
    await act(() => client.invalidateQueries());
    rerender(banner(4));
    expect(
      await screen.findByText('1 decision not yet downloaded'),
    ).toBeTruthy();
  });

  it('counts an accept approved after the download, though it was made before', async () => {
    // Downloaded with 1–3; an editor's accept made at 0:00:00 (before any
    // of them) is approved after it, keeping its time.
    const { rerender } = mount(3);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Download decisions.json' }),
    );
    const again = await screen.findByRole('button', { name: 'Download again' });
    // The keyboard goes to what replaced the button.
    await waitFor(() => expect(document.activeElement).toBe(again));
    net.file = {
      ...net.file,
      decisions: [
        { ...decision(1), suggestionId: 's0', at: '2026-10-01T00:00:00.000Z' },
        ...net.file.decisions,
      ],
    };
    await act(() => client.invalidateQueries());
    rerender(banner(4));
    expect(
      await screen.findByText('1 decision not yet downloaded'),
    ).toBeTruthy();
  });

  it('remembers the download across a reload of the page', async () => {
    window.localStorage.setItem(
      'ma-console-decisions-downloaded-v1',
      JSON.stringify({ at: decision(3).at }),
    );
    mount(3);
    expect(await screen.findByText(/decisions\.json downloaded/)).toBeTruthy();
    expect(screen.queryByText(/not yet downloaded/)).toBeNull();
  });

  it('lists the committed decisions a replay could not write again', () => {
    mount(0, {
      considered: 2,
      applied: 1,
      already: 0,
      removedSince: 0,
      created: 0,
      conflicts: [
        {
          suggestionId: 's9',
          target: { kind: 'globe_event', slug: 'evt-9' },
          path: 'placeId',
          reason: 'a proposal waits on it; review that first',
        },
      ],
      refused: [],
      error: null,
    } as never);
    expect(
      screen.getByText('1 committed decision could not be written again'),
    ).toBeTruthy();
    expect(
      screen.getByText(
        'evt-9 · placeId: a proposal waits on it; review that first',
      ),
    ).toBeTruthy();
  });
});
