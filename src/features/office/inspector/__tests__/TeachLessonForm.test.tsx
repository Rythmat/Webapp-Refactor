// @vitest-environment jsdom
/**
 * "Teach to a class" (owner, 2026-11-12): a Lessons-tab lesson is copied
 * into one of the teacher's classes and opens there, where Go Live works.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OFFICE_LESSONS_SCOPE } from '@/constants/officeScopes';
import type { Day } from '@/features/classroom/types';
import { TeachLessonForm } from '../TeachLessonForm';

const saveDay = vi.fn();
let classrooms: { id: string; name: string }[] = [];

vi.mock('@/hooks/data', () => ({
  useMyClassrooms: () => ({ classrooms }),
  useCanEditClassroom: () => true,
}));
vi.mock('@/features/classroom/annual/useAnnualPlan', () => ({
  useAnnualPlan: () => ({ suggestLessonDate: () => '2026-11-16' }),
}));
vi.mock('@/features/classroom/plan/useLocalPlan', () => ({
  useLocalPlan: () => ({ listDays: () => [], saveDay }),
}));

afterEach(() => {
  cleanup();
  saveDay.mockReset();
});

const lesson = {
  id: 'builtin-mj-producer',
  label: 'Michael Jackson · Producer',
  classroomId: OFFICE_LESSONS_SCOPE,
  cells: {},
  deck: { slides: [{ id: 'builtin-mj-producer-cx-builtin-s1' }] },
} as unknown as Day;

const Where = () => {
  const { pathname, search } = useLocation();
  return <output data-testid="where">{`${pathname}${search}`}</output>;
};

const draw = () =>
  render(
    <MemoryRouter initialEntries={['/office/lessons']}>
      <Routes>
        <Route path="*" element={<TeachLessonForm day={lesson} />} />
      </Routes>
      <Where />
    </MemoryRouter>,
  );

describe('Teach to a class', () => {
  it('copies the lesson into the class on its next day, and opens it there', () => {
    classrooms = [{ id: 'c1', name: 'Band 1' }];
    draw();
    fireEvent.click(screen.getByRole('button', { name: /add to the class/i }));

    expect(saveDay).toHaveBeenCalledTimes(1);
    const copy = saveDay.mock.calls[0][0] as Day;
    expect(copy).toMatchObject({
      classroomId: 'c1',
      scheduledDate: '2026-11-16',
      label: 'Michael Jackson · Producer',
    });
    expect(copy.id).not.toBe(lesson.id);
    expect(copy.deck!.slides[0].id).toBe(`${copy.id}-cx-builtin-s1`);

    const where = screen.getByTestId('where').textContent ?? '';
    expect(where.startsWith('/office/c1/plan?')).toBe(true);
    expect(decodeURIComponent(where)).toContain(`lesson:c1/${copy.id}`);
  });

  it('asks for a class first when there is none', () => {
    classrooms = [];
    draw();
    expect(screen.getByText(/make a class first/i)).toBeTruthy();
    expect(
      screen.getByRole('link', { name: /go to classes/i }).getAttribute('href'),
    ).toBe('/office/classes');
  });
});
