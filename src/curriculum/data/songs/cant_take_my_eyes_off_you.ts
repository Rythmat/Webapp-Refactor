import type { Song } from '@/curriculum/types/songLibrary';

export const cant_take_my_eyes_off_you: Song = {
  id: 'cant_take_my_eyes_off_you',
  title: 'Can’t Take My Eyes Off You',
  artist: 'Lauryn Hill',
  year: 1998,
  historicalDescription:
    "Lauryn Hill reimagines Frankie Valli's 1967 pop classic as a spare, acoustic neo-soul meditation, stripping away the orchestral bombast to reveal raw emotional intimacy. Released amid the phenomenon of 'The Miseducation of Lauryn Hill', it showcases her ability to inhabit a song completely — blending hip-hop sensibility with classic soul reverence in a way that defines the late 1990s neo-soul movement.",
  key: 'E minor',
  keyRoot: 64,
  mode: 'minor',
  tempo: 120,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['hip_hop', 'neo_soul'],
  techniques: [],

  sections: [
    {
      id: 'section_f',
      label: 'Section F',
      bars: [
        {
          chords: [
            { degree: '2 maj/1', chordName: 'F♯/E', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '2 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus',
      bars: [
        {
          chords: [
            { degree: '4 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [
            { degree: '2 maj/1', chordName: 'F♯/E', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '2 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      measuresPerRow: 5,
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♯6 7', chordName: 'C♯7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♯6 7', chordName: 'C♯7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      repeatCount: 3,
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'B7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♯3 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯6 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_9',
      label: 'Section I',
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '7 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 7', chordName: 'D7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_10',
      label: 'Section J',
      bars: [
        { chords: [{ degree: '3 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_11',
      label: 'Section K',
      bars: [
        { chords: [{ degree: '3 7', chordName: 'G7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 7', chordName: 'G7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_12',
      label: 'Section L',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '3 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj/3', chordName: 'A/G', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '4 min7/3',
              chordName: 'Amin7b5/G',
              beat: 1,
              duration: 4,
            },
          ],
        },
        { chords: [{ degree: '3 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_13',
      label: 'Section M',
      measuresPerRow: 5,
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♯6 7', chordName: 'C♯7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♯6 7', chordName: 'C♯7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_14',
      label: 'Section N',
      repeatCount: 5,
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'B7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♯3 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯6 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_15',
      label: 'Section O',
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '7 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 7', chordName: 'D7', beat: 1, duration: 4 }] },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=wVzvXW9bo5U' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
