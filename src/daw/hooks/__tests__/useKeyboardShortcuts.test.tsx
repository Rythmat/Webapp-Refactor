// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  renderHook,
  screen,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/studio-projects/api', () => ({
  saveCurrentProjectToCloud: vi.fn(() => Promise.resolve()),
}));
vi.mock('@/daw/store/undoMiddleware', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/daw/store/undoMiddleware')>()),
  smartUndo: vi.fn(() => true),
  smartRedo: vi.fn(() => true),
}));
// The suggestion modal previews through its own SoundFont player.
vi.mock('@/daw/instruments/SoundFontAdapter', () => ({
  SoundFontAdapter: class {
    init() {
      return Promise.resolve();
    }
    noteOn() {}
    noteOff() {}
    allNotesOff() {}
    setProgram() {}
    dispose() {}
  },
}));
vi.mock('@/daw/audio/AudioEngine', () => ({
  audioEngine: { getContext: () => ({}), getMasterGain: () => ({}) },
}));

import { useKeyboardShortcuts } from '../useKeyboardShortcuts';
import {
  getAudioBuffer,
  removeAudioBuffer,
  setAudioBuffer,
} from '@/daw/audio/AudioBufferStore';
import {
  dismissRecordRequest,
  isRecordGuardOpen,
} from '@/daw/commands/requestRecord';
import { PrismSuggestionModal } from '@/daw/components/Prism/PrismSuggestionModal';
import { RecordGuard } from '@/daw/components/Transport/RecordGuard';
import { useStore } from '@/daw/store';
import type { ViewType } from '@/daw/store/uiSlice';
import { smartUndo } from '@/daw/store/undoMiddleware';
import { saveCurrentProjectToCloud } from '@/lib/studio-projects/api';

// ── Fixtures ───────────────────────────────────────────────────────────────

const trackBase = {
  color: '#888888',
  mute: false,
  solo: false,
  volume: 0.8,
  pan: 0,
  monitoring: false,
  midiInputId: null,
  audioInputId: null,
  audioInputChannel: null,
  effects: {},
  activeEffects: [],
  trackRole: 'auto',
};

const keysTrack = {
  ...trackBase,
  id: 'keys',
  name: 'Keys',
  type: 'midi',
  instrument: 'oracle-synth',
  recordArmed: false,
  midiClips: [
    {
      id: 'clip-1',
      startTick: 1920,
      events: [{ note: 60, velocity: 100, startTick: 0, durationTicks: 480 }],
    },
  ],
  audioClips: [],
};

/** An armed vocal track with one take over bars 1-2. */
const vocalTrack = {
  ...trackBase,
  id: 'vox',
  name: 'Vocals',
  type: 'audio',
  instrument: 'vocal-fx',
  recordArmed: true,
  midiClips: [],
  audioClips: [
    {
      id: 'take-1',
      startTick: 0,
      duration: 3840,
      fadeInTicks: 0,
      fadeOutTicks: 0,
    },
  ],
};

function reset(view: ViewType = 'arrange') {
  useStore.setState({
    tracks: [structuredClone(keysTrack)],
    currentView: view,
    practiceSession: null,
    selectedTrackId: 'keys',
    selectedClipId: 'clip-1',
    selectedClipTrackId: 'keys',
    parkedClipSelection: null,
    editingClipId: null,
    editingClipTrackId: null,
    editingAudioClipId: null,
    editingAudioClipTrackId: null,
    clipboardClips: [],
    clipboardAudioClip: null,
    isPlaying: false,
    isRecording: false,
    isCountingIn: false,
    countInBars: 0,
    position: 0,
    metronomeEnabled: false,
    loopEnabled: false,
    activeTool: 'cursor',
    timelineZoom: 1,
    prismSuggestOpen: false,
    prismSuggestSets: [],
    prismSuggestActiveIdx: 0,
  } as never);
}

const KEYS: Record<string, string> = {
  Space: ' ',
  KeyA: 'a',
  KeyD: 'd',
  KeyL: 'l',
  KeyR: 'r',
  KeyM: 'm',
  KeyZ: 'z',
  KeyS: 's',
  KeyV: 'v',
  Equal: '=',
  Delete: 'Delete',
  Backspace: 'Backspace',
  ArrowLeft: 'ArrowLeft',
  ArrowRight: 'ArrowRight',
  Escape: 'Escape',
  Digit2: '2',
  Digit3: '3',
};

