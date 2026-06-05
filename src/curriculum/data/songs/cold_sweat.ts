import type { Song } from '@/curriculum/types/songLibrary';

export const cold_sweat: Song = {
  id: 'cold_sweat',
  title: 'Cold Sweat',
  artist: 'James Brown',
  year: 1967,
  historicalDescription:
    "James Brown releases 'Cold Sweat', stripping soul music down to its rhythmic bones and birthing a new grammar for funk. The groove locks into a relentless, hypnotic pulse where the one-beat reigns supreme — a blueprint that will define Black popular music for decades. Hip hop producers, from the 1970s to the present day, return to this record again and again.",
  key: 'C major',
  keyRoot: 60,
  mode: 'major',
  tempo: 110,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['funk'],
  techniques: [],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        { chords: [{ degree: '2 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 7', chordName: 'D7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_c',
      label: 'Section C',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [
            { degree: '3 7', chordName: 'E7', beat: 1, duration: 1 },
            { degree: '4 7', chordName: 'F7', beat: 2, duration: 1 },
            { degree: '♭5 7', chordName: 'F♯7', beat: 3, duration: 1 },
            { degree: '5 7', chordName: 'G7', beat: 4, duration: 1 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'G7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 7', chordName: 'F7', beat: 1, duration: 1 },
            { degree: '♭5 7', chordName: 'F♯7', beat: 2, duration: 1 },
            { degree: '5 7', chordName: 'G7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'G7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '2 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 7', chordName: 'D7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_g',
      label: 'Section G',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      bars: [
        {
          chords: [
            { degree: '3 7', chordName: 'E7', beat: 1, duration: 1 },
            { degree: '4 7', chordName: 'F7', beat: 2, duration: 1 },
            { degree: '♭5 7', chordName: 'F♯7', beat: 3, duration: 1 },
            { degree: '5 7', chordName: 'G7', beat: 4, duration: 1 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'G7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 7', chordName: 'F7', beat: 1, duration: 1 },
            { degree: '♭5 7', chordName: 'F♯7', beat: 2, duration: 1 },
            { degree: '5 7', chordName: 'G7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'G7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_g_2',
      label: 'Section G',
      bars: [
        { chords: [{ degree: '2 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 7', chordName: 'D7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_h',
      label: 'Section H',
      measuresPerRow: 1,
      bars: [{ chords: [], restBars: 4 }],
    },
    {
      id: 'section_i',
      label: 'Section I',
      bars: [
        { chords: [{ degree: '2 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 7', chordName: 'D7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_j',
      label: 'Section J',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=tvltTXEg5kI' },
  ],
  artistImageSource: 'commissioned',

  artistImageRef: '/artists/james-brown.webp',
  popularity: 50,
};
