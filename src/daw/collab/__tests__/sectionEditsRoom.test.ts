// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import * as Y from 'yjs';
import { useStore } from '@/daw/store';
import { resetHistory, startHistory } from '@/daw/store/history';
import {
  destroyCollabUndo,
  initCollabUndo,
  smartUndo,
  smartUndoLabel,
} from '@/daw/store/undoMiddleware';
import {
  addSectionOfType,
  duplicateSection,
  insertSection,
} from '@/daw/shell/canvas/sections/sectionActions';
import { setBridge } from '../collabMiddleware';
import {
  getYTracks,
  hydrateDocFromStore,
  sectionsFromDoc,
} from '../YjsDocManager';
import { ZustandYjsBridge } from '../ZustandYjsBridge';

// ── Duplicate and Insert section in a shared session (milestone 2.13) ─────
// They move the whole song after a section in one write. That write goes
// through the store's action (applyArrangementPatch), so the room gets it as
// one update and it is one undo step there, as every other edit is; the
// store's raw setState would leave the partner with the old song, and the
// next remote edit would undo it on this screen too.

const s = () => useStore.getState();
const BAR = 1920;

let doc: Y.Doc;
let partner: Y.Doc;
let bridge: ZustandYjsBridge;
let release: () => void = () => {};

/** The partner's clips on the first track, as `id@bar`. */
function partnerClips(): string[] {
  const track = getYTracks(partner).get(0);
  const clips = track.get('midiClips') as Y.Array<Y.Map<unknown>>;
  return clips
    .toArray()
    .map((c) => `${String(c.get('id'))}@${Number(c.get('startTick')) / BAR}`)
    .sort();
}

const partnerForm = () =>
  sectionsFromDoc(partner).map(
    (x) => `${x.label} ${x.startTick / BAR}-${x.endTick / BAR}`,
  );

beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true);
  const trackId = s().addTrack('midi', 'soundfont', 'Keys');
  s().addMidiClip(trackId, {
    id: 'clip-verse',
    startTick: 0,
    durationTicks: 8 * BAR,
    events: [
      { note: 60, velocity: 100, startTick: 0, durationTicks: 480, channel: 0 },
    ],
  });
  s().addMidiClip(trackId, {
    id: 'clip-chorus',
    startTick: 8 * BAR,
    durationTicks: 8 * BAR,
    events: [
      { note: 64, velocity: 100, startTick: 0, durationTicks: 480, channel: 0 },
    ],
  });
  resetHistory();
  release = startHistory();
  doc = new Y.Doc();
  partner = new Y.Doc();
  doc.on('update', (update: Uint8Array, origin: unknown) => {
    if (origin !== 'network') Y.applyUpdate(partner, update, 'network');
  });
  partner.on('update', (update: Uint8Array, origin: unknown) => {
    if (origin !== 'network') Y.applyUpdate(doc, update, 'network');
  });
  hydrateDocFromStore(doc, s());
  bridge = new ZustandYjsBridge(
    doc,
    (partial) => useStore.setState(partial),
    () => useStore.getState(),
    (listener) => useStore.subscribe(listener),
  );
  setBridge(bridge);
  initCollabUndo(doc);
  bridge.startObserving();
});

afterEach(() => {
  bridge.destroy();
  setBridge(null);
  destroyCollabUndo();
  release();
  resetHistory();
  doc.destroy();
  partner.destroy();
});

describe('a whole-song edit in a shared session', () => {
  it('Duplicate section reaches the partner, and is one undo step', () => {
    const verse = addSectionOfType('verse')!;
    addSectionOfType('chorus');
    expect(duplicateSection(verse)).toBe(true);

    expect(partnerForm()).toEqual(['Verse 0-8', 'Verse 8-16', 'Chorus 16-24']);
    // The Chorus' clip moved on, and the copy of the Verse's is new.
    const clips = partnerClips();
    expect(clips).toHaveLength(3);
    expect(clips).toContain('clip-verse@0');
    expect(clips).toContain('clip-chorus@16');
    expect(clips.filter((c) => c.endsWith('@8'))).toHaveLength(1);

    expect(smartUndoLabel()).toBe('Duplicate section');
    smartUndo();
    expect(partnerForm()).toEqual(['Verse 0-8', 'Chorus 8-16']);
    expect(partnerClips()).toEqual(['clip-chorus@8', 'clip-verse@0']);
    expect(s().sections.map((x) => x.label)).toEqual(['Verse', 'Chorus']);
  });

  it('Insert section reaches the partner', async () => {
    const verse = addSectionOfType('verse')!;
    addSectionOfType('chorus');
    await insertSection(verse, 'after', 'bridge');

    expect(partnerForm()).toEqual(['Verse 0-8', 'Bridge 8-16', 'Chorus 16-24']);
    expect(partnerClips()).toEqual(['clip-chorus@16', 'clip-verse@0']);
    expect(smartUndoLabel()).toBe('Insert section');
  });
});