/** A keydown as the browser sends it, on the focused element. */
function press(
  code: string,
  init: KeyboardEventInit = {},
  target: EventTarget = document.activeElement ?? document.body,
): KeyboardEvent {
  const event = new KeyboardEvent('keydown', {
    code,
    key: KEYS[code] ?? code,
    bubbles: true,
    cancelable: true,
    ...init,
  });
  act(() => {
    target.dispatchEvent(event);
  });
  return event;
}

/** Runs `fn` and fails if it wrote to the editor's store at all. */
function expectNoStoreChange(fn: () => void) {
  const writes = vi.fn();
  const unsubscribe = useStore.subscribe(writes);
  try {
    fn();
  } finally {
    unsubscribe();
  }
  expect(writes).not.toHaveBeenCalled();
}

/** Puts focus on a fresh element, as if the student had clicked into it. */
function focusOn(html: string, selector: string): HTMLElement {
  const host = document.createElement('div');
  host.innerHTML = html;
  document.body.appendChild(host);
  const el = host.querySelector<HTMLElement>(selector)!;
  el.focus();
  return el;
}

const clip = () =>
  useStore
    .getState()
    .tracks.find((t) => t.id === 'keys')
    ?.midiClips.find((c) => c.id === 'clip-1');

beforeEach(() => {
  reset();
  vi.mocked(smartUndo).mockClear();
  vi.mocked(saveCurrentProjectToCloud).mockClear();
});

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
  dismissRecordRequest();
});

// ── The interim guard ──────────────────────────────────────────────────────

