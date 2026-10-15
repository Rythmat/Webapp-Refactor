// @vitest-environment jsdom
/**
 * File ▸ New, Open…, Save, Save As and Delete (milestone 1.4).
 *
 * New opens a blank project in place through openSession: no question (owner
 * decision 6, the work it replaces is kept with a Restore), no reload. Open…
 * opens the Projects dialog. Both are off in a shared session (E15:
 * membership is the room id). Save and Save As go through saveProject, the
 * one save path; Delete keeps the session open as device-only work, its
 * cloud link let go in the store, the last save and the draft.
 *
 * Run: npx vitest run src/daw/components/Transport/__tests__/FileMenu.test.tsx
 */
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  openSession: vi.fn(async () => ({ status: 'cancelled' })),
  saveProject: vi.fn(async () => ({
    status: 'failed',
    error: { kind: 'unknown', message: '' },
  })),
  patchCloud: vi.fn(async () => undefined),
  remove: vi.fn(async (_token: string, id: string) => ({
    id,
    deletedAt: new Date(),
  })),
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));

vi.mock('@/contexts/AuthContext/hooks/useAuthToken', () => ({
  useAuthToken: () => 'tok',
}));
vi.mock('@/daw/session/openSession', () => ({ openSession: h.openSession }));
vi.mock('@/daw/commands/saveProject', () => ({ saveProject: h.saveProject }));
vi.mock('@/components/utils/toast', () => ({
  showError: h.showError,
  showSuccess: h.showSuccess,
}));
vi.mock('@/lib/studio-projects/api', () => ({
  studioProjectsApi: { remove: h.remove },
}));
// The export dialog is mounted only while open; not under test.
vi.mock('../ExportAudioDialog', () => ({
  DEFAULT_EXPORT_CHOICES: {},
  ExportAudioDialog: () => null,
}));

import { setAudioBuffer } from '@/daw/audio/AudioBufferStore';
import { setLastSaved, useCloudSaveStore } from '@/daw/commands/cloudSaveStore';
import { getSessionGeneration } from '@/daw/session/sessionGeneration';
import {
  registerSessionDeps,
  type SessionDeps,
} from '@/daw/session/sessionDeps';
import { useProjectsDialogStore } from '@/daw/shell/projects/useProjectsDialogStore';
import { useStore } from '@/daw/store';
import { FileMenu } from '../FileMenu';

const s = () => useStore.getState();

/** Open the File menu (Radix opens it from the keyboard in jsdom). */
function openMenu(): void {
  const trigger = screen.getByRole('button', { name: /File/ });
  fireEvent.keyDown(trigger, { key: 'Enter' });
}

function item(name: RegExp | string) {
  return screen.getByRole('menuitem', { name });
}

async function choose(name: RegExp | string): Promise<void> {
  await act(async () => {
    fireEvent.click(item(name));
  });
}

let unregister: () => void = () => {};
const reload = vi.fn();

beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true);
  useProjectsDialogStore.setState({ open: false, focusDraftId: null });
  useCloudSaveStore.setState(useCloudSaveStore.getInitialState(), true);
  for (const fn of Object.values(h)) fn.mockClear();
  unregister = registerSessionDeps({
    drafts: {
      activeDraftId: () => 'draft-live',
      patchCloud: h.patchCloud,
    },
  } as unknown as SessionDeps);
  reload.mockClear();
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { ...window.location, reload },
  });
});

afterEach(() => {
  cleanup();
  unregister();
  vi.restoreAllMocks();
});

describe('File ▸ New Project', () => {
  it('opens a blank project in place: no question, no reload', async () => {
    const confirm = vi.spyOn(window, 'confirm');
    render(<FileMenu />);
    openMenu();
    await choose('New Project');

    expect(h.openSession).toHaveBeenCalledTimes(1);
    expect(h.openSession).toHaveBeenCalledWith(
      { kind: 'new' },
      { source: 'menu' },
    );
    expect(confirm).not.toHaveBeenCalled();
    expect(reload).not.toHaveBeenCalled();
  });

  it('is off in a shared session', async () => {
    useStore.setState({ roomId: 'room-1', collabRole: 'editor' });
    render(<FileMenu />);
    openMenu();

    expect(item('New Project')).toHaveAttribute('aria-disabled', 'true');
    await choose('New Project');
    expect(h.openSession).not.toHaveBeenCalled();
  });
});

describe('File ▸ Open…', () => {
  it('opens the Projects dialog, with no list fetched by the menu', async () => {
    render(<FileMenu />);
    openMenu();
    await choose('Open…');

    expect(useProjectsDialogStore.getState().open).toBe(true);
    expect(h.openSession).not.toHaveBeenCalled();
  });

  it('is off in a shared session, as is the room’s identity alone', async () => {
    // A guest's room identity with no bridge yet: still a room (E15).
    useStore.setState({ roomId: 'room-1', collabRole: 'editor' });
    render(<FileMenu />);
    openMenu();

    expect(item('Open…')).toHaveAttribute('aria-disabled', 'true');
    await choose('Open…');
    expect(useProjectsDialogStore.getState().open).toBe(false);
  });
});

