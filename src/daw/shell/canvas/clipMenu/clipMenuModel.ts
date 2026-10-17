import type { AllSlices } from '@/daw/store';
import type { Track } from '@/daw/store/tracksSlice';
import type { AllGridSize } from '@/daw/utils/quantize';
import type { CanvasMenuTarget } from './canvasMenuStore';
import {
  QUANTIZE_GRIDS,
  findClip,
  isDrumTrack,
  playheadInside,
  trackHolder,
  type FoundClip,
} from './clipActions';

// ── The canvas menu's items (milestone 2.12) ───────────────────────────────
//
// What the one clip menu offers, by what it was opened on and what is true
// now, as plain data: CanvasMenu draws it on the 2.2 Menu primitive and
// runCanvasMenuItem (CanvasMenu.tsx) does what an item says. Every clip type
// gets the same menu, after Soundtrap's (anatomy §5, ST1):
//
//   Cut · Copy · Paste · Delete · Duplicate
//   Rename… · Split at playhead · Mute clip · Add comment
//   Transpose ▸ · Quantize ▸ (MIDI) · Fade in · Fade out (audio)
//   Prism ▸ (Premium)
//
// What can't act now stays in its place, off, with the reason as its hint,
// so the menu reads the same every time. An empty lane, a marker and the
// ruler get their own short menus from the same renderer.

export interface MenuItemModel {
  type: 'item';
  /** What runCanvasMenuItem does: 'cut', 'quantize:1/8', 'transpose:+1'. */
  id: string;
  label: string;
  /** The registry command whose key it shows. */
  command?: string;
  /** Why it can't act now: it shows off, with this as its hint. */
  disabled?: string;
  danger?: boolean;
  /** A check item (Mute clip, Fade in): on or off. */
  checked?: boolean;
  /** The menu stays open after it (Transpose's steps). */
  keepOpen?: boolean;
  /** Part of Premium: shown locked to a student without it. */
  premium?: boolean;
}

export interface SubMenuModel {
  type: 'sub';
  id: string;
  label: string;
  disabled?: string;
  items: MenuItemModel[];
}

export type MenuEntry = MenuItemModel | SubMenuModel;

/** Groups of entries, drawn with a separator between them. */
export type MenuModel = MenuEntry[][];

export interface MenuContext {
  /** The student has Premium (Prism). */
  premium: boolean;
  /** The playhead when the menu opened. */
  playheadTick: number;
}

type MenuState = Pick<
  AllSlices,
  | 'tracks'
  | 'remoteUsers'
  | 'clipboardClips'
  | 'clipboardAudioClip'
  | 'markers'
  | 'timelineGridSize'
>;

/** Why the clipboard's clip can't be pasted on `track`, or undefined. */
function pasteBlocked(state: MenuState, track: Track): string | undefined {
  if (state.clipboardAudioClip) {
    return track.type === 'audio'
      ? undefined
      : 'Audio clips go on audio tracks';
  }
  if (state.clipboardClips.length > 0) {
    return track.type === 'midi' ? undefined : 'MIDI clips go on MIDI tracks';
  }
  return 'Copy or cut a clip first';
}

const COMMENT: MenuItemModel = {
  type: 'item',
  id: 'comment',
  label: 'Add comment',
  disabled: 'Comments come in a later update',
};

/** Prism's sub-menu, or its locked item without Premium. */
function prismEntry(
  ctx: MenuContext,
  items: MenuItemModel[],
  locked?: string,
): MenuEntry {
  if (!ctx.premium) {
    return {
      type: 'item',
      id: 'prism:upgrade',
      label: 'Prism',
      premium: true,
    };
  }
  return {
    type: 'sub',
    id: 'prism',
    label: 'Prism',
    disabled: locked,
    items,
  };
}

const step = (
  id: string,
  label: string,
  command: string,
  disabled?: string,
): MenuItemModel => ({
  type: 'item',
  id,
  label,
  command,
  disabled,
  keepOpen: true,
});

function transposeEntry(found: FoundClip, locked?: string): SubMenuModel {
  const reason =
    locked ??
    (found.audio
      ? 'Audio clips keep their pitch'
      : isDrumTrack(found.track)
        ? 'Drums don’t change pitch'
        : found.midi!.events.length === 0
          ? 'No notes in the clip yet'
          : undefined);
  return {
    type: 'sub',
    id: 'transpose',
    label: 'Transpose',
    disabled: reason,
    items: [
      step('transpose:+1', 'Up a half step', 'clip.transposeUp'),
      step('transpose:-1', 'Down a half step', 'clip.transposeDown'),
      step('transpose:+12', 'Up an octave', 'clip.octaveUp'),
      step('transpose:-12', 'Down an octave', 'clip.octaveDown'),
    ],
  };
}

function quantizeEntry(
  state: MenuState,
  found: FoundClip,
  locked?: string,
): SubMenuModel {
  const grid = state.timelineGridSize as AllGridSize;
  return {
    type: 'sub',
    id: 'quantize',
    label: 'Quantize',
    disabled:
      locked ??
      (found.midi!.events.length === 0
        ? 'No notes in the clip yet'
        : undefined),
    items: [
      {
        type: 'item',
        id: 'quantize:grid',
        label: `To the grid (${grid})`,
      },
      ...QUANTIZE_GRIDS.map(
        ({ size, label }): MenuItemModel => ({
          type: 'item',
          id: `quantize:${size}`,
          label,
        }),
      ),
    ],
  };
}

