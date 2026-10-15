import {
  memo,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'framer-motion';
import {
  SkipBack,
  Square,
  Play,
  Pause,
  Circle,
  SkipForward,
  Settings,
  Repeat,
  Library,
  Magnet,
  Lock,
  Unlock,
  Hash,
} from 'lucide-react';

import { useDevCommitCount } from '@/daw/dev/DevProfiler';
import { useStore, type ViewType } from '@/daw/store';
import { ticksPerBeat } from '@/daw/time/timeModel';
import { seekTo } from '@/daw/hooks/useTransport';
import { addFrameTask } from '@/daw/engine/engineClock';
import { getPlayheadTick, subscribePlayhead } from '@/daw/engine/playheadClock';
import { projectEndTick } from '@/daw/audio/renderProject';
import { NOTES } from '@prism/engine';
import { FileMenu } from './FileMenu';
import { CircleOfFifths } from '../Prism/CircleOfFifths';
import { RainbowBorderButton } from '@/components/ui/rainbow-borders-button';
import { displayAccidentals } from '@/daw/utils/displayAccidentals';
import { chordNotationLockTitle } from '@/daw/utils/chordRegionNotation';
import { useChordNotation } from '@/lib/chordNotation';
import { CollabToolbar } from '@/daw/collab/ui/CollabToolbar';
import { requestRecord } from '@/daw/commands/requestRecord';
import { shortcutKeys } from '@/daw/commands/shortcuts';
import { preloadView } from '@/daw/shell/lazyParts';

/** The transport's keys, for screen readers (the '?' sheet lists them). */
const TRANSPORT_KEYS: Record<string, string> = Object.fromEntries(
  [
    'transport.playPause',
    'transport.record',
    'transport.stop',
    'transport.loop',
    'transport.metronome',
  ].map((id) => [id, shortcutKeys(id).aria]),
);

/** How the timeline zooms: never ⌘+/⌘−, which zoom the page. */
const ZOOM_HINT = `Ctrl or ⌘ with the scroll wheel, or ${shortcutKeys('timeline.zoomIn').label} / ${shortcutKeys('timeline.zoomOut').label}`;

// ── View Switcher ───────────────────────────────────────────────────────

const VIEWS: { id: ViewType; label: string }[] = [
  { id: 'arrange', label: 'Create' },
  { id: 'studio', label: 'Master' },
  { id: 'score', label: 'Score' },
  { id: 'leadsheet', label: 'Lead Sheet' },
];

// A Practice Track session adds a way back to its one-purpose screen.
const PRACTICE_VIEW = { id: 'practice' as ViewType, label: 'Practice' };

function ViewSwitcher() {
  const currentView = useStore((s) => s.currentView);
  const setCurrentView = useStore((s) => s.setCurrentView);
  const hasPracticeSession = useStore((s) => s.practiceSession !== null);
  const views = hasPracticeSession ? [PRACTICE_VIEW, ...VIEWS] : VIEWS;

  return (
    <div
      className="flex items-center overflow-hidden rounded-md"
      style={{ backgroundColor: 'var(--daw-surface-2)' }}
    >
      {views.map((v) => {
        const active = currentView === v.id;
        return (
          <button
            key={v.id}
            data-tutorial-id={`view-switch-${v.id}`}
            onClick={() => setCurrentView(v.id)}
            // Each view but Create is its own chunk (1.12a): fetched on a
            // pointer over or a focus, so a click usually finds it there.
            onPointerEnter={() => preloadView(v.id)}
            onFocus={() => preloadView(v.id)}
            className="h-5 shrink-0 cursor-pointer whitespace-nowrap px-2.5 text-[10px] font-semibold uppercase tracking-wide transition-colors"
            style={{
              backgroundColor: active ? 'var(--daw-hover)' : 'transparent',
              color: active ? 'var(--daw-text)' : 'var(--daw-text-3)',
              border: 'none',
            }}
          >
            {v.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Props ────────────────────────────────────────────────────────────────
interface TransportBarProps {
  onInit: () => void;
  isReady: boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────

function formatPosition(ticks: number, numerator = 4, denominator = 4): string {
  const beatTicks = (480 * 4) / denominator;
  const barTicks = numerator * beatTicks;
  const sixteenthTicks = 120;

  const bar = Math.floor(ticks / barTicks) + 1;
  const beat = (Math.floor((ticks % barTicks) / beatTicks) % numerator) + 1;
  const sixteenth = Math.floor((ticks % beatTicks) / sixteenthTicks) + 1;

  return `${bar}:${beat}:${sixteenth}`;
}

// ── Position Display (its own memoised child) ────────────────────────────
// The playhead moves every frame while playing. React renders this span
// once; a playhead clock subscription writes the bar:beat:sixteenth text into
// it, and only when that text changes, so playback re-renders neither the
// readout nor the bar around it (shell-17, milestone 1.7).

const positionText = (tick: number): string => {
  const s = useStore.getState();
  return formatPosition(
    tick,
    s.timeSignatureNumerator,
    s.timeSignatureDenominator,
  );
};

/** FixedDigits' cell widths in em (src/components/common/FixedDigits.tsx):
 *  each digit and colon sits in a cell of its own, so the readout holds
 *  still while it counts. */
const DIGIT_CELL_EM = 0.62;
const COLON_CELL_EM = 0.32;

/** The text in FixedDigits' cells. formatPosition writes digits and colons. */
function writeReadout(el: HTMLElement, text: string): void {
  el.replaceChildren(
    ...Array.from(text, (ch) => {
      const cell = document.createElement('span');
      cell.textContent = ch;
      const em = ch === ':' ? COLON_CELL_EM : DIGIT_CELL_EM;
      // Centred, and free of inherited letter-spacing, as in FixedDigits.
      cell.style.cssText = `display:inline-block;width:${em}em;text-align:center;letter-spacing:0`;
      return cell;
    }),
  );
}

const PositionDisplay = memo(function PositionDisplay() {
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    let shown = '';
    const show = (tick: number) => {
      const text = positionText(tick);
      if (text === shown) return;
      shown = text;
      writeReadout(el, text);
    };
    show(getPlayheadTick());
    const offPlayhead = subscribePlayhead(show);
    // A metre change re-counts the same tick.
    const offMeter = useStore.subscribe(
      (s) => `${s.timeSignatureNumerator}/${s.timeSignatureDenominator}`,
      () => show(getPlayheadTick()),
    );
    return () => {
      offPlayhead();
      offMeter();
    };
  }, []);
  return (
    <span
      ref={ref}
      className="block min-w-14 text-center text-xs"
      style={{ color: 'var(--daw-text)' }}
      title="Bar : Beat : Sixteenth"
    />
  );
});

// ── Zoom indicator ───────────────────────────────────────────────────────

function ZoomIndicator() {
  const zoom = useStore((s) => s.timelineZoom);
  return (
    <div
      className="flex h-5 items-center rounded px-1.5"
      style={{ backgroundColor: 'var(--daw-surface-2)' }}
      title={`Timeline Zoom: ${Math.round(zoom * 100)}%  (${ZOOM_HINT})`}
    >
      <span
        className="text-[9px] font-medium tabular-nums"
        style={{ color: 'var(--daw-text-3)' }}
      >
        {Math.round(zoom * 100)}%
      </span>
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────────

export const TransportBar = memo(function TransportBar({
  onInit,
  isReady,
}: TransportBarProps) {
  useDevCommitCount('TransportBar');
  const isPlaying = useStore((s) => s.isPlaying);
  const isRecording = useStore((s) => s.isRecording);
  const isCountingIn = useStore((s) => s.isCountingIn);
  const countInBars = useStore((s) => s.countInBars);
  const bpm = useStore((s) => s.bpm);
  const midiStatus = useStore((s) => s.midiStatus);
  const midiInputs = useStore((s) => s.inputs);
  const metronomeEnabled = useStore((s) => s.metronomeEnabled);
  const loopEnabled = useStore((s) => s.loopEnabled);
  const snapEnabled = useStore((s) => s.timelineSnapEnabled);
  const rootNote = useStore((s) => s.rootNote);
  const rootTrackColor = useStore((s) => s.rootTrackColor);
  const rootLocked = useStore((s) => s.rootLocked);
  const toggleRootLock = useStore((s) => s.toggleRootLock);
  const tsNum = useStore((s) => s.timeSignatureNumerator);
  const tsDen = useStore((s) => s.timeSignatureDenominator);
  const setTimeSignature = useStore((s) => s.setTimeSignature);

  const play = useStore((s) => s.play);
  const pause = useStore((s) => s.pause);
  const stop = useStore((s) => s.stop);
  const setCountInBars = useStore((s) => s.setCountInBars);
  const setBpm = useStore((s) => s.setBpm);
  const toggleMetronome = useStore((s) => s.toggleMetronome);
  const toggleLoop = useStore((s) => s.toggleLoop);
  const toggleSnap = useStore((s) => s.toggleTimelineSnap);
  const chordRulerShowNotes = useStore((s) => s.chordRulerShowNotes);
  const toggleChordRulerLabels = useStore((s) => s.toggleChordRulerLabels);
  // Jazz / Roman decide the chord ruler's labels; the toggle only applies to hybrid.
  const chordNotation = useChordNotation();
  const chordRulerLocked = chordNotation !== 'hybrid';
  const libraryOpen = useStore((s) => s.libraryOpen);
  const toggleLibrary = useStore((s) => s.toggleLibrary);
  const userListOpen = useStore((s) => s.userListOpen);
  const toggleUserList = useStore((s) => s.toggleUserList);
  const chatPanelOpen = useStore((s) => s.chatPanelOpen);
  const toggleChatPanel = useStore((s) => s.toggleChatPanel);
  const settingsOpen = useStore((s) => s.settingsOpen);
  const setSettingsOpen = useStore((s) => s.setSettingsOpen);
  const projectName = useStore((s) => s.projectName);
  const setProjectName = useStore((s) => s.setProjectName);
  // In a collab session only the host may rename the (shared) project.
  const canEditName = useStore(
    (s) => !s.isCollabActive || s.collabRole === 'owner',
  );

  const withInit = useCallback(
    (action: () => void) => {
      if (!isReady) onInit();
      action();
    },
    [isReady, onInit],
  );

  const handleStop = useCallback(() => withInit(stop), [withInit, stop]);
  const handleStopToZero = useCallback(
    () =>
      withInit(() => {
        stop();
        seekTo(0);
      }),
    [withInit, stop],
  );

  const handleSkipBack = useCallback(
    () =>
      withInit(() => {
        // The live playhead: the store's position is parked while playing.
        const pos = getPlayheadTick();
        const sorted = [...useStore.getState().markers].sort(
          (a, b) => a.tick - b.tick,
        );
        // Find the last marker strictly before current position
        let target: number | null = null;
        for (let i = sorted.length - 1; i >= 0; i--) {
          if (sorted[i].tick < pos) {
            target = sorted[i].tick;
            break;
          }
        }
        seekTo(target ?? 0);
      }),
    [withInit],
  );

  const handleSkipForward = useCallback(
    () =>
      withInit(() => {
        const pos = getPlayheadTick();
        const sorted = [...useStore.getState().markers].sort(
          (a, b) => a.tick - b.tick,
        );
        // Find the first marker strictly after current position
        for (const m of sorted) {
          if (m.tick > pos) {
            seekTo(m.tick);
            return;
          }
        }
        // Fallback: seek to the end of the content, audio clips included.
        // Read here rather than subscribed: the bar would otherwise re-render
        // on every track edit for this one button (shell-17).
        const lastTick = projectEndTick(useStore.getState());
        if (lastTick > pos) seekTo(lastTick);
      }),
    [withInit],
  );
  const handlePlayPause = useCallback(
    () => withInit(isPlaying ? pause : play),
    [withInit, isPlaying, pause, play],
  );
  // The same command as the R key: a take that would record over existing
  // audio waits for RecordGuard's confirm, mounted at the editor root.
  const handleRecord = useCallback(() => {
    requestRecord(isReady ? undefined : onInit);
  }, [isReady, onInit]);

  // Local state so the user can freely clear / type without the controlled
  // value snapping back on every keystroke.
  const [bpmInput, setBpmInput] = useState(String(bpm));
  const [projectNameInput, setProjectNameInput] = useState(projectName);
  useEffect(() => setProjectNameInput(projectName), [projectName]);
  const commitProjectName = useCallback(() => {
    const trimmed = projectNameInput.trim();
    if (trimmed) {
      setProjectName(trimmed);
    }
    setProjectNameInput(useStore.getState().projectName);
  }, [projectNameInput, setProjectName]);
  const [keyOpen, setKeyOpen] = useState(false);
  const keyPopoverRef = useRef<HTMLDivElement>(null);
  const [tsOpen, setTsOpen] = useState(false);
  const tsButtonRef = useRef<HTMLButtonElement>(null);
  const tsPopoverRef = useRef<HTMLDivElement>(null);
  const [customNum, setCustomNum] = useState('');
  const [customDen, setCustomDen] = useState('4');
  const keyButtonRef = useRef<HTMLDivElement>(null);

  // Close Key popover on outside click
  useEffect(() => {
    if (!keyOpen) return;
    function handleMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (
        keyPopoverRef.current?.contains(target) ||
        keyButtonRef.current?.contains(target)
      )
        return;
      setKeyOpen(false);
      // Auto-lock root note when dismissing the popover
      const {
        rootNote: rn,
        rootLocked: rl,
        toggleRootLock: trl,
      } = useStore.getState();
      if (rn !== null && !rl) {
        trl();
      }
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [keyOpen]);

  // Close time signature popover on outside click
  useEffect(() => {
    if (!tsOpen) return;
    function handleMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (
        tsPopoverRef.current?.contains(target) ||
        tsButtonRef.current?.contains(target)
      )
        return;
      setTsOpen(false);
    }
    document.addEventListener('mousedown', handleMouseDown);
    return () => document.removeEventListener('mousedown', handleMouseDown);
  }, [tsOpen]);

  // Sync from store when BPM changes externally (e.g. MIDI control)
  useEffect(() => setBpmInput(String(bpm)), [bpm]);

  const commitBpm = useCallback(() => {
    const value = parseInt(bpmInput, 10);
    if (!Number.isNaN(value)) {
      setBpm(value); // store clamps 40-300
    }
    // Reset display to the store value (handles NaN / out-of-range)
    setBpmInput(String(useStore.getState().bpm));
  }, [bpmInput, setBpm]);

  return (
    <div
      className="relative flex h-12 shrink-0 select-none items-center border-b px-3"
      style={{
        // Base tint so the transport bar reads continuous with the TopRail; the
        // border-b + glass shadow keep it separated from the timeline below.
        backgroundColor: 'var(--daw-bg)',
        borderColor: 'var(--daw-hairline)',
      }}
    >
      {/* ── Left Half ──────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
        {/* File menu */}
        <FileMenu />

        {/* Project name (read-only for non-host collaborators) */}
        <input
          type="text"
          value={projectNameInput}
          onChange={(e) => setProjectNameInput(e.target.value)}
          onBlur={commitProjectName}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              commitProjectName();
              (e.target as HTMLInputElement).blur();
            }
          }}
          readOnly={!canEditName}
          className={`h-5 max-w-[140px] rounded border border-transparent bg-transparent px-1.5 text-[11px] font-medium outline-none transition-colors ${
            canEditName
              ? 'hover:border-white/10 focus:border-white/20 focus:ring-1'
              : 'cursor-default'
          }`}
          style={{ color: 'var(--daw-text)' }}
          title={
            canEditName
              ? 'Project name (click to edit)'
              : 'Only the host can rename the project'
          }
        />

        {/* Root Note selector */}
        <RainbowBorderButton
          ref={keyButtonRef}
          active={rootNote === null}
          onClick={() => {
            if (!keyOpen) {
              // Opening: unlock so user can freely change keys
              const s = useStore.getState();
              if (s.rootLocked) s.toggleRootLock();
            } else {
              // Closing via button: auto-lock
              const s = useStore.getState();
              if (s.rootNote !== null && !s.rootLocked) s.toggleRootLock();
            }
            setKeyOpen((v) => !v);
          }}
          className="flex h-5 items-center gap-1 px-2 text-[10px] font-semibold uppercase tracking-wider"
          style={{
            backgroundColor:
              rootNote !== null && rootTrackColor
                ? rootTrackColor
                : 'var(--daw-surface-2)',
            color: '#fff',
          }}
          title="Key"
        >
          {rootNote !== null
            ? `Key: ${displayAccidentals(NOTES[rootNote])}`
            : 'Key'}
        </RainbowBorderButton>
        {keyOpen &&
          createPortal(
            <div
              ref={keyPopoverRef}
              className="fixed z-50 rounded-xl p-4 shadow-lg"
              style={{
                top:
                  (keyButtonRef.current?.getBoundingClientRect().bottom ?? 0) +
                  8,
                left: keyButtonRef.current?.getBoundingClientRect().left ?? 0,
                backgroundColor: 'var(--daw-popover)',
                border: '1px solid var(--daw-hairline)',
              }}
            >
              <CircleOfFifths />
            </div>,
            document.body,
          )}
        {rootNote !== null && (
          <button
            onClick={toggleRootLock}
            className="flex size-5 cursor-pointer items-center justify-center rounded transition-colors hover:bg-white/5"
            style={{
              color: rootLocked ? 'var(--daw-accent)' : 'var(--daw-text-3)',
              border: 'none',
              background: 'none',
            }}
            title={rootLocked ? 'Unlock root note' : 'Lock root note'}
          >
            {rootLocked ? <Lock size={10} /> : <Unlock size={10} />}
          </button>
        )}

        {/* Musical Controls — centered in remaining space */}
        <div className="flex flex-1 items-center justify-center gap-2">
          {/* Time Signature */}
          <div className="relative">
            <button
              ref={tsButtonRef}
              onClick={() => setTsOpen((v) => !v)}
              className="flex h-5 cursor-pointer items-center rounded px-1.5 text-[10px] font-medium tabular-nums transition-colors hover:bg-white/5"
              style={{
                backgroundColor: 'var(--daw-surface-2)',
                color: 'var(--daw-text-3)',
                border: 'none',
              }}
              title="Time Signature"
            >
              {tsNum}/{tsDen}
            </button>
            {tsOpen &&
              createPortal(
                <div
                  ref={tsPopoverRef}
                  className="fixed z-50 rounded-lg p-2 shadow-lg"
                  style={{
                    top:
                      (tsButtonRef.current?.getBoundingClientRect().bottom ??
                        0) + 6,
                    left:
                      tsButtonRef.current?.getBoundingClientRect().left ?? 0,
                    backgroundColor: 'var(--daw-popover)',
                    border: '1px solid var(--daw-hairline)',
                  }}
                >
                  <div className="grid grid-cols-3 gap-1">
                    {(
                      [
                        [2, 4],
                        [3, 4],
                        [4, 4],
                        [5, 4],
                        [6, 4],
                        [7, 4],
                        [3, 8],
                        [5, 8],
                        [6, 8],
                        [7, 8],
                        [9, 8],
                        [12, 8],
                      ] as [number, number][]
                    ).map(([n, d]) => {
                      const isActive = n === tsNum && d === tsDen;
                      return (
                        <button
                          key={`${n}/${d}`}
                          onClick={() => {
                            setTimeSignature(n, d);
                            setTsOpen(false);
                          }}
                          className="flex h-6 w-10 cursor-pointer items-center justify-center rounded text-[10px] font-medium tabular-nums transition-colors hover:bg-white/10"
                          style={{
                            backgroundColor: isActive
                              ? 'rgba(255, 255, 255, 0.10)'
                              : undefined,
                            color: 'var(--daw-text)',
                            border: 'none',
                          }}
                        >
                          {n}/{d}
                        </button>
                      );
                    })}
                  </div>
                  {/* Custom time signature input */}
                  <div
                    className="mt-1.5 flex items-center gap-1 border-t pt-1.5"
                    style={{ borderColor: 'var(--daw-hairline)' }}
                  >
                    <input
                      type="number"
                      min={1}
                      max={32}
                      value={customNum}
                      onChange={(e) => setCustomNum(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          const n = parseInt(customNum, 10);
                          const d = parseInt(customDen, 10);
                          if (n > 0) {
                            setTimeSignature(n, d);
                            setTsOpen(false);
                          }
                        }
                      }}
                      placeholder={String(tsNum)}
                      className="h-5 w-8 rounded border bg-transparent text-center text-[10px] tabular-nums outline-none focus:ring-1"
                      style={{
                        borderColor: 'var(--daw-hairline)',
                        color: 'var(--daw-text)',
                      }}
                    />
                    <span
                      className="text-[10px]"
                      style={{ color: 'var(--daw-text-3)' }}
                    >
                      /
                    </span>
                    <select
                      value={customDen}
                      onChange={(e) => setCustomDen(e.target.value)}
                      className="h-5 cursor-pointer rounded border bg-transparent text-[10px] tabular-nums outline-none focus:ring-1"
                      style={{
                        borderColor: 'var(--daw-hairline)',
                        color: 'var(--daw-text)',
                      }}
                    >
                      <option value="2">2</option>
                      <option value="4">4</option>
                      <option value="8">8</option>
                      <option value="16">16</option>
                    </select>
                    <button
                      onClick={() => {
                        const n = parseInt(customNum, 10);
                        const d = parseInt(customDen, 10);
                        if (n > 0) {
                          setTimeSignature(n, d);
                          setTsOpen(false);
                        }
                      }}
                      className="ml-auto flex h-6 cursor-pointer items-center rounded-full px-2.5 text-xs font-semibold transition-[filter] hover:brightness-90"
                      style={{
                        backgroundColor: '#fff',
                        color: '#101012',
                        border: 'none',
                      }}
                    >
                      Set
                    </button>
                  </div>
                </div>,
                document.body,
              )}
          </div>

          {/* BPM */}
          <div
            data-tutorial-id="transport-bpm"
            className="flex items-center gap-1"
          >
            <label
              className="text-[10px] font-medium uppercase"
              style={{ color: 'var(--daw-text-3)' }}
              htmlFor="bpm-input"
            >
              BPM
            </label>
            <input
              id="bpm-input"
              type="number"
              min={40}
              max={300}
              value={bpmInput}
              onChange={(e) => setBpmInput(e.target.value)}
              onBlur={commitBpm}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitBpm();
              }}
              className="h-5 w-12 rounded border bg-transparent text-center text-[11px] tabular-nums outline-none focus:ring-1"
              style={{
                borderColor: 'var(--daw-hairline)',
                color: 'var(--daw-text)',
              }}
            />
          </div>

          <div
            className="h-4 w-px"
            style={{ backgroundColor: 'var(--daw-hairline)' }}
          />

          {/* Metronome */}
          <motion.button
            onClick={toggleMetronome}
            whileTap={{ scale: 0.85 }}
            className="flex size-7 items-center justify-center rounded-md transition-colors hover:bg-white/5"
            style={{
              color: metronomeEnabled
                ? 'var(--daw-accent)'
                : 'var(--daw-text-3)',
              backgroundColor: metronomeEnabled
                ? 'var(--daw-selected)'
                : undefined,
            }}
            title="Metronome"
            aria-keyshortcuts={TRANSPORT_KEYS['transport.metronome']}
          >
            <MetronomeIcon active={metronomeEnabled} />
          </motion.button>

          {/* Count-In (click to cycle: Off → 1 Bar → 2 Bars) */}
          <motion.button
            onClick={() =>
              setCountInBars(countInBars >= 2 ? 0 : countInBars + 1)
            }
            whileTap={{ scale: 0.85 }}
            className="flex size-7 cursor-pointer items-center justify-center rounded-md transition-colors hover:bg-white/5"
            style={{
              color:
                countInBars > 0 ? 'var(--daw-accent)' : 'var(--daw-text-3)',
              backgroundColor:
                countInBars > 0 ? 'var(--daw-selected)' : undefined,
            }}
            title={`Count In: ${countInBars === 0 ? 'Off' : `${countInBars} Bar${countInBars > 1 ? 's' : ''}`}`}
          >
            <CountInIcon bars={countInBars} />
          </motion.button>

          {/* Loop */}
          <motion.button
            onClick={toggleLoop}
            whileTap={{ scale: 0.85 }}
            className="flex size-7 items-center justify-center rounded-md transition-colors hover:bg-white/5"
            style={{
              color: loopEnabled ? 'var(--daw-accent)' : 'var(--daw-text-3)',
              backgroundColor: loopEnabled ? 'var(--daw-selected)' : undefined,
            }}
            title="Loop"
            aria-keyshortcuts={TRANSPORT_KEYS['transport.loop']}
          >
            <Repeat size={14} strokeWidth={2} />
          </motion.button>

          {/* Snap to Grid. Only gestures snap: toggling it never moves the
              playhead (it used to jump it to the grid, audibly mid-song,
              when snap was turned off: shell-18). */}
          <motion.button
            onClick={toggleSnap}
            whileTap={{ scale: 0.85 }}
            className="flex size-7 items-center justify-center rounded-md transition-colors hover:bg-white/5"
            style={{
              color: snapEnabled ? 'var(--daw-accent)' : 'var(--daw-text-3)',
              backgroundColor: snapEnabled ? 'var(--daw-selected)' : undefined,
            }}
            title="Snap to Grid"
          >
            <Magnet size={14} strokeWidth={2} />
          </motion.button>

          {/* Chord Ruler: Numbers ↔ Notes */}
          <motion.button
            onClick={chordRulerLocked ? undefined : toggleChordRulerLabels}
            whileTap={chordRulerLocked ? undefined : { scale: 0.85 }}
            aria-disabled={chordRulerLocked || undefined}
            className={
              chordRulerLocked
                ? 'flex size-7 cursor-default items-center justify-center rounded-md opacity-40'
                : 'flex size-7 cursor-pointer items-center justify-center rounded-md transition-colors hover:bg-white/5'
            }
            style={{
              color:
                chordRulerShowNotes && !chordRulerLocked
                  ? 'var(--daw-accent)'
                  : 'var(--daw-text-3)',
              backgroundColor:
                chordRulerShowNotes && !chordRulerLocked
                  ? 'var(--daw-selected)'
                  : undefined,
            }}
            title={
              chordRulerLocked
                ? chordNotationLockTitle(chordNotation)
                : chordRulerShowNotes
                  ? 'Chord Ruler: Degree Numbers'
                  : 'Chord Ruler: Note Names'
            }
          >
            <Hash size={14} strokeWidth={2} />
          </motion.button>
        </div>
      </div>

      {/* ── Center: Transport Controls (true center) ──────────── */}
      <div className="flex shrink-0 items-center gap-1">
        {/* Stop */}
        <motion.button
          onClick={handleStop}
          onDoubleClick={handleStopToZero}
          whileTap={{ scale: 0.85 }}
          className="flex size-7 items-center justify-center rounded-md transition-colors hover:bg-white/5"
          style={{ color: 'var(--daw-text-3)' }}
          title="Stop (double-click for start)"
          aria-keyshortcuts={TRANSPORT_KEYS['transport.stop']}
        >
          <Square size={12} fill="currentColor" strokeWidth={0} />
        </motion.button>

        {/* Play / Pause */}
        <motion.button
          onClick={handlePlayPause}
          whileTap={{ scale: 0.85 }}
          className="flex size-8 items-center justify-center rounded-full transition-colors hover:bg-white/5"
          style={{
            color: isPlaying ? 'var(--daw-success)' : 'var(--daw-text)',
            backgroundColor: isPlaying
              ? 'rgba(34, 197, 94, 0.1)'
              : 'transparent',
          }}
          title={isPlaying ? 'Pause' : 'Play'}
          aria-keyshortcuts={TRANSPORT_KEYS['transport.playPause']}
        >
          {isPlaying ? (
            <Pause size={14} fill="currentColor" strokeWidth={0} />
          ) : (
            <Play size={14} fill="currentColor" strokeWidth={0} />
          )}
        </motion.button>

        {/* Record */}
        <motion.button
          onClick={handleRecord}
          whileTap={{ scale: 0.85 }}
          className={`flex size-7 items-center justify-center rounded-md transition-colors hover:bg-white/5 ${
            isRecording ? 'animate-pulse' : isCountingIn ? 'animate-pulse' : ''
          }`}
          style={{
            color: isRecording
              ? 'var(--daw-record)'
              : isCountingIn
                ? '#f59e0b'
                : 'var(--daw-text-3)',
          }}
          title="Record"
          aria-keyshortcuts={TRANSPORT_KEYS['transport.record']}
        >
          <Circle size={12} fill="currentColor" strokeWidth={0} />
        </motion.button>

        {/* Separator + Time Display */}
        <div
          className="mx-1 h-4 w-px"
          style={{ backgroundColor: 'var(--daw-hairline)' }}
        />
        <PositionDisplay />
      </div>

      {/* ── Right Half ────────────────────────────────────────── */}
      <div className="flex min-w-0 flex-1 items-center overflow-hidden">
        {/* ViewSwitcher — its own div, centered between center and right controls */}
        <div className="flex flex-1 items-center justify-center">
          <ViewSwitcher />
        </div>

        {/* Right controls */}
        <div className="flex shrink-0 items-center gap-2">
          {/* Skip Back */}
          <motion.button
            onClick={handleSkipBack}
            whileTap={{ scale: 0.85 }}
            className="flex size-7 items-center justify-center rounded-md transition-colors hover:bg-white/5"
            style={{ color: 'var(--daw-text-3)' }}
            title="Skip Back"
          >
            <SkipBack size={12} fill="currentColor" strokeWidth={0} />
          </motion.button>

          {/* Skip Forward */}
          <motion.button
            onClick={handleSkipForward}
            whileTap={{ scale: 0.85 }}
            className="flex size-7 items-center justify-center rounded-md transition-colors hover:bg-white/5"
            style={{ color: 'var(--daw-text-3)' }}
            title="Skip Forward"
          >
            <SkipForward size={12} fill="currentColor" strokeWidth={0} />
          </motion.button>

          {/* MIDI Status Indicator */}
          <div
            className="flex h-5 items-center gap-1 rounded px-1.5"
            style={{
              backgroundColor: 'var(--daw-surface-2)',
            }}
            title={
              midiStatus === 'ready'
                ? `MIDI: ${midiInputs.length} input(s) — ${midiInputs.map((d) => d.name).join(', ')}`
                : midiStatus === 'unavailable'
                  ? 'MIDI: Unavailable — use Chrome/Edge'
                  : 'MIDI: Initializing...'
            }
          >
            <div
              className="size-1.5 rounded-full"
              style={{
                backgroundColor:
                  midiStatus === 'ready'
                    ? '#22c55e'
                    : midiStatus === 'unavailable'
                      ? '#ef4444'
                      : '#6b7280',
              }}
            />
            <span
              className="text-[9px] font-medium uppercase"
              style={{
                color:
                  midiStatus === 'ready'
                    ? '#22c55e'
                    : midiStatus === 'unavailable'
                      ? '#ef4444'
                      : 'var(--daw-text-3)',
              }}
            >
              MIDI
            </span>
          </div>

          {/* Zoom indicator */}
          <ZoomIndicator />

          <div
            className="h-4 w-px"
            style={{ backgroundColor: 'var(--daw-hairline)' }}
          />

          {/* Collaboration */}
          <CollabToolbar
            onToggleUserList={toggleUserList}
            userListOpen={userListOpen}
            onToggleChatPanel={toggleChatPanel}
            chatPanelOpen={chatPanelOpen}
          />

          {/* The collab prompts (leave, kicked) mount at the DawApp root,
              so they show in Practice too; the Opening overlay's host wait
              replaced "Waiting on session creation" (milestone 1.4). */}

          {/* Library toggle */}
          <motion.button
            onClick={toggleLibrary}
            whileTap={{ scale: 0.85 }}
            className="flex h-7 items-center gap-1 rounded-md px-1 transition-colors hover:bg-white/5"
            style={{
              color: libraryOpen ? 'var(--daw-accent)' : 'var(--daw-text-3)',
              backgroundColor: libraryOpen ? 'var(--daw-selected)' : undefined,
            }}
            title="Library"
          >
            <Library size={13} strokeWidth={2} />
          </motion.button>

          <div
            className="h-4 w-px"
            style={{ backgroundColor: 'var(--daw-hairline)' }}
          />
          {/* Settings */}
          <motion.button
            whileTap={{ scale: 0.85 }}
            onClick={() => setSettingsOpen(true)}
            className="flex h-7 items-center gap-1 rounded-md px-1 transition-colors hover:bg-white/5"
            style={{
              color: settingsOpen ? 'var(--daw-accent)' : 'var(--daw-text-3)',
              backgroundColor: settingsOpen ? 'var(--daw-selected)' : undefined,
            }}
            title="Settings"
          >
            <Settings size={13} strokeWidth={2} />
          </motion.button>
        </div>
      </div>
    </div>
  );
});

// ── Inline SVG Components ────────────────────────────────────────────────

// Tracks the current metronome beat index while a click sequence is sounding
// (playback with the metronome on, or a count-in). The parity of the returned
// index drives which circle the icon fills. Returns 0 (left) when idle.
// Playback follows the playhead clock and a count-in runs as a task on the
// shared frame loop; either way the icon renders once a beat, and nothing
// runs while idle.
const beatTicksFor = (den: number) =>
  // Beat length matches the metronome/count-in scheduling: the note value
  // the denominator names, a sixteenth in x/16 too.
  ticksPerBeat({ numerator: 1, denominator: den });

function useMetronomeBeat(animating: boolean, countingIn: boolean): number {
  const [beat, setBeat] = useState(0);
  useEffect(() => {
    if (!animating) {
      setBeat(0);
      return;
    }
    const set = (next: number) =>
      setBeat((prev) => (prev === next ? prev : next));
    if (countingIn) {
      // Transport is paused during count-in — derive beats from elapsed time.
      const countInStart = performance.now();
      return addFrameTask(
        () => {
          const s = useStore.getState();
          const den = s.timeSignatureDenominator;
          const beatMs = (60 / s.bpm) * (4 / den) * 1000;
          set(Math.floor((performance.now() - countInStart) / beatMs));
        },
        { name: 'metronome-count-in' },
      );
    }
    // Playing — derive from the heard playhead, offset so the first beat
    // after playback starts fills the left circle.
    const beatOf = (tick: number) =>
      Math.floor(
        tick / beatTicksFor(useStore.getState().timeSignatureDenominator),
      );
    const startBeat = beatOf(getPlayheadTick());
    set(0);
    return subscribePlayhead((tick) => set(beatOf(tick) - startBeat));
  }, [animating, countingIn]);
  return beat;
}

function MetronomeIcon({ active }: { active: boolean }) {
  const isPlaying = useStore((s) => s.isPlaying);
  const isCountingIn = useStore((s) => s.isCountingIn);
  // A click sequence is sounding during a count-in, or during playback while
  // the metronome is enabled.
  const animating = isCountingIn || (isPlaying && active);
  const beat = useMetronomeBeat(animating, isCountingIn);

  // Sounding → fill one circle, alternating each beat (left first). Idle + on →
  // both filled. Off → both outlined.
  const leftFilled = animating ? beat % 2 === 0 : active;
  const rightFilled = animating ? beat % 2 !== 0 : active;

  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle
        cx="4"
        cy="7"
        r="2.5"
        fill="currentColor"
        fillOpacity={leftFilled ? 1 : 0}
        stroke="currentColor"
        strokeWidth="1.5"
        style={{ transition: 'fill-opacity 90ms ease-out' }}
      />
      <circle
        cx="10"
        cy="7"
        r="2.5"
        fill="currentColor"
        fillOpacity={rightFilled ? 1 : 0}
        stroke="currentColor"
        strokeWidth="1.5"
        style={{ transition: 'fill-opacity 90ms ease-out' }}
      />
    </svg>
  );
}

function CountInIcon({ bars }: { bars: number }) {
  return (
    <svg
      width="18"
      height="14"
      viewBox="0 0 18 14"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
    >
      {/* Bar 1: 4 ticks */}
      <line
        x1="1.5"
        y1="3"
        x2="1.5"
        y2="11"
        strokeWidth={bars >= 1 ? 2 : 1.2}
        opacity={bars >= 1 ? 1 : 0.3}
      />
      <line
        x1="4"
        y1="3"
        x2="4"
        y2="11"
        strokeWidth={bars >= 1 ? 2 : 1.2}
        opacity={bars >= 1 ? 1 : 0.3}
      />
      <line
        x1="6.5"
        y1="3"
        x2="6.5"
        y2="11"
        strokeWidth={bars >= 1 ? 2 : 1.2}
        opacity={bars >= 1 ? 1 : 0.3}
      />
      <line
        x1="9"
        y1="3"
        x2="9"
        y2="11"
        strokeWidth={bars >= 1 ? 2 : 1.2}
        opacity={bars >= 1 ? 1 : 0.3}
      />
      {/* Bar 2: 3 ticks */}
      <line
        x1="12"
        y1="3"
        x2="12"
        y2="11"
        strokeWidth={bars >= 2 ? 2 : 1.2}
        opacity={bars >= 2 ? 1 : 0.3}
      />
      <line
        x1="14.5"
        y1="3"
        x2="14.5"
        y2="11"
        strokeWidth={bars >= 2 ? 2 : 1.2}
        opacity={bars >= 2 ? 1 : 0.3}
      />
      <line
        x1="17"
        y1="3"
        x2="17"
        y2="11"
        strokeWidth={bars >= 2 ? 2 : 1.2}
        opacity={bars >= 2 ? 1 : 0.3}
      />
    </svg>
  );
}
