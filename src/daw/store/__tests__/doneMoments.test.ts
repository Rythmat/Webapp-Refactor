// @vitest-environment jsdom
/**
 * Done moments (doneMomentsSlice.ts): what a lesson step can watch for that
 * the project never shows. Each count goes up once where the thing really
 * happened, belongs to the page (a new project leaves it), and stays out of
 * saves, collab and undo.
 *
 * Run: npx vitest run src/daw/store/__tests__/doneMoments.test.ts
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  downloadMidiBlob: vi.fn(),
  downloadLeadSheet: vi.fn(),
}));

vi.mock('@/daw/midi/MidiFileIO', () => ({
  exportMidiFile: () => new Blob(),
  downloadMidiBlob: h.downloadMidiBlob,
}));
vi.mock('@/daw/midi/MusicXmlExport', () => ({
  downloadLeadSheet: h.downloadLeadSheet,
}));

import {
  exportLeadSheetMusicXml,
  exportProjectMidi,
  printSheet,
} from '@/daw/commands/projectCommands';
import {
  STORE_FIELDS,
  UNDO_KEYS,
} from '@/daw/persistence/projectDocument/fields';
import { initialProjectState } from '@/daw/persistence/projectDocument/projectDefaults';
import { useStore } from '../index';
import { DONE_MOMENTS, noDoneMoments } from '../doneMomentsSlice';
import {
  historyLabels,
  resetHistory,
  startHistory,
  undo,
  withTransaction,
} from '../history';
import type { ChordRegion } from '../prismSlice';

const s = () => useStore.getState();

const NOTE = {
  note: 60,
  velocity: 90,
  startTick: 0,
  durationTicks: 480,
  channel: 0,
};

const CHORD: ChordRegion = {
  id: 'c1',
  startTick: 0,
  endTick: 1920,
  name: '1 maj',
  noteName: 'C maj',
  color: [1, 2, 3],
};

let release: () => void = () => {};

beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true);
  h.downloadMidiBlob.mockReset();
  h.downloadLeadSheet.mockReset();
  resetHistory();
  release = startHistory();
});

afterEach(() => {
  release();
  resetHistory();
  vi.restoreAllMocks();
});

describe('the counts', () => {
  it('start at zero, one for each moment', () => {
    expect(s().doneMoments).toEqual(noDoneMoments());
    expect(Object.keys(s().doneMoments).sort()).toEqual(
      [...DONE_MOMENTS].sort(),
    );
    for (const moment of DONE_MOMENTS) expect(s().doneMoments[moment]).toBe(0);
  });

  it('go up one at a time, each on its own', () => {
    s().markDone('save');
    s().markDone('save');
    s().markDone('printScore');
    expect(s().doneMoments).toEqual({
      ...noDoneMoments(),
      save: 2,
      printScore: 1,
    });
  });

  it('carry on through a new project or a load', () => {
    s().markDone('exportMidi');
    useStore.setState(initialProjectState());
    expect(s().doneMoments.exportMidi).toBe(1);
  });
});

describe('the registry', () => {
  it('keeps them out of saves, collab and undo, for the life of the page', () => {
    expect(STORE_FIELDS.doneMoments).toMatchObject({
      scope: 'session',
      group: 'tutorial',
      local: false,
      cloud: false,
      collab: false,
      undo: false,
      resetOnNew: false,
    });
    expect(UNDO_KEYS).not.toContain('doneMoments');
  });

  it('is never an undo step, and undo leaves them', () => {
    const keys = s().addTrack('midi', 'piano-sampler', 'Keys');
    resetHistory();
    s().markDone('save');
    expect(historyLabels()).toEqual([]);

    withTransaction('Change volume', () => {
      s().updateTrack(keys, { volume: 0.2 });
      s().markDone('exportAudio');
    });
    expect(undo()).toBe(true);
    expect(s().tracks[0].volume).not.toBe(0.2);
    expect(s().doneMoments).toMatchObject({ save: 1, exportAudio: 1 });
  });
});

describe('where they are counted', () => {
  it('Export MIDI counts once the file is downloaded', async () => {
    const keys = s().addTrack('midi', 'piano-sampler', 'Keys');
    s().addMidiClip(keys, { id: 'c', startTick: 0, events: [NOTE] });
    await exportProjectMidi();
    expect(h.downloadMidiBlob).toHaveBeenCalledTimes(1);
    expect(s().doneMoments.exportMidi).toBe(1);
  });

  it('Export MIDI with no notes downloads and counts nothing', async () => {
    s().addTrack('midi', 'piano-sampler', 'Keys');
    await exportProjectMidi();
    expect(h.downloadMidiBlob).not.toHaveBeenCalled();
    expect(s().doneMoments.exportMidi).toBe(0);
  });

  it('the lead sheet’s MusicXML counts once the file is downloaded', async () => {
    useStore.setState({ chordRegions: [CHORD], projectName: 'Blue Song' });
    await exportLeadSheetMusicXml();
    expect(h.downloadLeadSheet).toHaveBeenCalledWith(
      [CHORD],
      expect.objectContaining({ title: 'Blue Song' }),
      'Blue Song.musicxml',
    );
    expect(s().doneMoments.exportMusicXml).toBe(1);
  });

  it('a lead sheet with no chords exports and counts nothing', async () => {
    await exportLeadSheetMusicXml();
    expect(h.downloadLeadSheet).not.toHaveBeenCalled();
    expect(s().doneMoments.exportMusicXml).toBe(0);
  });

  it('printing counts the sheet whose print dialog opened', () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    printSheet('printScore');
    printSheet('printLeadSheet');
    printSheet('printLeadSheet');
    expect(print).toHaveBeenCalledTimes(3);
    expect(s().doneMoments).toMatchObject({
      printScore: 1,
      printLeadSheet: 2,
    });
  });
});
