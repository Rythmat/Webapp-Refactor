// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TUTORIAL_COURSES } from '@/daw/components/Tutorial/tutorialCatalog';
import { studioTutorialActivityRef } from '../../../msp/mspLaunchParams';
import { resolveActivityRefHref } from '../../../slides/resolveContentHref';
import { StudioTab } from './StudioTab';
import { studioLessonItems, studioTemplateItems } from './catalog';

/**
 * Teach's content picker, Studio tab: the Studio Production lessons, in
 * order, ahead of the templates. A picked lesson is a `studio:tutorial:<id>`
 * tile that opens the editor with the lesson running (on a blank project,
 * the editor's ?tutorial= boot), the ref its completion is reported under.
 */

const COURSE = TUTORIAL_COURSES[0];

afterEach(cleanup);

describe('the Studio Production lessons in the picker', () => {
  it('lists the course’s lessons in order, each linking its lesson', () => {
    const items = studioLessonItems();
    expect(items.map((i) => i.ref)).toEqual(
      COURSE.lessonIds.map((id) => `studio:tutorial:${id}`),
    );
    expect(items[0]).toMatchObject({
      module: 'studio',
      title: 'Studio Production 1 · Studio Basics: make your first song',
    });
    expect(items[1].title).toBe(
      'Studio Production 2 · Hip Hop — Build the beat',
    );
    for (const item of items) {
      const id = item.ref.slice('studio:tutorial:'.length);
      expect(resolveActivityRefHref('studio', item.ref)).toBe(
        `/studio?tutorial=${id}`,
      );
      // The slide's launch matches the lesson's completion report.
      expect(item.ref).toBe(studioTutorialActivityRef(id));
    }
  });

  it('offers them first on the Studio tab, and emits a launch tile', () => {
    const onSelect = vi.fn();
    render(<StudioTab onSelect={onSelect} />);
    const rows = screen.getAllByRole('button');
    expect(rows).toHaveLength(
      COURSE.lessonIds.length + studioTemplateItems().length,
    );
    expect(rows[0]).toHaveTextContent('Studio Basics: make your first song');
    fireEvent.click(rows[2]);
    expect(onSelect).toHaveBeenCalledWith({
      module: 'studio',
      activityRef: 'studio:tutorial:house-make-it-pump',
      label: { en: 'Studio Production 3 · House — Make it pump' },
    });
  });
});
