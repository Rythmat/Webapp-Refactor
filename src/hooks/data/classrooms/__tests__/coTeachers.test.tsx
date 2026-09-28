// @vitest-environment jsdom
/**
 * Phase-1 DoD: "invite a co-teacher as editor through the real endpoint
 * (mocked in tests)".
 *
 * These go through the GENERATED axios client and are intercepted by msw at the
 * HTTP layer, so what is asserted is what actually travels: method, URL, body.
 * A hand-stubbed mutation would pass even if the hook were still wired to the
 * old `/classrooms/:id/invitations` route that 404s — which is exactly the bug
 * this phase fixes.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import type { ReactNode } from 'react';
import SuperJSON from 'superjson';
import { describe, expect, it } from 'vitest';
import { MusicAtlasContext } from '@/contexts/MusicAtlasContext/MusicAtlasContext';
import {
  Api,
  HttpClient,
} from '@/contexts/MusicAtlasContext/musicAtlas.generated';
import { API_BASE, mockApi, startMockApi } from '@/test/mockApi';
import { useAddClassroomTeacher } from '../useAddClassroomTeacher';
import { useClassroomTeachers } from '../useClassroomTeachers';
import { useRemoveClassroomTeacher } from '../useRemoveClassroomTeacher';
import { useUpdateClassroomTeacherRole } from '../useUpdateClassroomTeacherRole';

const CID = 'classroom-1';

/** The app's response pipeline SuperJSON-parses every 2xx body. */
const superjson = (payload: unknown) =>
  new HttpResponse(SuperJSON.stringify(payload), {
    headers: { 'Content-Type': 'application/json' },
  });

const makeApi = () =>
  new Api(
    new HttpClient({
      baseURL: API_BASE,
      transformResponse: (data: unknown) =>
        typeof data === 'string' ? SuperJSON.parse(data) : data,
    }),
  );

const wrapper = ({ children }: { children: ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>
      <MusicAtlasContext.Provider value={makeApi() as never}>
        {children}
      </MusicAtlasContext.Provider>
    </QueryClientProvider>
  );
};

const CO_ROW = {
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  email: 'co@school.edu',
  fullName: 'Co Teacher',
  id: 'row-1',
  nickname: 'co',
  role: 'editor' as const,
  teacherId: 'teacher-co',
  username: 'coteacher',
};

const TEACHERS_PAYLOAD = {
  owner: {
    email: 'owner@school.edu',
    fullName: 'Owner Teacher',
    nickname: 'owner',
    teacherId: 'teacher-owner',
  },
  teachers: [CO_ROW],
};

describe('co-teacher hooks hit the real /classrooms/:id/teachers routes', () => {
  startMockApi();

  it('GET returns the owner and the co-teacher rows', async () => {
    mockApi.use(
      http.get(`${API_BASE}/classrooms/${CID}/teachers`, () =>
        superjson(TEACHERS_PAYLOAD),
      ),
    );

    const { result } = renderHook(() => useClassroomTeachers(CID), { wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.owner.teacherId).toBe('teacher-owner');
    expect(result.current.data?.teachers).toHaveLength(1);
    expect(result.current.data?.teachers[0].role).toBe('editor');
  });

  it('POSTs {email, role} to /teachers — NOT to /invitations', async () => {
    let seenUrl: string | null = null;
    let seenBody: unknown = null;

    mockApi.use(
      http.post(`${API_BASE}/classrooms/:id/teachers`, async ({ request }) => {
        seenUrl = request.url;
        seenBody = await request.json();
        return superjson({ ...CO_ROW, email: 'new@school.edu' });
      }),
    );

    const { result } = renderHook(() => useAddClassroomTeacher(), { wrapper });
    result.current.mutate({
      classroomId: CID,
      email: 'new@school.edu',
      role: 'editor',
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(seenUrl).toBe(`${API_BASE}/classrooms/${CID}/teachers`);
    expect(String(seenUrl)).not.toContain('/invitations');
    expect(seenBody).toEqual({ email: 'new@school.edu', role: 'editor' });
    expect(result.current.data?.role).toBe('editor');
  });

  it('omits `role` when the caller does not pick one', async () => {
    let seenBody: unknown = null;
    mockApi.use(
      http.post(`${API_BASE}/classrooms/:id/teachers`, async ({ request }) => {
        seenBody = await request.json();
        return superjson({ ...CO_ROW, role: 'viewer' });
      }),
    );

    const { result } = renderHook(() => useAddClassroomTeacher(), { wrapper });
    result.current.mutate({ classroomId: CID, email: 'x@school.edu' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // The server marks `role` optional with no documented default, so the
    // client must not invent one.
    expect(seenBody).toEqual({ email: 'x@school.edu' });
  });

  it('PATCHes a role change to /teachers/:teacherId', async () => {
    let seenUrl: string | null = null;
    let seenBody: unknown = null;
    mockApi.use(
      http.patch(
        `${API_BASE}/classrooms/:id/teachers/:teacherId`,
        async ({ request }) => {
          seenUrl = request.url;
          seenBody = await request.json();
          return superjson({ ...CO_ROW, role: 'viewer' });
        },
      ),
    );

    const { result } = renderHook(() => useUpdateClassroomTeacherRole(), {
      wrapper,
    });
    result.current.mutate({
      classroomId: CID,
      teacherId: 'teacher-co',
      role: 'viewer',
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(seenUrl).toBe(`${API_BASE}/classrooms/${CID}/teachers/teacher-co`);
    expect(seenBody).toEqual({ role: 'viewer' });
  });

  it('DELETEs a co-teacher by teacherId', async () => {
    let seenUrl: string | null = null;
    mockApi.use(
      http.delete(
        `${API_BASE}/classrooms/:id/teachers/:teacherId`,
        ({ request }) => {
          seenUrl = request.url;
          return superjson({ removed: true, teacherId: 'teacher-co' });
        },
      ),
    );

    const { result } = renderHook(() => useRemoveClassroomTeacher(), {
      wrapper,
    });
    result.current.mutate({ classroomId: CID, teacherId: 'teacher-co' });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(seenUrl).toBe(`${API_BASE}/classrooms/${CID}/teachers/teacher-co`);
  });

  it('surfaces a 404 rather than reporting a successful invite', async () => {
    mockApi.use(
      http.post(`${API_BASE}/classrooms/:id/teachers`, () =>
        HttpResponse.json({ message: 'no such user' }, { status: 404 }),
      ),
    );

    const { result } = renderHook(() => useAddClassroomTeacher(), { wrapper });
    result.current.mutate({ classroomId: CID, email: 'ghost@school.edu' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.isSuccess).toBe(false);
  });
});
