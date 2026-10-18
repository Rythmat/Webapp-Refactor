// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react';
import {
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest';

// ── The Export dialog (milestone 2.15) ─────────────────────────────────────
// One dialog, Audio | Notation, opened from the Export pill, Project ▾, a
// track's menu and the palette. It is mounted only while open (shell-17), so
// the student's choices live in exportDialogStore and the next export
// starts from the last one's. Audio is the whole song, each track (stems,
// with a Stop) or one track (with or without its effects); Notation is a
// MIDI file or MusicXML. What the file would leave out is said first, and
// the run button says why it is off.
//
// Run: npx vitest run src/daw/shell/export/__tests__/ExportDialog.test.tsx

const h = vi.hoisted(() => ({
  exportProjectAudio: vi.fn(),
  exportStems: vi.fn(),
  downloadAudioBlob: vi.fn(),
  exportProjectMidi: vi.fn(),
  buildFullScoreXml: vi.fn(),
  buildLeadSheetExport: vi.fn(),
  downloadFile: vi.fn(),
  notice: vi.fn(),
}));

vi.mock('@/daw/audio/exportAudio', () => ({
  exportProjectAudio: h.exportProjectAudio,
  exportStems: h.exportStems,
  downloadAudioBlob: h.downloadAudioBlob,
  // The tracks that hold something, as stems are chosen (mute and solo
  // aren't under test here).
  stemTracks: (state: {
    tracks: { midiClips: unknown[]; audioClips: unknown[] }[];
  }) =>
    state.tracks.filter(
      (t) => t.midiClips.length > 0 || t.audioClips.length > 0,
    ),
}));
// Four bars of 4/4.
vi.mock('@/daw/audio/renderProject', () => ({
  projectEndTick: () => 4 * 1920,
}));
vi.mock('@/lib/studio-assets/encode-opus', () => ({
  isOpusEncodingSupported: () => true,
}));
vi.mock('@/daw/commands/projectCommands', () => ({
  exportProjectMidi: h.exportProjectMidi,
  planProjectMidi: () => ({ filename: 'night-drive.mid' }),
}));
vi.mock('@/daw/midi/scoreExport', () => ({
  buildFullScoreXml: h.buildFullScoreXml,
  buildLeadSheetExport: h.buildLeadSheetExport,
}));
vi.mock('@/daw/utils/exportFiles', () => ({
  downloadFile: h.downloadFile,
}));
vi.mock('@/daw/shell/notice', () => ({ notice: h.notice }));

import { ExportDialogPart } from '@/daw/shell/lazyParts';
import { useStore } from '@/daw/store';
import type { MidiClip } from '@/daw/store/tracksSlice';
import { ExportDialogHost } from '../ExportDialogHost';
import {
  DEFAULT_EXPORT_CHOICES,
  openExport,
  useExportDialogStore,
} from '../exportDialogStore';

const s = () => useStore.getState();
const dialogState = () => useExportDialogStore.getState();

/** A track with one note (or none), as the store keeps it. */
function addTrack(
  name: string,
  instrument: 'piano-sampler' | 'soundfont' | 'drum-machine' = 'piano-sampler',
  withNotes = true,
): string {
  const id = s().addTrack('midi', instrument, name);
  if (withNotes) {
    s().addMidiClip(id, {
      id: `${id}-clip`,
      startTick: 0,
      events: [
        {
          note: 60,
          velocity: 100,
          startTick: 0,
          durationTicks: 480,
          channel: 0,
        },
      ],
    } as MidiClip);
  }
  return id;
}

const dialog = () => screen.getByRole('dialog');
const group = (name: string) => screen.getByRole('radiogroup', { name });
/** Picks a segmented option in its group (a radio there). */
const pick = (groupName: string, option: string | RegExp) =>
  fireEvent.click(
    within(group(groupName)).getByRole('radio', { name: option }),
  );
const audioRun = () =>
  document.querySelector<HTMLButtonElement>(
    '[data-tutorial-id="export-audio-run"]',
  )!;
const notationRun = () => screen.getByTestId('export-notation-run');

function open(opts?: Parameters<typeof openExport>[0]) {
  act(() => openExport(opts));
}

async function run(button: HTMLElement) {
  await act(async () => {
    fireEvent.click(button);
  });
}

/** Cancel: the dialog closes and unmounts. */
function cancel() {
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(screen.queryByRole('dialog')).toBeNull();
}

beforeAll(async () => {
  // Loaded here, the host shows the dialog at once (1.12a).
  await ExportDialogPart.preload();
});

beforeEach(() => {
  for (const fn of Object.values(h)) fn.mockReset();
  h.exportProjectAudio.mockResolvedValue({
    blob: new Blob(['RIFF']),
    filename: 'song.wav',
  });
  h.exportProjectMidi.mockResolvedValue(true);
  useStore.setState(useStore.getInitialState(), true);
  useStore.setState({ remoteUsers: new Map(), loopEnabled: false });
  s().setTimeSignature(4, 4);
  useExportDialogStore.setState({
    isOpen: false,
    tab: 'audio',
    choices: DEFAULT_EXPORT_CHOICES,
  });
});

afterEach(cleanup);

describe('the Export dialog’s audio choices', () => {
  it('starts from WAV, 16-bit, the whole song, mastering on', async () => {
    addTrack('Keys');
    render(<ExportDialogHost />);
    open();

    await run(audioRun());
    expect(h.exportProjectAudio).toHaveBeenCalledTimes(1);
    expect(h.exportProjectAudio.mock.calls[0][0]).toMatchObject({
      format: 'wav',
      bitDepth: 16,
      range: 'project',
      mastering: true,
    });
    expect(h.exportProjectAudio.mock.calls[0][0]).not.toHaveProperty('trackId');
  });

  it('keeps the format, bit depth and range for the next export', async () => {
    addTrack('Keys');
    render(<ExportDialogHost />);
    open();
    pick('Bit depth', '24-bit');
    pick('Format', 'Opus');
    pick('Range', 'Bars');
    cancel();

    open();
    await run(audioRun());
    expect(h.exportProjectAudio.mock.calls[0][0]).toMatchObject({
      format: 'opus',
      bitDepth: 24,
      // Bars 1 to 4, prefilled again at the opening.
      range: { startTick: 0, endTick: 4 * 1920 },
      rangeLabel: 'bars-1-4',
    });
  });

  it('falls back to the whole song when the loop is off by then', async () => {
    addTrack('Keys');
    useStore.setState({ loopEnabled: true });
    render(<ExportDialogHost />);
    open();
    pick('Range', 'Loop');
    cancel();
    expect(dialogState().choices.range).toBe('loop');

    act(() => useStore.setState({ loopEnabled: false }));
    open();
    expect(
      within(group('Range')).getByRole('radio', { name: 'Whole song' }),
    ).toHaveAttribute('aria-checked', 'true');
    await run(audioRun());
    expect(h.exportProjectAudio.mock.calls[0][0]).toMatchObject({
      range: 'project',
    });
  });

  it('carries the lesson anchors on the dialog and its Export button', () => {
    addTrack('Keys');
    render(<ExportDialogHost />);
    open();
    expect(dialog()).toHaveAttribute('data-tutorial-id', 'export-audio-dialog');
    expect(audioRun()).not.toBeNull();
    expect(audioRun()).toHaveTextContent('Export');
  });
});

describe('Audio | Notation', () => {
  it('switches between the two, each with its own choices', () => {
    addTrack('Keys');
    render(<ExportDialogHost />);
    open();
    expect(screen.getByTestId('export-tab-audio')).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(
      within(screen.getByTestId('export-what')).getByRole('radio', {
        name: 'Each track',
      }),
    ).toBeInTheDocument();
    expect(screen.getByTestId('export-mastering')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('export-tab-notation'));
    expect(dialogState().tab).toBe('notation');
    expect(audioRun()).toBeNull();
    expect(notationRun()).toBeInTheDocument();
    expect(screen.getByTestId('export-notation-format')).toBeInTheDocument();
    expect(screen.queryByTestId('export-mastering')).toBeNull();
    // Stems are an audio idea.
    expect(
      within(screen.getByTestId('export-what')).queryByRole('radio', {
        name: 'Each track',
      }),
    ).toBeNull();
  });

  it('opens on the tab it is asked for', () => {
    addTrack('Keys');
    render(<ExportDialogHost />);
    open({ tab: 'notation' });
    expect(screen.getByTestId('export-tab-notation')).toHaveAttribute(
      'aria-checked',
      'true',
    );
    expect(notationRun()).toBeInTheDocument();
  });

  it('shows Whole song on Notation when stems were chosen on Audio', () => {
    addTrack('Keys');
    render(<ExportDialogHost />);
    open();
    pick('What to export', 'Each track');
    fireEvent.click(screen.getByTestId('export-tab-notation'));
    expect(
      within(group('What to export')).getByRole('radio', {
        name: 'Whole song',
      }),
    ).toHaveAttribute('aria-checked', 'true');
  });
});

describe('one track', () => {
  it('opens on One track and that track when a track’s menu asks', () => {
    addTrack('Keys');
    const bass = addTrack('Bass');
    render(<ExportDialogHost />);
    open({ trackId: bass });
    expect(
      within(group('What to export')).getByRole('radio', { name: 'One track' }),
    ).toHaveAttribute('aria-checked', 'true');
    expect(screen.getByRole('combobox', { name: 'Track' })).toHaveTextContent(
      'Bass',
    );
    expect(screen.getByTestId('export-dry')).toBeInTheDocument();
  });

  it('exports the one track, with its effects and the master chain', async () => {
    const keys = addTrack('Keys');
    useStore.setState({ masteringFxChain: ['compressor'] });
    render(<ExportDialogHost />);
    open({ trackId: keys });
    await run(audioRun());
    expect(h.exportProjectAudio.mock.calls[0][0]).toMatchObject({
      trackId: keys,
      dry: false,
      mastering: true,
    });
  });

  it('turns mastering off for a track without its effects', async () => {
    const keys = addTrack('Keys');
    useStore.setState({ masteringFxChain: ['compressor'] });
    render(<ExportDialogHost />);
    open({ trackId: keys, dry: true });

    const mastering = screen.getByTestId('export-mastering');
    expect(
      within(mastering).getByRole('radio', { name: 'Off' }),
    ).toHaveAttribute('aria-checked', 'true');
    for (const radio of within(mastering).getAllByRole('radio')) {
      expect(radio).toBeDisabled();
    }
    expect(
      screen.getByText(
        'A track without its effects leaves the master chain out too.',
      ),
    ).toBeInTheDocument();

    await run(audioRun());
    expect(h.exportProjectAudio.mock.calls[0][0]).toMatchObject({
      trackId: keys,
      dry: true,
      mastering: false,
    });
  });

  it('leaves One track when its track has gone', () => {
    const keys = addTrack('Keys');
    addTrack('Bass');
    render(<ExportDialogHost />);
    open({ trackId: keys });
    act(() => s().removeTrack(keys));
    expect(dialogState().choices.what).toBe('song');
    expect(dialogState().choices.trackId).toBeNull();
  });
});

describe('mastering', () => {
  it('is off with an empty master chain, and says so', () => {
    addTrack('Keys');
    render(<ExportDialogHost />);
    open();
    for (const radio of within(
      screen.getByTestId('export-mastering'),
    ).getAllByRole('radio')) {
      expect(radio).toBeDisabled();
    }
    expect(
      screen.getByText('The master chain is empty (Mix ▸ Master).'),
    ).toBeInTheDocument();
  });

  it('names the master chain and can be turned off', async () => {
    addTrack('Keys');
    useStore.setState({ masteringFxChain: ['compressor'] });
    render(<ExportDialogHost />);
    open();
    expect(
      screen.getByText('The master chain: Compressor.'),
    ).toBeInTheDocument();
    pick('Mastering', 'Off');
    await run(audioRun());
    expect(h.exportProjectAudio.mock.calls[0][0]).toMatchObject({
      mastering: false,
    });
  });
});

describe('stems', () => {
  it('renders each track with the chosen options, shows progress and stops', async () => {
    addTrack('Keys');
    addTrack('Bass');
    addTrack('Drums', 'drum-machine');
    let report: (p: unknown) => void = () => {};
    let signal: AbortSignal | undefined;
    let fail: (err: unknown) => void = () => {};
    h.exportStems.mockImplementation(
      (_opts: unknown, onProgress: typeof report, sig: AbortSignal) => {
        report = onProgress;
        signal = sig;
        return new Promise((_resolve, reject) => {
          fail = reject;
        });
      },
    );
    render(<ExportDialogHost />);
    open();
    pick('What to export', 'Each track');
    expect(
      screen.getByText('3 files, one for each track that plays, in one zip.'),
    ).toBeInTheDocument();
    pick('Bit depth', '24-bit');

    act(() => {
      fireEvent.click(audioRun());
    });
    expect(h.exportStems).toHaveBeenCalledTimes(1);
    expect(h.exportStems.mock.calls[0][0]).toMatchObject({
      format: 'wav',
      bitDepth: 24,
      range: 'project',
      mastering: true,
    });
    expect(h.exportProjectAudio).not.toHaveBeenCalled();
    // The first track, before the export says anything.
    expect(screen.getByRole('status')).toHaveTextContent('Track 1 of 3 · Keys');

    act(() =>
      report({ index: 1, total: 3, trackName: 'Bass', stage: 'render' }),
    );
    expect(screen.getByRole('status')).toHaveTextContent('Track 2 of 3 · Bass');
    act(() =>
      report({ index: 1, total: 3, trackName: 'Bass', stage: 'encode' }),
    );
    expect(screen.getByRole('status')).toHaveTextContent(
      'Track 2 of 3 · Bass · encoding',
    );
    // Nothing else closes it while it renders.
    expect(screen.queryByRole('button', { name: 'Cancel' })).toBeNull();

    fireEvent.click(screen.getByTestId('export-stop'));
    expect(signal?.aborted).toBe(true);
    expect(screen.getByTestId('export-stop')).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent(
      'Stopping after Track 2 of 3 · Bass',
    );

    await act(async () => {
      fail(new DOMException('Stopped', 'AbortError'));
    });
    expect(h.notice).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Export stopped' }),
    );
    expect(h.notice).not.toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'destructive' }),
    );
    expect(h.downloadAudioBlob).not.toHaveBeenCalled();
    // Stopped, the dialog stays open, ready to go again.
    expect(dialogState().isOpen).toBe(true);
    expect(dialog()).toBeInTheDocument();
    expect(screen.queryByTestId('export-stop')).toBeNull();
    expect(audioRun()).toBeEnabled();
  });

  it('warns that stems with mastering won’t add up to the song', () => {
    addTrack('Keys');
    addTrack('Bass');
    useStore.setState({ masteringFxChain: ['compressor'] });
    render(<ExportDialogHost />);
    open();
    pick('What to export', 'Each track');
    expect(
      screen.getByText(/each stem goes through the master chain alone/),
    ).toBeInTheDocument();
    pick('Mastering', 'Off');
    expect(
      screen.queryByText(/each stem goes through the master chain alone/),
    ).toBeNull();
  });

  it('is off while no track plays anything', () => {
    addTrack('Keys', 'piano-sampler', false);
    render(<ExportDialogHost />);
    open();
    pick('What to export', 'Each track');
    expect(audioRun()).toBeDisabled();
    expect(
      screen.getByText('No track plays anything yet.'),
    ).toBeInTheDocument();
  });
});

