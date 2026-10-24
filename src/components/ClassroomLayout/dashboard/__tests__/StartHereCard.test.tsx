// @vitest-environment jsdom
import { act, cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StartHereCard } from '@/components/ClassroomLayout/dashboard/StartHereCard';
import { getLiveMusicLiteracy } from '@/curriculum/engine/musicLiteracy/registry';
import { stopDoneKey } from '@/curriculum/musicLiteracy/stopDone';
import {
  literacyProgressKey,
  withTry,
  type LiteracyProgress,
} from '@/curriculum/musicLiteracy/useLiteracyProgress';
import { TUTORIAL_COURSES } from '@/daw/components/Tutorial/tutorialCatalog';
import { useTutorialProgressStore } from '@/features/tutorials/useTutorialProgressStore';

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
  beforeEach(() => {
    localStorage.clear();
    useTutorialProgressStore.setState({ completedAt: {} });
  });
  afterEach(() => cleanup());

  it('starts Part 1 when nothing is tried yet', () => {
    const card = renderCard();
    expect(card.getByText('Rhythm and Harmony')).toBeTruthy();
    expect(card.getByText(/^7 steps/)).toBeTruthy();
    expect(
      hrefOf(card.getByRole('link', { name: 'Start Rhythm and Harmony' })),
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
      hrefOf(card.getByRole('link', { name: 'Continue Rhythm and Harmony' })),
    ).toBe('/curriculum/music-literacy/music-literacy-part-1?step=add-the-3');
  });

  it('goes on to the band once Part 1 is done (Part 2 unpublished here)', () => {
    saveProgress(tags);
    const card = renderCard();
    expect(card.getByText('Practice with a Band')).toBeTruthy();
    // A stop with a route has no steps to count, and no subtitle: its
    // title says what it is.
    expect(card.queryByText(/steps/)).toBeNull();
    expect(card.queryByRole('img', { name: /steps passed/ })).toBeNull();
    expect(
      hrefOf(card.getByRole('link', { name: 'Start Practice with a Band' })),
    ).toBe('/curriculum/music-literacy/hear-it-with-your-band');
  });

  it('goes on to Studio Basics once the band is done: lesson 1, on its song', () => {
    saveProgress(tags);
    localStorage.setItem(stopDoneKey('hear-it-with-your-band'), '1');
    const card = renderCard();
    expect(card.getByText('Learn Studio Basics')).toBeTruthy();
    expect(card.getByText(/^9 lessons/)).toBeTruthy();
    expect(card.getByRole('img', { name: '0 of 9 lessons done' })).toBeTruthy();
    expect(
      hrefOf(card.getByRole('link', { name: 'Start Learn Studio Basics' })),
    ).toBe('/studio?tutorial=studio-basics-your-tracks');
  });

  it('continues Studio Basics at the first lesson not finished', () => {
    saveProgress(tags);
    localStorage.setItem(stopDoneKey('hear-it-with-your-band'), '1');
    act(() => {
      useTutorialProgressStore.setState({
        completedAt: {
          'studio-basics-your-tracks': 1,
          'studio-basics-add-a-track': 2,
        },
      });
    });
    const card = renderCard();
    expect(card.getByText(/2 of 9 lessons/)).toBeTruthy();
    expect(card.getByText(/Next: Record/)).toBeTruthy();
    expect(
      hrefOf(card.getByRole('link', { name: 'Continue Learn Studio Basics' })),
    ).toBe('/studio?tutorial=studio-basics-record');
  });

  it('goes on to Echo in the Arcade once every Studio Basics lesson is done', () => {
    saveProgress(tags);
    localStorage.setItem(stopDoneKey('hear-it-with-your-band'), '1');
    act(() => {
      useTutorialProgressStore.setState({
        completedAt: Object.fromEntries(
          TUTORIAL_COURSES[0].lessonIds.map((id) => [id, 1]),
        ),
      });
    });
    const card = renderCard();
    expect(card.getByText('Play Echo in the Arcade')).toBeTruthy();
    // A stop with a route: no steps to count.
    expect(card.queryByText(/steps|lessons/)).toBeNull();
    expect(card.queryByText(/coming soon/)).toBeNull();
    expect(
      hrefOf(card.getByRole('link', { name: 'Start Play Echo in the Arcade' })),
    ).toBe('/arcade/echo');
  });

  it('offers Echo again once a song is finished there, the last stop', () => {
    saveProgress(tags);
    localStorage.setItem(stopDoneKey('hear-it-with-your-band'), '1');
    localStorage.setItem(stopDoneKey('echo'), '1');
    act(() => {
      useTutorialProgressStore.setState({
        completedAt: Object.fromEntries(
          TUTORIAL_COURSES[0].lessonIds.map((id) => [id, 1]),
        ),
      });
    });
    const card = renderCard();
    expect(card.getByText('Play Echo in the Arcade')).toBeTruthy();
    expect(card.queryByText(/Up next/)).toBeNull();
    expect(
      hrefOf(
        card.getByRole('link', { name: 'Play again Play Echo in the Arcade' }),
      ),
    ).toBe('/arcade/echo');
  });

  it('links to the whole path, Learn → Start Here', () => {
    const card = renderCard();
    expect(hrefOf(card.getByRole('link', { name: /See the path/ }))).toBe(
      '/learn?tab=StartHere',
    );
  });
});
