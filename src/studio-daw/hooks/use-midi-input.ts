import { useState, useCallback, useRef, useEffect } from 'react';
import type { MidiNote, MidiClipData } from '@/studio-daw/audio/midi-engine';

export interface MidiDeviceInfo {
  id: string;
  name: string;
  manufacturer: string;
  state: 'connected' | 'disconnected';
}

interface ActiveMidiNote {
  note: number;
  velocity: number;
  channel: number;
  startTime: number; // seconds relative to recording start
}

interface UseMidiInputOptions {
  bpm: number;
}

export interface UseMidiInputReturn {
  isMidiSupported: boolean;
  midiDevices: MidiDeviceInfo[];
  selectedMidiDeviceId: string | null;
  setSelectedMidiDeviceId: (id: string | null) => void;
  refreshMidiDevices: () => Promise<void>;
  isMidiRecording: boolean;
  activeNotes: ActiveMidiNote[];
  capturedNotes: MidiNote[];
  startMidiRecording: () => void;
  stopMidiRecording: () => MidiClipData | null;
  cancelMidiRecording: () => void;
  midiError: string | null;
  clearMidiError: () => void;
}

export function useMidiInput(options: UseMidiInputOptions): UseMidiInputReturn {
  const [isMidiSupported, setIsMidiSupported] = useState(false);
  const [midiDevices, setMidiDevices] = useState<MidiDeviceInfo[]>([]);
  const [selectedMidiDeviceId, setSelectedMidiDeviceId] = useState<string | null>(null);
  const [isMidiRecording, setIsMidiRecording] = useState(false);
  const [activeNotes, setActiveNotes] = useState<ActiveMidiNote[]>([]);
  const [capturedNotes, setCapturedNotes] = useState<MidiNote[]>([]);
  const [midiError, setMidiError] = useState<string | null>(null);

  const midiAccessRef = useRef<MIDIAccess | null>(null);
  const recordingStartRef = useRef<number>(0);
  const activeNotesMapRef = useRef<Map<string, ActiveMidiNote>>(new Map());
  const capturedNotesRef = useRef<MidiNote[]>([]);
  const isMidiRecordingRef = useRef(false);
  const currentInputRef = useRef<MIDIInput | null>(null);

  // Enumerate MIDI devices from MIDIAccess
  const enumerateDevices = useCallback((access: MIDIAccess) => {
    const inputs: MidiDeviceInfo[] = [];
    access.inputs.forEach((input) => {
      inputs.push({
        id: input.id,
        name: input.name || `MIDI Input ${input.id.slice(0, 8)}`,
        manufacturer: input.manufacturer || 'Unknown',
        state: input.state as 'connected' | 'disconnected',
      });
    });
    setMidiDevices(inputs);

    // Auto-select first connected device
    const connected = inputs.filter(d => d.state === 'connected');
    if (!selectedMidiDeviceId && connected.length > 0) {
      setSelectedMidiDeviceId(connected[0].id);
    }
  }, [selectedMidiDeviceId]);

  // Initialize Web MIDI API
  useEffect(() => {
    if (!navigator.requestMIDIAccess) {
      setIsMidiSupported(false);
      return;
    }

    setIsMidiSupported(true);

    navigator.requestMIDIAccess({ sysex: false }).then((access) => {
      midiAccessRef.current = access;
      enumerateDevices(access);

      // Listen for hot-plug
      access.onstatechange = () => {
        enumerateDevices(access);
      };
    }).catch((err) => {
      console.warn('[MidiInput] MIDI access denied:', err);
      setMidiError('MIDI access denied. Check browser permissions.');
      setIsMidiSupported(false);
    });
  }, [enumerateDevices]);

  // MIDI message handler
  const handleMidiMessage = useCallback((event: MIDIMessageEvent) => {
    if (!isMidiRecordingRef.current) return;

    const data = event.data;
    if (!data || data.length < 3) return;

    const status = data[0];
    const noteNum = data[1];
    const velocity = data[2];
    const channel = status & 0x0F;
    const command = status & 0xF0;

    const now = performance.now() / 1000;
    const relativeTime = now - recordingStartRef.current;

    if (command === 0x90 && velocity > 0) {
      // Note On
      const key = `${channel}-${noteNum}`;
      const activeNote: ActiveMidiNote = {
        note: noteNum,
        velocity,
        channel,
        startTime: relativeTime,
      };
      activeNotesMapRef.current.set(key, activeNote);
      setActiveNotes(Array.from(activeNotesMapRef.current.values()));
    } else if (command === 0x80 || (command === 0x90 && velocity === 0)) {
      // Note Off
      const key = `${channel}-${noteNum}`;
      const activeNote = activeNotesMapRef.current.get(key);
      if (activeNote) {
        const duration = Math.max(0.01, relativeTime - activeNote.startTime);
        const completedNote: MidiNote = {
          note: noteNum,
          velocity: activeNote.velocity,
          startTime: activeNote.startTime,
          duration,
          channel,
        };
        capturedNotesRef.current.push(completedNote);
        setCapturedNotes([...capturedNotesRef.current]);
        activeNotesMapRef.current.delete(key);
        setActiveNotes(Array.from(activeNotesMapRef.current.values()));
      }
    }
  }, []);

  // Attach/detach MIDI listener when device selection changes
  useEffect(() => {
    const access = midiAccessRef.current;
    if (!access) return;

    // Detach from previous device
    if (currentInputRef.current) {
      currentInputRef.current.onmidimessage = null;
      currentInputRef.current = null;
    }

    if (!selectedMidiDeviceId) return;

    const input = access.inputs.get(selectedMidiDeviceId);
    if (input) {
      input.onmidimessage = handleMidiMessage as any;
      currentInputRef.current = input;
    }

    return () => {
      if (currentInputRef.current) {
        currentInputRef.current.onmidimessage = null;
        currentInputRef.current = null;
      }
    };
  }, [selectedMidiDeviceId, handleMidiMessage]);

  const refreshMidiDevices = useCallback(async () => {
    const access = midiAccessRef.current;
    if (access) {
      enumerateDevices(access);
    }
  }, [enumerateDevices]);

  const startMidiRecording = useCallback(() => {
    recordingStartRef.current = performance.now() / 1000;
    activeNotesMapRef.current.clear();
    capturedNotesRef.current = [];
    setCapturedNotes([]);
    setActiveNotes([]);
    isMidiRecordingRef.current = true;
    setIsMidiRecording(true);
  }, []);

  const stopMidiRecording = useCallback((): MidiClipData | null => {
    isMidiRecordingRef.current = false;
    setIsMidiRecording(false);

    const now = performance.now() / 1000;
    const relativeNow = now - recordingStartRef.current;

    // Force-close any still-held notes
    activeNotesMapRef.current.forEach((activeNote, key) => {
      const duration = Math.max(0.01, relativeNow - activeNote.startTime);
      capturedNotesRef.current.push({
        note: activeNote.note,
        velocity: activeNote.velocity,
        startTime: activeNote.startTime,
        duration,
        channel: activeNote.channel,
      });
    });
    activeNotesMapRef.current.clear();
    setActiveNotes([]);

    const notes = capturedNotesRef.current;
    if (notes.length === 0) return null;

    // Compute total duration from the latest note end
    const totalDuration = Math.max(
      ...notes.map(n => n.startTime + n.duration),
      relativeNow,
    );

    const midiData: MidiClipData = {
      notes,
      program: 0, // caller should set the actual instrument
      bankMSB: 0,
      bankLSB: 0,
      totalDuration: Math.ceil(totalDuration),
    };

    capturedNotesRef.current = [];
    setCapturedNotes([]);

    return midiData;
  }, []);

  const cancelMidiRecording = useCallback(() => {
    isMidiRecordingRef.current = false;
    setIsMidiRecording(false);
    activeNotesMapRef.current.clear();
    capturedNotesRef.current = [];
    setCapturedNotes([]);
    setActiveNotes([]);
  }, []);

  const clearMidiError = useCallback(() => setMidiError(null), []);

  return {
    isMidiSupported,
    midiDevices,
    selectedMidiDeviceId,
    setSelectedMidiDeviceId,
    refreshMidiDevices,
    isMidiRecording,
    activeNotes,
    capturedNotes,
    startMidiRecording,
    stopMidiRecording,
    cancelMidiRecording,
    midiError,
    clearMidiError,
  };
}
