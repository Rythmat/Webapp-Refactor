// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/daw/commands/saveProject', () => ({
  saveProject: vi.fn(() => Promise.resolve({ status: 'saved' })),
  registerSaveAuth: vi.fn(() => () => {}),
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
  audioEngine: {
    getIsInitialized: () => true,
    getContext: () => ({}),
    getMasterGain: () => ({}),
  },
}));

import { useArrangeKeymap } from '../clipCommands';
import { publishTimelineWidth } from '@/daw/editor/viewport';
import { useGlobalCommands } from '../globalCommands';
import {
  LEAD_SHEET_SCOPE,
  DOCK_SCOPE,
  PIANO_ROLL_SCOPE,
  SCORE_SCOPE,
} from '../keymaps';
import { useMusicalTypingStore } from '../musicalTypingStore';
import { useKeymap, type KeymapHandlers } from '../registry';
import { useMusicalTyping } from '@/daw/hooks/useMusicalTyping';
import { trackEngineRegistry } from '@/daw/hooks/usePlaybackEngine';
import { useShortcutSheetStore } from '@/daw/shell/help/useShortcutSheetStore';
import { useRef, type ReactNode } from 'react';
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
import {
  endPlayheadRun,
  setPlayheadSourceForTests,
  startPlayheadRun,
} from '@/daw/engine/playheadClock';
import type { ViewType } from '@/daw/store/uiSlice';
import { smartRedo, smartUndo } from '@/daw/store/undoMiddleware';
import { saveProject } from '@/daw/commands/saveProject';
import {
  INITIAL_SESSION_STATE,
  useSessionStore,
} from '@/daw/session/sessionStore';

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
    singleKeyShortcuts: true,
    hwActiveNotes: new Set<number>(),
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
  vi.mocked(smartRedo).mockClear();
  vi.mocked(saveProject).mockClear();
  useMusicalTypingStore.setState({ enabled: false, octave: 4, velocity: 100 });
  useShortcutSheetStore.setState({ isOpen: false });
});

afterEach(() => {
  useSessionStore.setState({ ...INITIAL_SESSION_STATE });
  cleanup();
  document.body.innerHTML = '';
  dismissRecordRequest();
});

// ── The editor's keyboard ──────────────────────────────────────────────────

/** The editor's one listener and its global keys, as DawApp mounts them. */
function Editor({ children }: { children?: ReactNode }) {
  useGlobalCommands();
  useMusicalTyping();
  return <>{children}</>;
}

/** Create's keys, as the Timeline binds them while it is on screen. */
function TimelineKeys() {
  publishTimelineWidth(1200);
  useArrangeKeymap();
  return null;
}

