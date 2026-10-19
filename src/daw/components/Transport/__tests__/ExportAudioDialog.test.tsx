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
/** Picks a segmented option (a radio in its group). */
const pick = (name: string | RegExp) =>
  fireEvent.click(screen.getByRole('radio', { name }));

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
      pick('24-bit');
      pick(/^Opus/);
      pick('Start – End');
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
    chooseThenCancel(() => pick('Loop region'));

    act(() => useStore.setState({ loopEnabled: false }));

    expect(await reopenAndExport()).toMatchObject({ range: 'project' });
  });

  it('counts a finished export as a done moment for the lessons', async () => {
    const before = useStore.getState().doneMoments.exportAudio;
    render(<FileMenuExport />);
    await reopenAndExport();
    expect(useStore.getState().doneMoments.exportAudio).toBe(before + 1);
    expect(useStore.getState().lastAudioExportAt).not.toBeNull();
  });
});

// ── What the dialog warns about ─────────────────────────────────────────────
// SoundFont tracks and amped takes render in the bounce now; only a wah's
// sweep doesn't (its envelope follower can't run offline), so only it warns.

/** A guitar track with a take and `chain` as its stored amp/pedal chain. */
function guitarWith(chain: { type: string; enabled: boolean }[]) {
  const s = useStore.getState();
  const id = s.addTrack('audio', 'guitar-fx', 'Gtr');
  s.addAudioClip(id, {
    id: `${id}-take`,
    startTick: 0,
    duration: 1920,
    fadeInTicks: 0,
    fadeOutTicks: 0,
  });
  s.setGuitarChain(
    id,
    chain.map((b) => ({ ...b, params: {} })),
  );
  return id;
}

describe('ExportAudioDialog warnings', () => {
  it("doesn't warn about SoundFont tracks or amped takes", () => {
    useStore.getState().addTrack('midi', 'soundfont', 'Strings');
    guitarWith([{ type: 'nam-amp', enabled: true }]);
    render(<FileMenuExport />);
    click('Export Audio…');
    expect(screen.queryByText(/SoundFont|dry|wah/i)).toBeNull();
  });

  it('warns that a wah bounces as a fixed filter', () => {
    guitarWith([{ type: 'wah', enabled: true }]);
    // Switched off, or muted: nothing to warn about.
    guitarWith([{ type: 'wah', enabled: false }]);
    const muted = guitarWith([{ type: 'wah', enabled: true }]);
    useStore.getState().updateTrack(muted, { mute: true });
    render(<FileMenuExport />);
    click('Export Audio…');
    expect(
      screen.getByText(
        '1 track uses the wah pedal, which bounces as a fixed filter (no sweep).',
      ),
    ).toBeTruthy();
  });

  it('shows how far the SoundFont tracks have rendered', async () => {
    h.exportProjectAudio.mockImplementation(
      (_opts: unknown, onProgress: (p: unknown) => void) => {
        onProgress({ stage: 'instruments', pct: 0.4 });
        return new Promise(() => {});
      },
    );
    render(<FileMenuExport />);
    click('Export Audio…');
    await act(async () => click(/^Export$/));
    expect(screen.getByText('Rendering instruments 40%')).toBeTruthy();
  });
});
