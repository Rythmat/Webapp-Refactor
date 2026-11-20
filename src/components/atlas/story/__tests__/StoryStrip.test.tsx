// @vitest-environment jsdom
/**
 * The Story bar along the map's foot in Story mode: what the student is on
 * waits at its end to be added, and Play steps the stops with their words.
 */
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { InspectorProvider } from '@/components/atlas/layout/useInspector';
import { AtlasNavigationProvider } from '@/components/atlas/navigation/useAtlasNavigate';
import {
  AtlasStoreProvider,
  createAtlasStore,
} from '@/components/atlas/state/atlasStore';
import { StageSignalsProvider } from '@/components/atlas/state/stageSignals';
import type { HistoricalEvent } from '@/components/atlas/types';
import { MUSIC_HISTORY } from '@/content/contentStore';
import { setLocalStoreUser } from '@/lib/local-store/userScope';
import { StoryStrip } from '../StoryStrip';
import {
  createStory,
  editStop,
  resetStoriesForTests,
  useStoryShelf,
} from '../storyStorage';

const event = (id: string, title: string, year: number): HistoricalEvent => ({
  id,
  year,
  location: { lat: 35.1, lng: -90, city: 'Memphis', country: 'US' },
  genre: ['Blues'],
  title,
  description: '',
  tags: [],
});
const first = event(
  'strip-test-1',
  'W. C. Handy writes the Memphis Blues',
  1912,
);
const second = event('strip-test-2', 'Sun Records opens', 1952);

function setup(path: string) {
  const where = { search: '' };
  const Where = () => {
    where.search = decodeURIComponent(useLocation().search);
    return null;
  };
  render(
    <MemoryRouter initialEntries={[path]}>
      <AtlasStoreProvider store={createAtlasStore()}>
        <StageSignalsProvider>
          <AtlasNavigationProvider>
            <InspectorProvider>
              <StoryStrip />
            </InspectorProvider>
            <Where />
          </AtlasNavigationProvider>
        </StageSignalsProvider>
      </AtlasStoreProvider>
    </MemoryRouter>,
  );
  return where;
}

// The shelf, read the way the bar does.
let shelf: ReturnType<typeof useStoryShelf>;
function Shelf() {
  shelf = useStoryShelf();
  return null;
}

describe('the Story bar', () => {
  beforeEach(() => {
    localStorage.clear();
    resetStoriesForTests();
    setLocalStoreUser('student-1');
    MUSIC_HISTORY.push(first, second);
  });
  afterEach(() => {
    cleanup();
    setLocalStoreUser(undefined);
    MUSIC_HISTORY.length = 0;
  });

  it('shows only in Story mode with a Story open', () => {
    createStory('Blues roads');
    setup(`/globe?event=${first.id}`);
    expect(screen.queryByTestId('story-strip')).toBeNull();
    cleanup();
    setup(`/globe?story=1&event=${first.id}`);
    expect(screen.getByTestId('story-strip')).toBeTruthy();
  });

  it('adds what the student is on, then plays the stops with their words', () => {
    createStory('Blues roads');
    setup(`/globe?story=1&event=${first.id}`);
    fireEvent.click(screen.getByRole('button', { name: /Add to Story/ }));
    const stops = screen.getByRole('list', { name: 'Stops' });
    expect(
      within(stops).getByRole('button', { name: `Stop 1: ${first.title}` }),
    ).toHaveAttribute('aria-current', 'step');
    // Added: nothing waits to be added any more.
    expect(screen.queryByRole('button', { name: /Add to Story/ })).toBeNull();

    cleanup();
    render(<Shelf />);
    const story = shelf.stories[0];
    editStop(story.id, story.stops[0].id, { note: 'Where it starts' });
    cleanup();

    const where = setup(`/globe?story=1&event=${second.id}`);
    fireEvent.click(screen.getByRole('button', { name: /Add to Story/ }));
    fireEvent.click(screen.getByRole('button', { name: /Play/ }));
    expect(where.search).toBe(`?story=1&event=${first.id}`);
    expect(screen.getByText('Where it starts')).toBeTruthy();
    expect(screen.getByText('1 of 2')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Next stop' }));
    expect(where.search).toBe(`?story=1&event=${second.id}`);
    expect(screen.getByText('2 of 2')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /End/ }));
    expect(screen.getByRole('button', { name: /Play/ })).toBeTruthy();
  });

  it('leaves Story mode', () => {
    createStory('Blues roads');
    const where = setup('/globe?story=1');
    fireEvent.click(screen.getByRole('button', { name: 'Leave Story mode' }));
    expect(where.search).toBe('');
  });
});
