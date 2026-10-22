// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest';
import { useStore, type AllSlices } from '@/daw/store';

// ── The lead sheet's melody tracks, in the store ──────────────────────────
// The Score is one editor since 2026-10-21 (its Staves menu says which
// tracks have a staff), so the Lead sheet's Melody picker went; its list
// (leadSheetMelodyTrackIds) is still the project's, saved and synced, and
// these are the setters other code calls on it.

const s = () => useStore.getState();

let keys = '';
let lead = '';
let bass = '';

beforeEach(() => {
  useStore.setState({
    tracks: [],
    remoteUsers: new Map(),
    leadSheetShowMelody: false,
    leadSheetMelodyTrackIds: [],
  } as Partial<AllSlices>);
  keys = s().addTrack('midi', 'soundfont', 'Keys');
  lead = s().addTrack('midi', 'oracle-synth', 'Lead');
  bass = s().addTrack('midi', 'soundfont', 'Bass', {
    gmProgram: 33,
  });
});

describe('the setter other code calls', () => {
  it('assigns tracks and, asked to, shows them', () => {
    s().setLeadSheetMelodyTrackIds([bass, bass]);
    expect(s().leadSheetMelodyTrackIds).toEqual([bass]);
    expect(s().leadSheetShowMelody).toBe(false);
    s().setLeadSheetMelodyTrackIds([lead], { show: true });
    expect(s().leadSheetMelodyTrackIds).toEqual([lead]);
    expect(s().leadSheetShowMelody).toBe(true);
    s().setLeadSheetMelodyTrackIds([]);
    expect(s().leadSheetMelodyTrackIds).toEqual([]);
  });

  it('keeps a toggled list in track order, without tracks that are gone', () => {
    useStore.setState({ leadSheetMelodyTrackIds: ['gone', lead] });
    s().toggleLeadSheetMelodyTrack(keys);
    expect(s().leadSheetMelodyTrackIds).toEqual([keys, lead]);
  });
});
