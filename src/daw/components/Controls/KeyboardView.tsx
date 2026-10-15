import { useState, useCallback, useMemo } from 'react';
import { Search } from 'lucide-react';
import { useStore } from '@/daw/store';
import { trackEngineRegistry } from '@/daw/hooks/usePlaybackEngine';
import { studioRealtime } from '@/daw/collab/studioRealtime';
import { SoundFontAdapter } from '@/daw/instruments/SoundFontAdapter';
import { PianoKeyboard } from '@/daw/oracle-synth/components/keyboard/PianoKeyboard';
import { auditionNote } from '@/daw/audio/auditionNote';
import { resolveEditorClip } from '@/daw/model/editorClip';
import { ClipPianoRoll } from '../PianoRoll/ClipPianoRoll';
import { PresetBrowser } from './PresetBrowser';
import { PRESETS } from '@/daw/data/instrumentPresets';
import type { Track } from '@/daw/store/tracksSlice';

/** The preset name to show: the saved one while it still matches the track's
 *  instrument, else the first preset for that instrument. A name the catalog
 *  no longer lists (a preset that only relabelled the track) falls back too,
 *  so the label always names what the track plays. */
function displayPresetName(track: Track | undefined): string {
  if (!track) return 'Studio Grand';
  const saved = PRESETS.find((p) => p.name === track.presetName);
  if (saved && saved.instrumentType === track.instrument) return saved.name;
  if (track.instrument === 'piano-sampler') return 'Studio Grand';
  return (
    PRESETS.find((p) => p.instrumentType === track.instrument)?.name ??
    'Studio Grand'
  );
}
import { useLiveChordColor } from '@/daw/hooks/useLiveChordColor';

// ── KeyboardView ────────────────────────────────────────────────────────

type ViewMode = 'keyboard' | 'pianoroll';

