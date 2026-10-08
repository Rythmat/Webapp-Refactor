// @vitest-environment jsdom
import { useState } from 'react';
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ── Export choices between openings ─────────────────────────────────────────
// FileMenu mounts the dialog only while it is open (shell-17: an always-
// mounted dialog re-rendered the transport bar on every track edit), so the
// student's format, bit depth and range live in FileMenu: the next export
// starts from the last one's choices, as it did when the dialog stayed
// mounted.

const h = vi.hoisted(() => ({
  exportProjectAudio: vi.fn(),
}));

vi.mock('@/daw/audio/exportAudio', () => ({
  exportProjectAudio: h.exportProjectAudio,
  downloadAudioBlob: vi.fn(),
}));
// Four bars of 4/4.
vi.mock('@/daw/audio/renderProject', () => ({
  projectEndTick: () => 4 * 1920,
}));
vi.mock('@/lib/studio-assets/encode-opus', () => ({
  isOpusEncodingSupported: () => true,
}));
vi.mock('@/components/utils/toast', () => ({
  showError: vi.fn(),
  showSuccess: vi.fn(),
}));

import { useStore } from '@/daw/store';
import {
  DEFAULT_EXPORT_CHOICES,
  ExportAudioDialog,
  type ExportChoices,
} from '../ExportAudioDialog';

/** FileMenu's wiring: the choices kept here, the dialog mounted while open. */
function FileMenuExport() {
  const [open, setOpen] = useState(false);
  const [choices, setChoices] = useState<ExportChoices>(DEFAULT_EXPORT_CHOICES);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Export Audio…
      </button>
      {open && (
        <ExportAudioDialog
          open
          onOpenChange={setOpen}
          choices={choices}
          onChoicesChange={setChoices}
        />
      )}
    </>
  );
}

const click = (name: string | RegExp) =>
  fireEvent.click(screen.getByRole('button', { name }));

/** Open the dialog, run `pick`, then cancel, which unmounts it. */
function chooseThenCancel(pick: () => void) {
  click('Export Audio…');
  pick();
  click('Cancel');
  expect(screen.queryByRole('dialog')).toBeNull();
}

/** Reopen the dialog and export: the options the export ran with. */
async function reopenAndExport() {
  click('Export Audio…');
  await act(async () => click(/^Export$/));
  return h.exportProjectAudio.mock.calls[0][0];
}

beforeEach(() => {
  h.exportProjectAudio.mockReset();
  h.exportProjectAudio.mockResolvedValue({
    blob: new Blob(),
    filename: 'song.wav',
  });
  useStore.setState({ tracks: [], loopEnabled: false });
  useStore.getState().setTimeSignature(4, 4);
  useStore.getState().addTrack('midi', 'piano-sampler', 'Keys');
});

afterEach(cleanup);

describe('ExportAudioDialog choices', () => {
  it('starts from WAV, 16-bit, the whole project', async () => {
    render(<FileMenuExport />);

    expect(await reopenAndExport()).toMatchObject({
      format: 'wav',
      bitDepth: 16,
      range: 'project',
    });
  });

  it('keeps the format, bit depth and range for the next export', async () => {
    render(<FileMenuExport />);
    chooseThenCancel(() => {
      click('24-bit');
      click(/^Opus/);
      click('Start – End');
    });

    expect(await reopenAndExport()).toMatchObject({
      format: 'opus',
      bitDepth: 24,
      // Bars 1 to 4, prefilled again at the opening.
      range: { startTick: 0, endTick: 4 * 1920 },
    });
  });

  it('falls back to the whole project when the loop is off by then', async () => {
    useStore.setState({ loopEnabled: true });
    render(<FileMenuExport />);
    chooseThenCancel(() => click('Loop region'));

    act(() => useStore.setState({ loopEnabled: false }));

    expect(await reopenAndExport()).toMatchObject({ range: 'project' });
  });
});
