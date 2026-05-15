import type { Song } from '@/curriculum/types/songLibrary';

export const shake_a_tail_feather: Song = {
  id: 'shake_a_tail_feather',
  title: 'Shake A Tail Feather',
  artist: 'Ray Charles',
  year: 1980,
  historicalDescription:
    "Ray Charles records 'Shake A Tail Feather', injecting his signature soul and gospel-drenched energy into the classic R&B party anthem. Originally a hit for The Five Du-Tones in the early 1960s, the song finds new life through Charles's unmistakable voice — a reminder that his genius can electrify any material he touches.",
  key: 'B♭ major',
  keyRoot: 70,
  mode: 'major',
  tempo: 168,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['blues'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      measuresPerRow: 7,
      bars: [
        { chords: [], restBars: 1 },
        { chords: [{ degree: '4 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 7', chordName: 'A♭7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 7', chordName: 'A♭7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_b',
      label: 'Section B',
      measuresPerRow: 6,
      bars: [
        { chords: [{ degree: '4 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 7', chordName: 'A♭7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      measuresPerRow: 7,
      bars: [
        { chords: [{ degree: '4 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 7', chordName: 'A♭7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 7', chordName: 'A♭7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'F7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_d',
      label: 'Section D',
      measuresPerRow: 10,
      bars: [
        { chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      measuresPerRow: 8,
      bars: [
        { chords: [{ degree: '4 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 7', chordName: 'A♭7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 7', chordName: 'A♭7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 7', chordName: 'A♭7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      bars: [
        {
          chords: [{ degree: '♭7 7', chordName: 'A♭7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 7', chordName: 'A♭7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_g',
      label: 'Section G',
      measuresPerRow: 6,
      bars: [
        { chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      measuresPerRow: 8,
      bars: [
        { chords: [{ degree: '4 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 7', chordName: 'A♭7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 7', chordName: 'A♭7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 7', chordName: 'A♭7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [] },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=qdbrIrFxas0' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
