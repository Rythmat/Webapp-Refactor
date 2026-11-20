// @vitest-environment jsdom
/**
 * The Story card: the student's Stories, and the open one to name, note,
 * order and delete.
 */
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AtlasNavigationProvider } from '@/components/atlas/navigation/useAtlasNavigate';
import {
  AtlasStoreProvider,
  createAtlasStore,
} from '@/components/atlas/state/atlasStore';
import { StageSignalsProvider } from '@/components/atlas/state/stageSignals';
import {
  addStop,
  resetStoriesForTests,
} from '@/components/atlas/story/storyStorage';
import { setLocalStoreUser } from '@/lib/local-store/userScope';
import StoryPanel from './StoryPanel';

function setup() {
  render(
    <MemoryRouter initialEntries={['/globe?story=1']}>
      <AtlasStoreProvider store={createAtlasStore()}>
        <StageSignalsProvider>
          <AtlasNavigationProvider>
            <StoryPanel onClose={() => undefined} />
          </AtlasNavigationProvider>
        </StageSignalsProvider>
      </AtlasStoreProvider>
    </MemoryRouter>,
  );
}

describe('the Story card', () => {
  beforeEach(() => {
    localStorage.clear();
    resetStoriesForTests();
    setLocalStoreUser('student-1');
  });
  afterEach(() => {
    cleanup();
    setLocalStoreUser(undefined);
  });

  it('explains Add to Story while there are no Stories, and starts one', () => {
    setup();
    expect(screen.getByText(/Make a tour of your own/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /New story/ }));
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveValue(
      'Untitled story',
    );
    expect(screen.getByText(/No stops yet/)).toBeTruthy();
  });

  it('names, notes and orders the stops', () => {
    addStop({ kind: 'artist', artist: 'Bessie Smith' }, 'Bessie Smith');
    addStop(
      { kind: 'place', place: { type: 'city', id: 'memphis' } },
      'Memphis',
    );
    setup();
    fireEvent.change(screen.getByRole('textbox', { name: 'Name' }), {
      target: { value: 'Blues roads' },
    });
    expect(screen.getByRole('heading', { name: 'Blues roads' })).toBeTruthy();
    const stops = screen.getByRole('list', { name: 'Stops' });
    fireEvent.change(
      within(stops).getByRole('textbox', { name: 'Stop 2 note' }),
      { target: { value: 'Beale Street' } },
    );
    fireEvent.click(
      within(stops).getByRole('button', { name: 'Move stop 2 up' }),
    );
    expect(
      within(stops).getByRole('textbox', { name: 'Stop 1 title' }),
    ).toHaveValue('Memphis');
    expect(
      within(stops).getByRole('textbox', { name: 'Stop 1 note' }),
    ).toHaveValue('Beale Street');
  });

  it('asks before deleting a Story', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: /New story/ }));
    fireEvent.click(screen.getByRole('button', { name: /Delete story/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Keep it' }));
    fireEvent.click(screen.getByRole('button', { name: /Delete story/ }));
    fireEvent.click(screen.getByRole('button', { name: 'Delete' }));
    expect(screen.getByText(/Make a tour of your own/)).toBeTruthy();
  });
});