describe('an audio export', () => {
  it('downloads the file, tells the lessons and closes', async () => {
    addTrack('Keys');
    render(<ExportDialogHost />);
    open();
    expect(s().lastAudioExportAt).toBeFalsy();

    await run(audioRun());
    const { blob } = await h.exportProjectAudio.mock.results[0].value;
    expect(h.downloadAudioBlob).toHaveBeenCalledWith(blob, 'song.wav');
    expect(s().lastAudioExportAt).toEqual(expect.any(Number));
    expect(h.notice).toHaveBeenCalledWith({ title: 'Exported song.wav' });
    expect(dialogState().isOpen).toBe(false);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('says so in red when it fails, and stays open', async () => {
    addTrack('Keys');
    h.exportProjectAudio.mockRejectedValue(new Error('Out of memory'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<ExportDialogHost />);
    open();

    await run(audioRun());
    expect(h.notice).toHaveBeenCalledWith({
      title: 'The export didn’t finish',
      description: 'Out of memory',
      variant: 'destructive',
    });
    expect(h.downloadAudioBlob).not.toHaveBeenCalled();
    expect(dialogState().isOpen).toBe(true);
  });
});

describe('a song where nothing plays', () => {
  it('still exports, saying the file will be silent (a lesson bounces what is there)', () => {
    addTrack('Synth', 'piano-sampler', false);
    render(<ExportDialogHost />);
    open();
    expect(audioRun()).toBeEnabled();
    expect(dialog()).toHaveTextContent('so the file will be silent');
  });

  it('counts a soloed empty track as what plays, as Play does', () => {
    addTrack('Keys');
    const empty = addTrack('Empty', 'piano-sampler', false);
    act(() => s().toggleSolo(empty));
    render(<ExportDialogHost />);
    open();
    expect(dialog()).toHaveTextContent('so the file will be silent');
  });
});

/** The song has chord symbols (what the lead sheet writes). */
function withChords() {
  useStore.setState({
    chordRegions: [
      { id: 'r1' } as unknown as ReturnType<
        typeof useStore.getState
      >['chordRegions'][number],
    ],
  });
}

describe('a notation export', () => {
  it('writes the song’s MIDI file', async () => {
    addTrack('Keys');
    render(<ExportDialogHost />);
    open({ tab: 'notation' });

    await run(notationRun());
    expect(h.exportProjectMidi).toHaveBeenCalledWith({ trackIds: undefined });
    expect(h.notice).toHaveBeenCalledWith({
      title: 'Exported night-drive.mid',
    });
    expect(dialogState().isOpen).toBe(false);
  });

  it('writes one track’s MIDI file', async () => {
    addTrack('Keys');
    const bass = addTrack('Bass');
    render(<ExportDialogHost />);
    open({ tab: 'notation', trackId: bass, notation: 'midi' });

    await run(notationRun());
    expect(h.exportProjectMidi).toHaveBeenCalledWith({ trackIds: [bass] });
  });

  it('says there are no notes when the MIDI file would be empty, and stays open', async () => {
    addTrack('Keys');
    h.exportProjectMidi.mockResolvedValue(false);
    render(<ExportDialogHost />);
    open({ tab: 'notation' });

    await run(notationRun());
    expect(h.notice).toHaveBeenCalledWith({
      title: 'There are no notes to write to a MIDI file',
    });
    expect(h.notice).not.toHaveBeenCalledWith({
      title: 'Exported night-drive.mid',
    });
    expect(dialogState().isOpen).toBe(true);
  });

  it('writes the lead sheet as MusicXML', async () => {
    addTrack('Keys');
    withChords();
    h.buildLeadSheetExport.mockReturnValue({
      xml: '<score-partwise/>',
      filename: 'night-drive-lead-sheet.musicxml',
    });
    render(<ExportDialogHost />);
    open({ tab: 'notation' });
    pick('Notation format', 'MusicXML: lead sheet');

    await run(notationRun());
    expect(h.buildLeadSheetExport).toHaveBeenCalledTimes(1);
    expect(h.exportProjectMidi).not.toHaveBeenCalled();
    const [blob, filename] = h.downloadFile.mock.calls[0];
    expect(filename).toBe('night-drive-lead-sheet.musicxml');
    expect(blob).toBeInstanceOf(Blob);
    expect((blob as Blob).type).toBe('application/vnd.recordare.musicxml+xml');
    expect(dialogState().isOpen).toBe(false);
  });

  it('offers no lead sheet without chord symbols, and needs no track for one', () => {
    render(<ExportDialogHost />);
    open({ tab: 'notation', notation: 'leadsheet' });
    expect(notationRun()).toBeDisabled();
    expect(notationRun()).toHaveAttribute(
      'title',
      'The song has no chord symbols yet',
    );
    // Chords typed into the Lead sheet, and no track at all: it can go.
    act(() => withChords());
    expect(notationRun()).toBeEnabled();
  });

  it('says the song has no chords when the lead sheet would be empty', async () => {
    addTrack('Keys');
    withChords();
    h.buildLeadSheetExport.mockReturnValue(null);
    render(<ExportDialogHost />);
    open({ tab: 'notation', notation: 'leadsheet' });

    await run(notationRun());
    expect(h.notice).toHaveBeenCalledWith({
      title: 'The song has no chord symbols to write yet',
    });
    expect(h.downloadFile).not.toHaveBeenCalled();
    expect(dialogState().isOpen).toBe(true);
  });

  it('writes the full score, or one track’s part', async () => {
    addTrack('Keys');
    const bass = addTrack('Bass');
    h.buildFullScoreXml.mockReturnValue({
      xml: '<score-partwise/>',
      filename: 'night-drive.musicxml',
    });
    render(<ExportDialogHost />);
    open({ tab: 'notation', notation: 'score' });

    await run(notationRun());
    expect(h.buildFullScoreXml).toHaveBeenCalledWith(expect.anything(), {
      trackIds: undefined,
    });
    expect(h.downloadFile.mock.calls[0][1]).toBe('night-drive.musicxml');

    h.buildFullScoreXml.mockReturnValue({
      xml: '<score-partwise/>',
      filename: 'night-drive-bass.musicxml',
    });
    open({ tab: 'notation', trackId: bass, notation: 'score' });
    await run(notationRun());
    expect(h.buildFullScoreXml).toHaveBeenLastCalledWith(expect.anything(), {
      trackIds: [bass],
    });
    expect(h.downloadFile.mock.calls[1][1]).toBe('night-drive-bass.musicxml');
  });

  it('offers MIDI or its part for one track, never the lead sheet', async () => {
    const keys = addTrack('Keys');
    render(<ExportDialogHost />);
    // The lead sheet chosen last time, for the song.
    open({ tab: 'notation', notation: 'leadsheet' });
    cancel();
    open({ tab: 'notation', trackId: keys });

    const formats = within(screen.getByTestId('export-notation-format'))
      .getAllByRole('radio')
      .map((r) => r.textContent);
    expect(formats).toEqual(['MIDI file', 'MusicXML: its part']);
    expect(
      within(screen.getByTestId('export-notation-format')).getByRole('radio', {
        name: 'MIDI file',
      }),
    ).toHaveAttribute('aria-checked', 'true');

    await run(notationRun());
    expect(h.exportProjectMidi).toHaveBeenCalledWith({ trackIds: [keys] });
    expect(h.buildLeadSheetExport).not.toHaveBeenCalled();
  });
});

describe('why Export is off', () => {
  it('asks for a track first in an empty project', () => {
    render(<ExportDialogHost />);
    open();
    expect(audioRun()).toBeDisabled();
    expect(audioRun()).toHaveTextContent('Add a track first');

    fireEvent.click(screen.getByTestId('export-tab-notation'));
    expect(notationRun()).toBeDisabled();
    expect(notationRun()).toHaveTextContent('Add a track first');
  });

  it('says a track without notes has nothing to write down', () => {
    addTrack('Keys');
    const empty = addTrack('Vox', 'piano-sampler', false);
    render(<ExportDialogHost />);
    open({ tab: 'notation', trackId: empty });

    expect(notationRun()).toBeDisabled();
    expect(notationRun()).toHaveAttribute(
      'title',
      'Vox has no notes to write down',
    );
    expect(
      screen.getByText('Vox has no notes to write down.'),
    ).toBeInTheDocument();
  });

  it('says a track without clips has nothing to play', () => {
    const empty = addTrack('Vox', 'piano-sampler', false);
    render(<ExportDialogHost />);
    open({ trackId: empty });
    expect(audioRun()).toBeDisabled();
    expect(screen.getByText('Vox has nothing to play.')).toBeInTheDocument();
  });

  it('says a run of bars is the wrong way round', () => {
    addTrack('Keys');
    render(<ExportDialogHost />);
    open();
    pick('Range', 'Bars');
    fireEvent.change(screen.getByLabelText('Start bar'), {
      target: { value: '4' },
    });
    fireEvent.change(screen.getByLabelText('End bar'), {
      target: { value: '2' },
    });
    expect(audioRun()).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent(
      'The end bar must be the start bar or after it.',
    );
  });
});

describe('warnings', () => {
  it('says a SoundFont track is silent in an audio export', () => {
    addTrack('Keys');
    addTrack('GM Strings', 'soundfont');
    render(<ExportDialogHost />);
    open();
    expect(
      screen.getByText(
        'A General MIDI (SoundFont) track is silent in an export for now.',
      ),
    ).toBeInTheDocument();

    // Notation writes its notes all the same.
    fireEvent.click(screen.getByTestId('export-tab-notation'));
    expect(screen.queryByText(/General MIDI \(SoundFont\)/)).toBeNull();
  });

  it('leaves the SoundFont warning out for one other track', () => {
    const keys = addTrack('Keys');
    addTrack('GM Strings', 'soundfont');
    render(<ExportDialogHost />);
    open({ trackId: keys });
    expect(screen.queryByText(/General MIDI \(SoundFont\)/)).toBeNull();
  });
});
