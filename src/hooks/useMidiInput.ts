import { useState, useEffect, useCallback } from 'react';
import { showSuccess, showError } from '@/components/utils/toast';
import {
  trackMidiNoteOn,
  trackMidiNoteOff,
} from '@/telemetry/hooks/useTelemetryAudio';

type UseMidiInputProps = {
  onNoteOn: (note: string, velocity: number) => void;
  onNoteOff: (note: string) => void;
  enabled?: boolean;
};

const midiNumberToNoteName = (midiNumber: number): string => {
  const notes = [
    'C',
    'C#',
    'D',
    'D#',
    'E',
    'F',
    'F#',
    'G',
    'G#',
    'A',
    'A#',
    'B',
  ];
  const octave = Math.floor(midiNumber / 12) - 1;
  const noteIndex = midiNumber % 12;
  return notes[noteIndex] + octave;
};

export const useMidiInput = ({
  onNoteOn,
  onNoteOff,
  enabled = true,
}: UseMidiInputProps) => {
  const [devices, setDevices] = useState<MIDIInput[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    if (!enabled || !navigator.requestMIDIAccess) {
      return;
    }

    let midiAccess: MIDIAccess | null = null;

    const onMIDISuccess = (ma: MIDIAccess) => {
      midiAccess = ma;
      setIsSupported(true);
      const inputs = Array.from(midiAccess.inputs.values());
      setDevices(inputs);

      setSelectedDeviceId((currentId) => {
        if (inputs.length > 0 && !currentId) {
          showSuccess(`MIDI device detected: ${inputs[0].name}`);
          return inputs[0].id;
        }
        return currentId;
      });

      midiAccess.onstatechange = (event: MIDIConnectionEvent) => {
        if (!midiAccess) return;
        const updatedInputs = Array.from(midiAccess.inputs.values());
        setDevices(updatedInputs);
        const port = event.port;
        if (port && port.type === 'input') {
          if (port.state === 'connected') {
            showSuccess(`MIDI device connected: ${port.name}`);
            setSelectedDeviceId((currentId) => currentId || port.id);
          } else if (port.state === 'disconnected') {
            showError(`MIDI device disconnected: ${port.name}`);
            setSelectedDeviceId((currentId) => {
              if (currentId === port.id) {
                return updatedInputs.length > 0 ? updatedInputs[0].id : null;
              }
              return currentId;
            });
          }
        }
      };
    };

    const onMIDIFailure = () => {
      setIsSupported(false);
      console.warn('Could not access your MIDI devices.');
    };

    navigator.requestMIDIAccess().then(onMIDISuccess, onMIDIFailure);

    return () => {
      if (midiAccess) {
        midiAccess.onstatechange = null;
      }
    };
  }, [enabled]);

  const handleMIDIMessage = useCallback(
    (event: MIDIMessageEvent) => {
      if (!event.data) return;
      const [command, noteNumber, velocity] = event.data;
      if (command === 144 && velocity > 0) {
        const noteName = midiNumberToNoteName(noteNumber);
        trackMidiNoteOn(noteName, velocity);
        onNoteOn(noteName, velocity);
      } else if (command === 128 || (command === 144 && velocity === 0)) {
        const noteName = midiNumberToNoteName(noteNumber);
        trackMidiNoteOff(noteName);
        onNoteOff(noteName);
      }
    },
    [onNoteOn, onNoteOff],
  );

  useEffect(() => {
    devices.forEach((device) => {
      device.onmidimessage = null;
    });

    const selectedDevice = devices.find((d) => d.id === selectedDeviceId);
    if (selectedDevice) {
      selectedDevice.onmidimessage = handleMIDIMessage;
    }

    return () => {
      devices.forEach((device) => {
        if (device) device.onmidimessage = null;
      });
    };
  }, [selectedDeviceId, devices, handleMIDIMessage]);

  return { devices, selectedDeviceId, setSelectedDeviceId, isSupported };
};
