// @vitest-environment jsdom
/**
 * The teacher's list of shared work (owner, 2026-11-11): what a student
 * offered the class can be featured; what they sent the teacher only can't.
 */
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ShowcasePanel } from './ShowcasePanel';

afterEach(cleanup);

describe('ShowcasePanel', () => {
  it('features class offers only, and opens what was sent to the teacher', () => {
    render(
      <ShowcasePanel
        slideId="s-share"
        showcase={null}
        onFeature={vi.fn()}
        onClear={vi.fn()}
        offers={[
          {
            enrollmentId: 'e1',
            displayName: 'Ana Lux',
            artifact: {
              projectId: 'p1',
              name: 'Night Drive',
              place: 'studio',
              audience: 'class',
            },
          },
          {
            enrollmentId: 'e2',
            displayName: 'Ben Ode',
            artifact: {
              projectId: 'song:thriller',
              name: 'Thriller',
              place: 'songs',
              deepLink: '/songs/thriller',
              audience: 'teacher',
            },
          },
        ]}
      />,
    );
    expect(screen.getAllByRole('button', { name: /Feature/ })).toHaveLength(1);
    expect(screen.getByText('Sent to you')).toBeTruthy();
    expect(
      screen.getByRole('link', { name: /Open/ }).getAttribute('href'),
    ).toBe('/songs/thriller');
  });
});
