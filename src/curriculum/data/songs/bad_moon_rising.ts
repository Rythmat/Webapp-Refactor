import type { Song } from '@/curriculum/types/songLibrary';

export const bad_moon_rising: Song = {
  id: 'bad_moon_rising',
  title: 'Bad Moon Rising',
  artist: 'CCR',
  year: undefined,

  historicalDescription:
    "Creedence Clearwater Revival releases 'Bad Moon Rising', a deceptively bright, uptempo rocker wrapped around a dark omen of disaster. Written by John Fogerty and drawn from a scene in the 1941 film 'The Devil and Daniel Webster', it captures the dread and uncertainty of late-1960s America — Vietnam, social upheaval, and a nation on edge. It becomes one of CCR's signature songs and a rock standard.",
  key: 'D major',
  keyRoot: 62,
  mode: 'major',
  tempo: 180,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['classic_rock'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      measuresPerRow: 3,
      bars: [
        { chords: [], restBars: 2 },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      measuresPerRow: 8,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'G', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'G', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      measuresPerRow: 8,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'G', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'G', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      measuresPerRow: 8,
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      measuresPerRow: 8,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'G', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'G', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      measuresPerRow: 8,
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      measuresPerRow: 8,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'G', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'G', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_g',
      label: 'Section G',
      measuresPerRow: 8,
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_i',
      label: 'Section I',
      bars: [
        { chords: [{ degree: '2 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '7 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭2 maj', chordName: 'D♯', beat: 1, duration: 2 },
            { degree: '3 maj', chordName: 'F♯', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_e_2',
      label: 'Section E',
      bars: [
        {
          chords: [
            { degree: '6 maj', chordName: 'B', beat: 1, duration: 2 },
            { degree: '6 7', chordName: 'B7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '2 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_k',
      label: 'Section K',
      bars: [
        {
          chords: [
            { degree: '6 maj', chordName: 'B', beat: 1, duration: 2 },
            { degree: '6 7', chordName: 'B7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '2 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭5 min7', chordName: 'G♯min7', beat: 1, duration: 1 },
            { degree: '♭6 min7', chordName: 'A♯min7', beat: 2, duration: 1 },
            { degree: '♭2 maj', chordName: 'D♯', beat: 3, duration: 1 },
            { degree: '♭5 min7', chordName: 'G♯min7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '7 min7', chordName: 'C♯min7', beat: 1, duration: 2 },
            { degree: '3 7', chordName: 'F♯7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_f_2',
      label: 'Section F',
      bars: [
        {
          chords: [
            { degree: '6 maj', chordName: 'B', beat: 1, duration: 2 },
            { degree: '6 7', chordName: 'B7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '2 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_m',
      label: 'Section M',
      bars: [
        {
          chords: [
            { degree: '6 maj', chordName: 'B', beat: 1, duration: 2 },
            { degree: '6 7', chordName: 'B7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '2 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭5 min7', chordName: 'G♯min7', beat: 1, duration: 1 },
            { degree: '♭6 min7', chordName: 'A♯min7', beat: 2, duration: 1 },
            { degree: '♭2 maj', chordName: 'D♯', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '♭2 maj', chordName: 'D♯', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_g_2',
      label: 'Section G',
      measuresPerRow: 2,
      bars: [
        {
          chords: [
            { degree: '♭5 min7', chordName: 'G♯min7', beat: 1, duration: 1 },
            { degree: '♭6 min7', chordName: 'A♯min7', beat: 2, duration: 1 },
            { degree: '6 maj', chordName: 'B', beat: 3, duration: 1 },
            { degree: '7 maj', chordName: 'C♯', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '♭5 min7', chordName: 'G♯min7', beat: 1, duration: 1 },
            { degree: '♭6 min7', chordName: 'A♯min7', beat: 2, duration: 1 },
            { degree: '6 maj', chordName: 'B', beat: 3, duration: 1 },
            { degree: '7 maj', chordName: 'C♯', beat: 4, duration: 1 },
          ],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=zUQiUFZ5RDw' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
