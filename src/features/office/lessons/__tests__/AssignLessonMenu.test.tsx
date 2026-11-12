// @vitest-environment jsdom
/**
 * "Assign to a class" on the Lessons page (owner, 2026-11-12): the teacher
 * picks which class the lesson goes to, and it lands on that class's plan.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { OFFICE_LESSONS_SCOPE } from '@/constants/officeScopes';
import type { Day } from '@/features/classroom/types';
import { AssignLessonMenu } from '../AssignLessonMenu';

const saveDay = vi.fn();
let classrooms: { id: string; name: string }[] = [];

vi.mock('@/hooks/data', () => ({
  useMyClassrooms: () => ({ classrooms }),
  useCanEditClassroom: () => true,
}));
vi.mock('@/features/classroom/annual/useAnnualPlan', () => ({
  useAnnualPlan: (cid: string) => ({
    suggestLessonDate: () => (cid === 'c2' ? '2026-11-20' : '2026-11-16'),
  }),
}));
vi.mock('@/features/classroom/plan/useLocalPlan', () => ({
  useLocalPlan: () => ({ listDays: () => [], saveDay }),
}));
vi.mock('sonner', () => ({ toast: { success: vi.fn() } }));

afterEach(() => {
  cleanup();
  saveDay.mockReset();
});

const lesson = {
  id: 'builtin-mj-producer',
  label: 'Michael Jackson · Producer',
  classroomId: OFFICE_LESSONS_SCOPE,
  cells: {},
  deck: { slides: [] },
} as unknown as Day;

const open = () => {
  render(
    <MemoryRouter>
      <AssignLessonMenu day={lesson} />
    </MemoryRouter>,
  );
  const trigger = screen.getByRole('button', { name: /assign to a class/i });
  fireEvent.pointerDown(trigger, { button: 0, ctrlKey: false });
  fireEvent.keyDown(trigger, { key: 'Enter' });
};

describe('Assign to a class', () => {
  it('lists the teacher’s classes, and puts the lesson on the one picked', async () => {
    classrooms = [
      { id: 'c1', name: 'Jazz Band' },
      { id: 'c2', name: 'Concert Choir' },
    ];
    open();
    fireEvent.click(
      await screen.findByRole('menuitem', { name: /concert choir/i }),
    );
    expect(saveDay).toHaveBeenCalledTimes(1);
    expect(saveDay.mock.calls[0][0]).toMatchObject({
      classroomId: 'c2',
      scheduledDate: '2026-11-20',
      label: 'Michael Jackson · Producer',
    });
    expect(saveDay.mock.calls[0][0].id).not.toBe(lesson.id);
  });

  it('asks for a class first when there is none', async () => {
    classrooms = [];
    open();
    expect(
      await screen.findByRole('menuitem', { name: /make a class first/i }),
    ).toBeTruthy();
  });
});
