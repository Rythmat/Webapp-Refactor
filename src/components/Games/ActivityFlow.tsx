import { useEffect, useMemo, useState } from "react";
// import { useQueries } from "@tanstack/react-query";
import * as Tone from "tone";
// import { useMusicAtlas } from "@/contexts/MusicAtlasContext";
import { usePrismStartContours } from "@/hooks/data/prism/usePrismStartContours";
import { NoteHold } from "./NoteHold";
import { PlayAlong } from "./PlayAlong";
import { BoardChoiceGame } from "./BoardChoiceGame";
import { ChordPressGame } from "./ChordPressGame";
import type { NoteEvent } from "./PianoRollPlay";
import {  PrismModeChordDataMap,  PrismModeSlug, usePrismModeChordsData } from "@/hooks/data";
import { usePrismRhythms } from "@/hooks/data/prism/usePrismRhythms";

type FlowActivityProps = {
  events?: NoteEvent[];
  onContinue?: () => void;
  startMessage?: string;
};

type ActivityFlowProps = {
  scaleMidis?: number[];
  onComplete?: () => void;
  labelChange?: (newLabel: string[]) => void;
  rootKey: string;
  rootMidi: number;
  mode?: PrismModeSlug;
};

const DEFAULT_SCALE: number[] = [60, 62, 64, 65, 67, 69, 71, 72];
const NOTE_DURATION_TICKS = 480;

type ActivityDefinition = {
  key: string;
  label: string;
  Component: (props: FlowActivityProps) => JSX.Element;
  events: NoteEvent[];
  direction: string;
};

const ChordLoadingStep: (props: FlowActivityProps) => JSX.Element = ({
  startMessage,
}) => (
  <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-6 text-center">
    <div className="text-sm text-neutral-300">
      {startMessage ?? "Loading chord exercises..."}
    </div>
  </div>
);

const midiSequenceToEvents = (sequence: number[],prefix: string): NoteEvent[] =>{
  return sequence.map((midi, idx) => ({
    id: `${prefix}-${idx}-${midi}`,
    pitchName: Tone.Frequency(midi, "midi").toNote(),
    startTicks: idx * NOTE_DURATION_TICKS,
    durationTicks: NOTE_DURATION_TICKS,
  }));
}

const midiSequenceToHalfNotes = (sequence: number[],prefix: string): NoteEvent[] =>{
  return sequence.flatMap((midi, idx) => ([{
    id: `${prefix}-${idx}-${midi}`,
    pitchName: Tone.Frequency(midi, "midi").toNote(),
    startTicks: idx * NOTE_DURATION_TICKS,
    durationTicks: NOTE_DURATION_TICKS*0.5,
  },{
    id: `${prefix}-${idx}-${midi}`,
    pitchName: Tone.Frequency(midi, "midi").toNote(),
    startTicks: (idx+0.5) * NOTE_DURATION_TICKS,
    durationTicks: NOTE_DURATION_TICKS*0.5,
  }
  ]));
}

const midiSequenceToQuarterNotes
 = (sequence: number[],prefix: string): NoteEvent[] =>{
  return sequence.flatMap((midi, idx) => ([{
    id: `${prefix}-${idx}-${midi}`,
    pitchName: Tone.Frequency(midi, "midi").toNote(),
    startTicks: idx * NOTE_DURATION_TICKS,
    durationTicks: NOTE_DURATION_TICKS*0.25,
  },{
    id: `${prefix}-${idx}-${midi}`,
    pitchName: Tone.Frequency(midi, "midi").toNote(),
    startTicks: (idx+0.25) * NOTE_DURATION_TICKS,
    durationTicks: NOTE_DURATION_TICKS*0.25,
  },{
    id: `${prefix}-${idx}-${midi}`,
    pitchName: Tone.Frequency(midi, "midi").toNote(),
    startTicks: (idx+0.5) * NOTE_DURATION_TICKS,
    durationTicks: NOTE_DURATION_TICKS*0.25,
  },{
    id: `${prefix}-${idx}-${midi}`,
    pitchName: Tone.Frequency(midi, "midi").toNote(),
    startTicks: (idx+0.75) * NOTE_DURATION_TICKS,
    durationTicks: NOTE_DURATION_TICKS*0.25,
  }
  ]));
}