describe('File ▸ Save and Save As', () => {
  it('saves through saveProject, which words the outcome', async () => {
    render(<FileMenu />);
    openMenu();
    // The hint names the student's own modifier (Ctrl off a Mac).
    await choose(/^Save\s*(⌘S|Ctrl\+S)$/);

    expect(h.saveProject).toHaveBeenCalledWith({ source: 'menu' });
    expect(h.showSuccess).not.toHaveBeenCalled();
  });

  it('reads Saving… while a save runs', () => {
    useCloudSaveStore.setState({ phase: 'saving' });
    render(<FileMenu />);
    openMenu();

    expect(item(/Saving…/)).toHaveAttribute('aria-disabled', 'true');
  });

  it('saves a copy under the name asked for, leaving the link to the save', async () => {
    useStore.setState({ projectId: 'p1', projectName: 'Mine' });
    vi.spyOn(window, 'prompt').mockReturnValue('  My Copy ');
    render(<FileMenu />);
    openMenu();
    await choose('Save As…');

    expect(h.saveProject).toHaveBeenCalledWith({
      source: 'menu',
      saveAs: { name: 'My Copy' },
    });
    // The link and the name move only once the copy is saved.
    expect([s().projectId, s().projectName]).toEqual(['p1', 'Mine']);
  });

  it('does nothing when the name is left empty', async () => {
    vi.spyOn(window, 'prompt').mockReturnValue('   ');
    render(<FileMenu />);
    openMenu();
    await choose('Save As…');

    expect(h.saveProject).not.toHaveBeenCalled();
  });
});

describe('File ▸ Delete Project', () => {
  it('keeps the session open as device-only work, its link let go everywhere', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const keys = s().addTrack('audio', 'guitar-fx', 'Take');
    s().updateTrack(keys, {
      audioClips: [
        {
          id: 'take-1',
          startTick: 0,
          duration: 1920,
          fadeInTicks: 0,
          fadeOutTicks: 0,
          assetId: 'asset-1',
        },
      ],
    });
    setAudioBuffer('take-1', {} as AudioBuffer);
    useStore.setState({ projectId: 'p1', projectName: 'Gone' });
    setLastSaved({
      projectId: 'p1',
      fingerprint: 'h1:0',
      version: 1,
      complete: true,
      updatedAt: null,
      at: 1,
      generation: getSessionGeneration(),
    });
    render(<FileMenu />);
    openMenu();
    await choose('Delete Project');
    await waitFor(() =>
      expect(h.showSuccess).toHaveBeenCalledWith('Project deleted'),
    );

    expect(h.remove).toHaveBeenCalledWith('tok', 'p1');
    expect(s().projectId).toBeNull();
    expect(s().tracks.find((t) => t.id === keys)?.audioClips[0].assetId).toBe(
      null,
    );
    expect(useCloudSaveStore.getState().lastSaved).toBeNull();
    expect(h.patchCloud).toHaveBeenCalledWith('draft-live', {
      projectId: null,
      cloud: null,
    });
    expect(h.openSession).not.toHaveBeenCalled();
    expect(h.showSuccess).toHaveBeenCalledWith('Project deleted');
  });

  it('changes nothing when the delete fails, in plain words', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    vi.spyOn(console, 'error').mockImplementation(() => {});
    h.remove.mockRejectedValueOnce(new Error('DELETE /projects/p1 (500)'));
    useStore.setState({ projectId: 'p1', projectName: 'Kept' });
    render(<FileMenu />);
    openMenu();
    await choose('Delete Project');
    await waitFor(() => expect(h.showError).toHaveBeenCalled());

    expect(s().projectId).toBe('p1');
    expect(h.patchCloud).not.toHaveBeenCalled();
    expect(h.showError).toHaveBeenCalledWith(
      expect.not.stringMatching(/500|p1/),
    );
  });

  it('leaves a session opened meanwhile alone, and unlinks only the draft that held the project', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    let finish: () => void = () => {};
    h.remove.mockImplementationOnce(
      (_t, id) =>
        new Promise((resolve) => {
          finish = () => resolve({ id, deletedAt: new Date() });
        }),
    );
    useStore.setState({ projectId: 'p1', projectName: 'Old' });
    render(<FileMenu />);
    openMenu();
    await choose('Delete Project');
    await waitFor(() => expect(h.remove).toHaveBeenCalled());

    // Another project opened while the request was out.
    useStore.setState({ projectId: 'p2', projectName: 'New' });
    await act(async () => {
      finish();
      await Promise.resolve();
    });

    await waitFor(() =>
      expect(h.patchCloud).toHaveBeenCalledWith('draft-live', {
        projectId: null,
        cloud: null,
      }),
    );
    expect(s().projectId).toBe('p2');
  });

  it('is off while a save is out, which would re-create the project', () => {
    useStore.setState({ projectId: 'p1', projectName: 'Busy' });
    useCloudSaveStore.setState({ phase: 'saving' });
    render(<FileMenu />);
    openMenu();

    expect(item('Delete Project')).toHaveAttribute('aria-disabled', 'true');
  });

  it('lets a save still out land before it deletes, then deletes what is open', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    useStore.setState({ projectId: 'p1', projectName: 'Racing' });
    // A save is out (the chip's Retry, say) but the menu isn't 'saving' yet.
    useCloudSaveStore.setState({ inFlight: 1 });
    render(<FileMenu />);
    openMenu();
    await choose('Delete Project');
    expect(confirm).not.toHaveBeenCalled();
    expect(h.remove).not.toHaveBeenCalled();

    // The save lands as a re-created project under a new id.
    act(() => {
      useStore.setState({ projectId: 'p1b' });
      useCloudSaveStore.setState({ inFlight: 0 });
    });
    await waitFor(() => expect(h.remove).toHaveBeenCalledWith('tok', 'p1b'));
  });
});

describe('lesson anchors', () => {
  it('keeps the File menu and Export Audio anchors', () => {
    render(<FileMenu />);
    expect(
      document.querySelector('[data-tutorial-id="file-menu"]'),
    ).not.toBeNull();
    openMenu();
    expect(
      document.querySelector('[data-tutorial-id="file-export-audio"]'),
    ).not.toBeNull();
  });
});