/** A view or region scope bound to stub handlers. */
function Bound({
  scope,
  handlers,
  children,
  role,
}: {
  scope: string;
  handlers: KeymapHandlers;
  children?: ReactNode;
  role?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useKeymap(scope, handlers, { element: ref });
  return (
    <div ref={ref} role={role} data-testid={`scope-${scope}`}>
      {children}
    </div>
  );
}

function renderEditor(extra?: ReactNode) {
  return render(
    <Editor>
      <TimelineKeys />
      {extra}
    </Editor>,
  );
}

describe('the dispatcher: keys stay where the student is working', () => {
  it('never deletes a clip from the Score, whatever the Score does with Delete', () => {
    // A clip left selected from Create (as before setCurrentView cleared it).
    reset('score');
    const scoreDelete = vi.fn();
    renderEditor(
      <Bound
        scope={SCORE_SCOPE.id}
        handlers={{ 'score.delete': scoreDelete }}
      />,
    );

    press('Delete');
    press('Backspace');
    expect(scoreDelete).toHaveBeenCalledTimes(2);
    expect(clip()).toBeDefined();
  });

  it('makes no store change for Delete in the Score when nothing there takes it', () => {
    reset('score');
    renderEditor();
    expectNoStoreChange(() => {
      press('Delete');
      press('ArrowRight');
      press('Digit3');
    });
    expect(clip()?.startTick).toBe(1920);
    expect(useStore.getState().activeTool).toBe('cursor');
  });

  it('makes no store change for Cmd+Z or Ctrl+Z inside a text field', () => {
    renderEditor();
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

  it('never records on Alt+R, in the Score or the lead sheet', () => {
    for (const view of ['score', 'leadsheet'] as const) {
      reset(view);
      const { unmount } = renderEditor();
      expectNoStoreChange(() => {
        press('KeyR', { altKey: true });
      });
      expect(useStore.getState().isRecording).toBe(false);
      unmount();
    }
  });

  it('gives the Score its ⌥R (write rests) before anything else', () => {
    reset('score');
    const rests = vi.fn();
    renderEditor(
      <Bound scope={SCORE_SCOPE.id} handlers={{ 'score.layerRests': rests }} />,
    );
    const event = press('KeyR', { altKey: true });
    expect(rests).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);
    expect(useStore.getState().isRecording).toBe(false);
  });

  it('still deletes the selected clip in Create', () => {
    renderEditor();
    const event = press('Delete');
    expect(event.defaultPrevented).toBe(true);
    expect(clip()).toBeUndefined();
    expect(useStore.getState().selectedClipId).toBeNull();
  });

  it('takes Backspace for Delete (a Chromebook has no Delete key)', () => {
    renderEditor();
    press('Backspace');
    expect(clip()).toBeUndefined();
  });

  it('keeps the audio of a deleted take, so undo brings it back playing', () => {
    const buffer = { duration: 4 } as AudioBuffer;
    setAudioBuffer('take-1', buffer);
    useStore.setState({
      tracks: [structuredClone(keysTrack), structuredClone(vocalTrack)],
      selectedClipId: 'take-1',
      selectedClipTrackId: 'vox',
    } as never);
    renderEditor();

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
    for (const [view, scope, id] of [
      ['score', SCORE_SCOPE.id, 'score.escape'],
      ['leadsheet', LEAD_SHEET_SCOPE.id, 'leadsheet.escape'],
    ] as const) {
      reset(view);
      useStore.setState({ isPlaying: true });
      const clear = vi.fn();
      const { unmount } = renderEditor(
        <Bound scope={scope} handlers={{ [id]: clear }} />,
      );
      expectNoStoreChange(() => press('Escape'));
      expect(clear).toHaveBeenCalledTimes(1);
      expect(useStore.getState().isPlaying).toBe(true);
      unmount();
    }

    // Create keeps it as the stop key, and drops the clip selection.
    reset('arrange');
    useStore.setState({ isPlaying: true });
    renderEditor();
    press('Escape');
    expect(useStore.getState().isPlaying).toBe(false);
    expect(useStore.getState().selectedClipId).toBeNull();
  });

  it('leaves Cmd+A in a text field to the field', () => {
    renderEditor();
    const input = focusOn('<input type="text" value="My song" />', 'input');

    let event!: KeyboardEvent;
    expectNoStoreChange(() => {
      event = press('KeyA', { metaKey: true }, input);
    });
    expect(event.defaultPrevented).toBe(false);
  });

  it('keeps clip keys away from a focused widget with keys of its own', () => {
    // A knob, a slider: a focusable element that isn't a registered region.
    renderEditor();
    const knob = focusOn('<div tabindex="0">knob</div>', 'div');

    expectNoStoreChange(() => {
      press('Backspace', {}, knob);
      press('ArrowRight', {}, knob);
      press('KeyV', { metaKey: true }, knob);
    });
    expect(clip()?.startTick).toBe(1920);
  });

  it('gives the docked piano roll its own keys, and never the clip behind it', () => {
    const select = vi.fn();
    const deleteNotes = vi.fn();
    renderEditor(
      <Bound
        scope={PIANO_ROLL_SCOPE.id}
        handlers={{
          'pianoRoll.select': select,
          'pianoRoll.delete': deleteNotes,
        }}
      >
        <div tabIndex={0} data-testid="roll" />
      </Bound>,
    );
    const roll = screen.getByTestId('roll');
    roll.focus();

    press('Backspace', {}, roll);
    press('Backspace', {}, roll);
    expect(deleteNotes).toHaveBeenCalledTimes(2);
    expect(clip()).toBeDefined();

    // ⌘V is never the Select tool (it used to switch tools as it pasted).
    press('KeyV', { metaKey: true }, roll);
    expect(select).not.toHaveBeenCalled();
    press('KeyV', {}, roll);
    expect(select).toHaveBeenCalledTimes(1);
  });

  it('leaves keys inside a dialog or menu to it', () => {
    renderEditor();
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

    const option = focusOn(
      '<div role="listbox"><div role="option" tabindex="0">C</div></div>',
      '[role="option"]',
    );
    expectNoStoreChange(() => press('KeyM', {}, option));
  });

  it('keeps Space and undo in the dock’s piano roll, but not clip keys', () => {
    const tool = vi.fn();
    renderEditor(
      <Bound scope={DOCK_SCOPE.id} handlers={{}}>
        <Bound
          scope={PIANO_ROLL_SCOPE.id}
          handlers={{ 'pianoRoll.draw': tool }}
        >
          <div tabIndex={0} data-testid="roll" />
        </Bound>
      </Bound>,
    );
    const roll = screen.getByTestId('roll');
    roll.focus();

    // The clip behind the dock stays put. (R and M are global keys, and
    // work in the dock as anywhere.)
    expectNoStoreChange(() => {
      press('Delete', {}, roll);
      press('ArrowRight', {}, roll);
      press('KeyD', { metaKey: true }, roll);
    });
    expect(clip()?.startTick).toBe(1920);

    press('KeyD', {}, roll);
    expect(tool).toHaveBeenCalledTimes(1);
    press('KeyZ', { metaKey: true }, roll);
    expect(smartUndo).toHaveBeenCalledTimes(1);
    press('Space', {}, roll);
    expect(useStore.getState().isPlaying).toBe(true);
  });

  it('never lets Cmd+D open the bookmark dialog over the editor', () => {
    const { unmount } = renderEditor(
      <Bound scope={DOCK_SCOPE.id} handlers={{}}>
        <div tabIndex={0} data-testid="roll" />
      </Bound>,
    );
    let inEditor!: KeyboardEvent;
    expectNoStoreChange(() => {
      inEditor = press('KeyD', { metaKey: true }, screen.getByTestId('roll'));
    });
    expect(inEditor.defaultPrevented).toBe(true);
    unmount();

    // Score has no ⌘D of its own, and the clip from Create is hidden there.
    reset('score');
    renderEditor();
    let inScore!: KeyboardEvent;
    expectNoStoreChange(() => {
      inScore = press('KeyD', { metaKey: true }, document.body);
    });
    expect(inScore.defaultPrevented).toBe(true);
  });

  it('never lets ⌘E send focus to the address bar where it splits nothing (2.12)', () => {
    // ⌘E splits the selected clip in Create; in the Score it does nothing.
    reset('score');
    renderEditor();
    let inScore!: KeyboardEvent;
    expectNoStoreChange(() => {
      inScore = press('KeyE', { metaKey: true }, document.body);
    });
    expect(inScore.defaultPrevented).toBe(true);
  });

  it('lets a view take a key before the global scope (the Score walks chords on Space)', () => {
    reset('score');
    const walk = vi.fn(() => true);
    renderEditor(
      <Bound scope={SCORE_SCOPE.id} handlers={{ 'score.nextBeat': walk }} />,
    );
    expectNoStoreChange(() => press('Space'));
    expect(walk).toHaveBeenCalledTimes(1);

    // Declined (no chord symbol picked): Space plays, as everywhere.
    walk.mockReturnValue(false);
    press('Space');
    expect(useStore.getState().isPlaying).toBe(true);
  });

  it('answers no key in a view nobody can see', () => {
    // The Score's handlers are bound (the Score is mounted) but Create shows.
    const scoreDelete = vi.fn();
    renderEditor(
      <Bound
        scope={SCORE_SCOPE.id}
        handlers={{ 'score.delete': scoreDelete }}
      />,
    );
    press('Delete');
    expect(scoreDelete).not.toHaveBeenCalled();
    expect(clip()).toBeUndefined();
  });

  it('saves on Cmd+S even from a text field', () => {
    renderEditor();
    const input = focusOn('<input type="text" />', 'input');
    const event = press('KeyS', { metaKey: true }, input);
    expect(event.defaultPrevented).toBe(true);
    expect(saveProject).toHaveBeenCalledWith({ source: 'shortcut' });
  });

  it('saves on Ctrl+S too, and from inside a dialog', () => {
    renderEditor();
    const event = press('KeyS', { ctrlKey: true });
    expect(event.defaultPrevented).toBe(true);
    const button = focusOn(
      '<div role="dialog"><button>Open</button></div>',
      'button',
    );
    press('KeyS', { metaKey: true }, button);
    expect(saveProject).toHaveBeenCalledTimes(2);
  });

  it('does nothing while a session opens, but still keeps Cmd+S from the browser', () => {
    renderEditor();
    useSessionStore.setState({ phase: 'preparing' });

    let save!: KeyboardEvent;
    expectNoStoreChange(() => {
      save = press('KeyS', { metaKey: true });
      press('Space');
      press('KeyM');
      press('KeyZ', { metaKey: true });
    });
    expect(save.defaultPrevented).toBe(true);
    expect(saveProject).not.toHaveBeenCalled();
    expect(smartUndo).not.toHaveBeenCalled();

    useSessionStore.setState({ phase: 'ready' });
    press('Space');
    expect(useStore.getState().isPlaying).toBe(true);
  });

  it('neither undoes nor redoes while recording (the buttons are disabled)', () => {
    renderEditor();
    useStore.setState({ isRecording: true });

    press('KeyZ', { metaKey: true });
    press('KeyZ', { ctrlKey: true });
    press('KeyZ', { metaKey: true, shiftKey: true });
    expect(smartUndo).not.toHaveBeenCalled();
    expect(smartRedo).not.toHaveBeenCalled();

    useStore.setState({ isRecording: false });
    press('KeyZ', { metaKey: true });
    expect(smartUndo).toHaveBeenCalledTimes(1);
    press('KeyZ', { metaKey: true, shiftKey: true });
    expect(smartRedo).toHaveBeenCalledTimes(1);
  });

  it("leaves Cmd+=, Cmd+− and Cmd+0 to the browser's page zoom", () => {
    renderEditor();
    for (const code of ['Equal', 'Minus', 'Digit0']) {
      let event!: KeyboardEvent;
      expectNoStoreChange(() => {
        event = press(code, { metaKey: true });
      });
      expect(event.defaultPrevented).toBe(false);
    }
  });

  it('zooms the timeline on Alt+= and Alt+−, matched by key position', () => {
    renderEditor();
    // Option rewrites the character on a Mac: ⌥= types ≠.
    press('Equal', { altKey: true, key: '≠' });
    expect(useStore.getState().timelineZoom).toBeCloseTo(1.25);
    press('Minus', { altKey: true, key: '–' });
    expect(useStore.getState().timelineZoom).toBeCloseTo(1);
  });

  it('gives the practice screen only its transport keys', () => {
    reset('practice');
    const play = vi.fn();
    renderEditor(
      <Bound scope="practice" handlers={{ 'practice.playPause': play }} />,
    );

    expectNoStoreChange(() => {
      press('KeyM');
      press('Digit3');
      press('Delete');
      press('KeyZ', { metaKey: true });
      press('KeyE', { metaKey: true });
    });
    expect(smartUndo).not.toHaveBeenCalled();

    press('Space');
    expect(play).toHaveBeenCalledTimes(1);
    press('KeyL');
    expect(useStore.getState().loopEnabled).toBe(true);
  });

  it('acts once while a key is held', () => {
    renderEditor();
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
    expect(saveProject).toHaveBeenCalledTimes(1);
  });

  it('opens the shortcut sheet on ?', () => {
    renderEditor();
    press('Slash', { shiftKey: true, key: '?' });
    expect(useShortcutSheetStore.getState().isOpen).toBe(true);
  });
});

// ── Single-key shortcuts can be turned off (WCAG 2.1.4) ────────────────────

describe('at the playhead while playing', () => {
  afterEach(() => {
    endPlayheadRun();
    setPlayheadSourceForTests();
  });

  it('pastes where the student hears the playhead, not where play began', () => {
    // 120 bpm: 960 ticks a second, the transport started at 0 from tick 0.
    const now = { t: 0 };
    setPlayheadSourceForTests({
      currentTime: () => now.t,
      outputLatency: () => 0,
      ticksAtTime: (time) => time * 960,
      scheduleTime: () => now.t + 0.1,
    });
    useStore.setState({
      clipboardClips: [structuredClone(keysTrack.midiClips[0])],
      isPlaying: true,
    } as never);
    renderEditor();
    startPlayheadRun(0, 0);
    now.t = 4;

    press('KeyV', { metaKey: true });

    const pasted = useStore
      .getState()
      .tracks.find((t) => t.id === 'keys')
      ?.midiClips.find((c) => c.id.startsWith('clip-paste-'));
    expect(pasted?.startTick).toBe(3840);
    // The store's position stays parked at the start while playing.
    expect(useStore.getState().position).toBe(0);
  });
});

describe('the single-key switch', () => {
  it('turns off letter, digit and symbol keys, and nothing else', () => {
    useStore.setState({ singleKeyShortcuts: false });
    renderEditor();

    let r!: KeyboardEvent;
    expectNoStoreChange(() => {
      r = press('KeyR');
      press('KeyM');
      press('KeyL');
      press('Digit3');
      press('Backquote');
      press('Slash', { shiftKey: true, key: '?' });
    });
    // Off means off: the key goes to the page as a plain key would.
    expect(r.defaultPrevented).toBe(false);
    expect(useMusicalTypingStore.getState().enabled).toBe(false);
    expect(useShortcutSheetStore.getState().isOpen).toBe(false);

    press('Space');
    expect(useStore.getState().isPlaying).toBe(true);
    press('KeyS', { metaKey: true });
    expect(saveProject).toHaveBeenCalledTimes(1);
    press('Delete');
    expect(clip()).toBeUndefined();
  });
});

// ── Musical typing ─────────────────────────────────────────────────────────

describe('musical typing', () => {
  const engine = { noteOn: vi.fn(), noteOff: vi.fn() };

  beforeEach(() => {
    engine.noteOn.mockClear();
    engine.noteOff.mockClear();
    trackEngineRegistry.set('keys', { trackEngine: engine } as never);
  });

  afterEach(() => {
    trackEngineRegistry.delete('keys');
  });

  function up(code: string, target: EventTarget = document.body) {
    act(() => {
      target.dispatchEvent(
        new KeyboardEvent('keyup', {
          code,
          key: KEYS[code] ?? code,
          bubbles: true,
          cancelable: true,
        }),
      );
    });
  }

  it('turns on with the backquote and plays the selected track', () => {
    renderEditor();
    press('Backquote', { key: '`' });
    expect(useMusicalTypingStore.getState().enabled).toBe(true);

    press('KeyA');
    expect(engine.noteOn).toHaveBeenCalledWith(60, 100);
    expect(useStore.getState().hwActiveNotes.has(60)).toBe(true);
    up('KeyA');
    expect(engine.noteOff).toHaveBeenCalledWith(60);
    expect(useStore.getState().hwActiveNotes.has(60)).toBe(false);
  });

  it('never toggles loop or metronome while it plays (L is a D, M rests)', () => {
    useMusicalTypingStore.setState({ enabled: true });
    renderEditor();
    press('KeyL');
    press('KeyM');
    press('KeyR');
    press('Digit2');
    const s = useStore.getState();
    expect(s.loopEnabled).toBe(false);
    expect(s.metronomeEnabled).toBe(false);
    expect(s.isRecording).toBe(false);
    expect(s.activeTool).toBe('cursor');
    expect(engine.noteOn).toHaveBeenCalledWith(74, 100);

    // Space and ⌘S still work.
    press('Space');
    expect(useStore.getState().isPlaying).toBe(true);
  });

  it('beats a view’s letters, and leaves text fields alone', () => {
    reset('score');
    useMusicalTypingStore.setState({ enabled: true });
    const slur = vi.fn();
    renderEditor(
      <Bound scope={SCORE_SCOPE.id} handlers={{ 'score.slur': slur }} />,
    );
    press('KeyS');
    expect(slur).not.toHaveBeenCalled();
    expect(engine.noteOn).toHaveBeenCalledWith(62, 100);

    const input = focusOn('<input type="text" />', 'input');
    const typed = press('KeyD', {}, input);
    expect(typed.defaultPrevented).toBe(false);
    expect(engine.noteOn).toHaveBeenCalledTimes(1);
  });

  it('shifts octave and velocity, and lets go of the note a key started', () => {
    useMusicalTypingStore.setState({ enabled: true });
    renderEditor();
    press('KeyX');
    press('KeyV');
    press('KeyA');
    expect(engine.noteOn).toHaveBeenLastCalledWith(72, 120);
    press('KeyZ');
    up('KeyA');
    // The C5 it started, not the C4 it would play now.
    expect(engine.noteOff).toHaveBeenLastCalledWith(72);
  });

  it('lets every held note go when turned off or the window loses focus', () => {
    useMusicalTypingStore.setState({ enabled: true });
    renderEditor();
    press('KeyA');
    press('KeyD');
    act(() => {
      window.dispatchEvent(new Event('blur'));
    });
    expect(engine.noteOff).toHaveBeenCalledWith(60);
    expect(engine.noteOff).toHaveBeenCalledWith(64);

    press('KeyG');
    press('Backquote', { key: '`' });
    expect(useMusicalTypingStore.getState().enabled).toBe(false);
    expect(engine.noteOff).toHaveBeenCalledWith(67);
  });

  it('plays a drum kit at its own octave: A the kick, whatever the octave', () => {
    const kitEngine = { noteOn: vi.fn(), noteOff: vi.fn() };
    const s = useStore.getState();
    const kit = s.addTrack('midi', 'drum-machine', 'Kit');
    useStore.setState({
      tracks: useStore
        .getState()
        .tracks.map((t) => ({ ...t, monitoring: false })),
    });
    s.setSelectedTrackId(kit);
    trackEngineRegistry.set(kit, { trackEngine: kitEngine } as never);
    useMusicalTypingStore.setState({ enabled: true, octave: 5 });
    renderEditor();
    press('KeyA');
    press('KeyS');
    press('KeyT');
    // The kick, the snare and the closed hi-hat (2.9's pad letters).
    expect(kitEngine.noteOn.mock.calls.map((c) => c[0])).toEqual([36, 38, 42]);
    trackEngineRegistry.delete(kit);
  });

  it('acts once while a key is held', () => {
    useMusicalTypingStore.setState({ enabled: true });
    renderEditor();
    press('KeyA');
    press('KeyA', { repeat: true });
    expect(engine.noteOn).toHaveBeenCalledTimes(1);
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
    renderEditor();

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
    renderEditor();

    press('KeyR');
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));

    expect(isRecordGuardOpen()).toBe(false);
    expect(useStore.getState().isRecording).toBe(false);
  });

  it('records straight away after the last take', () => {
    armVocals(3840);
    renderEditor();

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
    renderEditor();
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
    renderEditor();
    openModal(2);

    const event = press('Digit2');

    expect(event.defaultPrevented).toBe(true);
    expect(useStore.getState().prismSuggestActiveIdx).toBe(1);
    expect(useStore.getState().activeTool).toBe('cursor');
  });

  it('leaves Enter on a focused button to that button', () => {
    renderEditor();
    openModal();
    const cancel = screen.getByRole('button', { name: 'Cancel' });
    cancel.focus();

    const event = press('Enter', { key: 'Enter' }, cancel);

    expect(commit).not.toHaveBeenCalled();
    expect(event.defaultPrevented).toBe(false);
  });
});