describe('useKeyboardShortcuts: keys stay where the student is working', () => {
  it('makes no store change for Delete in the score view', () => {
    // A clip left selected from Create (as before setCurrentView cleared it).
    reset('score');
    renderHook(() => useKeyboardShortcuts('token'));

    expectNoStoreChange(() => {
      press('Delete');
      press('Backspace');
    });
    expect(clip()).toBeDefined();
  });

  it('makes no store change for Cmd+Z or Ctrl+Z inside a text field', () => {
    renderHook(() => useKeyboardShortcuts('token'));
    const input = focusOn('<input type="text" value="My song" />', 'input');

    let meta!: KeyboardEvent;
    let ctrl!: KeyboardEvent;
    expectNoStoreChange(() => {
      meta = press('KeyZ', { metaKey: true }, input);
      ctrl = press('KeyZ', { ctrlKey: true }, input);
    });
    expect(smartUndo).not.toHaveBeenCalled();
    // Not prevented, so the field's own text undo runs.
    expect(meta.defaultPrevented).toBe(false);
    expect(ctrl.defaultPrevented).toBe(false);
  });

  it('makes no store change for Alt+R (the Score writes rests on it)', () => {
    reset('score');
    renderHook(() => useKeyboardShortcuts('token'));

    expectNoStoreChange(() => {
      press('KeyR', { altKey: true });
    });
    expect(useStore.getState().isRecording).toBe(false);
  });

  it('still deletes the selected clip in Create', () => {
    renderHook(() => useKeyboardShortcuts('token'));
    const event = press('Delete');
    expect(event.defaultPrevented).toBe(true);
    expect(clip()).toBeUndefined();
    expect(useStore.getState().selectedClipId).toBeNull();
  });

  it('keeps the audio of a deleted take, so undo brings it back playing', () => {
    const buffer = { duration: 4 } as AudioBuffer;
    setAudioBuffer('take-1', buffer);
    useStore.setState({
      tracks: [structuredClone(keysTrack), structuredClone(vocalTrack)],
      selectedClipId: 'take-1',
      selectedClipTrackId: 'vox',
    } as never);
    renderHook(() => useKeyboardShortcuts('token'));

    try {
      press('Delete');

      const vox = useStore.getState().tracks.find((t) => t.id === 'vox');
      expect(vox?.audioClips).toEqual([]);
      expect(getAudioBuffer('take-1')).toBe(buffer);
    } finally {
      removeAudioBuffer('take-1');
    }
  });

  it('does not stop playback on Escape in Score or Lead Sheet', () => {
    // There Escape clears the view's own note or chord selection.
    for (const view of ['score', 'leadsheet'] as const) {
      reset(view);
      useStore.setState({ isPlaying: true });
      const { unmount } = renderHook(() => useKeyboardShortcuts('token'));
      expectNoStoreChange(() => press('Escape'));
      expect(useStore.getState().isPlaying).toBe(true);
      unmount();
    }

    // Create keeps it as the stop key.
    reset('arrange');
    useStore.setState({ isPlaying: true });
    renderHook(() => useKeyboardShortcuts('token'));
    press('Escape');
    expect(useStore.getState().isPlaying).toBe(false);
  });

  it('leaves Cmd+A in a text field to the field', () => {
    renderHook(() => useKeyboardShortcuts('token'));
    const input = focusOn('<input type="text" value="My song" />', 'input');

    let event!: KeyboardEvent;
    expectNoStoreChange(() => {
      event = press('KeyA', { metaKey: true }, input);
    });
    expect(event.defaultPrevented).toBe(false);
  });

  it('keeps clip keys away from a focused widget with keys of its own', () => {
    // The docked piano roll's body is a tabIndex=0 div.
    renderHook(() => useKeyboardShortcuts('token'));
    const roll = focusOn('<div tabindex="0">piano roll</div>', 'div');

    expectNoStoreChange(() => {
      press('Backspace', {}, roll);
      press('ArrowRight', {}, roll);
      press('KeyV', { metaKey: true }, roll);
    });
    expect(clip()?.startTick).toBe(1920);
  });

  it('leaves keys inside a dialog or menu to it', () => {
    renderHook(() => useKeyboardShortcuts('token'));
    const button = focusOn(
      '<div role="dialog"><button>Cancel</button></div>',
      'button',
    );
    expectNoStoreChange(() => {
      press('Space', {}, button);
      press('Escape', {}, button);
      press('Delete', {}, button);
    });

    const item = focusOn(
      '<div role="menu"><div role="menuitem" tabindex="-1">Export</div></div>',
      '[role="menuitem"]',
    );
    expectNoStoreChange(() => press('KeyR', {}, item));
  });

  it('keeps Space and undo in the modal piano roll, but not clip keys', () => {
    useStore.setState({
      editingClipId: 'clip-1',
      editingClipTrackId: 'keys',
    });
    renderHook(() => useKeyboardShortcuts('token'));
    const roll = focusOn(
      '<div role="dialog"><div tabindex="0">notes</div></div>',
      '[tabindex="0"]',
    );

    expectNoStoreChange(() => {
      press('Delete', {}, roll);
      press('ArrowRight', {}, roll);
      press('KeyD', { metaKey: true }, roll);
      press('KeyR', {}, roll);
    });
    expect(clip()?.startTick).toBe(1920);

    press('KeyZ', { metaKey: true }, roll);
    expect(smartUndo).toHaveBeenCalledTimes(1);
    press('Space', {}, roll);
    expect(useStore.getState().isPlaying).toBe(true);
  });

  it('keeps Space in the vocal pitch editor, which has no play button', () => {
    useStore.setState({
      editingAudioClipId: 'take-1',
      editingAudioClipTrackId: 'vox',
    });
    renderHook(() => useKeyboardShortcuts('token'));
    const editor = focusOn(
      '<div role="dialog"><div tabindex="0">pitch</div></div>',
      '[tabindex="0"]',
    );

    expectNoStoreChange(() => {
      press('Delete', {}, editor);
      press('ArrowRight', {}, editor);
    });
    expect(clip()?.startTick).toBe(1920);

    press('Space', {}, editor);
    expect(useStore.getState().isPlaying).toBe(true);
  });

  it('never lets Cmd+D open the bookmark dialog over the editor', () => {
    // In the modal piano roll ⌘D used to duplicate the clip behind it.
    useStore.setState({ editingClipId: 'clip-1', editingClipTrackId: 'keys' });
    const { unmount } = renderHook(() => useKeyboardShortcuts('token'));
    const roll = focusOn(
      '<div role="dialog"><div tabindex="0">notes</div></div>',
      '[tabindex="0"]',
    );
    let inEditor!: KeyboardEvent;
    expectNoStoreChange(() => {
      inEditor = press('KeyD', { metaKey: true }, roll);
    });
    expect(inEditor.defaultPrevented).toBe(true);
    unmount();

    // Score has no ⌘D of its own, and the clip from Create is hidden there.
    reset('score');
    renderHook(() => useKeyboardShortcuts('token'));
    let inScore!: KeyboardEvent;
    expectNoStoreChange(() => {
      inScore = press('KeyD', { metaKey: true }, document.body);
    });
    expect(inScore.defaultPrevented).toBe(true);
  });

  it('lets a view that handled a key keep it, even listening after this hook', () => {
    renderHook(() => useKeyboardShortcuts('token'));
    // Added later, like the Score's window listeners when Score opens. The
    // Score takes Space to walk chord entry to the next beat.
    const scoreSpace = (e: KeyboardEvent) => {
      if (e.code === 'Space') e.preventDefault();
    };
    window.addEventListener('keydown', scoreSpace);
    try {
      expectNoStoreChange(() => press('Space'));
    } finally {
      window.removeEventListener('keydown', scoreSpace);
    }
    press('Space');
    expect(useStore.getState().isPlaying).toBe(true);
  });

  it('saves on Cmd+S even from a text field', () => {
    renderHook(() => useKeyboardShortcuts('token'));
    const input = focusOn('<input type="text" />', 'input');
    const event = press('KeyS', { metaKey: true }, input);
    expect(event.defaultPrevented).toBe(true);
    expect(saveCurrentProjectToCloud).toHaveBeenCalledWith('token');
  });

  it("leaves Cmd+= to the browser's page zoom", () => {
    renderHook(() => useKeyboardShortcuts('token'));
    let event!: KeyboardEvent;
    expectNoStoreChange(() => {
      event = press('Equal', { metaKey: true });
    });
    expect(event.defaultPrevented).toBe(false);
  });

  it('gives the practice screen only its transport keys', () => {
    reset('practice');
    renderHook(() => useKeyboardShortcuts('token'));

    expectNoStoreChange(() => {
      press('KeyM');
      press('Digit3');
      press('Delete');
      press('KeyZ', { metaKey: true });
    });
    expect(smartUndo).not.toHaveBeenCalled();

    press('Space');
    expect(useStore.getState().isPlaying).toBe(true);
  });

  it('acts once while a key is held', () => {
    renderHook(() => useKeyboardShortcuts('token'));
    for (const code of ['Space', 'KeyM', 'KeyL', 'KeyR']) {
      press(code);
      let held!: KeyboardEvent;
      expectNoStoreChange(() => {
        held = press(code, { repeat: true });
      });
      // Prevented all the same: a held Space must not scroll the page.
      expect(held.defaultPrevented).toBe(true);
    }
    const s = useStore.getState();
    expect(s.isPlaying).toBe(true);
    expect(s.metronomeEnabled).toBe(true);
    expect(s.loopEnabled).toBe(true);
    expect(s.isRecording).toBe(true);

    press('KeyS', { metaKey: true });
    const heldSave = press('KeyS', { metaKey: true, repeat: true });
    expect(heldSave.defaultPrevented).toBe(true);
    expect(saveCurrentProjectToCloud).toHaveBeenCalledTimes(1);
  });
});

