// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CurriculumRoutes } from '@/constants/routes';
import type { MusicLiteracyLesson } from '@/content/musicLiteracy/schemas';
import type { UserRole } from '@/contexts/AuthContext/types';

const lessons = vi.hoisted(() => {
  const base = {
    part: 1,
    steps: [],
    tempo: 80,
  } as unknown as MusicLiteracyLesson;
  return {
    live: { ...base, id: 'part-1', name: 'Part 1', status: 'live' },
    draft: { ...base, id: 'part-2', name: 'Part 2', status: 'draft' },
  } as Record<string, MusicLiteracyLesson>;
});
vi.mock('@/curriculum/engine/musicLiteracy/registry', () => ({
  listMusicLiteracy: () => [lessons.live, lessons.draft],
  listLiveMusicLiteracy: () => [lessons.live],
  getMusicLiteracy: (id: string) =>
    Object.values(lessons).find((l) => l.id === id),
  getLiveMusicLiteracy: (id: string) =>
    lessons.live.id === id ? lessons.live : undefined,
}));
const auth = vi.hoisted(() => ({ role: 'student' as UserRole | null }));
vi.mock('@/contexts/AuthContext/hooks/useUserRole', () => ({
  useUserRole: () => auth.role,
}));
vi.mock('../MusicLiteracyPlayer', () => ({
  MusicLiteracyPlayer: ({ lesson }: { lesson: MusicLiteracyLesson }) => (
    <p>Playing {lesson.name}</p>
  ),
}));

const { MusicLiteracyIndexRoute, MusicLiteracyLessonRoute } = await import(
  '../MusicLiteracyRoutes'
);

function open(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path={CurriculumRoutes.musicLiteracy.definition}
          element={<MusicLiteracyIndexRoute />}
        />
        <Route
          path={CurriculumRoutes.musicLiteracyLesson.definition}
          element={<MusicLiteracyLessonRoute />}
        />
      </Routes>
    </MemoryRouter>,
  );
}

describe('Music Literacy’s routes', () => {
  afterEach(() => cleanup());

  it('are /curriculum/music-literacy and /curriculum/music-literacy/:id', () => {
    expect(CurriculumRoutes.musicLiteracy()).toBe('/curriculum/music-literacy');
    expect(CurriculumRoutes.musicLiteracyLesson({ id: 'part-1' })).toBe(
      '/curriculum/music-literacy/part-1',
    );
  });

  it('take a student straight into the one live lesson', () => {
    auth.role = 'student';
    open('/curriculum/music-literacy');
    expect(screen.getByText('Playing Part 1')).toBeTruthy();
  });

  it('never show a student a draft', () => {
    auth.role = 'student';
    open('/curriculum/music-literacy/part-2');
    expect(screen.getByText('This Lesson Isn’t Here')).toBeTruthy();
  });

  it('let the console preview a draft through the mirror', () => {
    auth.role = 'editor';
    open('/curriculum/music-literacy/part-2');
    expect(screen.getByText('Playing Part 2')).toBeTruthy();
    cleanup();
    auth.role = 'admin';
    open('/curriculum/music-literacy');
    // Two lessons for the console: the list, the draft marked.
    expect(screen.getByText('Part 1')).toBeTruthy();
    expect(screen.getByText('Draft')).toBeTruthy();
  });
});
