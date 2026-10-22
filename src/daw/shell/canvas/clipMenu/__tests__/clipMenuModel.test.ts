import { beforeEach, describe, expect, it } from 'vitest';
import { useStore, type AllSlices } from '@/daw/store';
import type { AudioClip, MidiClip } from '@/daw/store/tracksSlice';
import {
  canvasMenuModel,
  menuItemIds,
  type MenuItemModel,
  type MenuModel,
  type SubMenuModel,
} from '../clipMenuModel';

// ── The one clip menu's items (milestone 2.12) ─────────────────────────────
// Every clip type gets the same menu, in Soundtrap's order; what can't act
// now stays in its place, off, with a reason. Run:
// npx vitest run src/daw/shell/canvas/clipMenu/__tests__/clipMenuModel.test.ts

const s = () => useStore.getState();

const note = (n: number, startTick = 0) => ({
  note: n,
  velocity: 100,
  startTick,
  durationTicks: 480,
  channel: 0,
});

let keys = '';
let drums = '';
let vocal = '';

beforeEach(() => {
  useStore.setState(useStore.getInitialState(), true);
  keys = s().addTrack('midi', 'soundfont', 'Keys');
  drums = s().addTrack('midi', 'drum-machine', 'Beat');
  vocal = s().addTrack('audio', 'audio-input', 'Vocal');
  s().addMidiClip(keys, {
    id: 'keys-1',
    startTick: 1920,
    events: [note(60), note(64, 480), note(67, 960)],
  } as MidiClip);
  s().addMidiClip(drums, {
    id: 'beat-1',
    startTick: 0,
    events: [note(36), note(38, 960)],
  } as MidiClip);
  s().addAudioClip(vocal, {
    id: 'take-1',
    startTick: 0,
    duration: 3840,
    fadeInTicks: 480,
    fadeOutTicks: 0,
  } as AudioClip);
});

const ctx = { premium: true, playheadTick: 0 };
const model = (
  target: Parameters<typeof canvasMenuModel>[1],
  context = ctx,
): MenuModel => canvasMenuModel(s() as AllSlices, target, context);
const clip = (trackId: string, clipId: string) =>
  ({ kind: 'clip', trackId, clipId }) as const;

function find(
  m: MenuModel,
  id: string,
): MenuItemModel | SubMenuModel | undefined {
  for (const entry of m.flat()) {
    if (entry.type === 'note') continue;
    if (entry.id === id) return entry;
    if (entry.type === 'sub') {
      const inner = entry.items.find((item) => item.id === id);
      if (inner) return inner;
    }
  }
  return undefined;
}

