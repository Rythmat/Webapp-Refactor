// ── Jam Room ──────────────────────────────────────────────────────────────
// Main component for a live jam session. Inspired by Chrome Music Lab's
// Shared Piano: note waterfall fills the screen, piano at the bottom,
// slim toolbar underneath.

import {
  Copy,
  LogOut,
  Drum,
  WifiOff,
  MessageSquare,
  X,
  Music,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GameRoutes } from '@/constants/routes';
import { useAuthContext } from '@/contexts/AuthContext/hooks/useAuthContext';
import { JamChat } from './JamChat';
import { JamDrumMachine } from './JamDrumMachine';
import { JamRoomProvider, useJamRoom } from './JamRoomProvider';
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
  MIDI_TO_DRUM,
  type DrumSound,
} from './types';
import { useJamAudio } from './useJamAudio';
import { useJamKeyboard } from './useJamKeyboard';
import { useJamMidi } from './useJamMidi';

const DRUM_GLOW_INTENSITY: Record<DrumSound, number> = {
  kick: 0.8,
  snare: 0.8,
  rim: 0.45,
  hihat: 0,
};

// ── Inner component (needs JamRoomProvider context) ─────────────────────

function JamRoomInner() {
  const navigate = useNavigate();
  const { roomId: paramRoomId } = useParams<{ roomId: string }>();
  const {
    isConnected,
    roomId,
    roomCode,
    joinRoomByCode,
    leaveRoom,
    localColor,
    setLocalInstrument,
    remotePlayers,
    onNoteMessage,
    latencyMs,
  } = useJamRoom();
  const { appUser, userId } = useAuthContext();
  const localInstrument = useJamRoomStore((s) => s.localInstrument);
  const localGmProgram = useJamRoomStore((s) => s.localGmProgram);

  const localPlayer = useMemo(
    () => ({
      avatarUrl: appUser?.avatarUrl ?? '',
      color: localColor,
      userName: appUser?.nickname ?? appUser?.fullName ?? 'You',
    }),
    [appUser, localColor],
  );

  const waterfallRef = useRef<WaterfallHandle>(null);
  const [showChat, setShowChat] = useState(false);
  const [copied, setCopied] = useState(false);

  // Initialize SoundFont engine + join room on mount
  useEffect(() => {
    initJamSynth().catch((err) =>
      console.warn('[JamRoom] SoundFont init failed:', err),
    );
    return () => {
      disposeJamSynth();
    };
  }, []);

  useEffect(() => {
    if (paramRoomId && !roomId) {
      joinRoomByCode(paramRoomId);
    }
  }, [paramRoomId, roomId, joinRoomByCode]);

  // Audio engine for remote notes
  useJamAudio();

  // ── Waterfall feed ──────────────────────────────────────────────────

  // Local note callback — feeds both keyboard/mouse/MIDI input to the waterfall
  const onLocalNote = useCallback(
    (midi: number, action: 'on' | 'off') => {
      if (action === 'on') waterfallRef.current?.noteOn(midi, localColor);
      else waterfallRef.current?.noteOff(midi);
    },
    [localColor],
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

  // Local drum hit → waterfall glow or particles
  const onLocalDrumHit = useCallback(
    (sound: DrumSound) => {
      triggerDrumEffect(sound);
    },
    [triggerDrumEffect],
  );

  // Sync waterfall gradient speed to sequencer BPM
  const onBpmChange = useCallback((bpm: number) => {
    waterfallRef.current?.setBpm(bpm);
  }, []);

  // Remote notes → waterfall + drum effects
  useEffect(() => {
    return onNoteMessage((msg) => {
      if (msg.instrument === 'drums') {
        // Skip local user's echoed drum messages (already handled by onLocalDrumHit)
        if (msg.userId === userId) return;
        if (msg.action === 'on') {
          const sound = MIDI_TO_DRUM[msg.midi];
          if (sound) triggerDrumEffect(sound);
        }
        return;
      }
      if (msg.instrument !== 'piano') return;
      if (msg.action === 'on')
        waterfallRef.current?.noteOn(msg.midi, msg.color);
      else waterfallRef.current?.noteOff(msg.midi);
    });
  }, [onNoteMessage, triggerDrumEffect, userId]);

  // Keyboard + MIDI input (pass onLocalNote for waterfall)
  useJamKeyboard(localInstrument, isConnected, onLocalNote);
  useJamMidi(localInstrument, isConnected, onLocalNote);

  // ── Actions ─────────────────────────────────────────────────────────

  const handleLeave = () => {
    leaveRoom();
    navigate(GameRoutes.jamLobby());
  };

  const shareCode = roomCode ?? paramRoomId ?? '';

  const copyRoomCode = () => {
    if (shareCode) {
      navigator.clipboard.writeText(shareCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  };

  const handleSoundChange = (program: number) => {
    useJamRoomStore.getState().setLocalGmProgram(program);
    jamProgramChange(getLocalChannel(), program);
    // Switch to melodic mode when selecting a sound
    if (localInstrument === 'drums') {
      setLocalInstrument('piano');
    }
  };

  // ── Render ──────────────────────────────────────────────────────────

  return (
    <div
      className="flex flex-col h-full overflow-hidden"
      style={{ backgroundColor: '#0a0a0c' }}
    >
      {/* Waterfall — fills all remaining space */}
      <div className="flex-1 relative min-h-0">
        <NoteWaterfall
          ref={waterfallRef}
          startMidi={JAM_PIANO_START}
          endMidi={JAM_PIANO_END}
        />

        {/* Chat drawer (right side, toggled) */}
        {showChat && (
          <div
            className="absolute top-0 right-0 bottom-0 w-72 z-10 border-l border-zinc-800"
            style={{
              backgroundColor: '#0f0f11ee',
              backdropFilter: 'blur(12px)',
            }}
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider font-medium">
                Chat
              </span>
              <button
                onClick={() => setShowChat(false)}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                <X size={14} />
              </button>
            </div>
            <div className="h-[calc(100%-36px)]">
              <JamChat />
            </div>
          </div>
        )}
      </div>

      {/* Piano keyboard — full width */}
      <div style={{ backgroundColor: '#111113' }}>
        <PianoKeyboard
          isLocalInstrument={localInstrument === 'piano'}
          onLocalNote={onLocalNote}
          remotePlayers={remotePlayers}
          localPlayer={localPlayer}
        />
      </div>

      {/* Drum machine — always visible below piano */}
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
        {/* Left: status + room code */}
        <div className="flex items-center gap-3">
          {/* Connection badge — pill style */}
          {isConnected ? (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-emerald-900/50 text-emerald-400 border border-emerald-800">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live
            </span>
          ) : (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-red-900/50 text-red-400 border border-red-800">
              <WifiOff size={10} />
              Offline
            </span>
          )}

          {/* Player avatar row */}
          <div className="flex items-center -space-x-1">
            {/* Local player */}
            <div
              className="w-5 h-5 rounded-full border-2 overflow-hidden flex items-center justify-center shrink-0"
              style={{ borderColor: localColor, backgroundColor: '#222' }}
              title={localPlayer.userName}
            >
              {localPlayer.avatarUrl ? (
                <img
                  src={localPlayer.avatarUrl}
                  alt=""
                  className="w-full h-full object-cover"
                />
              ) : (
                <span
                  className="text-[8px] font-bold"
                  style={{ color: localColor }}
                >
                  {localPlayer.userName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            {/* Remote players */}
            {remotePlayers.map((p) => (
              <div
                key={p.userId}
                className="w-5 h-5 rounded-full border-2 overflow-hidden flex items-center justify-center shrink-0"
                style={{ borderColor: p.color, backgroundColor: '#222' }}
                title={p.userName}
              >
                {p.avatarUrl ? (
                  <img
                    src={p.avatarUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span
                    className="text-[8px] font-bold"
                    style={{ color: p.color }}
                  >
                    {p.userName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* Latency */}
          {latencyMs > 0 && (
            <span className="text-[10px] text-zinc-600 font-mono">
              {latencyMs}ms
            </span>
          )}

          {/* Room code + copy */}
          <button
            onClick={copyRoomCode}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] text-zinc-500 hover:text-zinc-300 bg-zinc-800/50 hover:bg-zinc-800 transition-colors font-mono"
          >
            <Copy size={8} />
            {copied ? 'Copied!' : shareCode}
          </button>
        </div>

        {/* Center: instrument selector */}
        <div className="flex items-center gap-1.5">
          {/* Sound picker (melodic instruments) */}
          <button
            onClick={() => {
              setLocalInstrument('piano');
            }}
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
            onClick={() => {
              setLocalInstrument('drums');
            }}
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

        {/* Right: toggles + leave */}
        <div className="flex items-center gap-2">
          {/* Chat toggle */}
          <button
            onClick={() => setShowChat((v) => !v)}
            className={`p-1.5 rounded transition-colors ${
              showChat
                ? 'text-white bg-zinc-700'
                : 'text-zinc-500 hover:text-white'
            }`}
            title="Toggle chat"
          >
            <MessageSquare size={14} />
          </button>

          {/* Leave */}
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

// ── Wrapper with Provider ──────────────────────────────────────────────

export default function JamRoom() {
  return (
    <JamRoomProvider>
      <JamRoomInner />
    </JamRoomProvider>
  );
}
