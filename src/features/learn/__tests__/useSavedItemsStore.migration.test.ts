// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import {
  migrateSavedItems,
  useSavedItemsStore,
} from '@/features/learn/useSavedItemsStore';

const STORAGE_KEY = 'music-atlas-saved-learn-items';

describe('saved Learn items: guitar moved from Technique to Theory', () => {
  afterEach(() => {
    localStorage.clear();
    useSavedItemsStore.setState({ saved: {} });
  });

  it('turns a saved guitar Technique tile into a saved Ionian (Major)', () => {
    const migrated = migrateSavedItems(
      {
        saved: {
          'technique:guitar:applied-theory-fundamentals': true,
          'technique:Piano Fundamentals': true,
          'mode:dorian': true,
          'course:course:jazz': true,
        },
      },
      0,
    );
    expect(migrated.saved).toEqual({
      'mode:ionian': true,
      'technique:Piano Fundamentals': true,
      'mode:dorian': true,
      'course:course:jazz': true,
    });
  });

  it('leaves saves without the guitar tile untouched', () => {
    const saved = {
      'technique:Applied Theory Fundamentals': true,
      'mode:lydian': true,
    } as const;
    expect(migrateSavedItems({ saved }, 0).saved).toEqual(saved);
    expect(migrateSavedItems(undefined, 0).saved).toEqual({});
  });

  it('only runs on saves from before the move', () => {
    const saved = { 'technique:guitar:applied-theory-fundamentals': true };
    expect(migrateSavedItems({ saved }, 1).saved).toEqual(saved);
  });

  it('migrates what an older build stored when the store rehydrates', async () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        state: {
          saved: {
            'technique:guitar:applied-theory-fundamentals': true,
            'mode:aeolian': true,
          },
        },
        version: 0,
      }),
    );
    await useSavedItemsStore.persist.rehydrate();

    expect(useSavedItemsStore.getState().saved).toEqual({
      'mode:ionian': true,
      'mode:aeolian': true,
    });
    expect(useSavedItemsStore.getState().isSaved('mode', 'ionian')).toBe(true);
    // Written back at the new version, so it runs once.
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toMatchObject({
      version: 1,
      state: { saved: { 'mode:ionian': true, 'mode:aeolian': true } },
    });
  });
});
