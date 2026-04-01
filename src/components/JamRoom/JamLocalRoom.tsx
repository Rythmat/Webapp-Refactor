// ── Jam Local Room ────────────────────────────────────────────────────────
// Offline-only jam room — no WebSocket, no collaboration.
// Lets the user play piano/drums locally with the full UI.

import {
  Drum,
  Music,
  LogOut,
} from 'lucide-react';
import { useCallback, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { GameRoutes } from '@/constants/routes';
import { JamDrumMachine } from './JamDrumMachine';
import { JamSoundPicker } from './JamSoundPicker';
import { NoteWaterfall, type WaterfallHandle } from './NoteWaterfall';
import { PianoKeyboard } from './PianoKeyboard';
import { useJamRoomStore } from './jamRoomStore';
import {
  initJamSynth,
  jamProgramChange,
  getLocalChannel,
  disposeJamSynth,
} from './jamSoundFont';
import {
  JAM_PIANO_START,
  JAM_PIANO_END,
  type DrumSound,
} from './types';
import { useJamKeyboard } from './useJamKeyboard';
import { useJamMidi } from './useJamMidi';

const DRUM_GLOW_INTENSITY: Record<DrumSound, number> = {
  kick: 0.8,
  snare: 0.8,
  rim: 0.45,
  hihat: 0,
};

export function JamLocalRoom() {
  const navigate = useNavigate();
  const localInstrument = useJamRoomStore((s) => s.localInstrument);
  const localGmProgram = useJamRoomStore((s) => s.localGmProgram);
  const setLocalInstrument = useJamRoomStore((s) => s.setLocalInstrument);

  const waterfallRef = useRef<WaterfallHandle>(null);

  // Initialize SoundFont engine
  useEffect(() => {
    initJamSynth().catch((err) =>
      console.warn('[JamLocalRoom] SoundFont init failed:', err),
    );
    return () => {
      disposeJamSynth();
      useJamRoomStore.getState().reset();
    };
  }, []);

  // ── Waterfall feed ──────────────────────────────────────────────────
  const onLocalNote = useCallback(
    (midi: number, action: 'on' | 'off') => {
      if (action === 'on') waterfallRef.current?.noteOn(midi, '#a78bfa');
      else waterfallRef.current?.noteOff(midi);
    },
    [],
  );

  // ── Drum effects on waterfall ───────────────────────────────────────
  const flashTimer = useRef<number>();

  const triggerDrumEffect = useCallback((sound: DrumSound) => {
    if (sound === 'hihat') {
      waterfallRef.current?.spawnParticles();
    } else if (sound === 'snare') {
      waterfallRef.current?.spawnShatter();
    } else {
      clearTimeout(flashTimer.current);
      waterfallRef.current?.setDrumFlash(DRUM_GLOW_INTENSITY[sound]);
      flashTimer.current = window.setTimeout(() => {
        waterfallRef.current?.setDrumFlash(0);
      }, 200);
    }
  }, []);

  const onLocalDrumHit = useCallback(
    (sound: DrumSound) => {
      triggerDrumEffect(sound);
    },
    [triggerDrumEffect],
  );

  const onBpmChange = useCallback((bpm: number) => {
    waterfallRef.current?.setBpm(bpm);
  }, []);

  // Keyboard + MIDI input
  useJamKeyboard(localInstrument, true, onLocalNote);
  useJamMidi(localInstrument, true, onLocalNote);

  const handleLeave = () => {
    navigate(GameRoutes.jamLobby());
  };

  const handleSoundChange = (program: number) => {
    useJamRoomStore.getState().setLocalGmProgram(program);
    jamProgramChange(getLocalChannel(), program);
    if (localInstrument === 'drums') {
      setLocalInstrument('piano');
    }
  };

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ backgroundColor: '#0a0a0c' }}
    >
      {/* Waterfall */}
      <div className="flex-1 relative min-h-0">
        <NoteWaterfall
          ref={waterfallRef}
          startMidi={JAM_PIANO_START}
          endMidi={JAM_PIANO_END}
        />
      </div>

      {/* Piano keyboard */}
      <div style={{ backgroundColor: '#111113' }}>
        <PianoKeyboard
          isLocalInstrument={localInstrument === 'piano'}
          onLocalNote={onLocalNote}
          remotePlayers={[]}
          localPlayer={{
            avatarUrl: '',
            color: '#a78bfa',
            userName: 'You',
          }}
        />
      </div>

      {/* Drum machine */}
      <div
        className="shrink-0 border-t border-zinc-800"
        style={{ backgroundColor: '#0d0d0f' }}
      >
        <JamDrumMachine
          isLocalInstrument={localInstrument === 'drums'}
          onLocalDrumHit={onLocalDrumHit}
          onBpmChange={onBpmChange}
        />
      </div>

      {/* Slim bottom toolbar */}
      <div
        className="flex items-center justify-between px-4 shrink-0"
        style={{
          height: 44,
          backgroundColor: '#111113',
          borderTop: '1px solid #1e1e22',
        }}
      >
        {/* Left: local mode badge */}
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-zinc-800 text-zinc-400 border border-zinc-700">
            Local
          </span>
        </div>

        {/* Center: instrument selector */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setLocalInstrument('piano')}
            className={`flex items-center gap-1 p-1.5 rounded transition-colors ${
              localInstrument === 'piano'
                ? 'text-white bg-zinc-700'
                : 'text-zinc-500 hover:text-white'
            }`}
            title="Melodic mode"
          >
            <Music size={12} />
          </button>

          <JamSoundPicker
            currentProgram={localGmProgram}
            onSelect={handleSoundChange}
          />

          <button
            onClick={() => setLocalInstrument('drums')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded text-[11px] font-medium transition-colors ${
              localInstrument === 'drums'
                ? 'bg-white text-black'
                : 'text-zinc-500 hover:text-white bg-zinc-800/50'
            }`}
          >
            <Drum size={11} />
            Drums
          </button>
        </div>

        {/* Right: leave */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleLeave}
            className="flex items-center gap-1 px-2 py-1 rounded text-[11px] text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <LogOut size={12} />
            Leave
          </button>
        </div>
      </div>
    </div>
  );
}
