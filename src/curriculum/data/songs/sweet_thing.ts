import type { Song } from '@/curriculum/types/songLibrary';

export const sweet_thing: Song = {
  id: 'sweet_thing',
  title: 'Sweet Thing',
  artist: 'Rufus and Chaka Khan',
  year: undefined,

  historicalDescription:
    "Rufus and Chaka Khan release 'Sweet Thing', a velvet-smooth R&B ballad that showcases Chaka Khan's extraordinary vocal power in its most intimate setting. The song becomes one of the defining slow jams of the mid-1970s, cementing Khan's status as one of soul music's greatest voices and Rufus as a premier funk and R&B outfit.",
  key: 'A major',
  keyRoot: 69,
  mode: 'major',
  tempo: 82,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['R&B'],
  techniques: [],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      repeatCount: 3,
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      bars: [
        {
          chords: [
            { degree: '3 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 min7', chordName: 'C♯min7', beat: 1, duration: 2 },
            { degree: '6 min7', chordName: 'F♯min7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_c',
      label: 'Section C',
      measuresPerRow: 5,
      bars: [
        {
          chords: [
            { degree: '3 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 min7', chordName: 'C♯min7', beat: 1, duration: 2 },
            { degree: '6 min7', chordName: 'F♯min7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      repeatCount: 3,
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '3 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 min7', chordName: 'C♯min7', beat: 1, duration: 2 },
            { degree: '6 min7', chordName: 'F♯min7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      measuresPerRow: 5,
      bars: [
        {
          chords: [
            { degree: '3 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 min7', chordName: 'C♯min7', beat: 1, duration: 2 },
            { degree: '6 min7', chordName: 'F♯min7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'D', beat: 3, duration: 2 },
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
            { degree: '♭2 maj', chordName: 'B♭', beat: 1, duration: 2 },
            { degree: '♭5 maj', chordName: 'E♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭2 maj', chordName: 'B♭', beat: 1, duration: 2 },
            { degree: '♭5 maj', chordName: 'E♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭2 maj', chordName: 'B♭', beat: 1, duration: 2 },
            { degree: '♭5 maj', chordName: 'E♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭2 maj', chordName: 'B♭', beat: 1, duration: 2 },
            { degree: '♭5 maj', chordName: 'E♭', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_g',
      label: 'Section G',
      bars: [
        {
          chords: [
            { degree: '♭2 maj', chordName: 'B♭', beat: 1, duration: 2 },
            { degree: '♭5 maj', chordName: 'E♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭2 maj', chordName: 'B♭', beat: 1, duration: 2 },
            { degree: '♭5 maj', chordName: 'E♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭2 maj', chordName: 'B♭', beat: 1, duration: 2 },
            { degree: '♭5 maj', chordName: 'E♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Dmin7', beat: 1, duration: 1 },
            { degree: '3 7', chordName: 'D♭7', beat: 2, duration: 1 },
            { degree: '♭3 min7', chordName: 'Cmin7', beat: 3, duration: 1 },
            { degree: '2 7', chordName: 'B7', beat: 4, duration: 1 },
          ],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=Y7dwufE72UE' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
