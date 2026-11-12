/* eslint-disable react/jsx-sort-props */
/* eslint-disable tailwindcss/classnames-order */
import { ArrowLeft } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useMidiNoteListener } from '@/hooks/music/useMidiNoteListener';

type MappingStep = 'detect' | 'first-key' | 'last-key' | 'confirm';

interface MidiMappingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deviceName?: string;
  onSave?: (mapping: {
    firstNote: number;
    lastNote: number;
    keyCount: number;
  }) => void;
}

/** Simple piano keyboard SVG for the mapping visualization. */
const PianoVisual = ({
  highlightRange,
  dimOutside,
  activeKeys,
}: {
  highlightRange?: [number, number];
  dimOutside?: boolean;
  activeKeys?: Set<number>;
}) => {
  const startMidi = 36; // C2
  const totalKeys = 61; // 5 octaves (C2–C7)
  const whiteKeys: number[] = [];
  const blackKeyPositions: { x: number; midi: number }[] = [];

  // Build key layout
  const isBlack = (noteInOctave: number) =>
    [1, 3, 6, 8, 10].includes(noteInOctave);
  const whiteKeyWidth = 100 / 36; // 36 white keys in 61 total
  let whiteIndex = 0;

  for (let i = 0; i < totalKeys; i++) {
    const noteInOctave = i % 12;
    if (!isBlack(noteInOctave)) {
      whiteKeys.push(i);
      whiteIndex++;
    } else {
      const x = (whiteIndex - 0.35) * whiteKeyWidth;
      blackKeyPositions.push({ x, midi: i });
    }
  }

  const inRange = (idx: number) => {
    if (!highlightRange) return true;
    return idx >= highlightRange[0] && idx <= highlightRange[1];
  };

  const isActive = (idx: number) => activeKeys?.has(idx + startMidi) ?? false;

  return (
    <svg viewBox="0 0 100 20" className="w-full max-w-3xl mx-auto">
      {/* White keys */}
      {whiteKeys.map((keyIdx, wi) => (
        <rect
          key={`w-${keyIdx}`}
          x={wi * whiteKeyWidth}
          y={0}
          width={whiteKeyWidth - 0.15}
          height={20}
          fill={
            isActive(keyIdx)
              ? '#8e8ea3'
              : dimOutside && !inRange(keyIdx)
                ? '#3a3a3a'
                : '#f5f5f5'
          }
          stroke="#222"
          strokeWidth={0.12}
          rx={0.3}
        />
      ))}
      {/* Black keys */}
      {blackKeyPositions.map(({ x, midi }) => (
        <rect
          key={`b-${midi}`}
          x={x}
          y={0}
          width={whiteKeyWidth * 0.6}
          height={12}
          fill={
            isActive(midi)
              ? '#8e8ea3'
              : dimOutside && !inRange(midi)
                ? '#2a2a2a'
                : '#222'
          }
          stroke="#111"
          strokeWidth={0.08}
          rx={0.2}
        />
      ))}
    </svg>
  );
};

/** Step indicator dots */
const StepDots = ({ current }: { current: number }) => {
  const steps = 4;
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mr-2">
        Setup Your Instrument
      </span>
      {Array.from({ length: steps }).map((_, i) => (
        <div
          key={i}
          className="size-2 rounded-full"
          style={{
            backgroundColor:
              i < current ? '#4aff4a' : i === current ? '#ffffff' : '#555',
          }}
        />
      ))}
    </div>
  );
};

