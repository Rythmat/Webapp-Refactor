import type { Song } from '@/curriculum/types/songLibrary';

export const ebony_eyes: Song = {
  id: 'ebony_eyes',
  title: 'Ebony Eyes',
  artist: 'Stevie Wonder',
  year: 1976,
  historicalDescription:
    "Stevie Wonder releases 'Ebony Eyes' in 1976, deep in his celebrated run of classic albums that redefined what soul and pop music could be. A smooth, funky groove showcasing his mastery of melody and arrangement, the track reflects the rich creative peak of a period in which Wonder almost single-handedly elevates Black pop to new artistic heights.",
  key: 'B♭ major',
  keyRoot: 70,
  mode: 'major',
  tempo: 102,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['funky_pop'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      measuresPerRow: 2,
      bars: [
        {
          chords: [
            { degree: '5 7', chordName: 'F7(♯5)', beat: 1, duration: 4 },
          ],
          restBars: 1,
        },
        {
          chords: [
            { degree: '5 7', chordName: 'F7(♯5)', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '3 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 7', chordName: 'D7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_c',
      label: 'Section C',
      bars: [
        { chords: [{ degree: '6 7', chordName: 'G7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 7', chordName: 'G7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 7', chordName: 'C7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭3 dim7', chordName: 'C♯dim7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      measuresPerRow: 8,
      bars: [
        {
          chords: [
            { degree: '1 maj/5', chordName: 'B♭/F', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '6 7', chordName: 'G7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭5 dim7', chordName: 'Edim7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/5', chordName: 'B♭/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/5', chordName: 'B♭/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭5 dim7', chordName: 'Edim7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      measuresPerRow: 7,
      bars: [
        {
          chords: [
            { degree: '1 maj/5', chordName: 'B♭/F', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '6 7', chordName: 'G7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'F7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'B♭', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'F7(♯5)', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '3 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 7', chordName: 'D7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_g',
      label: 'Section G',
      bars: [
        { chords: [{ degree: '6 7', chordName: 'G7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 7', chordName: 'G7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 7', chordName: 'C7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭3 dim7', chordName: 'C♯dim7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      measuresPerRow: 8,
      bars: [
        {
          chords: [
            { degree: '1 maj/5', chordName: 'B♭/F', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '6 7', chordName: 'G7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭5 dim7', chordName: 'Edim7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/5', chordName: 'B♭/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/5', chordName: 'B♭/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭5 dim7', chordName: 'Edim7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_i',
      label: 'Section I',
      measuresPerRow: 6,
      bars: [
        {
          chords: [
            { degree: '1 maj/5', chordName: 'B♭/F', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '6 7', chordName: 'G7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'F7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_j',
      label: 'Section J',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }],
          fermata: true,
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=sqKyPQUReys' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
