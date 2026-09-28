// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { resetSessionToEmpty } from '@/daw/persistence/SessionSerializer';
import { useStore } from '@/daw/store';
import { pushUndo, resetUndoHistory } from '@/daw/store/undoMiddleware';
import {
  clearLocalSession,
  unsavedStudioSession,
  writeLocalSession,
} from '../localSession';

/**
 * Which Studio sessions are worth interrupting someone over.
 *
 * Opening a song starts a fresh session, so it discards whatever the Studio was
 * holding. That is worth a prompt when the player has work in there and worth
 * nothing but a click the rest of the time — an empty Studio, or one holding a
 * song they opened and never touched.
 */

const withATrack = (name = 'My Project') => {
  resetSessionToEmpty();
  useStore.getState().setProjectName(name);
  useStore.getState().addTrack('midi', 'piano-sampler', 'Piano');
  // Loading or seeding a session always rebaselines undo, so this stands in for
  // "just arrived, nobody has touched it yet".
  resetUndoHistory();
};

describe('unsavedStudioSession', () => {
  beforeEach(() => {
    clearLocalSession();
    resetSessionToEmpty();
  });

  it('is silent on an empty Studio', () => {
    expect(unsavedStudioSession()).toBeNull();
  });

  it('is silent on a session nobody has edited', () => {
    // The song-after-song case: open one, go back, open another. Nothing was
    // done to the first, so there is nothing to warn about losing.
    withATrack();
    expect(unsavedStudioSession()).toBeNull();
  });

  it('names the session once the player has changed something', () => {
    withATrack('Blues in G');
    pushUndo(); // a take recorded, a chord edited — anything undoable
    expect(unsavedStudioSession()).toBe('Blues in G');
  });

  it('names an autosaved session waiting from an earlier visit', () => {
    // A fresh page load on the song library: the store is empty, but the
    // autosave holds a session and is its only copy.
    withATrack('Yesterday’s Jam');
    writeLocalSession();
    resetSessionToEmpty();
    resetUndoHistory();
    expect(unsavedStudioSession()).toBe('Yesterday’s Jam');
  });

  it('ignores an autosave of an empty session', () => {
    resetSessionToEmpty();
    writeLocalSession();
    resetSessionToEmpty();
    expect(unsavedStudioSession()).toBeNull();
  });

  it('falls back to a name when the project was never titled', () => {
    withATrack('');
    pushUndo();
    expect(unsavedStudioSession()).toBe('Untitled Project');
  });
});