function clipMenu(
  state: MenuState,
  target: Extract<CanvasMenuTarget, { kind: 'clip' }>,
  ctx: MenuContext,
): MenuModel {
  const found = findClip(state, target);
  if (!found) return [];
  const holder = trackHolder(state, target.trackId);
  const locked = holder ? `${holder} is editing this track` : undefined;
  const clip = (found.midi ?? found.audio)!;

  const edit: MenuEntry[] = [
    {
      type: 'item',
      id: 'cut',
      label: 'Cut',
      command: 'clip.cut',
      disabled: locked,
    },
    { type: 'item', id: 'copy', label: 'Copy', command: 'clip.copy' },
    {
      type: 'item',
      id: 'paste',
      label: 'Paste',
      command: 'clip.paste',
      disabled: locked ?? pasteBlocked(state, found.track),
    },
    {
      type: 'item',
      id: 'delete',
      label: 'Delete',
      command: 'clip.delete',
      disabled: locked,
      danger: true,
    },
    {
      type: 'item',
      id: 'duplicate',
      label: 'Duplicate',
      command: 'clip.duplicate',
      disabled: locked,
    },
  ];

  const clipItems: MenuEntry[] = [
    {
      type: 'item',
      id: 'rename',
      label: 'Rename…',
      command: 'clip.rename',
      disabled: locked,
    },
    {
      type: 'item',
      id: 'split',
      label: 'Split at playhead',
      command: 'clip.split',
      disabled:
        locked ??
        (playheadInside(found, ctx.playheadTick)
          ? undefined
          : 'Move the playhead into the clip'),
    },
    {
      type: 'item',
      id: 'mute',
      label: 'Mute clip',
      command: 'clip.mute',
      checked: clip.muted === true,
      disabled: locked,
    },
    COMMENT,
  ];

  const sound: MenuEntry[] = found.midi
    ? [transposeEntry(found, locked), quantizeEntry(state, found, locked)]
    : [
        transposeEntry(found, locked),
        {
          type: 'item',
          id: 'fadeIn',
          label: 'Fade in',
          checked: found.audio!.fadeInTicks > 0,
          disabled: locked,
        },
        {
          type: 'item',
          id: 'fadeOut',
          label: 'Fade out',
          checked: found.audio!.fadeOutTicks > 0,
          disabled: locked,
        },
      ];

  const prismItems: MenuItemModel[] = [
    { type: 'item', id: 'prism:suggest', label: 'Suggest chords here' },
  ];
  if (found.midi && !isDrumTrack(found.track)) {
    prismItems.push({
      type: 'item',
      id: 'prism:open',
      label: 'Open Prism for this track',
    });
  }
  return [edit, clipItems, sound, [prismEntry(ctx, prismItems)]];
}

function laneMenu(
  state: MenuState,
  target: Extract<CanvasMenuTarget, { kind: 'lane' }>,
  ctx: MenuContext,
): MenuModel {
  const track = state.tracks.find((t) => t.id === target.trackId);
  if (!track) return [];
  const holder = trackHolder(state, track.id);
  const locked = holder ? `${holder} is editing this track` : undefined;
  const make: MenuEntry[] = [
    {
      type: 'item',
      id: 'paste',
      label: 'Paste here',
      disabled: locked ?? pasteBlocked(state, track),
    },
  ];
  if (track.type === 'midi') {
    make.push({
      type: 'item',
      id: 'createClip',
      label: 'Create clip',
      disabled: locked,
    });
  }
  return [
    make,
    [COMMENT],
    [
      prismEntry(ctx, [
        { type: 'item', id: 'prism:suggest', label: 'Suggest chords here' },
      ]),
    ],
  ];
}

/** The menu for `target` now, or no groups when it has gone. */
export function canvasMenuModel(
  state: MenuState,
  target: CanvasMenuTarget,
  ctx: MenuContext,
): MenuModel {
  switch (target.kind) {
    case 'clip':
      return clipMenu(state, target, ctx);
    case 'lane':
      return laneMenu(state, target, ctx);
    case 'marker':
      if (!state.markers.some((m) => m.id === target.markerId)) return [];
      return [
        [
          { type: 'item', id: 'renameMarker', label: 'Rename marker…' },
          {
            type: 'item',
            id: 'deleteMarker',
            label: 'Delete marker',
            danger: true,
          },
        ],
      ];
    case 'ruler':
      return [[{ type: 'item', id: 'addMarker', label: 'Add marker here' }]];
  }
}

/** Every item of a model, sub-menus' too, by id (tests, the harness). */
export function menuItemIds(model: MenuModel): string[] {
  return model
    .flat()
    .flatMap((entry) =>
      entry.type === 'sub'
        ? [entry.id, ...entry.items.map((i) => i.id)]
        : [entry.id],
    );
}
