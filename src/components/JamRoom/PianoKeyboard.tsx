// ── Piano Keyboard ────────────────────────────────────────────────────────
// Full-width interactive piano for the Jam Room.
// Keys light up in each player's color on note-on.

import { useCallback, useMemo, useRef, useState } from 'react';
import { useJamRoom } from './JamRoomProvider';
import { useJamRoomStore, type ActiveNote } from './jamRoomStore';
import { jamNoteOn, jamNoteOff, getLocalChannel } from './jamSoundFont';
import { JAM_PIANO_START, JAM_PIANO_END, type JamPresence } from './types';

// ── Key layout helpers ──────────────────────────────────────────────────

const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

interface KeyInfo {
  midi: number;
  isBlack: boolean;
  name: string;
}

function buildKeys(start: number, end: number): KeyInfo[] {
  const keys: KeyInfo[] = [];
  for (let midi = start; midi <= end; midi++) {
    const note = NOTE_NAMES[midi % 12];
    const octave = Math.floor(midi / 12) - 1;
    keys.push({
      midi,
      isBlack: note.includes('#'),
      name: `${note}${octave}`,
    });
  }
  return keys;
}

const ALL_KEYS = buildKeys(JAM_PIANO_START, JAM_PIANO_END);
const WHITE_KEYS = ALL_KEYS.filter((k) => !k.isBlack);
const BLACK_KEYS = ALL_KEYS.filter((k) => k.isBlack);

function getBlackKeyPosition(blackMidi: number): number {
  // Count white keys from start up to (but not including) the black key,
  // then subtract 1 to get the index of the white key to its LEFT.
  // C# sits to the right of C (index 0), not D (index 1).
  let whiteIndex = 0;
  for (let m = JAM_PIANO_START; m < blackMidi; m++) {
    if (!NOTE_NAMES[m % 12].includes('#')) whiteIndex++;
  }
  return whiteIndex - 1;
}

function whiteKeysBefore(midi: number, start: number): number {
  let count = 0;
  for (let m = start; m < midi; m++) {
    if (!NOTE_NAMES[m % 12].includes('#')) count++;
  }
  return count;
}

function getActiveColor(midi: number, remoteNotes: Map<string, ActiveNote[]>): string | null {
  for (const [, notes] of remoteNotes) {
    for (const note of notes) {
      if (note.midi === midi && note.instrument === 'piano') return note.color;
    }
  }
  return null;
}

// ── Component ───────────────────────────────────────────────────────────

interface PlayerAvatarInfo {
  avatarUrl: string;
  color: string;
  userName: string;
}

interface PianoKeyboardProps {
  isLocalInstrument: boolean;
  /** Called when local player triggers a note (for waterfall visualization). */
  onLocalNote?: (midi: number, action: 'on' | 'off') => void;
  /** Remote players for avatar display below keys. */
  remotePlayers?: JamPresence[];
  /** Local player info for avatar display. */
  localPlayer?: PlayerAvatarInfo;
}

