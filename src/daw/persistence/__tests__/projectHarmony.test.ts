// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { useStore } from '@/daw/store';
import type { ChordRegion } from '@/daw/store/prismSlice';
import {
  deserializeCloudProject,
  deserializeSession,
  resetSessionToEmpty,
  serializeSession,
  type CloudProjectDetail,
} from '../SessionSerializer';

const s = () => useStore.getState();

const chord = {
  id: 'c1',
  startTick: 0,
  endTick: 1920,
  name: '1 major',
  noteName: 'C maj',
  color: [255, 0, 0],
  degreeKey: '1 major',
} as ChordRegion;

// What a previous project leaves in the store.
const previousProject = () =>
  useStore.setState({
    chordRegions: [chord],
    chordSeq: [[60, 64, 67]],
    stringSeq: ['1 major'],
    selectedChordIds: ['c1'],
    selectedNotes: [{ trackId: 't', clipId: 'c', noteIndices: [0] }],
    leadSheetSelectedChordIdx: 'c1',
    mode: 'dorian',
    chordAnalysisPromptOpen: true,
  });

const harmony = () => {
  const x = s();
  return {
    chordRegions: x.chordRegions,
    chordSeq: x.chordSeq,
    stringSeq: x.stringSeq,
    selectedChordIds: x.selectedChordIds,
    selectedNotes: x.selectedNotes,
    leadSheetSelectedChordIdx: x.leadSheetSelectedChordIdx,
    mode: x.mode,
    chordAnalysisPromptOpen: x.chordAnalysisPromptOpen,
    selectionAnalysis: x.selectionAnalysis,
    chordAnalysis: x.chordAnalysis,
  };
};
const clean = {
  chordRegions: [],
  chordSeq: [],
  stringSeq: [],
  selectedChordIds: [],
  selectedNotes: [],
  leadSheetSelectedChordIdx: null,
  mode: 'ionian',
  chordAnalysisPromptOpen: false,
  selectionAnalysis: null,
  chordAnalysis: null,
};

const otherProject = {
  id: 'p2',
  name: 'Other',
  composerName: null,
  bpm: 100,
  prism: { rootNote: 2, rhythmName: 'Quarters', genre: 'Pop', swing: 0 },
  tracks: [],
  createdAt: new Date(),
  updatedAt: new Date(),
} as unknown as CloudProjectDetail;

describe('loading a project starts from a clean harmonic slate', () => {
  it('opening a cloud project drops the previous project’s chords, progression and selections', () => {
    previousProject();
    deserializeCloudProject(otherProject);
    expect(harmony()).toEqual(clean);
    expect(s().rootNote).toBe(2);
  });

  it('starting a new project does too', () => {
    previousProject();
    resetSessionToEmpty();
    expect(harmony()).toEqual(clean);
  });

  it('the local autosave keeps the chord symbols and mode', () => {
    useStore.setState({ tracks: [], chordRegions: [chord], mode: 'dorian' });
    const saved = serializeSession();
    previousProject();
    useStore.setState({ chordRegions: [], mode: 'ionian' });
    deserializeSession(saved);
    expect(s().chordRegions).toEqual([chord]);
    expect(s().mode).toBe('dorian');
    expect(s().stringSeq).toEqual([]);
  });

  it('an autosave from before chord symbols were saved loads with none', () => {
    useStore.setState({ tracks: [], chordRegions: [chord], mode: 'dorian' });
    const saved = structuredClone(serializeSession());
    delete saved.data.chordRegions;
    delete saved.data.prism.mode;
    deserializeSession(saved);
    expect(s().chordRegions).toEqual([]);
    expect(s().mode).toBe('ionian');
  });
});
