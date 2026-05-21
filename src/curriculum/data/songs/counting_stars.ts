import type { Song } from '@/curriculum/types/songLibrary';

export const counting_stars: Song = {
  id: 'counting_stars',
  title: 'Counting Stars',
  artist: 'One Republic',
  year: 2013,
  historicalDescription:
    "OneRepublic releases 'Counting Stars', a pop-rock anthem that becomes one of the defining radio hits of 2013. Driven by a brooding verse that erupts into an anthemic chorus, the song captures a restless hunger for meaning over money — a sentiment that resonates globally and propels the band to their biggest commercial breakthrough.",
  key: 'A major',
  keyRoot: 69,
  mode: 'major',
  tempo: 104,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['pop_rock'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      measuresPerRow: 6,
      bars: [
        {
          chords: [
            { degree: '3 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [] },
      ],
    },
    {
      id: 'section_b',
      label: 'Section B',
      measuresPerRow: 8,
      bars: [
        {
          chords: [
            { degree: '3 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [] },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [] },
        { chords: [{ degree: '2 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [] },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      measuresPerRow: 10,
      bars: [
        {
          chords: [
            { degree: '3 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [] },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [] },
        { chords: [{ degree: '2 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [] },
        { chords: [] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      measuresPerRow: 10,
      bars: [
        {
          chords: [
            { degree: '3 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [] },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [] },
        { chords: [{ degree: '2 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [] },
        { chords: [] },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      measuresPerRow: 8,
      bars: [
        {
          chords: [
            { degree: '3 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [] },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [] },
        { chords: [{ degree: '2 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [] },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      measuresPerRow: 7,
      bars: [
        { chords: [], restBars: 8 },
        {
          chords: [
            { degree: '3 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [] },
        { chords: [] },
      ],
    },
    {
      id: 'section_g',
      label: 'Section G',
      measuresPerRow: 8,
      bars: [
        {
          chords: [
            { degree: '3 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [] },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [] },
        { chords: [{ degree: '2 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [] },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=hT_nvWreIhg' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
