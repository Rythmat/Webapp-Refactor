// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import {
  forgetLiveSession,
  resetSessionToEmpty,
} from '@/daw/persistence/SessionSerializer';
import { markDocumentBaseline } from '@/daw/persistence/saveStatusStore';
import { useStore } from '@/daw/store';
import {
  clearLocalSession,
  unsavedStudioSession,
  writeLocalSession,
} from '../localSession';

/**
 * Which Studio sessions are worth interrupting someone over: the ones a link
 * would keep (keepOutgoingSession). Work is a change to the project document
 * since it opened, or a session kept nowhere else (decision D7); arming a
 * track, the metronome or the playhead is not.
 *
 * Opening a song starts a fresh session, so it discards whatever the Studio was
 * holding. That is worth a prompt when the player has work in there and worth
 * nothing but a click the rest of the time — an empty Studio, or one holding a
 * song they opened and never touched.
 */

const s = () => useStore.getState();

const withATrack = (name = 'My Project') => {
  resetSessionToEmpty();
  s().setProjectName(name);
  s().addTrack('midi', 'piano-sampler', 'Piano');
  // Loading or seeding a session always marks its baseline, so this stands
  // in for "just arrived, nobody has touched it yet".
  markDocumentBaseline();
};

/** A fresh page load (the song library): nothing loaded, the store empty. */
const freshPage = () => {
  forgetLiveSession();
  useStore.setState(useStore.getInitialState(), true);
};

describe('unsavedStudioSession', () => {
  beforeEach(() => {
    localStorage.clear();
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

  it('is silent about arming a track, the metronome or the playhead', () => {
    withATrack();
    s().toggleRecordArm(s().tracks[0].id);
    s().toggleMetronome();
    s().setPosition(1920);
    expect(unsavedStudioSession()).toBeNull();
  });

  it('names the session once the player has changed something', () => {
    withATrack('Blues in G');
    s().updateTrack(s().tracks[0].id, { volume: 0.3 });
    expect(unsavedStudioSession()).toBe('Blues in G');
  });

  it('names a session whose only change is outside the tracks', () => {
    // A marker, the metre or a lead-sheet section is work too.
    withATrack('Blues in G');
    s().addMarker(1920, 'Bridge');
    expect(unsavedStudioSession()).toBe('Blues in G');
  });

  it('names an autosaved session waiting from an earlier visit', () => {
    // A fresh page load on the song library: the store is empty, but the
    // autosave holds a session and is its only copy.
    withATrack('Yesterday’s Jam');
    writeLocalSession();
    freshPage();
    expect(unsavedStudioSession()).toBe('Yesterday’s Jam');
  });

  it('ignores an autosave of an empty session', () => {
    resetSessionToEmpty();
    writeLocalSession();
    freshPage();
    expect(unsavedStudioSession()).toBeNull();
  });

  it('falls back to a name when the project was never titled', () => {
    withATrack('');
    s().updateTrack(s().tracks[0].id, { pan: -0.5 });
    expect(unsavedStudioSession()).toBe('Untitled Project');
  });
});