const midiSequenceToEighthNotes
 = (sequence: number[],prefix: string): NoteEvent[] =>{
  return sequence.flatMap((midi, idx) => ([{
    id: `${prefix}-${idx}-${midi}`,
    pitchName: Tone.Frequency(midi, "midi").toNote(),
    startTicks: idx * NOTE_DURATION_TICKS,
    durationTicks: NOTE_DURATION_TICKS*0.125,
  },{
    id: `${prefix}-${idx}-${midi}`,
    pitchName: Tone.Frequency(midi, "midi").toNote(),
    startTicks: (idx+0.125) * NOTE_DURATION_TICKS,
    durationTicks: NOTE_DURATION_TICKS*0.125,
  },{
    id: `${prefix}-${idx}-${midi}`,
    pitchName: Tone.Frequency(midi, "midi").toNote(),
    startTicks: (idx+0.25) * NOTE_DURATION_TICKS,
    durationTicks: NOTE_DURATION_TICKS*0.125,
  },{
    id: `${prefix}-${idx}-${midi}`,
    pitchName: Tone.Frequency(midi, "midi").toNote(),
    startTicks: (idx+0.375) * NOTE_DURATION_TICKS,
    durationTicks: NOTE_DURATION_TICKS*0.125,
  },{
    id: `${prefix}-${idx}-${midi}`,
    pitchName: Tone.Frequency(midi, "midi").toNote(),
    startTicks: (idx+0.5) * NOTE_DURATION_TICKS,
    durationTicks: NOTE_DURATION_TICKS*0.125,
  },{
    id: `${prefix}-${idx}-${midi}`,
    pitchName: Tone.Frequency(midi, "midi").toNote(),
    startTicks: (idx+0.625) * NOTE_DURATION_TICKS,
    durationTicks: NOTE_DURATION_TICKS*0.125,
  },{
    id: `${prefix}-${idx}-${midi}`,
    pitchName: Tone.Frequency(midi, "midi").toNote(),
    startTicks: (idx+0.75) * NOTE_DURATION_TICKS,
    durationTicks: NOTE_DURATION_TICKS*0.125,
  },{
    id: `${prefix}-${idx}-${midi}`,
    pitchName: Tone.Frequency(midi, "midi").toNote(),
    startTicks: (idx+0.875) * NOTE_DURATION_TICKS,
    durationTicks: NOTE_DURATION_TICKS*0.125,
  }
  ]));
}

const midiSequenceToStoccatoEvents = (sequence: number[],prefix: string): NoteEvent[] =>{
  return sequence.map((midi, idx) => ({
    id: `${prefix}-${idx}-${midi}`,
    pitchName: Tone.Frequency(midi, "midi").toNote(),
    startTicks: idx * NOTE_DURATION_TICKS,
    durationTicks: NOTE_DURATION_TICKS*0.5,
  }));
}

const midiSequenceToMixedArticulation = (sequence: number[],prefix: string): NoteEvent[] =>{
  return sequence.map((midi, idx) => ({
    id: `${prefix}-${idx}-${midi}`,
    pitchName: Tone.Frequency(midi, "midi").toNote(),
    startTicks: idx * NOTE_DURATION_TICKS,
    durationTicks: NOTE_DURATION_TICKS*Math.floor((Math.random()*2)+1)/2,
  }));
}
 
const chordArpegiateEvents = (sequence: number[],prefix: string): NoteEvent[] => {  
  const events: NoteEvent[] = []; 
  sequence.forEach((note, idx) => {
    events.push({
      id: `${prefix}-${idx}-${note}`,
      pitchName: Tone.Frequency(note, "midi").toNote(),
      startTicks: idx * NOTE_DURATION_TICKS,
      durationTicks: NOTE_DURATION_TICKS,
    },
    {
      id: `${prefix}Join-${idx}-${note}`,
      pitchName: Tone.Frequency(note, "midi").toNote(),
      startTicks: (sequence.length+1) * NOTE_DURATION_TICKS,
      durationTicks: NOTE_DURATION_TICKS*2,
    });
  });
  return events;
};

