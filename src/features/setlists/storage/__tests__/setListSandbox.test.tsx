// @vitest-environment jsdom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSetList, emptyBlob, ensureDefaults } from '../../setListsStore';
import { useSetListsStorage } from '../gameOptionsSetListsStore';
import {
  sandboxAdditions,
  seedSetListSandbox,
  startSetListSandbox,
  stopSetListSandbox,
  useSetListSandbox,
} from '../setListSandbox';

const api = vi.hoisted(() => ({
  fetchAll: vi.fn(),
  patchGame: vi.fn(),
}));
vi.mock('@/lib/gameOptions/api', () => ({ gameOptionsApi: api }));
vi.mock('@/contexts/AuthContext/hooks/useAuthToken', () => ({
  useAuthToken: () => 'token',
}));

const real = createSetList(ensureDefaults(emptyBlob()), { title: 'Gig' }).blob;

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => {
  api.fetchAll.mockResolvedValue({ options: { setlists: real } });
  api.patchGame.mockResolvedValue({ options: { setlists: real } });
});

afterEach(() => {
  stopSetListSandbox();
  vi.clearAllMocks();
});

describe('the practice copy', () => {
  it('counts what was made on it, not what the player had', () => {
    startSetListSandbox();
    seedSetListSandbox(real);
    expect(sandboxAdditions().setLists).toEqual([]);
    const { blob } = useSetListSandbox.getState();
    const made = createSetList(blob!, { title: 'Practice' });
    useSetListSandbox.setState({ blob: made.blob });
    expect(sandboxAdditions().setLists).toEqual([made.setListId]);
  });

  it('is made once, readied as the tour asks, and the readying counts as the player’s', () => {
    startSetListSandbox((b) => createSetList(b, { title: 'Ready' }).blob);
    seedSetListSandbox(real);
    const first = useSetListSandbox.getState().blob;
    seedSetListSandbox(emptyBlob());
    expect(useSetListSandbox.getState().blob).toBe(first);
    expect(sandboxAdditions().setLists).toEqual([]);
  });

  it('reads and writes the copy, never the account, then gives the player’s back', async () => {
    const { result } = renderHook(() => useSetListsStorage(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe('ready'));
    expect(Object.keys(result.current.blob.setLists)).toEqual(
      Object.keys(real.setLists),
    );

    act(() => startSetListSandbox());
    await waitFor(() =>
      expect(useSetListSandbox.getState().blob).not.toBeNull(),
    );
    const practice = createSetList(result.current.blob, {
      title: 'Practice',
    }).blob;
    act(() => result.current.save(practice));
    expect(result.current.blob).toBe(practice);

    await new Promise((resolve) => setTimeout(resolve, 1000));
    expect(api.patchGame).not.toHaveBeenCalled();

    act(() => stopSetListSandbox());
    expect(Object.keys(result.current.blob.setLists)).toEqual(
      Object.keys(real.setLists),
    );
  });
});