describe('a clip’s menu', () => {
  it('reads Cut · Copy · Paste · Delete · Duplicate │ Rename · Split · Mute · Comment │ Transpose · Quantize │ Prism on a MIDI clip', () => {
    const m = model(clip(keys, 'keys-1'));
    expect(m.map((group) => group.map((e) => e.id))).toEqual([
      ['cut', 'copy', 'paste', 'delete', 'duplicate'],
      ['rename', 'split', 'mute', 'comment'],
      ['transpose', 'quantize'],
      ['prism'],
    ]);
    // Each item shows the key that does the same from the timeline.
    const shown = m
      .flat()
      .filter((e) => e.type === 'item' && e.command)
      .map((e) => (e.type === 'item' ? e.command : ''));
    expect(shown).toEqual([
      'clip.cut',
      'clip.copy',
      'clip.paste',
      'clip.delete',
      'clip.duplicate',
      'clip.rename',
      'clip.split',
      'clip.mute',
    ]);
  });

  it('gives an audio clip fades where a MIDI clip has Quantize', () => {
    const m = model(clip(vocal, 'take-1'));
    expect(m[2].map((e) => e.id)).toEqual(['transpose', 'fadeIn', 'fadeOut']);
    expect(find(m, 'fadeIn')).toMatchObject({ checked: true });
    expect(find(m, 'fadeOut')).toMatchObject({ checked: false });
    // Audio keeps its pitch: Transpose is there, and says why it is off.
    expect(find(m, 'transpose')).toMatchObject({
      disabled: 'Audio clips keep their pitch',
    });
  });

  it('never transposes drums, as transposePart leaves them', () => {
    const m = model(clip(drums, 'beat-1'));
    expect(find(m, 'transpose')).toMatchObject({
      disabled: 'Drums don’t change pitch',
    });
    expect(find(m, 'quantize')).toMatchObject({ disabled: undefined });
    // Prism's suggestions, but not Prism in the dock, for a drum clip.
    expect(menuItemIds(m)).toContain('prism:suggest');
    expect(menuItemIds(m)).not.toContain('prism:open');
  });

  it('splits only with the playhead inside the clip', () => {
    expect(find(model(clip(keys, 'keys-1')), 'split')).toMatchObject({
      disabled: 'Move the playhead into the clip',
    });
    const inside = model(clip(keys, 'keys-1'), { ...ctx, playheadTick: 2400 });
    expect(find(inside, 'split')).toMatchObject({ disabled: undefined });
    // The clip's edges are not inside it.
    const edge = model(clip(keys, 'keys-1'), { ...ctx, playheadTick: 1920 });
    expect(find(edge, 'split')).toMatchObject({
      disabled: 'Move the playhead into the clip',
    });
  });

  it('checks Mute clip on a muted clip', () => {
    s().updateMidiClip(keys, 'keys-1', { muted: true });
    expect(find(model(clip(keys, 'keys-1')), 'mute')).toMatchObject({
      checked: true,
    });
  });

  it('pastes only what fits the track, and says what to do first', () => {
    expect(find(model(clip(keys, 'keys-1')), 'paste')).toMatchObject({
      disabled: 'Copy or cut a clip first',
    });
    s().setClipboard([s().tracks[0].midiClips[0]]);
    expect(find(model(clip(keys, 'keys-1')), 'paste')).toMatchObject({
      disabled: undefined,
    });
    expect(find(model(clip(vocal, 'take-1')), 'paste')).toMatchObject({
      disabled: 'MIDI clips go on MIDI tracks',
    });
  });

  it('shows Add comment off until comments arrive (4.3)', () => {
    expect(find(model(clip(keys, 'keys-1')), 'comment')).toMatchObject({
      disabled: expect.any(String),
    });
  });

  it('offers a free student Prism locked, as one item', () => {
    const m = model(clip(keys, 'keys-1'), { ...ctx, premium: false });
    expect(m[3]).toEqual([
      { type: 'item', id: 'prism:upgrade', label: 'Prism', premium: true },
    ]);
  });

  it('quantizes to the timeline’s grid first, then the usual values', () => {
    useStore.setState({ timelineGridSize: '1/8' });
    const quantize = find(model(clip(keys, 'keys-1')), 'quantize');
    expect(quantize?.type === 'sub' && quantize.items.map((i) => i.id)).toEqual(
      [
        'quantize:grid',
        'quantize:1/4',
        'quantize:1/8',
        'quantize:1/16',
        'quantize:1/32',
        'quantize:1/8T',
        'quantize:1/16T',
      ],
    );
  });

  it('keeps everything that would change a collaborator’s track off, Copy aside', () => {
    useStore.setState({
      remoteUsers: new Map([
        [7, { userName: 'Sam', selectedTrackId: keys } as never],
      ]),
    });
    const m = model(clip(keys, 'keys-1'));
    const off = m
      .flat()
      .filter(
        (e) => e.type !== 'note' && e.disabled === 'Sam is editing this track',
      )
      .map((e) => e.id);
    expect(off).toEqual([
      'cut',
      'paste',
      'delete',
      'duplicate',
      'rename',
      'split',
      'mute',
      'transpose',
      'quantize',
    ]);
    expect(find(m, 'copy')?.disabled).toBeUndefined();
  });

  it('has nothing to show once its clip has gone', () => {
    s().removeMidiClip(keys, 'keys-1');
    expect(model(clip(keys, 'keys-1'))).toEqual([]);
  });
});

describe('the other canvas menus', () => {
  it('an empty MIDI lane: Paste here, Create clip, comment, Prism', () => {
    const m = model({ kind: 'lane', trackId: keys, tick: 960 });
    expect(menuItemIds(m)).toEqual([
      'paste',
      'createClip',
      'comment',
      'prism',
      'prism:suggest',
    ]);
  });

  it('an empty audio lane makes no MIDI clip', () => {
    const m = model({ kind: 'lane', trackId: vocal, tick: 0 });
    expect(menuItemIds(m)).not.toContain('createClip');
  });

  it('a marker and the ruler', () => {
    s().addMarker(1920, 'Verse');
    const markerId = s().markers[0].id;
    expect(
      menuItemIds(model({ kind: 'marker', markerId, tick: 1920 })),
    ).toEqual(['renameMarker', 'deleteMarker']);
    expect(menuItemIds(model({ kind: 'ruler', tick: 0 }))).toEqual([
      'addMarker',
    ]);
  });
});
