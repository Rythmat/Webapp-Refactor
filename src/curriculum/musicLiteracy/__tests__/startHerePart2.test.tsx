// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { StartHere } from '@/components/learn/StartHere';
import {
  choicesStorageKey,
  emptyChoices,
  withMode,
  withTonic,
} from '@/curriculum/engine/musicLiteracy/choices';
import { getLiveMusicLiteracy } from '@/curriculum/engine/musicLiteracy/registry';
import {
  literacyProgressKey,
  withTry,
  type LiteracyProgress,
} from '../useLiteracyProgress';

/**
 * Learn → Start Here with Part 2 published: its stop opens the lesson, in
 * the key the student chose, and comes up once Part 1 is done. The
 * registry serves the frozen fixtures under the path's lesson ids.
 */

vi.mock('@/curriculum/engine/musicLiteracy/registry', async () => {
  const { LITERACY_FIXTURE, fixtureRegistry } = await import(
    '@/curriculum/engine/musicLiteracy/__fixtures__/literacyFixture'
  );
  const { PART2_FIXTURE } = await import(
    '@/curriculum/engine/musicLiteracy/__fixtures__/part2Fixture'
  );
  return fixtureRegistry([
    { ...LITERACY_FIXTURE, id: 'music-literacy-part-1' },
    { ...PART2_FIXTURE, id: 'music-literacy-part-2', status: 'live' },
  ]);
});

const part1 = getLiveMusicLiteracy('music-literacy-part-1')!;
const part2 = getLiveMusicLiteracy('music-literacy-part-2')!;

function save(lessonId: string, passed: readonly string[]) {
  let progress: LiteracyProgress = {};
  for (const tag of passed) progress = withTry(progress, tag, 90, true);
  localStorage.setItem(literacyProgressKey(lessonId), JSON.stringify(progress));
}

const stop = (id: string) =>
  document.querySelector<HTMLElement>(`[data-path-stop="${id}"]`)!;

beforeEach(() => localStorage.clear());
afterEach(() => cleanup());

describe('Start Here with Part 2', () => {
  it('opens Part 2 as a stop of its own, Part 1 first', () => {
    render(
      <MemoryRouter>
        <StartHere />
      </MemoryRouter>,
    );
    const card = within(stop('choose-a-color'));
    expect(stop('choose-a-color').getAttribute('data-path-status')).toBe('new');
    expect(
      card
        .getByRole('link', { name: 'Start Part 2 · Choose a Color' })
        .getAttribute('href'),
    ).toBe('/curriculum/music-literacy/music-literacy-part-2');
    expect(card.getByText(`${part2.steps.length} steps`)).toBeTruthy();
    // Part 1 is still where a new student starts: its pill is the bright one.
    expect(stop('call-and-response').getAttribute('data-path-status')).toBe(
      'new',
    );
  });

  it('comes up next once Part 1 is done, in the key the student chose', () => {
    save(
      part1.id,
      part1.steps.map((s) => s.tag),
    );
    save(part2.id, ['choose-key']);
    localStorage.setItem(
      choicesStorageKey(part2.id),
      JSON.stringify(withMode(withTonic(emptyChoices(), 'Eb'), 'minor')),
    );
    render(
      <MemoryRouter>
        <StartHere />
      </MemoryRouter>,
    );
    const card = within(stop('choose-a-color'));
    expect(stop('choose-a-color').getAttribute('data-path-status')).toBe(
      'started',
    );
    expect(card.getByRole('img', { name: 'E♭ Minor' })).toBeTruthy();
    expect(
      card
        .getByRole('link', { name: 'Continue Part 2 · Choose a Color' })
        .getAttribute('href'),
    ).toBe(
      '/curriculum/music-literacy/music-literacy-part-2?step=one-three-five',
    );
    expect(screen.getByText(/Next: 1-3-5/)).toBeTruthy();
  });
});
