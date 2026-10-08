// @vitest-environment jsdom
/**
 * The lesson generator, on the small fixture Atlas: suggest a focus, shuffle,
 * search, pick a Group Project role, preview, save.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { newBlankDay } from '../../../plan/newBlankDay';
import type { Day } from '../../../types';
import { fixture, fixtureCatalog } from '../../cortex/__tests__/fixture';
import { DeckWizardPage } from '../DeckWizardPage';
import { recentFocusIds, focusContextForDay } from '../cortexContext';

const saved: Day[] = [];
let days: Day[] = [];

vi.mock('../../cortex/loadLessonAtlas', () => ({
  loadLessonAtlas: async () => ({
    graph: fixture(),
    catalog: fixtureCatalog(),
  }),
}));
vi.mock('../../../plan/useLocalPlan', () => ({
  useLocalPlan: () => ({
    listDays: () => days,
    saveDay: (day: Day) => saved.push(day),
  }),
}));
vi.mock('../../../publish/usePublishedDays', () => ({
  usePublishedDays: () => ({ publishDayToClassroom: vi.fn() }),
}));
vi.mock('../../../live/useStartClassroomSession', () => ({
  useStartClassroomSession: () => vi.fn(),
  confirmPracticeSession: () => true,
}));
vi.mock('../../../live/useLocalSessionStore', () => ({
  useLocalSessionStore: () => ({ endSession: vi.fn() }),
}));
vi.mock('@/hooks/data', () => ({ useCanEditClassroom: () => true }));
vi.mock('../../../annual/useAnnualPlan', () => ({
  useAnnualPlan: () => ({
    plan: {
      year: {
        semesters: { autumn: [{ id: 'unit-1', dayIds: [] }], spring: [] },
      },
    },
    seedFromTemplate: vi.fn(),
    addDayToUnit: vi.fn(),
    suggestDayScheduleInUnit: () => null,
  }),
}));
// The real slides render in the preview; a projector-sized canvas is not
// what is under test here.
vi.mock('../DeckPreview', () => ({
  DeckPreview: ({ day }: { day: Day }) => (
    <ol aria-label="Preview">
      {day.deck?.slides.map((s) => <li key={s.id}>{s.title.en}</li>)}
    </ol>
  ),
}));

const renderWizard = (query = '') =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <MemoryRouter initialEntries={[`/c/class-1/wizard${query}`]}>
        <Routes>
          <Route path="/c/:classroomId/wizard" element={<DeckWizardPage />} />
          <Route path="*" element={<p>Left the wizard</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );

beforeEach(() => {
  saved.length = 0;
  days = [];
});
afterEach(cleanup);

describe('the lesson generator', () => {
  it('suggests a focus, shuffles to another, and finds one by name', async () => {
    renderWizard();
    const heading = await screen.findByRole('heading', { level: 2 });
    const first = heading.textContent;
    fireEvent.click(screen.getByRole('button', { name: /Shuffle/ }));
    expect(screen.getByRole('heading', { level: 2 }).textContent).not.toBe(
      first,
    );
    fireEvent.click(screen.getByRole('button', { name: /Search/ }));
    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: 'motor' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Motor City/ }));
    expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent(
      'Motor City',
    );
    expect(screen.getByText('Your pick')).toBeInTheDocument();
  });

  it("suggests from a planned Day's song", async () => {
    const planned = newBlankDay('Week 3 · Day 2');
    planned.cells.connectRegulate.presentation.song = { id: 'low_tide' };
    days = [{ ...planned, id: 'day-planned' }];
    renderWizard('?day=day-planned');
    expect(
      await screen.findByRole('heading', { level: 2, name: 'Cy Dee' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("From today's plan: “Low Tide”"),
    ).toBeInTheDocument();
  });

  it('builds the chosen role into the lesson and saves it to the plan', async () => {
    renderWizard();
    fireEvent.click(await screen.findByRole('button', { name: /Search/ }));
    fireEvent.change(screen.getByRole('searchbox'), {
      target: { value: 'ana' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Ana Lux/ }));
    fireEvent.click(screen.getByRole('button', { name: /Use Ana Lux/ }));

    const roles = screen.getByRole('radiogroup', { name: 'Group Project' });
    fireEvent.click(within(roles).getByRole('radio', { name: /Producer/ }));
    fireEvent.change(
      screen.getByRole('combobox', { name: 'Studio tutorial' }),
      {
        target: { value: 'hiphop-build-the-beat' },
      },
    );
    fireEvent.click(screen.getByRole('button', { name: /Next: Preview/ }));

    const preview = screen.getByRole('list', { name: 'Preview' });
    expect(preview).toHaveTextContent('Group Project: Producer');
    fireEvent.click(screen.getByRole('button', { name: /Save to Plan/ }));

    expect(saved).toHaveLength(1);
    const day = saved[0];
    expect(day.label).toBe('Ana Lux');
    expect(day.deck?.templateRef).toMatchObject({
      templateId: 'cortex-lesson-v1',
      focusId: 'artist:ana-lux',
      role: 'producer',
    });
    expect(
      day.cells.groupPractice.presentation.interactions?.[0].atlas?.activityRef,
    ).toBe('studio:tutorial:hiphop-build-the-beat');
    expect(screen.getByText('Left the wizard')).toBeInTheDocument();
  });
});

describe('what a planned Day tells the generator', () => {
  it('reads its song, its Globe events and the recent lessons to skip', () => {
    const day = {
      id: 'd1',
      cells: {
        connectRegulate: {
          presentation: {
            song: { id: 'lovely_day' },
            launchTiles: [
              { id: 't1', module: 'globe', activityRef: 'evt-motown' },
              { id: 't2', module: 'globe', activityRef: 'globe:event:evt-x' },
              { id: 't3', module: 'learn', activityRef: 'learn:dorian:d' },
            ],
          },
        },
      },
    } as unknown as Day;
    expect(focusContextForDay(day, ['artist:a'])).toEqual({
      plannedSongIds: ['lovely_day'],
      plannedEventIds: ['evt-motown', 'evt-x'],
      recentFocusIds: ['artist:a'],
    });
    const lesson = (id: string, focusId: string, date: string) =>
      ({
        id,
        scheduledDate: date,
        deck: { templateRef: { templateId: 'cortex-lesson-v1', focusId } },
      }) as unknown as Day;
    expect(
      recentFocusIds(
        [
          lesson('a', 'artist:old', '2026-09-01'),
          lesson('b', 'place:new', '2026-10-01'),
          lesson('d1', 'artist:self', '2026-10-08'),
        ],
        'd1',
      ),
    ).toEqual(['place:new', 'artist:old']);
  });
});
