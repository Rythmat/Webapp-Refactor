import { useEffect, useRef } from 'react';
import { useStore } from '@/daw/store';
import { midiClipLength } from '@/daw/components/Timeline/midiClipCuts';
import type { ToolType } from '@/daw/store/uiSlice';
import { saveCurrentProjectToCloud } from '@/lib/studio-projects/api';
import { smartUndo, smartRedo } from '@/daw/store/undoMiddleware';
import { exportMidiFile, downloadMidiBlob } from '@/daw/midi/MidiFileIO';
import { getAudioBuffer, setAudioBuffer } from '@/daw/audio/AudioBufferStore';
import { requestRecord } from '@/daw/commands/requestRecord';
import type { MidiSequence } from '@prism/engine';

// ── Tool map (number keys) ──────────────────────────────────────────────
const TOOL_KEYS: Record<string, ToolType> = {
  Digit1: 'cursor',
  Digit2: 'pencil',
  Digit3: 'scissors',
  Digit4: 'layout',
};

// Nudge amount in ticks (1 beat = 480 ticks)
const NUDGE_TICKS = 480;
const OUR_PPQ = 480;

// Inputs nobody types into. Their plain keys are still theirs (Space ticks a
// checkbox, the arrows move a range slider), but undo works while they have
// focus.
const NON_TEXT_INPUT_TYPES = new Set([
  'button',
  'checkbox',
  'color',
  'file',
  'hidden',
  'image',
  'radio',
  'range',
  'reset',
  'submit',
]);

const EDITABLE = '[contenteditable]:not([contenteditable="false"])';

/** A field the student types into: every key but ⌘S belongs to its text. */
function isTextField(target: EventTarget | null): boolean {
  if (target instanceof HTMLTextAreaElement) return true;
  if (target instanceof HTMLInputElement) {
    return !NON_TEXT_INPUT_TYPES.has(target.type);
  }
  return target instanceof Element && target.closest(EDITABLE) !== null;
}

/** Any form control (text fields too), which keeps its plain keys. */
function isFormControl(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.closest(`input, textarea, select, ${EDITABLE}`) !== null
  );
}

/** Inside an open dialog or menu: Escape, Space and Enter are its own. */
function isInDialogOrMenu(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.closest('[role="dialog"], [role="menu"]') !== null
  );
}

/**
 * Inside a focusable widget that answers keys itself: the docked piano roll
 * or drum machine, a knob, a slider. Its arrows and Delete are not the
 * timeline's.
 */
function isInKeyWidget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    target.closest('[tabindex]:not([tabindex="-1"])') !== null
  );
}

function togglePlayback() {
  const state = useStore.getState();
  if (state.isPlaying) {
    state.pause();
  } else {
    state.play();
  }
}

// ── useKeyboardShortcuts ────────────────────────────────────────────────
// Global keyboard shortcuts for the DAW. Keys belong to whatever the student
// is working in, so this hook stands aside when:
// - a nearer handler already took the key (e.defaultPrevented): a view's own
//   keymap, a dialog;
// - Option is held: the Score writes rests on ⌥R;
// - focus is in a text field (only ⌘S still saves) or another form control
//   (undo still works there);
// - focus is in a dialog or menu, except the modal note editors (piano roll,
//   vocal pitch editor), where Space and undo keep working.
// Clip and timeline keys (copy, paste, duplicate, select, delete, nudge,
// tools, zoom to fit) act on the arrangement, so they run only in Create, and
// not while a modal note editor is open or a widget with keys of its own has
// focus. ⌘A and ⌘D never fall through to the browser (select the page, add a
// bookmark). On the practice screen only Space, R, L, Esc and ⌘S do anything.
// ⌘+/⌘−/⌘0 are left to the browser's page zoom.
// This is Stage A's interim guard; 1.6 replaces the hook with a command
// registry.