export function KeyboardView({ trackId }: { trackId: string }) {
  const [activeNotes, setActiveNotes] = useState<Set<number>>(new Set());
  const hwActiveNotes = useStore((s) => s.hwActiveNotes);
  const mergedNotes = useMemo(
    () => new Set([...activeNotes, ...hwActiveNotes]),
    [activeNotes, hwActiveNotes],
  );
  const activeColor = useLiveChordColor(mergedNotes);
  const [browserOpen, setBrowserOpen] = useState(false);
  const [mode, setMode] = useState<ViewMode>('keyboard');

  // Piano roll data: the clip every note editor on this track edits
  // (editorClip.ts), not always the first one.
  const track = useStore((s) => s.tracks.find((t) => t.id === trackId));
  const clipId = useStore((s) => resolveEditorClip(s, trackId)?.id ?? null);
  const updateTrack = useStore((s) => s.updateTrack);
  const presetName = displayPresetName(track);

  const handleAuditionNote = useCallback(
    (note: number, velocity: number) => auditionNote(trackId, note, velocity),
    [trackId],
  );

  const handleNoteOn = useCallback(
    (note: number, velocity: number = 0.8) => {
      const state = trackEngineRegistry.get(trackId);
      const vel = Math.round(velocity * 127);
      if (state) state.trackEngine.noteOn(note, vel);
      setActiveNotes((prev) => new Set(prev).add(note));
      // Relay to collaborators monitoring this user's live playing.
      if (studioRealtime.shouldBroadcast()) {
        studioRealtime.send({
          type: 'studio:note',
          action: 'on',
          note,
          velocity: vel,
          trackId,
        });
      }
    },
    [trackId],
  );

  const handleNoteOff = useCallback(
    (note: number) => {
      const state = trackEngineRegistry.get(trackId);
      if (state) state.trackEngine.noteOff(note);
      setActiveNotes((prev) => {
        const next = new Set(prev);
        next.delete(note);
        return next;
      });
      if (studioRealtime.shouldBroadcast()) {
        studioRealtime.send({
          type: 'studio:note',
          action: 'off',
          note,
          velocity: 0,
          trackId,
        });
      }
    },
    [trackId],
  );

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* Top bar */}
      <div
        className="flex shrink-0 items-center gap-4 border-b px-4 py-2"
        style={{ borderColor: 'var(--color-border)' }}
      >
        <span
          className="text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: 'var(--color-text-dim)' }}
        >
          Instrument
        </span>

        {/* Current preset. Browse is the way to change it: the arrows that
            sat either side of the name had no handler. */}
        <div
          className="flex items-center gap-1 rounded-lg px-3 py-1"
          style={{
            backgroundColor: 'var(--color-surface-2)',
            border: '1px solid var(--color-border)',
          }}
        >
          <span
            className="min-w-[100px] text-center text-xs font-medium"
            style={{ color: 'var(--color-text)' }}
          >
            {presetName}
          </span>
        </div>

        {/* Browse button */}
        <button
          onClick={() => setBrowserOpen((o) => !o)}
          className="flex cursor-pointer items-center gap-1 rounded-lg px-3 py-1.5 text-[10px] font-medium transition-colors"
          style={{
            backgroundColor: browserOpen
              ? 'var(--color-accent)'
              : 'var(--color-surface-2)',
            color: browserOpen ? '#fff' : 'var(--color-text-dim)',
            border: '1px solid var(--color-border)',
          }}
        >
          <Search size={12} />
          Browse
        </button>

        <div className="flex-1" />

        {/* Mode toggle */}
        <span
          className="text-[10px] font-semibold uppercase tracking-wider"
          style={{ color: 'var(--color-text-dim)' }}
        >
          Mode
        </span>
        <div
          className="flex overflow-hidden rounded-lg"
          style={{ border: '1px solid var(--color-border)' }}
        >
          <button
            onClick={() => setMode('keyboard')}
            className="cursor-pointer px-3 py-1 text-[10px] font-medium"
            style={{
              backgroundColor:
                mode === 'keyboard'
                  ? 'var(--color-accent)'
                  : 'var(--color-surface-2)',
              color: mode === 'keyboard' ? '#fff' : 'var(--color-text-dim)',
              border: 'none',
            }}
          >
            Keyboard
          </button>
          <button
            onClick={() => setMode('pianoroll')}
            className="cursor-pointer px-3 py-1 text-[10px] font-medium"
            style={{
              backgroundColor:
                mode === 'pianoroll'
                  ? 'var(--color-accent)'
                  : 'var(--color-surface-2)',
              color: mode === 'pianoroll' ? '#fff' : 'var(--color-text-dim)',
              border: 'none',
            }}
          >
            Piano Roll
          </button>
        </div>
      </div>

      {/* Main area */}
      {mode === 'keyboard' ? (
        <div className="relative overflow-hidden" style={{ height: 140 }}>
          <div style={{ position: 'absolute', inset: 0 }}>
            <PianoKeyboard
              startNote={36}
              endNote={96}
              activeNotes={mergedNotes}
              activeColor={activeColor ?? undefined}
              onNoteOn={handleNoteOn}
              onNoteOff={handleNoteOff}
            />
          </div>

          {/* Preset Browser Overlay */}
          {browserOpen && (
            <div className="absolute inset-0 z-20">
              <PresetBrowser
                onSelect={(preset) => {
                  // Saved on the track so the name (and sound) reload.
                  updateTrack(trackId, {
                    presetName: preset.name,
                    instrument: preset.instrumentType,
                    ...(preset.gmProgram !== undefined && {
                      gmProgram: preset.gmProgram,
                    }),
                  });
                  // If already a SoundFont track, live-switch the program
                  if (preset.gmProgram !== undefined) {
                    const state = trackEngineRegistry.get(trackId);
                    if (state?.instrument instanceof SoundFontAdapter) {
                      state.instrument.setProgram(preset.gmProgram);
                    }
                  }
                  setBrowserOpen(false);
                }}
                onClose={() => setBrowserOpen(false)}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 overflow-hidden">
          {clipId && track ? (
            <ClipPianoRoll
              trackId={trackId}
              clipId={clipId}
              onAuditionNote={handleAuditionNote}
            />
          ) : (
            <div
              className="flex h-full items-center justify-center text-xs"
              style={{ color: 'var(--color-text-dim)' }}
            >
              No MIDI clips on this track
            </div>
          )}
        </div>
      )}
    </div>
  );
}