describe('setCurrentView', () => {
  it('parks the clip selection outside Create and keeps the selected track', () => {
    useStore.getState().setCurrentView('score');
    const s = useStore.getState();
    expect(s.selectedClipId).toBeNull();
    expect(s.selectedClipTrackId).toBeNull();
    expect(s.selectedTrackId).toBe('keys');
  });

  it('gives the clip back in Create, so the docked editor still edits it', () => {
    const { setCurrentView } = useStore.getState();
    setCurrentView('score');
    setCurrentView('leadsheet');
    setCurrentView('arrange');

    const s = useStore.getState();
    expect(s.selectedClipId).toBe('clip-1');
    expect(s.selectedClipTrackId).toBe('keys');
    expect(s.parkedClipSelection).toBeNull();
  });

  it('does not bring back a clip deleted or deselected meanwhile', () => {
    const { setCurrentView, removeMidiClip, setSelectedClip } =
      useStore.getState();
    setCurrentView('studio');
    removeMidiClip('keys', 'clip-1');
    setCurrentView('arrange');
    expect(useStore.getState().selectedClipId).toBeNull();

    // A lesson step clearing the selection while Score is showing.
    reset();
    setCurrentView('score');
    setSelectedClip(null, null);
    setCurrentView('arrange');
    expect(useStore.getState().selectedClipId).toBeNull();
  });

  it('keeps the clip selection when the view does not change', () => {
    useStore.getState().setCurrentView('arrange');
    expect(useStore.getState().selectedClipId).toBe('clip-1');
  });
});