export function useKeyboardShortcuts(token: string | null) {
  // Hold token in a ref so the keydown closure always reads the latest value
  // without re-binding the listener whenever auth state changes.
  const tokenRef = useRef(token);
  tokenRef.current = token;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey) return;

      const state = useStore.getState();
      const isMod = e.metaKey || e.ctrlKey;
      const target = e.target;

      // Cmd+S: Save current project to the cloud (POST or PUT depending on
      // whether a projectId is already stamped on the store). Works even
      // while typing: it never touches the text.
      if (e.code === 'KeyS' && isMod) {
        e.preventDefault();
        if (e.repeat) return;
        const currentToken = tokenRef.current;
        if (!currentToken) {
          console.warn('Cmd-S ignored: not authenticated');
          return;
        }
        void saveCurrentProjectToCloud(currentToken).catch((err) => {
          console.error('Cmd-S cloud save failed', err);
        });
        return;
      }

      // ⌘Z, ⌘A, ⌘C and ⌘V in a text field edit its text.
      if (isTextField(target)) return;

      const view = state.currentView;
      // The modal piano roll and the vocal pitch editor are dialogs too, but
      // editors with no transport of their own: Space and undo still work in
      // them. Nothing else does, since clip keys would act on the clip behind.
      const inNoteEditor =
        view === 'arrange' &&
        (state.editingClipId !== null || state.editingAudioClipId !== null);
      if (!inNoteEditor && isInDialogOrMenu(target)) return;

      const practice = view === 'practice';
      const onTimeline =
        view === 'arrange' &&
        !inNoteEditor &&
        !isFormControl(target) &&
        !isInKeyWidget(target);

      // Cmd+Z: Undo / Cmd+Shift+Z: Redo. Not on the practice screen: it shows
      // no undo, and its history can reach back past its backing tracks.
      if (e.code === 'KeyZ' && isMod) {
        if (practice) return;
        e.preventDefault();
        if (e.shiftKey) {
          smartRedo();
        } else {
          smartUndo();
        }
        return;
      }

      // Cmd+A: Select first clip on current/first track. Outside a text
      // field it never selects the page's text.
      if (e.code === 'KeyA' && isMod) {
        e.preventDefault();
        if (!onTimeline) return;
        const trackId = state.selectedClipTrackId || state.tracks[0]?.id;
        if (trackId) {
          const track = state.tracks.find((t) => t.id === trackId);
          const firstClip = track?.midiClips[0];
          if (firstClip) {
            state.setSelectedClip(firstClip.id, trackId);
          }
        }
        return;
      }

      // Cmd+D: Duplicate selected clip (copy + paste right after, MIDI or
      // audio). Like ⌘A, outside a text field it never reaches the browser,
      // whose ⌘D opens a bookmark dialog over the editor.
      if (e.code === 'KeyD' && isMod) {
        e.preventDefault();
        if (!onTimeline) return;
        const { selectedClipId, selectedClipTrackId } = state;
        if (selectedClipId && selectedClipTrackId) {
          const track = state.tracks.find((t) => t.id === selectedClipTrackId);
          const midiClip = track?.midiClips.find(
            (c) => c.id === selectedClipId,
          );
          if (midiClip) {
            // Events are clip-relative, so the copy goes right after the
            // clip's own length, not after its song position.
            const duration = midiClipLength(midiClip);
            const newId = `clip-dup-${crypto.randomUUID().slice(0, 8)}`;
            state.addMidiClip(selectedClipTrackId, {
              ...structuredClone(midiClip),
              id: newId,
              startTick: midiClip.startTick + duration,
            });
            state.setSelectedClip(newId, selectedClipTrackId);
          } else {
            const audioClip = track?.audioClips.find(
              (c) => c.id === selectedClipId,
            );
            if (audioClip) {
              const srcBuffer = getAudioBuffer(audioClip.id);
              if (srcBuffer) {
                const newId = `clip-dup-${crypto.randomUUID().slice(0, 8)}`;
                setAudioBuffer(newId, srcBuffer);
                state.addAudioClip(selectedClipTrackId, {
                  ...structuredClone(audioClip),
                  id: newId,
                  startTick: audioClip.startTick + audioClip.duration,
                });
                state.setSelectedClip(newId, selectedClipTrackId);
              }
            }
          }
        }
        return;
      }

      if (inNoteEditor) {
        if (e.code === 'Space' && !isFormControl(target)) {
          e.preventDefault();
          if (!e.repeat) togglePlayback();
        }
        return;
      }

      // Cmd+C: Copy selected clip (MIDI or audio)
      if (e.code === 'KeyC' && isMod && !e.shiftKey) {
        if (!onTimeline) return;
        const { selectedClipId, selectedClipTrackId } = state;
        if (selectedClipId && selectedClipTrackId) {
          e.preventDefault();
          const track = state.tracks.find((t) => t.id === selectedClipTrackId);
          const midiClip = track?.midiClips.find(
            (c) => c.id === selectedClipId,
          );
          if (midiClip) {
            state.setClipboard([structuredClone(midiClip)]);
          } else {
            const audioClip = track?.audioClips.find(
              (c) => c.id === selectedClipId,
            );
            if (audioClip) {
              state.setAudioClipboard(structuredClone(audioClip), audioClip.id);
            }
          }
        }
        return;
      }

      // Cmd+V: Paste clipboard clips at playhead (MIDI or audio)
      if (e.code === 'KeyV' && isMod) {
        if (!onTimeline) return;
        const {
          clipboardClips,
          clipboardAudioClip,
          selectedClipTrackId,
          position,
        } = state;
        if (clipboardAudioClip) {
          e.preventDefault();
          const targetTrackId = selectedClipTrackId || state.tracks[0]?.id;
          if (targetTrackId) {
            const srcBuffer = getAudioBuffer(clipboardAudioClip.bufferId);
            if (srcBuffer) {
              const newId = `clip-paste-${crypto.randomUUID().slice(0, 8)}`;
              setAudioBuffer(newId, srcBuffer);
              state.addAudioClip(targetTrackId, {
                ...structuredClone(clipboardAudioClip.clip),
                id: newId,
                startTick: position,
              });
              state.setSelectedClip(newId, targetTrackId);
            }
          }
        } else if (clipboardClips.length > 0) {
          e.preventDefault();
          const targetTrackId = selectedClipTrackId || state.tracks[0]?.id;
          if (targetTrackId) {
            for (const clip of clipboardClips) {
              state.addMidiClip(targetTrackId, {
                ...structuredClone(clip),
                id: `clip-paste-${crypto.randomUUID().slice(0, 8)}`,
                startTick: position,
              });
            }
          }
        }
        return;
      }

      // Cmd+E: Export MIDI
      if (e.code === 'KeyE' && isMod) {
        if (practice) return;
        e.preventDefault();
        const sequences = new Map<number, MidiSequence>();
        const midiTracks = state.tracks.filter((t) => t.type === 'midi');
        for (let i = 0; i < midiTracks.length; i++) {
          const t = midiTracks[i];
          const allEvents = t.midiClips.flatMap((c) => c.events);
          if (allEvents.length === 0) continue;
          sequences.set(i + 1, {
            ticksPerQuarterNote: OUR_PPQ,
            trackName: t.name,
            events: allEvents,
          });
        }
        if (sequences.size > 0) {
          const blob = exportMidiFile(sequences, state.bpm);
          downloadMidiBlob(blob, 'prism-session.mid');
        }
        return;
      }

      // Cmd+Shift+U: Analyze (UNISON)
      if (e.code === 'KeyU' && isMod && e.shiftKey) {
        if (practice) return;
        e.preventDefault();
        state.analyzeSession();
        state.setLibraryOpen(true);
        return;
      }

      // Cmd+N: Add new MIDI track (addTrack enforces the limit + notifies)
      if (e.code === 'KeyN' && isMod) {
        if (practice) return;
        e.preventDefault();
        const colors = [
          '#8b5cf6',
          '#06b6d4',
          '#f59e0b',
          '#ef4444',
          '#10b981',
          '#ec4899',
        ];
        const idx = state.tracks.length % colors.length;
        state.addTrack(
          'midi',
          'oracle-synth',
          `Track ${state.tracks.length + 1}`,
          colors[idx],
        );
        return;
      }

      // Cmd+Shift+F: Zoom to fit all content
      if (e.code === 'KeyF' && isMod && e.shiftKey) {
        if (!onTimeline) return;
        e.preventDefault();
        // Estimate viewport width (the timeline canvas container)
        const viewportWidth =
          document.querySelector('.overflow-y-auto.overflow-x-hidden')
            ?.clientWidth ?? 800;
        // Compute project length from tracks
        let maxTick = 1920 * 8; // 8 bars minimum
        for (const track of state.tracks) {
          for (const clip of track.midiClips) {
            const endTick = clip.startTick + midiClipLength(clip);
            maxTick = Math.max(maxTick, endTick);
          }
          for (const clip of track.audioClips) {
            maxTick = Math.max(maxTick, clip.startTick + clip.duration);
          }
        }
        maxTick += 1920 * 4; // 4 bars padding
        state.zoomToFit(viewportWidth, maxTick);
        return;
      }

      // ── Plain keys: a focused control keeps them ───────────────────

      if (isFormControl(target)) return;

      // ── Number keys (1-4): Switch tool ─────────────────────────────

      if (TOOL_KEYS[e.code] && !isMod) {
        if (!onTimeline) return;
        e.preventDefault();
        state.setActiveTool(TOOL_KEYS[e.code]);
        return;
      }

      // ── Arrow keys: Nudge selected clip by one beat ────────────────

      if (
        (e.code === 'ArrowLeft' || e.code === 'ArrowRight') &&
        !isMod &&
        onTimeline &&
        state.selectedClipId &&
        state.selectedClipTrackId
      ) {
        e.preventDefault();
        const clipTrackId = state.selectedClipTrackId;
        if (!clipTrackId) return;
        const track = state.tracks.find((t) => t.id === clipTrackId);
        const midiClip = track?.midiClips.find(
          (c) => c.id === state.selectedClipId,
        );
        if (midiClip) {
          const delta = e.code === 'ArrowRight' ? NUDGE_TICKS : -NUDGE_TICKS;
          const newStart = Math.max(0, midiClip.startTick + delta);
          state.updateMidiClip(clipTrackId, midiClip.id, {
            startTick: newStart,
          });
        } else {
          const audioClip = track?.audioClips.find(
            (c) => c.id === state.selectedClipId,
          );
          if (audioClip) {
            const delta = e.code === 'ArrowRight' ? NUDGE_TICKS : -NUDGE_TICKS;
            const newStart = Math.max(0, audioClip.startTick + delta);
            state.updateAudioClip(clipTrackId, audioClip.id, {
              startTick: newStart,
            });
          }
        }
        return;
      }

      // ── Standard shortcuts ─────────────────────────────────────────

      // A held key toggles once: the repeats are prevented but do nothing.
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          if (!e.repeat) togglePlayback();
          break;

        // The Record button's command: it asks before recording over a take.
        case 'KeyR':
          if (!isMod) {
            e.preventDefault();
            if (!e.repeat) requestRecord();
          }
          break;

        case 'KeyM':
          if (!isMod && !practice) {
            e.preventDefault();
            if (!e.repeat) state.toggleMetronome();
          }
          break;

        case 'KeyL':
          if (!isMod) {
            e.preventDefault();
            if (!e.repeat) state.toggleLoop();
          }
          break;

        // Score and Lead Sheet clear their own selection on Escape; it must
        // not stop the music there too.
        case 'Escape':
          if (view === 'score' || view === 'leadsheet') break;
          state.stop();
          if (onTimeline) state.setSelectedClip(null, null);
          break;

        case 'Delete':
        case 'Backspace': {
          if (!onTimeline) break;
          const { selectedClipId, selectedClipTrackId } = state;
          if (selectedClipId && selectedClipTrackId) {
            e.preventDefault();
            const delTrack = state.tracks.find(
              (t) => t.id === selectedClipTrackId,
            );
            const isMidi = delTrack?.midiClips.some(
              (c) => c.id === selectedClipId,
            );
            if (isMidi) {
              state.removeMidiClip(selectedClipTrackId, selectedClipId);
            } else {
              // The take's audio stays in the AudioBufferStore: undo brings
              // the clip back, and a take that was never uploaded could not
              // play again otherwise (1.10 gives the audio a lifetime).
              state.removeAudioClip(selectedClipTrackId, selectedClipId);
            }
            state.setSelectedClip(null, null);
          }
          break;
        }
      }
    };

    // The views' own keymaps (the Score's, the practice screen's) are window
    // listeners too, added after this one because their views mount later,
    // so they would run after it and their preventDefault would come too
    // late. Moving this listener to the end of the window's list as each key
    // press starts (the capture phase comes before any bubble listener runs)
    // lets it see their claim in e.defaultPrevented.
    const runLast = () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.addEventListener('keydown', handleKeyDown);
    };

    window.addEventListener('keydown', runLast, { capture: true });
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', runLast, { capture: true });
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);
}
