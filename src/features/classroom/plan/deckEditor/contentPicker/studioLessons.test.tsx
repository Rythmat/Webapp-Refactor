// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { TUTORIAL_COURSES } from '@/daw/components/Tutorial/tutorialCatalog';
import { studioTutorialActivityRef } from '../../../msp/mspLaunchParams';
import { resolveActivityRefHref } from '../../../slides/resolveContentHref';
import { StudioTab } from './StudioTab';
import { studioLessonItems, studioTemplateItems } from './catalog';

/**
 * Teach's content picker, Studio tab: the Studio Basics lessons, in order,
 * ahead of the templates. A picked lesson is a `studio:tutorial:<id>` tile
 * that opens the editor with the lesson running (on the course's demo song,
 * the editor's ?tutorial= boot), the ref its completion is reported under.
 */

const COURSE = TUTORIAL_COURSES[0];

afterEach(cleanup);

describe('the Studio Basics lessons in the picker', () => {
  it('lists the course’s nine lessons in order, each linking its lesson', () => {
    const items = studioLessonItems();
    expect(items.map((i) => i.ref)).toEqual(
      COURSE.lessonIds.map((id) => `studio:tutorial:${id}`),
    );
    expect(items[0]).toMatchObject({
      module: 'studio',
      title: 'Studio Basics 1: Your Tracks',
    });
    expect(items[8].title).toBe('Studio Basics 9: Save and Export');
    for (const item of items) {
      const id = item.ref.slice('studio:tutorial:'.length);
      expect(resolveActivityRefHref('studio', item.ref)).toBe(
        `/studio/editor?tutorial=${id}`,
      );
      // The slide's launch matches the lesson's completion report.
      expect(item.ref).toBe(studioTutorialActivityRef(id));
    }
  });

  it('offers them first on the Studio tab, and emits a launch tile', () => {
    const onSelect = vi.fn();
    render(<StudioTab onSelect={onSelect} />);
    const rows = screen.getAllByRole('button');
    expect(rows).toHaveLength(9 + studioTemplateItems().length);
    expect(rows[0]).toHaveTextContent('Studio Basics 1: Your Tracks');
    fireEvent.click(rows[2]);
    expect(onSelect).toHaveBeenCalledWith({
      module: 'studio',
      activityRef: 'studio:tutorial:studio-basics-record',
      label: { en: 'Studio Basics 3: Record' },
    });
  });
});