const isNumberArray = (value: unknown): value is number[] =>
  Array.isArray(value) && value.every((n) => typeof n === "number" && Number.isFinite(n));

const extractContours = (value: unknown): number[][] => {
  if (!value) return [];
  const results: number[][] = [];

  const pushIfNumbers = (maybe: unknown) => {
    if (isNumberArray(maybe)) {
      results.push(maybe);
      return true;
    }
    return false;
  };

  const inspectCollection = (collection: unknown) => {
    if (!Array.isArray(collection)) return;
    collection.forEach((item) => {
      if (pushIfNumbers(item)) return;
      if (Array.isArray(item)) {
        item.forEach((inner) => pushIfNumbers(inner));
      }
    });
  };

  if (pushIfNumbers(value)) {
    return results;
  }

  if (Array.isArray(value)) {
    inspectCollection(value);
    return results;
  }

  if (typeof value === "object") {
    inspectCollection(Object.values(value));
  }

  return results;
};

const shuffleArray = <T,>(items: T[]) => {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};


export const ActivityFlow = ({ scaleMidis, onComplete, labelChange, rootKey, rootMidi, mode }: ActivityFlowProps) => {

  const { data: contourData } = usePrismStartContours();
  const availableContours = useMemo(() => {
    const raw = contourData?.contours;
    return extractContours(raw);
  }, [contourData]);

  const chordsQuery = usePrismModeChordsData(mode);
  const chordResponse = chordsQuery.data;
  const modeChords: PrismModeChordDataMap | undefined = chordResponse?.chords;
  const triads = modeChords && Array.isArray(modeChords.triads)
    ? modeChords.triads
    : [];

  type RhythmHit = [number, number];
  type RhythmRecord = Record<string, RhythmHit[]>
  const rhythmsQuery = usePrismRhythms();

  const melodyRhythms: RhythmRecord = rhythmsQuery.data?.melodies ?? {};
  const chordRhythms: RhythmRecord = rhythmsQuery.data?.chords ?? {};
  console.log(rhythmsQuery);
  const getRhythm = (melOrChord: "melody" | "chord", name?: string, lengthOf?: number  ): RhythmHit[] | undefined => {
    const rhythms = melOrChord === "chord" ? chordRhythms : melodyRhythms;

    if (name) return rhythms[name];

    const keys = lengthOf
      ? Object.entries(rhythms)
          .filter(([, hits]) => hits.length === lengthOf)
          .map(([k]) => k)
      : Object.keys(rhythms);

    if (keys.length === 0) return undefined;

    const pick = keys[Math.floor(Math.random() * keys.length)];
    return rhythms[pick];
  }

  const generateStepTriad = (step: number) => {
    const baseChord = triads[step-1];
    return baseChord ? baseChord.map((x) => x + rootMidi) : undefined;
  }

  const rhythmicMidiSequenceEvents = (sequence: number[],prefix: string, rhythmName?: string): NoteEvent[] => {
    const rhythm = getRhythm("melody",rhythmName,sequence.length);
    if (rhythm == undefined){
      return [];
    } 
    return sequence.map((midi, idx) => ({
    id: `${prefix}-${idx}-${midi}`,
    pitchName: Tone.Frequency(midi, "midi").toNote(),
    startTicks: rhythm[idx][0],
    durationTicks: rhythm[idx][1],
    }));
  }
    
  

  const buildFlowDefinitions = (
    scale: number[],
    contours?: number[][],
    chordTriads: number[][] = [],
    includeChordPlaceholder = false,
  ): ActivityDefinition[] => {
    const ascending = scale;
    const descending = [...scale].reverse();
    const ascendDescend = [...ascending, ...descending];
    const modeTitle = (mode as string).charAt(0).toUpperCase() + (mode as string).slice(1);
    const chordLabel = `${rootKey} ${modeTitle} Chord`;
    const chordHoldEvents = midiSequenceToEvents(ascending, "chord-hold");
    const contourSeqs: number[][] = [];
    contours?.forEach((contour) => {
      if (!Array.isArray(contour)) {
        return;
      }

      const mapContourValue = (value: number): number | undefined => {
        if (value > 0) {
          const noteIdx = value - 1;
          return scale[noteIdx];
        }
        if (value < 0) {
          const idxFromBack = scale.length + value;
          if (idxFromBack < 0 || idxFromBack >= scale.length) return undefined;
          return scale[idxFromBack] - 12;
        }
        return undefined;
      };

      const seq = contour
        .map((scaleIdx) => mapContourValue(scaleIdx))
        .filter((midi): midi is number => typeof midi === "number");

      if (seq.length === 0) return;
      contourSeqs.push(seq);
    });
    const randomIntro = shuffleArray([
      {
        key: "intro-chord-press",
        label: `${rootKey} ${modeTitle} • Press`,
        Component: ({ onContinue }: FlowActivityProps) => (
          <ChordPressGame
            targetNotes={ascending}
            targetLabel={`${rootKey} ${modeTitle}`}
            onComplete={onContinue}
          />
        ),
        seq: [] as NoteEvent[],
        direction: `Play the ${chordLabel}.`,
      },
      {
        key: "intro-board-choice",
        label: `${rootKey} ${modeTitle} • Choose`,
        Component: ({ onContinue }: FlowActivityProps) => (
          <BoardChoiceGame
            targetNotes={ascending}
            targetLabel={`${rootKey} ${modeTitle}`}
            onComplete={onContinue}
          />
        ),
        seq: [] as NoteEvent[],
        direction: `Pick the keyboard that shows the ${chordLabel}.`,
      },
      {
        key: "intro-chord-hold",
        label: `${rootKey} ${modeTitle} • Hold`,
        Component: NoteHold,
        seq: chordHoldEvents,
        direction: `Hold the notes of the ${rootKey} ${modeTitle} scale.`,
      },
    ]);

    const sequences = [
      ...randomIntro,
      { key: "asc-pa", label: `${rootKey} ${modeTitle} Ascend • Play Along`, Component: PlayAlong, seq: midiSequenceToEvents(ascending, "asc-pa"),
        direction: "In a steady tempo, play the notes of the scale going up"
      },
      { key: "desc-nh", label: `${rootKey} ${modeTitle} Descend • Hold`, Component: NoteHold, seq: midiSequenceToEvents(descending, "desc-nh"),
        direction: "Play the notes of the scale going down (to the left)."  },
      { key: "desc-pa", label: `${rootKey} ${modeTitle} Descend • Play Along`, Component: PlayAlong, seq: midiSequenceToEvents(descending, "desc-pa"),
        direction: "In a steady tempo, play the notes of the scale going down" },
      { key: "ascdesc-nh", label: `${rootKey} ${modeTitle} Ascend + Descend • Hold`, Component: NoteHold, seq: midiSequenceToEvents(ascendDescend, "ascdesc-nh"),
        direction: "Play the notes of the scale going up and down." },
      { key: "ascdesc-pa", label: `${rootKey} ${modeTitle} Ascend + Descend • Play Along`, Component: PlayAlong, seq: midiSequenceToEvents(ascendDescend, "ascdesc-pa"),
        direction: "In a steady tempo, play the notes of the scale going up and down." },
    ];

    //////////////////ACTIVITIES 2-3 ?4?
    if (contourSeqs[0] && contourSeqs[1]) {
      const combined = [...contourSeqs[0], ...contourSeqs[1]];
      sequences.push(
        {
          key: `contour-1-nh`,
          label: `$${rootKey} ${modeTitle} Musical Contour • Hold`,
          Component: NoteHold,
          seq: midiSequenceToEvents(contourSeqs[0], `contour-1-nh`),
          direction: `Play this short melodic phrase in ${rootKey} ${modeTitle}`
        },
        {
          key: `contour-1-pa`,
          label: `${rootKey} ${modeTitle} Musical Contour • Play Along`,
          Component: PlayAlong,
          seq: midiSequenceToEvents(contourSeqs[0], `contour-1-pa`),
          direction: `In a steady tempo, play this short melodic phrase in ${rootKey} ${modeTitle}`
        },
        {
          key: `contour-2-nh`,
          label: `${rootKey} ${modeTitle} Melodic Phrase • Hold`,
          Component: NoteHold,
          seq: midiSequenceToEvents(combined, `contour-2-nh`),
          direction: `Play this longer melodic phrase in ${rootKey} ${modeTitle}`,
        },
        {
          key: `contour-2-pa`,
          label: `${rootKey} ${modeTitle} Melodic Phrase • Play Along`,
          Component: PlayAlong,
          seq: midiSequenceToEvents(combined, `contour-2-pa`),
          direction: `In a steady tempo, play this longer melodic phrase in ${rootKey} ${modeTitle}`,
        },
        {
          key: `contour-1-stac-pa`,
          label: `${rootKey} ${modeTitle} Musical Contour (Staccato) • Play Along`,
          Component: PlayAlong,
          seq: midiSequenceToStoccatoEvents(contourSeqs[0], `contour-1-stac-pa`),
          direction: `In a steady tempo, play this short melodic phrase in ${rootKey} ${modeTitle} with short articulations (“staccato”).`
        },
        {
          key: `contour-1-lega-pa`,
          label: `${rootKey} ${modeTitle} Musical Contour (Legato) • Play Along`,
          Component: PlayAlong,
          seq: midiSequenceToEvents(contourSeqs[0], `contour-1-lega-pa`),
          direction: `In a steady tempo, play this short melodic phrase in ${rootKey} ${modeTitle} with long articulations (“legato”).`
        },
        {
          key: `contour-1-mix-pa`,
          label: `${rootKey} ${modeTitle} Musical Contour (Mixed Articulation) • Play Along`,
          Component: NoteHold,
          seq: midiSequenceToMixedArticulation(contourSeqs[0], `contour-1-mix-pa`),
          direction: `In a steady tempo, play this short melodic phrase in ${rootKey} ${modeTitle} with mixed articulations (“staccato” and “legato”). `
        },
        {
          key: `contour-2-mix-pa`,
          label: `${rootKey} ${modeTitle} Melodic Phrase (Mixed Articulation) • Play Along`,
          Component: PlayAlong,
          seq: midiSequenceToMixedArticulation(combined, `contour-2-mix-pa`),
          direction: `In a steady tempo, play this longer melodic phrase in ${rootKey} ${modeTitle} with mixed articulations (“staccato” and “legato”).`,
        },
        {
          key: `contour-1-rhythm-pa`,
          label: `${rootKey} ${modeTitle} Musical Contour (Styled) • Play Along`,
          Component: NoteHold,
          seq: rhythmicMidiSequenceEvents(contourSeqs[0], `contour-1-rhythm-pa`),
          direction: `In a steady tempo, play this short melodic phrase in ${rootKey} ${modeTitle} in a rhythmic style. `
        },
        {
          key: `contour-2-rhythm-pa`,
          label: `${rootKey} ${modeTitle} Melodic Phrase (Styled) • Play Along`,
          Component: PlayAlong,
          seq: rhythmicMidiSequenceEvents(combined, `contour-2-rhythm-pa`),
          direction: `In a steady tempo, play this longer melodic phrase in ${rootKey} ${modeTitle} in a rhythmic style.`,
        },
      );
    }
    /////////// ACTIVITIES FOR 5
    for (let i = 0; i < 4; i++) {
      const chordNotes = generateStepTriad(i+1);
      if (isNumberArray(chordNotes)) {
        sequences.push(
          {
            key: `arpeggiate-${i + 1}-nh`,
            label: `${rootKey} ${modeTitle} ${i + 1} Chord Arpeggio • Hold`,
            Component: NoteHold,
            seq: chordArpegiateEvents(
              chordNotes ?? [scale[0], scale[2], scale[4]],
              `arpeggiate-${i + 1}-nh`
            ),
            direction: `Play the notes of the ${i + 1} chord one at a time going up (to the right) and then play the chord.`,
          },
          {
            key: `arpeggiate-${i + 1}-pa`,
            label: `${rootKey} ${modeTitle} ${i + 1} Chord Arpeggio • Play Along`,
            Component: PlayAlong,
            seq: chordArpegiateEvents(
              chordNotes ?? [scale[0], scale[2], scale[4]],
              `arpeggiate-${i + 1}-pa`
            ),
            direction:
              "In a steady tempo, play an arpeggio of the chord going up and then play the chord.",
          },
        );
      }
    }
    if(triads.length >4){
      ////////////////ACTIVITES FOR 6
      const oneToFourChords = [...triads[0],...triads[1],...triads[2],...triads[3]];
      sequences.push({
        key: `chords-1-nh`,
        label: `${rootKey} ${modeTitle} Chords • Hold`,
        Component: NoteHold,
        seq: midiSequenceToEvents(oneToFourChords, `chords-1-nh`),
        direction: `Play the notes of the 1 through the four chord for ${rootKey} ${modeTitle}, holding down the notes of each chord as you go.`
      },{
        key: `chords-1-pa`,
        label: `${rootKey} ${modeTitle} Chords (Whole) • Play Along`,
        Component: PlayAlong,
        seq: midiSequenceToEvents(oneToFourChords, `chords-1-pa`),
        direction: `In a steady tempo, play the 1 through the four chord for ${rootKey} ${modeTitle} in whole notes.`,
      },{
        key: `chords-2-pa`,
        label: `${rootKey} ${modeTitle} Chords (Half) • Play Along`,
        Component: PlayAlong,
        seq: midiSequenceToHalfNotes(oneToFourChords, `chords-2-pa`),
        direction: `In a steady tempo, play the 1 through the four chord for ${rootKey} ${modeTitle} in half notes.`,
      },{
        key: `chords-3-pa`,
        label: `${rootKey} ${modeTitle} Chords (Quarter) • Play Along`,
        Component: PlayAlong,
        seq: midiSequenceToQuarterNotes(oneToFourChords, `chords-3-pa`),
        direction: `In a steady tempo, play the 1 through the four chord for ${rootKey} ${modeTitle} in quarter notes.`,
      });
    
    

      //////////ACTIVITES FOR 7
      const indices = [0,1,2,3];
      let shuffled = indices.sort(() => Math.random() - 0.5);
      sequences.push({
        key: `chords-4-pa`,
        label: `${rootKey} ${modeTitle} Two Chords (Staccato) • Play Along`,
        Component: PlayAlong,
        seq: midiSequenceToStoccatoEvents([...triads[shuffled[0]],...triads[shuffled[1]]], `chords-4-pa`),
        direction: `Play chord ${shuffled[0]+1} and ${shuffled[1]+1} in a steady tempo, with short articulations (“staccato”).`
      })
      shuffled = shuffled.sort(() => Math.random() - 0.5);
      sequences.push({
        key: `chords-5-pa`,
        label: `${rootKey} ${modeTitle} Two Chords (Legato) • Play Along`,
        Component: PlayAlong,
        seq: midiSequenceToEvents([...triads[shuffled[0]],...triads[shuffled[1]]], `chords-5-pa`),
        direction: `Play chord ${shuffled[0]+1} and ${shuffled[1]+1} in a steady tempo, with long articulations (“legato”).`
      })
      shuffled = shuffled.sort(() => Math.random() - 0.5);
      sequences.push({
        key: `chords-6-pa`,
        label: `${rootKey} ${modeTitle} Four Chords (Mixed Articulation) • Play Along`,
        Component: PlayAlong,
        seq: midiSequenceToEvents([...triads[shuffled[0]],...triads[shuffled[1]],...triads[shuffled[2]],...triads[shuffled[3]]], `chords-6-pa`),
        direction: `Play the four chords in a steady tempo, with mixed articulations.`
      })

      /////////ACTIVITES FOR 8
      shuffled = shuffled.sort(() => Math.random() - 0.5);
      sequences.push({
        key: `chords-2-nh`,
        label: `${rootKey} ${modeTitle} First Four Chords • Hold`,
        Component: NoteHold,
        seq: midiSequenceToEvents([...triads[shuffled[0]],...triads[shuffled[1]],...triads[shuffled[2]],...triads[shuffled[3]]], `chords-2-nh`),
        direction: `Play the first four chords in a mixed order, holding down each chord one by one.`
      })
      shuffled = shuffled.sort(() => Math.random() - 0.5);
      sequences.push({
        key: `chords-7-pa`,
        label: `${rootKey} ${modeTitle} First Four Chords • Play Along`,
        Component: PlayAlong,
        seq: midiSequenceToHalfNotes([...triads[shuffled[0]],...triads[shuffled[1]],...triads[shuffled[2]],...triads[shuffled[3]]], `chords-7-pa`),
        direction: `In a steady tempo, play the first four chords in a mixed order, each chord held for a half note.`
      })
      shuffled = shuffled.sort(() => Math.random() - 0.5);
      sequences.push({
        key: `chords-8-pa`,
        label: `${rootKey} ${modeTitle} First Four Chords • Play Along`,
        Component: PlayAlong,
        seq: midiSequenceToQuarterNotes([...triads[shuffled[0]],...triads[shuffled[1]],...triads[shuffled[2]],...triads[shuffled[3]]], `chords-8-pa`),
        direction: `In a steady tempo, play the first four chords in a mixed order, each chord held for a quarter note.`
      })
      shuffled = shuffled.sort(() => Math.random() - 0.5);
      sequences.push({
        key: `chords-9-pa`,
        label: `${rootKey} ${modeTitle} First Four Chords • Play Along`,
        Component: PlayAlong,
        seq: midiSequenceToEighthNotes([...triads[shuffled[0]],...triads[shuffled[1]],...triads[shuffled[2]],...triads[shuffled[3]]], `chords-9-pa`),
        direction: `In a steady tempo, play the first four chords in a mixed order, each chord held for a eighth note.`
      })
    }
    if (includeChordPlaceholder && chordTriads.length === 0) {
      sequences.push({
        key: "chords-loading",
        label: `${rootKey} ${modeTitle} Chords • Loading`,
        Component: ChordLoadingStep,
        seq: [] as NoteEvent[],
        direction: "Loading chord exercises...",
      });
    }
    
    return sequences.map(({ key, label, Component, seq, direction }) => ({
      key,
      label,
      Component,
      events: seq,
      direction
    }));
  };
  ////////////// end buildFlowDefinitions ///////////////////

  const randomContours = useMemo(() => {
    if (availableContours.length === 0){
      return [];
    } 
    const shuffled = [...availableContours].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  }, [availableContours]);

  const flowDefinitions = useMemo(() => {
    const scale = scaleMidis && scaleMidis.length > 0 ? scaleMidis : DEFAULT_SCALE;
    return buildFlowDefinitions(
      scale,
      randomContours,
      triads,
      chordsQuery.isPending && triads.length === 0,
    );
  }, [scaleMidis, randomContours, triads, chordsQuery.isPending]);


  const [currentIndex, setCurrentIndex] = useState(0);
  const currentActivity = flowDefinitions[currentIndex];
  useEffect(() => {
    if (flowDefinitions.length === 0) return;
    if (currentIndex < flowDefinitions.length) return;
    if (!chordsQuery.isPending) {
      onComplete?.();
    }
    setCurrentIndex(Math.max(flowDefinitions.length - 1, 0));
  }, [currentIndex, flowDefinitions.length, chordsQuery.isPending, onComplete]);
  useEffect(() => {
    if(labelChange){
      if (!currentActivity) return;
      const activityLabel = `Activity ${currentIndex + 1} of ${flowDefinitions.length}`;
      labelChange([currentActivity.label,activityLabel]);
    }
  }, [currentActivity, currentIndex, labelChange, flowDefinitions.length]);

  const handleContinue = () => {
    setCurrentIndex((idx) => {
      if (idx < flowDefinitions.length - 1) {
        return idx + 1;
      }
      if (!chordsQuery.isPending) {
        onComplete?.();
      }
      return idx;
    });
  };

  if (!currentActivity) {
    return null;
  }

  const { Component, events, direction} = currentActivity;
  
  return (
    <div className="flex flex-col gap-4">
      <Component
        key={currentActivity.key}
        events={events}
        onContinue={handleContinue}
        startMessage={direction}
      />
    </div>
  );
};
