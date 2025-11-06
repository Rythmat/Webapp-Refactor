import PianoRoll from "./PianoRollPlay";


export const PlayAlong = () => {


  return (
      <PianoRoll
        events={[
          { id: "e1", pitchName: "A2", startBeats: 0, durationBeats: 4 },
          { id: "e2", pitchName: "C3", startBeats: 0, durationBeats: 4 },
          { id: "e3", pitchName: "E3", startBeats: 0, durationBeats: 4 },
          { id: "e4", pitchName: "G3", startBeats: 0, durationBeats: 4 },
          { id: "e5", pitchName: "B3", startBeats: 4, durationBeats: 4 },
          { id: "e6", pitchName: "E3", startBeats: 4, durationBeats: 4 },
          { id: "e7", pitchName: "G3", startBeats: 4, durationBeats: 4 },
          { id: "e8", pitchName: "C3", startBeats: 4, durationBeats: 4 },
        ]}
        lanes={["D4","C4","B3","Bb3","A3","Ab3","G3","Gb3","F3","E3","Eb3","D3","Db3","C3","B2","Bb2","A2","Ab2"]}
        bars={2}
        beatsPerBar={4}
        subdivision={1}
        rowHeight={36}
        showChordsTop
        // showCountIn
        countInBars={1}
        playheadBeat={9.5}
      />

  )
}
