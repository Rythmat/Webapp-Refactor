// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LessonToolRail, type LessonTools } from '../LessonToolRail';

afterEach(cleanup);

const tools = (over: Partial<LessonTools> = {}): LessonTools => ({
  about: { open: false, onToggle: vi.fn() },
  settings: { open: false, onToggle: vi.fn() },
  ...over,
});

describe('LessonToolRail', () => {
  it('holds About this step and the lesson settings, in that order', () => {
    render(<LessonToolRail tools={tools()} />);
    const rail = screen.getByRole('toolbar', { name: 'Lesson tools' });
    expect(
      [...rail.querySelectorAll('button')].map((b) =>
        b.getAttribute('aria-label'),
      ),
    ).toEqual(['About this step', 'Lesson settings']);
  });

  it('toggles each sheet, and says which is open', () => {
    const t = tools({
      about: { open: true, onToggle: vi.fn() },
    });
    render(<LessonToolRail tools={t} />);
    const about = screen.getByRole('button', { name: 'About this step' });
    const settings = screen.getByRole('button', { name: 'Lesson settings' });
    expect(about).toHaveAttribute('aria-expanded', 'true');
    expect(settings).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(about);
    fireEvent.click(settings);
    expect(t.about.onToggle).toHaveBeenCalledTimes(1);
    expect(t.settings.onToggle).toHaveBeenCalledTimes(1);
  });

  it('marks About this step when the step has unseen notes', () => {
    const { container, rerender } = render(<LessonToolRail tools={tools()} />);
    const about = () => screen.getByRole('button', { name: 'About this step' });
    expect(container.querySelector('[data-guitar-about-dot]')).toBeNull();
    expect(about()).not.toHaveAccessibleDescription();
    rerender(
      <LessonToolRail
        tools={tools({
          about: { open: false, hasNews: true, onToggle: vi.fn() },
        })}
      />,
    );
    expect(container.querySelector('[data-guitar-about-dot]')).not.toBeNull();
    expect(about()).toHaveAccessibleDescription('New notes for this step');
  });
});
