// @vitest-environment jsdom
/**
 * A student's Stories on the device: per user, checked on the way back in,
 * one stop per thing.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { setLocalStoreUser } from '@/lib/local-store/userScope';
import {
  FIRST_STORY_TITLE,
  addStop,
  createStory,
  deleteStory,
  editStop,
  moveStop,
  openStory,
  playStory,
  removeStop,
  resetStoriesForTests,
  useStoryShelf,
} from '../storyStorage';
import type { StoryTarget } from '../storyTypes';

// The hook's snapshot, read without React.
const shelf = (): ReturnType<typeof useStoryShelf> => {
  resetStoriesForTests();
  const raw = localStorage.getItem('musicAtlas:stories:student-1');
  return raw ? JSON.parse(raw) : { stories: [], openId: null };
};

const event = (eventId: string): StoryTarget => ({ kind: 'event', eventId });
const memphis: StoryTarget = {
  kind: 'place',
  place: { type: 'city', id: 'memphis' },
};

describe('the Story store', () => {
  beforeEach(() => {
    localStorage.clear();
    resetStoriesForTests();
    setLocalStoreUser('student-1');
  });
  afterEach(() => setLocalStoreUser(undefined));

  it('makes a first Story on the first Add to Story, then adds to it', () => {
    expect(addStop(event('evt-1'), 'The first')).toMatchObject({
      status: 'added',
    });
    expect(addStop(memphis, 'Memphis').status).toBe('added');
    const { stories, openId } = shelf();
    expect(stories).toHaveLength(1);
    expect(stories[0].title).toBe(FIRST_STORY_TITLE);
    expect(openId).toBe(stories[0].id);
    expect(stories[0].stops.map((s) => s.title)).toEqual([
      'The first',
      'Memphis',
    ]);
  });

  it('refuses the same thing twice', () => {
    addStop(memphis, 'Memphis');
    expect(
      addStop({ kind: 'place', place: { type: 'city', id: 'memphis' } }, 'x')
        .status,
    ).toBe('already');
    expect(shelf().stories[0].stops).toHaveLength(1);
  });

  it('names, notes, orders and removes stops', () => {
    const id = createStory('Blues roads')!;
    addStop(event('a'), 'A');
    addStop(event('b'), 'B');
    addStop(event('c'), 'C');
    const [a, , c] = shelf().stories[0].stops;
    editStop(id, a.id, { title: 'Start', note: 'Where it began' });
    moveStop(id, c.id, -1);
    moveStop(id, a.id, -1); // already first: nothing
    removeStop(id, shelf().stories[0].stops[1].id);
    const stops = shelf().stories[0].stops;
    expect(stops.map((s) => s.title)).toEqual(['Start', 'B']);
    expect(stops[0].note).toBe('Where it began');
  });

  it('keeps each user’s Stories apart', () => {
    createStory('Mine');
    setLocalStoreUser('student-2');
    resetStoriesForTests();
    addStop(memphis, 'Memphis');
    expect(shelf().stories.map((s) => s.title)).toEqual(['Mine']);
  });

  it('opens, closes and deletes a Story', () => {
    const id = createStory('Gone soon')!;
    openStory(null);
    expect(shelf().openId).toBeNull();
    openStory(id);
    playStory(id);
    deleteStory(id);
    expect(shelf()).toEqual({ stories: [], openId: null });
  });

  it('drops what doesn’t read as a Story', () => {
    localStorage.setItem(
      'musicAtlas:stories:student-1',
      JSON.stringify({
        openId: 'gone',
        stories: [
          { id: 'bad' },
          {
            id: 's1',
            title: 'Kept',
            createdAt: 1,
            updatedAt: 1,
            stops: [
              {
                id: 'x',
                target: { kind: 'tour', tourId: 't' },
                title: '',
                note: '',
                addedAt: 1,
              },
              {
                id: 'y',
                target: { kind: 'event', eventId: 'e' },
                title: 'E',
                note: '',
                addedAt: 1,
              },
            ],
          },
        ],
      }),
    );
    resetStoriesForTests();
    // A write reads what's there first, checking it.
    openStory('s1');
    const { stories, openId } = shelf();
    expect(stories.map((s) => s.id)).toEqual(['s1']);
    expect(stories[0].stops.map((s) => s.id)).toEqual(['y']);
    expect(stories[0].description).toBe('');
    expect(openId).toBe('s1');
  });

  it('keeps nothing while auth hasn’t answered', () => {
    setLocalStoreUser(undefined);
    resetStoriesForTests();
    expect(addStop(memphis, 'Memphis').status).toBe('unavailable');
    expect(createStory()).toBeNull();
  });
});
