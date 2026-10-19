// @vitest-environment jsdom
/**
 * Done moments on the Score page (doneMomentsSlice.ts): the Lead sheet
 * layout's own MusicXML and PDF buttons count exportMusicXml and
 * printLeadSheet once the file is handed to the browser or the print dialog
 * opens. The Full score layout counts printScore (ScoreView, through the
 * same printSheet), and the Export dialog its own exports
 * (ExportDialog.test.tsx).
 *
 * Run: npx vitest run src/daw/store/__tests__/doneMomentsSheets.test.tsx
 */
import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  downloadFile: vi.fn(),
  buildLeadSheetExport: vi.fn(),
}));

vi.mock('@/daw/components/LeadSheet/SendToSetList', () => ({
  SendToSetListButton: () => null,
}));
vi.mock('@/daw/utils/exportFiles', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/daw/utils/exportFiles')>()),
  downloadFile: h.downloadFile,
}));
vi.mock('@/daw/midi/scoreExport', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/daw/midi/scoreExport')>()),
  buildLeadSheetExport: h.buildLeadSheetExport,
  buildLeadSheetMelodyExport: () => null,
}));

import { LeadSheetToolbar } from '@/daw/components/LeadSheet/LeadSheetToolbar';
import { useStore } from '../index';
import type { ChordRegion } from '../prismSlice';

const s = () => useStore.getState();

const CHORD: ChordRegion = {
  id: 'c1',
  startTick: 0,
  endTick: 1920,
  name: '1 maj',
  noteName: 'C maj',
  color: [1, 2, 3],
};

const button = (anchor: string) =>
  document.querySelector<HTMLButtonElement>(`[data-tutorial-id="${anchor}"]`)!;

beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true);
  useStore.setState({ chordRegions: [CHORD], projectName: 'Blue Song' });
  h.downloadFile.mockReset();
  h.buildLeadSheetExport.mockReset();
  h.buildLeadSheetExport.mockReturnValue({
    xml: '<score-partwise/>',
    filename: 'blue-song-lead-sheet.musicxml',
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('the Lead sheet layout', () => {
  it('counts its MusicXML once the file is downloaded', () => {
    render(<LeadSheetToolbar selectedMeasureIdx={null} />);
    fireEvent.click(button('leadsheet-export-musicxml'));
    expect(h.downloadFile).toHaveBeenCalledTimes(1);
    expect(h.downloadFile.mock.calls[0][1]).toBe(
      'blue-song-lead-sheet.musicxml',
    );
    expect(s().doneMoments.exportMusicXml).toBe(1);
  });

  it('counts nothing when there is nothing to write', () => {
    h.buildLeadSheetExport.mockReturnValue(null);
    render(<LeadSheetToolbar selectedMeasureIdx={null} />);
    fireEvent.click(button('leadsheet-export-musicxml'));
    expect(h.downloadFile).not.toHaveBeenCalled();
    expect(s().doneMoments.exportMusicXml).toBe(0);
  });

  it('counts its PDF as the lead sheet printed', () => {
    const print = vi.spyOn(window, 'print').mockImplementation(() => {});
    render(<LeadSheetToolbar selectedMeasureIdx={null} />);
    fireEvent.click(button('leadsheet-print'));
    expect(print).toHaveBeenCalledTimes(1);
    expect(s().doneMoments).toMatchObject({
      printLeadSheet: 1,
      printScore: 0,
    });
  });
});
