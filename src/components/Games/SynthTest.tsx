import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMidiInput, type MidiNoteEvent } from "@/hooks/music/useMidiInput";
import { useSynth } from "@/hooks/useSynth";
import * as Tone from "tone";
import { PianoKeyboard } from "@/components/PianoKeyboard";
import type { PlaybackEvent } from "@/contexts/PlaybackContext/helpers";

export const SynthTest = () => {
  const [keyboardPlayingNotes, setKeyboardPlayingNotes] = useState<PlaybackEvent[]>([]);
  const getSynth = useSynth();
  const hasStartedAudioContextRef = useRef(false);

  const startToneContext = useCallback(async () => {
    if (hasStartedAudioContextRef.current) {
      return;
    }
    if (Tone.getContext().state === "running") {
      hasStartedAudioContextRef.current = true;
      return;
    }
    try {
      await Tone.start();
      hasStartedAudioContextRef.current = true;
    } catch (error) {
      console.warn("Failed to start Tone.js audio context", error);
    }
  }, []);

   const handleKeyboardNoteOn = useCallback(
      (midi: number) => {
        let color = "#60a5fa";
        const id = `keyboard-${midi}`;
        setKeyboardPlayingNotes((prev) => [
          ...prev.filter((event) => event.midi !== midi),
          {
            id,
            type: "note",
            midi,
            time: Date.now(),
            duration: Number.POSITIVE_INFINITY,
            velocity: 1,
            color,
          },
        ]);
      },
      [],
    );
  
    const handleKeyboardNoteOff = useCallback((midi: number) => {
      setKeyboardPlayingNotes((prev) =>
        prev.filter((event) => event.midi !== midi),
      );
    }, []);


    const handleMidiNoteOff = useCallback(
      (event: MidiNoteEvent) => {
        const midi = event.number;
        const synth = getSynth();
        const name = Tone.Frequency(midi, "midi").toNote();
        synth.triggerRelease(name, Tone.now());
        console.log("Note Off call on ", midi)
        handleKeyboardNoteOff(midi);
      },
      [handleKeyboardNoteOff]
    );
  
  
    const handleMidiNoteOn = useCallback(
      (event: MidiNoteEvent) => {
        const midi = event.number;
        const synth = getSynth();
        const name = Tone.Frequency(midi, "midi").toNote();
        synth.triggerAttack(name, Tone.now());
        console.log("Note On call on ", midi)
        handleKeyboardNoteOn(midi);
      },
      [handleKeyboardNoteOn]
    );



    const { startListening, stopListening} = useMidiInput(undefined, {
      onNoteOn: (e) => {
        console.log("[MIDI] NOTE ON", e.number, "vel", e.velocity);
        handleMidiNoteOn(e);
      },
      onNoteOff: (e) => {
        console.log("[MIDI] NOTE OFF", e.number, "vel", e.velocity);
        handleMidiNoteOff(e);
      } 
    });

    useEffect(() => {
      // if(isListening){
      //   return;
      // }
      console.log("Beginning to Listen....");
      const stop = startListening();
      return () => {
        stop?.();
        stopListening();
        console.log("Listening stopped!");
      };
    }, []);

    useMemo(async () => {
      if(!hasStartedAudioContextRef.current){
        await startToneContext();
        hasStartedAudioContextRef.current = true;
      }
    },[startToneContext]);

   return (
    <div className="flex flex-col gap-4">

      <div className="rounded-xl border border-neutral-800 bg-neutral-950/80 p-4">
        <PianoKeyboard
          className="mx-auto"
          startC={2}
          endC={6}
          playingNotes={keyboardPlayingNotes}
          activeWhiteKeyColor="#60a5fa"
          activeBlackKeyColor="#3b82f6"
          showOctaveStart
        />
      </div>
    </div>
  );
}