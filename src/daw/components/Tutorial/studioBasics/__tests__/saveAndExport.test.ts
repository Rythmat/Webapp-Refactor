// @vitest-environment jsdom
/**
 * Studio Basics 9 · Save and Export, on the course's song. Each step's check
 * is armed as the lesson layer arms it: it doesn't pass then, and it passes
 * once the thing really happened, through the editor's own save and exports:
 * Save with the cloud mocked (it refuses once, as the dev bypass's token on
 * the real API does, then takes it), MIDI and MusicXML with the download
 * mocked.
 *
 * Run: npx vitest run src/daw/components/Tutorial/studioBasics/__tests__/saveAndExport.test.ts
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/studio-assets/upload-pending', () => ({
  uploadPendingAudioClips: vi.fn(async () => undefined),
  reconcileMissingAssets: vi.fn(async () => ({
    reuploaded: 0,
    unrecoverable: 0,
  })),
}));
vi.mock('@/components/utils/toast', () => ({
  showError: vi.fn(),
  showSuccess: vi.fn(),
  showWarning: vi.fn(),
}));
vi.mock('@/daw/midi/MidiFileIO', () => ({
  exportMidiFile: () => new Blob(),
  downloadMidiBlob: vi.fn(),
}));
vi.mock('@/daw/midi/MusicXmlExport', () => ({
  downloadLeadSheet: vi.fn(),
}));

import { whenSavesSettled } from '@/daw/commands/cloudSaveStore';
import {
  exportLeadSheetMusicXml,
  exportProjectMidi,
} from '@/daw/commands/projectCommands';
import { registerSaveAuth, saveProject } from '@/daw/commands/saveProject';
import {
  studioProjectsApi,
  type StudioProjectDetail,
} from '@/lib/studio-projects/api';
import { StudioApiError } from '@/lib/studio-projects/studioApiError';
import {
  arm,
  describeLessonConventions,
  openDemoSong,
  s,
} from './scoreToSaveTestUtils';

const SAVE = 'studio-basics-save-and-export';

let unregister: () => void = () => {};
beforeEach(openDemoSong);
afterEach(() => {
  unregister();
  vi.restoreAllMocks();
});

describe('Save and Export', () => {
  it('save passes when the cloud takes the save, and not when it refuses it', async () => {
    unregister = registerSaveAuth(() => 'tok');
    const create = vi
      .spyOn(studioProjectsApi, 'create')
      .mockRejectedValueOnce(
        new StudioApiError({
          status: 401,
          method: 'POST',
          path: '/api/studio/projects',
          message: 'POST /api/studio/projects failed (401)',
        }),
      )
      .mockImplementation(
        async (_token, body) =>
          ({
            ...JSON.parse(JSON.stringify(body)),
            id: 'p1',
            createdAt: new Date(),
            updatedAt: new Date(),
            tracks: body.tracks.map((track, ordinal) => ({
              ...JSON.parse(JSON.stringify(track)),
              id: `row-${ordinal}`,
              ordinal,
            })),
          }) as unknown as StudioProjectDetail,
      );
    const { passes } = arm(SAVE, 'save');
    expect(passes()).toBe(false);

    // Refused: signed out, as the dev bypass's token is on the real API.
    await saveProject({ source: 'menu' });
    await whenSavesSettled(5000);
    expect(create).toHaveBeenCalledTimes(1);
    expect(passes()).toBe(false);

    await saveProject({ source: 'menu' });
    await whenSavesSettled(5000);
    expect(create).toHaveBeenCalledTimes(2);
    expect(passes()).toBe(true);
  });

  it('export-midi passes once a MIDI file is downloaded', async () => {
    const { passes } = arm(SAVE, 'export-midi');
    expect(passes()).toBe(false);
    await exportProjectMidi();
    expect(passes()).toBe(true);
  });

  it('export-musicxml passes once a MusicXML file is downloaded', async () => {
    const { passes } = arm(SAVE, 'export-musicxml');
    expect(passes()).toBe(false);
    await exportProjectMidi();
    expect(passes()).toBe(false);
    await exportLeadSheetMusicXml();
    expect(passes()).toBe(true);
  });

  it('export-audio passes once a mixdown is downloaded', () => {
    const { passes } = arm(SAVE, 'export-audio');
    expect(passes()).toBe(false);
    // What Export Audio marks when its file is handed to the browser.
    s().markAudioExported();
    s().markDone('exportAudio');
    expect(passes()).toBe(true);
  });
});

describeLessonConventions(SAVE);
