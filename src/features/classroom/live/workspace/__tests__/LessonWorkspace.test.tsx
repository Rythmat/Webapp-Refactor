// @vitest-environment jsdom
/**
 * The lesson's workspace (owner, 2026-11-11): the places a student opened
 * stay mounted inside the lesson, and the teacher's slide comes over them.
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LESSON_FRAME_NAME } from '@/layouts/DashboardLayout/lessonFrame';
import { LessonWorkspace, lessonSheetOpen } from '../LessonWorkspace';

afterEach(cleanup);

const draw = (over: Partial<Parameters<typeof LessonWorkspace>[0]> = {}) =>
  render(
    <LessonWorkspace
      opened={['studio', 'learn']}
      shown="learn"
      onShow={vi.fn()}
      onSlides={vi.fn()}
      onCloseSheet={vi.fn()}
      title="Michael Jackson"
      language="en"
      {...over}
    />,
  ).container;

describe('LessonWorkspace', () => {
  it('keeps every place opened, showing one, in frames named for the lesson', () => {
    const root = draw();
    const frames = [...root.querySelectorAll('iframe')];
    expect(frames.map((f) => f.dataset.place)).toEqual(['studio', 'learn']);
    expect(
      frames.every((f) => f.getAttribute('name') === LESSON_FRAME_NAME),
    ).toBe(true);
    expect(frames.map((f) => f.getAttribute('src'))).toEqual([
      '/studio',
      '/learn',
    ]);
    // The Studio is hidden, never unmounted: its work stays as it was.
    expect(frames[0].className).toContain('invisible');
    expect(frames[1].className).not.toContain('invisible');
  });

  it('switches place from the bar, and brings the slide up from Slides', () => {
    const onShow = vi.fn();
    const onSlides = vi.fn();
    draw({ onShow, onSlides });
    fireEvent.click(screen.getByRole('button', { name: 'Globe' }));
    expect(onShow).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'globe' }),
    );
    fireEvent.click(screen.getByRole('button', { name: /Slides/ }));
    expect(onSlides).toHaveBeenCalled();
  });

  it('shows the teacher’s slide over the work, until set aside', () => {
    const onCloseSheet = vi.fn();
    draw({ sheet: <p>Before you go</p>, onCloseSheet });
    expect(
      screen.getByRole('dialog', { name: /teacher's slide/ }),
    ).toBeTruthy();
    expect(screen.getByText('Before you go')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Back to my work' }));
    expect(onCloseSheet).toHaveBeenCalled();
  });
});

describe('lessonSheetOpen', () => {
  const base = {
    pinned: false,
    ended: false,
    asks: false,
    slideId: 's-exit',
    setAside: null,
  };
  it('comes up for a slide that asks something', () => {
    expect(lessonSheetOpen(base)).toBe(false);
    expect(lessonSheetOpen({ ...base, asks: true })).toBe(true);
  });
  it('stays down once that slide is set aside, and comes up for the next', () => {
    expect(lessonSheetOpen({ ...base, asks: true, setAside: 's-exit' })).toBe(
      false,
    );
    expect(
      lessonSheetOpen({
        ...base,
        asks: true,
        slideId: 's-reset',
        setAside: 's-exit',
      }),
    ).toBe(true);
  });
  it('comes up when asked for, and when the class ends', () => {
    expect(lessonSheetOpen({ ...base, pinned: true })).toBe(true);
    expect(lessonSheetOpen({ ...base, ended: true })).toBe(true);
  });
});
