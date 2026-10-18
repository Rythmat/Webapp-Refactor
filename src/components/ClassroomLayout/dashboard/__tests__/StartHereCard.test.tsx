// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StartHereCard } from '@/components/ClassroomLayout/dashboard/StartHereCard';
import { getLiveMusicLiteracy } from '@/curriculum/engine/musicLiteracy/registry';
import {
  literacyProgressKey,
  withTry,
  type LiteracyProgress,
} from '@/curriculum/musicLiteracy/useLiteracyProgress';

/**
 * Home's "Start here" card: the Music Literacy path's next stop, how far
 * along it this device is, its one action and the way to the whole path.
 */

// The registry serves the test fixture, under the id the path's Part 1 stop
// opens: the card counts the fixture's steps, never the real lesson's.
vi.mock('@/curriculum/engine/musicLiteracy/registry', async () => {
  const { LITERACY_FIXTURE, fixtureRegistry } = await import(
    '@/curriculum/engine/musicLiteracy/__fixtures__/literacyFixture'
  );
  return fixtureRegistry([
    { ...LITERACY_FIXTURE, id: 'music-literacy-part-1' },
  ]);
});

const lesson = getLiveMusicLiteracy('music-literacy-part-1')!;
const tags = lesson.steps.map((s) => s.tag);

function saveProgress(passed: readonly string[]) {
  let progress: LiteracyProgress = {};
  for (const tag of passed) progress = withTry(progress, tag, 90, true);
  localStorage.setItem(
    literacyProgressKey(lesson.id),
    JSON.stringify(progress),
  );
}

function renderCard() {
  render(
    <MemoryRouter>
      <StartHereCard />
    </MemoryRouter>,
  );
  return within(screen.getByRole('region', { name: 'Start here' }));
}

const hrefOf = (el: HTMLElement) => el.getAttribute('href');

describe('Home’s Start here card', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => cleanup());

  it('starts Part 1 when nothing is tried yet', () => {
    const card = renderCard();
    expect(card.getByText('Part 1 · Call and Response')).toBeTruthy();
    expect(card.getByText(/^7 steps/)).toBeTruthy();
    expect(
      hrefOf(
        card.getByRole('link', { name: 'Start Part 1 · Call and Response' }),
      ),
    ).toBe('/curriculum/music-literacy/music-literacy-part-1');
    expect(card.queryByRole('link', { name: /^Continue/ })).toBeNull();
  });

  it('continues at the next step, with how far along it is', () => {
    saveProgress(['note-called-c', 'root-is-1']);
    const card = renderCard();
    expect(card.getByText(/2 of 7 steps/)).toBeTruthy();
    expect(card.getByText(/Next: Add the 3: Major/)).toBeTruthy();
    expect(card.getByRole('img', { name: '2 of 7 steps passed' })).toBeTruthy();
    expect(
      hrefOf(
        card.getByRole('link', { name: 'Continue Part 1 · Call and Response' }),
      ),
    ).toBe('/curriculum/music-literacy/music-literacy-part-1?step=add-the-3');
  });

  it('offers Part 1 again once it is done, and says what comes next', () => {
    saveProgress(tags);
    const card = renderCard();
    expect(card.getByText(/All 7 steps passed/)).toBeTruthy();
    expect(
      card.getByText(/Up next: Part 2 · Choose a Color, coming soon/),
    ).toBeTruthy();
    expect(
      hrefOf(
        card.getByRole('link', {
          name: 'Play again Part 1 · Call and Response',
        }),
      ),
    ).toBe('/curriculum/music-literacy/music-literacy-part-1');
  });

  it('links to the whole path, Learn → Start Here', () => {
    const card = renderCard();
    expect(hrefOf(card.getByRole('link', { name: /See the path/ }))).toBe(
      '/learn?tab=StartHere',
    );
  });
});