// ── R and the overwrite guard ──────────────────────────────────────────────

describe('R and the overwrite guard', () => {
  function armVocals(position: number) {
    useStore.setState({
      tracks: [structuredClone(keysTrack), structuredClone(vocalTrack)],
      position,
    } as never);
  }

  it('opens the guard instead of recording when a take is under the range', () => {
    armVocals(960);
    render(<RecordGuard />);
    renderHook(() => useKeyboardShortcuts('token'));

    press('KeyR');

    expect(useStore.getState().isRecording).toBe(false);
    expect(useStore.getState().isCountingIn).toBe(false);
    expect(isRecordGuardOpen()).toBe(true);
    expect(
      screen.getByText('Overwrite existing recording?'),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Continue' }));
    expect(useStore.getState().isRecording).toBe(true);
    expect(isRecordGuardOpen()).toBe(false);
  });

  it('records nothing when the student cancels', () => {
    armVocals(960);
    render(<RecordGuard />);
    renderHook(() => useKeyboardShortcuts('token'));

    press('KeyR');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(isRecordGuardOpen()).toBe(false);
    expect(useStore.getState().isRecording).toBe(false);
  });

  it('records straight away after the last take', () => {
    armVocals(3840);
    renderHook(() => useKeyboardShortcuts('token'));

    press('KeyR');

    expect(isRecordGuardOpen()).toBe(false);
    expect(useStore.getState().isRecording).toBe(true);
  });
});

// ── The suggestion modal's own keys ────────────────────────────────────────

describe('PrismSuggestionModal keys', () => {
  const regenerate = vi.fn();
  const commit = vi.fn();

  function openModal(sets = 1) {
    useStore.setState({
      prismSuggestOpen: true,
      prismSuggestTrackId: 'keys',
      prismSuggestActiveIdx: 0,
      prismSuggestMeasures: 4,
      prismSuggestSets: Array.from({ length: sets }, (_, i) => ({
        id: `set-${i + 1}`,
        label: `Set ${i + 1}`,
        chords: [
          {
            degree: '1 major',
            quality: 'major',
            noteName: 'C maj',
            midi: [60, 64, 67],
            color: [255, 0, 0],
          },
        ],
      })),
      regeneratePrismSuggestions: regenerate,
      commitPrismSuggestion: commit,
    } as never);
    render(<PrismSuggestionModal />);
  }

  beforeEach(() => {
    regenerate.mockClear();
    commit.mockClear();
  });

  it('re-rolls on R without recording, and browses without moving the clip', () => {
    renderHook(() => useKeyboardShortcuts('token'));
    openModal();

    press('KeyR');
    expect(regenerate).toHaveBeenCalledTimes(1);
    expect(useStore.getState().isRecording).toBe(false);

    press('ArrowRight');
    press('Space');
    press('Delete');
    expect(clip()?.startTick).toBe(1920);
    expect(useStore.getState().isPlaying).toBe(false);
  });

  it('jumps to a suggestion on its number key, not to a timeline tool', () => {
    renderHook(() => useKeyboardShortcuts('token'));
    openModal(2);

    const event = press('Digit2');

    expect(event.defaultPrevented).toBe(true);
    expect(useStore.getState().prismSuggestActiveIdx).toBe(1);
    expect(useStore.getState().activeTool).toBe('cursor');
  });

  it('leaves Enter on a focused button to that button', () => {
    renderHook(() => useKeyboardShortcuts('token'));
    openModal();
    const cancel = screen.getByRole('button', { name: 'Cancel' });
    cancel.focus();

    const event = press('Enter', { key: 'Enter' }, cancel);

    expect(commit).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });
});