export function PianoKeyboard({ isLocalInstrument, onLocalNote, remotePlayers, localPlayer }: PianoKeyboardProps) {
  const { sendNote } = useJamRoom();
  const activeRemoteNotes = useJamRoomStore((s) => s.activeRemoteNotes);
  const heldRef = useRef<Set<number>>(new Set());
  const [, setRenderTick] = useState(0);

  const handleNoteOn = useCallback(
    (midi: number) => {
      if (!isLocalInstrument || heldRef.current.has(midi)) return;
      heldRef.current.add(midi);
      setRenderTick((t) => t + 1);
      jamNoteOn(getLocalChannel(), midi, 100);
      const gmProgram = useJamRoomStore.getState().localGmProgram;
      sendNote({
        type: 'jam:note',
        action: 'on',
        instrument: 'piano',
        midi,
        velocity: 100,
        gmProgram,
      });
      onLocalNote?.(midi, 'on');
    },
    [isLocalInstrument, sendNote, onLocalNote],
  );

  const handleNoteOff = useCallback(
    (midi: number) => {
      if (!isLocalInstrument || !heldRef.current.has(midi)) return;
      heldRef.current.delete(midi);
      setRenderTick((t) => t + 1);
      jamNoteOff(getLocalChannel(), midi);
      sendNote({
        type: 'jam:note',
        action: 'off',
        instrument: 'piano',
        midi,
        velocity: 0,
      });
      onLocalNote?.(midi, 'off');
    },
    [isLocalInstrument, sendNote, onLocalNote],
  );

  const whiteKeyWidth = 100 / WHITE_KEYS.length;

  // Build avatar positions: one avatar per player at their lowest active piano note
  const avatarPositions = useMemo(() => {
    const positions: { midi: number; avatarUrl: string; color: string; userName: string }[] = [];

    // Remote players
    if (remotePlayers) {
      for (const [userId, notes] of activeRemoteNotes) {
        const pianoNotes = notes.filter((n) => n.instrument === 'piano');
        if (pianoNotes.length === 0) continue;
        const lowestMidi = Math.min(...pianoNotes.map((n) => n.midi));
        const player = remotePlayers.find((p) => p.userId === userId);
        if (player) {
          positions.push({
            midi: lowestMidi,
            avatarUrl: player.avatarUrl,
            color: player.color,
            userName: player.userName,
          });
        }
      }
    }

    // Local player
    if (localPlayer && heldRef.current.size > 0) {
      const lowestLocal = Math.min(...heldRef.current);
      positions.push({
        midi: lowestLocal,
        avatarUrl: localPlayer.avatarUrl,
        color: localPlayer.color,
        userName: localPlayer.userName,
      });
    }

    return positions;
  }, [activeRemoteNotes, remotePlayers, localPlayer]);

  return (
    <div
      className="relative select-none"
      style={{ height: 120 }}
      onMouseLeave={() => {
        heldRef.current.forEach((midi) => handleNoteOff(midi));
      }}
    >
      {/* White keys */}
      <div className="flex h-full">
        {WHITE_KEYS.map((key) => {
          const activeColor = getActiveColor(key.midi, activeRemoteNotes);
          const isHeld = heldRef.current.has(key.midi);
          const active = !!(isHeld || activeColor);
          const isC = key.name.startsWith('C');

          return (
            <div
              key={key.midi}
              className="relative border-r transition-colors"
              style={{
                width: `${whiteKeyWidth}%`,
                backgroundColor: active ? '#d4d4d4' : '#ffffff',
                borderColor: '#d4d4d4',
                borderBottom: active ? '3px solid #b0b0b0' : '3px solid #d4d4d4',
                boxShadow: active ? '0 0 12px #b0b0b020 inset' : 'none',
                cursor: isLocalInstrument ? 'pointer' : 'default',
                borderRadius: '0 0 4px 4px',
              }}
              onMouseDown={() => handleNoteOn(key.midi)}
              onMouseUp={() => handleNoteOff(key.midi)}
              onMouseEnter={(e) => {
                if (e.buttons === 1) handleNoteOn(key.midi);
              }}
            >
              {/* Show note name only on C keys */}
              {isC && (
                <div
                  className="absolute bottom-1 left-1/2 -translate-x-1/2 text-[8px] font-mono"
                  style={{ color: '#9ca3af' }}
                >
                  {key.name}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Black keys */}
      {BLACK_KEYS.map((key) => {
        const whiteIdx = getBlackKeyPosition(key.midi);
        const leftPercent = (whiteIdx + 0.65) * whiteKeyWidth;
        const activeColor = getActiveColor(key.midi, activeRemoteNotes);
        const isHeld = heldRef.current.has(key.midi);
        const active = !!(isHeld || activeColor);

        return (
          <div
            key={key.midi}
            className="absolute top-0 transition-colors"
            style={{
              left: `${leftPercent}%`,
              width: `${whiteKeyWidth * 0.6}%`,
              height: '58%',
              backgroundColor: active ? '#b0b0b0' : '#1a1a1a',
              border: '1px solid #d4d4d4',
              borderRadius: '0 0 3px 3px',
              boxShadow: active ? '0 0 10px #b0b0b030' : 'none',
              cursor: isLocalInstrument ? 'pointer' : 'default',
              zIndex: 1,
            }}
            onMouseDown={() => handleNoteOn(key.midi)}
            onMouseUp={() => handleNoteOff(key.midi)}
            onMouseEnter={(e) => {
              if (e.buttons === 1) handleNoteOn(key.midi);
            }}
          />
        );
      })}

      {/* Player avatar circles below active keys */}
      {avatarPositions.map((avatar) => {
        if (avatar.midi < JAM_PIANO_START || avatar.midi > JAM_PIANO_END) return null;
        const black = avatar.midi % 12 === 1 || avatar.midi % 12 === 3 || avatar.midi % 12 === 6 || avatar.midi % 12 === 8 || avatar.midi % 12 === 10;
        const wkIdx = whiteKeysBefore(avatar.midi, JAM_PIANO_START);
        let leftPercent: number;
        if (!black) {
          leftPercent = (wkIdx + 0.5) * whiteKeyWidth;
        } else {
          leftPercent = (wkIdx - 1 + 0.65 + 0.3) * whiteKeyWidth;
        }

        return (
          <div
            key={`avatar-${avatar.userName}-${avatar.midi}`}
            className="absolute z-10 flex items-center justify-center"
            style={{
              left: `${leftPercent}%`,
              bottom: 4,
              transform: 'translateX(-50%)',
              width: 26,
              height: 26,
              borderRadius: '50%',
              border: '2px solid #b0b0b0',
              backgroundColor: '#ffffff',
              boxShadow: '0 1px 4px rgba(0,0,0,0.3)',
              overflow: 'hidden',
            }}
          >
            {avatar.avatarUrl ? (
              <img
                src={avatar.avatarUrl}
                alt={avatar.userName}
                className="w-full h-full object-cover"
              />
            ) : (
              <span
                className="text-[10px] font-bold"
                style={{ color: '#b0b0b0' }}
              >
                {avatar.userName.charAt(0).toUpperCase()}
              </span>
            )}
          </div>
        );
      })}

    </div>
  );
}
