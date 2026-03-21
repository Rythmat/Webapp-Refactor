import { useEffect } from 'react';
import { useStore } from '@/daw/store';
import type { ToolType } from '@/daw/store/uiSlice';
import {
  serializeSession,
  deserializeSession,
} from '@/daw/persistence/SessionSerializer';
import {
  saveToLocalStorage,
  loadFromLocalStorage,
} from '@/daw/persistence/SessionStorage';
import { undo, redo } from '@/daw/store/undoMiddleware';
import { deriveChordRegionsFromSession } from '@/daw/store/prismSlice';
import { exportMidiFile, downloadMidiBlob } from '@/daw/midi/MidiFileIO';
import {
  getAudioBuffer,
  setAudioBuffer,
  removeAudioBuffer,
} from '@/daw/audio/AudioBufferStore';
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

// ── useKeyboardShortcuts ────────────────────────────────────────────────
// Global keyboard shortcuts for the DAW.
// Shortcuts are suppressed when focus is inside an <input> or <textarea>
// (except Cmd-prefixed shortcuts which always work).

export function useKeyboardShortcuts() {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const state = useStore.getState();
      const isMod = e.metaKey || e.ctrlKey;

      // ── Cmd shortcuts (always active, even in inputs) ───────────────

      // Cmd+S: Save session to current project slot
      if (e.code === 'KeyS' && isMod) {
        e.preventDefault();
        const session = serializeSession();
        saveToLocalStorage(session, state.projectName);
        return;
      }

      // Cmd+Z: Undo / Cmd+Shift+Z: Redo
      if (e.code === 'KeyZ' && isMod) {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }

      // Cmd+C: Copy selected clip (MIDI or audio)
      if (e.code === 'KeyC' && isMod && !e.shiftKey) {
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
            // Derive chord regions from all clips on target track (skip drums)
            const {
              rootNote,
              mode,
              setChordRegions,
              tracks: allTracks,
            } = useStore.getState();
            {
              const updatedTrack = allTracks.find(
                (t) => t.id === targetTrackId,
              );
              if (updatedTrack && updatedTrack.instrument !== 'drum-machine') {
                const regions = deriveChordRegionsFromSession(
                  allTracks,
                  (rootNote ?? 0) + 48,
                  mode,
                );
                setChordRegions(regions);
              }
            }
          }
        }
        return;
      }

      // Cmd+D: Duplicate selected clip (copy + paste right after, MIDI or audio)
      if (e.code === 'KeyD' && isMod) {
        const { selectedClipId, selectedClipTrackId } = state;
        if (selectedClipId && selectedClipTrackId) {
          e.preventDefault();
          const track = state.tracks.find((t) => t.id === selectedClipTrackId);
          const midiClip = track?.midiClips.find(
            (c) => c.id === selectedClipId,
          );
          if (midiClip) {
            const maxTick = midiClip.events.reduce(
              (max, ev) => Math.max(max, ev.startTick + ev.durationTicks),
              midiClip.startTick,
            );
            const duration = maxTick - midiClip.startTick;
            const newId = `clip-dup-${crypto.randomUUID().slice(0, 8)}`;
            state.addMidiClip(selectedClipTrackId, {
              ...structuredClone(midiClip),
              id: newId,
              startTick: midiClip.startTick + duration,
            });
            state.setSelectedClip(newId, selectedClipTrackId);
            // Derive chord regions from all clips on track (skip drums)
            const {
              rootNote,
              mode,
              setChordRegions,
              tracks: allTracks,
            } = useStore.getState();
            {
              const updatedTrack = allTracks.find(
                (t) => t.id === selectedClipTrackId,
              );
              if (updatedTrack && updatedTrack.instrument !== 'drum-machine') {
                const regions = deriveChordRegionsFromSession(
                  allTracks,
                  (rootNote ?? 0) + 48,
                  mode,
                );
                setChordRegions(regions);
              }
            }
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

      // Cmd+A: Select first clip on current/first track
      if (e.code === 'KeyA' && isMod) {
        e.preventDefault();
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

      // Cmd+E: Export MIDI
      if (e.code === 'KeyE' && isMod) {
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
        e.preventDefault();
        state.analyzeSession();
        state.setLibraryOpen(true);
        return;
      }

      // Cmd+N: Add new MIDI track
      if (e.code === 'KeyN' && isMod) {
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

      // Cmd+=: Zoom in timeline
      if (e.code === 'Equal' && isMod) {
        e.preventDefault();
        state.setTimelineZoom(state.timelineZoom * 1.2);
        return;
      }

      // Cmd+-: Zoom out timeline
      if (e.code === 'Minus' && isMod) {
        e.preventDefault();
        state.setTimelineZoom(state.timelineZoom / 1.2);
        return;
      }

      // Cmd+0: Reset timeline zoom
      if (e.code === 'Digit0' && isMod) {
        e.preventDefault();
        state.setTimelineZoom(1.0);
        return;
      }

      // Cmd+Shift+F: Zoom to fit all content
      if (e.code === 'KeyF' && isMod && e.shiftKey) {
        e.preventDefault();
        // Estimate viewport width (the timeline canvas container)
        const viewportWidth =
          document.querySelector('.overflow-y-auto.overflow-x-hidden')
            ?.clientWidth ?? 800;
        // Compute project length from tracks
        let maxTick = 1920 * 8; // 8 bars minimum
        for (const track of state.tracks) {
          for (const clip of track.midiClips) {
            const endTick = clip.durationTicks
              ? clip.startTick + clip.durationTicks
              : clip.events.reduce(
                  (
                    max: number,
                    ev: { startTick: number; durationTicks: number },
                  ) => Math.max(max, ev.startTick + ev.durationTicks),
                  clip.startTick,
                );
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

      // ── Skip non-Cmd shortcuts when in inputs ──────────────────────

      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // ── Number keys (1-5): Switch tool ─────────────────────────────

      if (TOOL_KEYS[e.code] && !isMod) {
        e.preventDefault();
        state.setActiveTool(TOOL_KEYS[e.code]);
        return;
      }

      // ── Arrow keys: Nudge selected clip by one beat ────────────────

      if (
        (e.code === 'ArrowLeft' || e.code === 'ArrowRight') &&
        !isMod &&
        state.selectedClipId &&
        state.selectedClipTrackId
      ) {
        e.preventDefault();
        const track = state.tracks.find(
          (t) => t.id === state.selectedClipTrackId,
        );
        const midiClip = track?.midiClips.find(
          (c) => c.id === state.selectedClipId,
        );
        if (midiClip) {
          const delta = e.code === 'ArrowRight' ? NUDGE_TICKS : -NUDGE_TICKS;
          const newStart = Math.max(0, midiClip.startTick + delta);
          state.updateMidiClip(state.selectedClipTrackId!, midiClip.id, {
            startTick: newStart,
          });
        } else {
          const audioClip = track?.audioClips.find(
            (c) => c.id === state.selectedClipId,
          );
          if (audioClip) {
            const delta = e.code === 'ArrowRight' ? NUDGE_TICKS : -NUDGE_TICKS;
            const newStart = Math.max(0, audioClip.startTick + delta);
            state.updateAudioClip(state.selectedClipTrackId!, audioClip.id, {
              startTick: newStart,
            });
          }
        }
        return;
      }

      // ── Standard shortcuts ─────────────────────────────────────────

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          if (state.isPlaying) {
            state.pause();
          } else {
            state.play();
          }
          break;

        case 'KeyR':
          if (!isMod) {
            e.preventDefault();
            state.record();
          }
          break;

        case 'KeyM':
          if (!isMod) {
            e.preventDefault();
            state.toggleMetronome();
          }
          break;

        case 'KeyL':
          if (!isMod) {
            e.preventDefault();
            state.toggleLoop();
          }
          break;

        case 'Escape':
          state.stop();
          state.setSelectedClip(null, null);
          break;

        case 'Delete':
        case 'Backspace': {
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
              removeAudioBuffer(selectedClipId);
              state.removeAudioClip(selectedClipTrackId, selectedClipId);
            }
            state.setSelectedClip(null, null);
          }
          break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}

// ── loadSessionOnStartup ────────────────────────────────────────────────
// Call once at app init to restore the last saved session.

export function loadSessionOnStartup(): void {
  const session = loadFromLocalStorage();
  if (session) {
    deserializeSession(session);
  }
}