const midiNoteName = (midi: number): string => {
  const names = [
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
  const octave = Math.floor(midi / 12) - 1;
  return `${names[midi % 12]}${octave}`;
};

export const MidiMappingModal = ({
  open,
  onOpenChange,
  deviceName = 'your device',
  onSave,
}: MidiMappingModalProps) => {
  const [step, setStep] = useState<MappingStep>('detect');
  const [firstNote, setFirstNote] = useState<number | null>(null);
  const [lastNote, setLastNote] = useState<number | null>(null);
  const [activeKeys, setActiveKeys] = useState<Set<number>>(new Set());

  // Reset state when modal opens
  useEffect(() => {
    if (open) {
      setStep('detect');
      setFirstNote(null);
      setLastNote(null);
      setActiveKeys(new Set());
    }
  }, [open]);

  // Listen for MIDI input throughout the modal
  const handleMidiNote = useCallback(
    (midi: number) => {
      if (step === 'detect') {
        // Highlight pressed keys on the visual
        setActiveKeys((prev) => new Set(prev).add(midi));
      } else if (step === 'first-key') {
        setFirstNote(midi);
        setStep('last-key');
      } else if (step === 'last-key') {
        setLastNote(midi);
        setStep('confirm');
      }
    },
    [step],
  );

  useMidiNoteListener(open, handleMidiNote);

  const keyCount =
    firstNote !== null && lastNote !== null ? lastNote - firstNote + 1 : 0;

  const handleSave = () => {
    if (firstNote !== null && lastNote !== null) {
      onSave?.({ firstNote, lastNote, keyCount });
    }
    onOpenChange(false);
  };

  const stepIndex =
    step === 'detect'
      ? 0
      : step === 'first-key'
        ? 1
        : step === 'last-key'
          ? 2
          : 3;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-[#2d2d2d] border-white/10 p-0 gap-0 [&>button]:hidden">
        <div className="relative flex min-h-[520px] flex-col items-center justify-between p-8">
          {/* Step: Detect */}
          {step === 'detect' && (
            <>
              <div className="flex w-full items-center justify-between">
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  className="flex items-center gap-2 text-white/80 transition-colors hover:text-white"
                >
                  <div className="flex size-10 items-center justify-center rounded-full border-2 border-white/60">
                    <ArrowLeft className="size-5" />
                  </div>
                  <span className="text-xs font-bold uppercase tracking-wider">
                    Back
                  </span>
                </button>
                <StepDots current={stepIndex} />
              </div>

              <div className="flex-1 flex flex-col items-center justify-center gap-8">
                <div className="text-center">
                  <p className="text-lg">
                    <span className="text-white font-semibold">
                      {deviceName}
                    </span>
                    <span className="text-white"> Connected.</span>
                  </p>
                  <p className="text-white">
                    Play some notes to{' '}
                    <span className="text-white">
                      ensure you can hear audio.
                    </span>
                  </p>
                </div>

                <PianoVisual activeKeys={activeKeys} />

                <div className="text-center text-sm text-muted-foreground">
                  <p>
                    Tip: If the keys you're playing don't match the ones above,
                    you may need to adjust using
                  </p>
                  <p>
                    your keyboard's{' '}
                    <span className="text-white">Octave Up</span> &{' '}
                    <span className="text-white">Octave Down</span> controls.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <button
                  type="button"
                  className="text-sm text-white hover:underline"
                >
                  Need help connecting your controller?
                </button>
                <Button
                  className="bg-white px-10 text-xs font-bold uppercase tracking-wider text-[#101012] hover:bg-white/90"
                  onClick={() => setStep('first-key')}
                >
                  Next
                </Button>
              </div>
            </>
          )}

          {/* Step: First Key */}
          {step === 'first-key' && (
            <>
              <h2 className="text-lg font-semibold text-white mt-8">
                Mapping your device
              </h2>

              <div className="flex-1 flex flex-col items-center justify-center gap-8 w-full">
                <PianoVisual highlightRange={[0, 11]} dimOutside />

                <p className="text-center text-lg">
                  <span className="text-white">Hit the </span>
                  <span className="text-white font-bold">first</span>
                  <span className="text-white"> key on the device</span>
                </p>
              </div>

              <div className="flex gap-4">
                <Button
                  variant="destructive"
                  className="font-bold uppercase text-xs tracking-wider px-10"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  disabled
                  className="font-bold uppercase text-xs tracking-wider px-10 bg-white/10 text-white/40"
                >
                  Save
                </Button>
              </div>
            </>
          )}

          {/* Step: Last Key */}
          {step === 'last-key' && (
            <>
              <h2 className="text-lg font-semibold text-white mt-8">
                Mapping your device
              </h2>

              <div className="flex-1 flex flex-col items-center justify-center gap-8 w-full">
                <PianoVisual highlightRange={[49, 60]} dimOutside />

                <p className="text-center text-lg">
                  <span className="text-white">Awesome. Now hit the </span>
                  <span className="text-white font-bold">last</span>
                  <span className="text-white"> key on the device.</span>
                </p>
              </div>

              <div className="flex gap-4">
                <Button
                  variant="destructive"
                  className="font-bold uppercase text-xs tracking-wider px-10"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  disabled
                  className="font-bold uppercase text-xs tracking-wider px-10 bg-white/10 text-white/40"
                >
                  Save
                </Button>
              </div>
            </>
          )}

          {/* Step: Confirm */}
          {step === 'confirm' && (
            <>
              <h2 className="text-lg font-semibold text-white mt-8">
                Mapping your device
              </h2>

              <div className="flex-1 flex flex-col items-center justify-center gap-8 w-full">
                <PianoVisual />

                {/* Range bracket visual */}
                <svg
                  viewBox="0 0 100 8"
                  className="w-full max-w-3xl mx-auto -mt-4"
                >
                  <path
                    d="M 15 2 Q 50 8 85 2"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="0.4"
                  />
                </svg>

                <div className="text-center text-lg">
                  <p>
                    <span className="text-white">
                      Sweet - looks like your device has{' '}
                    </span>
                    <span className="text-white font-bold">
                      {keyCount} keys
                    </span>
                    <span className="text-white"> right.</span>
                  </p>
                  <p className="text-white">We are good to go!</p>
                  {firstNote !== null && lastNote !== null && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Range: {midiNoteName(firstNote)} —{' '}
                      {midiNoteName(lastNote)}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  variant="destructive"
                  className="font-bold uppercase text-xs tracking-wider px-10"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  className="bg-white px-10 text-xs font-bold uppercase tracking-wider text-[#101012] hover:bg-white/90"
                  onClick={handleSave}
                >
                  Save
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
