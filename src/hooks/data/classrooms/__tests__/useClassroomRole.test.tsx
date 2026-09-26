// @vitest-environment jsdom
/**
 * The guard contract.
 *
 * A browser run caught this the hard way: keying a redirect on `role === null`
 * ejects a teacher from their OWN classroom whenever `GET /classrooms` fails,
 * because a failed request and "not your classroom" produce the same null. The
 * fix is `isResolved` — only a confident answer may be acted on — and these
 * tests exist so it cannot regress.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import SuperJSON from 'superjson';
import { describe, expect, it, vi } from 'vitest';
import { MusicAtlasContext } from '@/contexts/MusicAtlasContext/MusicAtlasContext';
import {
  Api,
  HttpClient,
} from '@/contexts/MusicAtlasContext/musicAtlas.generated';
import { API_BASE, mockApi, startMockApi } from '@/test/mockApi';
import {
  useCanEditClassroom,
  useCanManageClassroom,
  useClassroomRole,
} from '../useClassroomRole';

const ME = { id: 'teacher-1', role: 'teacher' };

// `useMe` needs the whole AuthContext (token + bootstrap state). The subject
// here is the ROLE logic, so the signed-in user is stubbed while `/classrooms`
// and `/teachers` still go over real HTTP through msw.
vi.mock('../../auth', () => ({
  useMe: () => ({ data: ME, isLoading: false }),
}));

// `useClassrooms` is gated on a real auth token; stub it so the request runs.
vi.mock('@/contexts/AuthContext/hooks/useAuthToken', () => ({
  useAuthToken: () => 'test-token',
}));

const CID = 'class-a';
const superjson = (payload: unknown) =>
  new HttpResponse(SuperJSON.stringify(payload), {
    headers: { 'Content-Type': 'application/json' },
  });

const wrapper = ({ children }: { children: ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  const api = new Api(
    new HttpClient({
      baseURL: API_BASE,
      transformResponse: (d: unknown) =>
        typeof d === 'string' ? SuperJSON.parse(d) : d,
    }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <MusicAtlasContext.Provider value={api as never}>
        {children}
      </MusicAtlasContext.Provider>
    </QueryClientProvider>
  );
};

describe('useClassroomRole', () => {
  startMockApi();

  it('resolves OWNER from the classroom list without asking for teachers', async () => {
    let teachersCalled = false;
    mockApi.use(
      http.get(`${API_BASE}/classrooms`, () =>
        superjson([{ id: CID, teacherId: ME.id, name: 'A' }]),
      ),
      http.get(`${API_BASE}/classrooms/:id/teachers`, () => {
        teachersCalled = true;
        return superjson({ owner: {}, teachers: [] });
      }),
    );

    const { result } = renderHook(() => useClassroomRole(CID), { wrapper });
    await waitFor(() => expect(result.current.role).toBe('owner'));
    expect(result.current.isResolved).toBe(true);
    // Ownership answered it — no extra request.
    expect(teachersCalled).toBe(false);
  });

  it('resolves EDITOR for a co-teacher from the teachers endpoint', async () => {
    mockApi.use(
      http.get(`${API_BASE}/classrooms`, () => superjson([])),
      http.get(`${API_BASE}/classrooms/:id/teachers`, () =>
        superjson({
          owner: { teacherId: 'someone-else' },
          teachers: [{ teacherId: ME.id, role: 'editor', id: 'r1' }],
        }),
      ),
    );

    const { result } = renderHook(() => useClassroomRole(CID), { wrapper });
    await waitFor(() => expect(result.current.role).toBe('editor'));
    expect(result.current.isResolved).toBe(true);
  });

  it('a FAILED classroom list is NOT a confident "no" — the ejection bug', async () => {
    mockApi.use(
      http.get(`${API_BASE}/classrooms`, () =>
        HttpResponse.json({ message: 'nope' }, { status: 500 }),
      ),
      http.get(`${API_BASE}/classrooms/:id/teachers`, () =>
        HttpResponse.json({ message: 'nope' }, { status: 500 }),
      ),
    );

    const { result } = renderHook(() => useClassroomRole(CID), { wrapper });
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.role).toBeNull();
    // The load-bearing assertion: a guard keyed on isResolved will NOT bounce.
    expect(result.current.isResolved).toBe(false);
    expect(result.current.isDegraded).toBe(true);
  });

  it('a successful list with no match IS a confident "no"', async () => {
    mockApi.use(
      http.get(`${API_BASE}/classrooms`, () => superjson([])),
      http.get(`${API_BASE}/classrooms/:id/teachers`, () =>
        superjson({ owner: { teacherId: 'other' }, teachers: [] }),
      ),
    );

    const { result } = renderHook(() => useClassroomRole(CID), { wrapper });
    await waitFor(() => expect(result.current.isResolved).toBe(true));
    expect(result.current.role).toBeNull();
  });
});

describe('permission split: local edits fail OPEN, server writes fail CLOSED', () => {
  startMockApi();

  it('an unknown role still allows LOCAL curriculum edits', async () => {
    mockApi.use(
      http.get(`${API_BASE}/classrooms`, () =>
        HttpResponse.json({}, { status: 500 }),
      ),
      http.get(`${API_BASE}/classrooms/:id/teachers`, () =>
        HttpResponse.json({}, { status: 500 }),
      ),
    );
    const { result } = renderHook(() => useCanEditClassroom(CID), { wrapper });
    await waitFor(() => expect(result.current).toBe(true));
  });

  it('an unknown role BLOCKS server-backed roster writes', async () => {
    mockApi.use(
      http.get(`${API_BASE}/classrooms`, () =>
        HttpResponse.json({}, { status: 500 }),
      ),
      http.get(`${API_BASE}/classrooms/:id/teachers`, () =>
        HttpResponse.json({}, { status: 500 }),
      ),
    );
    const { result } = renderHook(() => useCanManageClassroom(CID), {
      wrapper,
    });
    // Never flips true on an unknown role.
    await new Promise((r) => setTimeout(r, 300));
    expect(result.current).toBe(false);
  });

  it('a confident VIEWER cannot edit', async () => {
    mockApi.use(
      http.get(`${API_BASE}/classrooms`, () => superjson([])),
      http.get(`${API_BASE}/classrooms/:id/teachers`, () =>
        superjson({
          owner: { teacherId: 'other' },
          teachers: [{ teacherId: ME.id, role: 'viewer', id: 'r1' }],
        }),
      ),
    );
    const { result } = renderHook(() => useCanEditClassroom(CID), { wrapper });
    await waitFor(() => expect(result.current).toBe(false));
  });
});
