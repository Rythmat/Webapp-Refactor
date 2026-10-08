// @vitest-environment jsdom
/**
 * File ▸ New Project and leaving a shared session (resetToNewProject): the
 * autosave goes, the project starts over through the registry's one door
 * (resetProjectState), and the page reloads into a blank project.
 *
 * The reset happens in the store too, not only with the reload: anything
 * that runs before the page goes sees a new project with no cloud link, and
 * the reset never reaches a collaboration room that is still attached (the
 * old code renamed the project through the collab middleware). Nothing is
 * autosaved before the reload, and the student's prefs stay theirs.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ZustandYjsBridge } from '@/daw/collab/ZustandYjsBridge';
import { setBridge } from '@/daw/collab/collabMiddleware';
import {
  forgetLiveSession,
  resetSessionToEmpty,
  sessionLoadedAt,
} from '@/daw/persistence/SessionSerializer';
import {
  leaveAProjectBehind,
  same,
  storeData,
} from '@/daw/persistence/projectDocument/__tests__/projectLeftBehind';
import { RESET_ON_NEW_KEYS } from '@/daw/persistence/projectDocument/fields';
import { initialProjectState } from '@/daw/persistence/projectDocument/initialState';
import { useStore } from '@/daw/store';
import { readLocalSession, writeLocalSession } from '../localSession';
import { resetToNewProject } from '../newProject';

const s = () => useStore.getState();
const reload = vi.fn();
const realLocation = window.location;

beforeEach(() => {
  localStorage.clear();
  useStore.setState(useStore.getInitialState(), true);
  forgetLiveSession();
  reload.mockReset();
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...realLocation, reload },
  });
});

afterEach(() => {
  setBridge(null);
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: realLocation,
  });
});

/** A cloud project with work in it, autosaved. */
function workInProgress(): void {
  resetSessionToEmpty();
  useStore.setState({ projectId: 'cloud-42' });
  s().setProjectName('Blue Hour');
  s().addTrack('midi', 'piano-sampler', 'Keys');
  s().addMarker(1920, 'Bridge');
  s().setTimeSignature(6, 8);
  s().toggleMetronome();
  expect(writeLocalSession('u1')).toBe(true);
}

describe('resetToNewProject', () => {
  it('drops the autosave, starts a new project and reloads', () => {
    workInProgress();
    resetToNewProject();

    expect(readLocalSession()).toBeNull();
    expect(reload).toHaveBeenCalledTimes(1);
    const fresh = initialProjectState();
    expect({
      projectId: s().projectId,
      projectName: s().projectName,
      tracks: s().tracks,
      markers: s().markers,
      metre: [s().timeSignatureNumerator, s().timeSignatureDenominator],
    }).toEqual({
      projectId: fresh.projectId,
      projectName: fresh.projectName,
      tracks: [],
      markers: [],
      metre: [4, 4],
    });
    // The student's own setting is theirs, not the project's.
    expect(s().metronomeEnabled).toBe(true);
  });

  it('starts over every key a new project does, and leaves every other alone', () => {
    // Every key off its default, as a project could leave it: a key lock, a
    // loop, Score marks, a lesson, the room, the student's prefs.
    const before = leaveAProjectBehind();
    resetToNewProject();

    const after = storeData();
    const fresh = initialProjectState() as Record<string, unknown>;
    const resetKeys = RESET_ON_NEW_KEYS as readonly string[];
    expect(resetKeys.filter((key) => !same(after[key], fresh[key]))).toEqual(
      [],
    );
    expect(
      Object.keys(before).filter(
        (key) =>
          !resetKeys.includes(key) && !Object.is(after[key], before[key]),
      ),
    ).toEqual([]);
  });

  it('writes nothing more before the reload', () => {
    workInProgress();
    resetToNewProject();

    expect(sessionLoadedAt()).toBeNull();
    expect(writeLocalSession('u1')).toBe(false);
    expect(readLocalSession()).toBeNull();
  });

  it('never sends the reset to a room still attached', () => {
    workInProgress();
    const syncToYjs = vi.fn();
    setBridge({
      suppressStoreToYjs: false,
      syncToYjs,
    } as unknown as ZustandYjsBridge);

    resetToNewProject();
    expect(syncToYjs).not.toHaveBeenCalled();
  });
});
