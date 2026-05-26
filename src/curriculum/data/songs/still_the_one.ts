import type { Song } from '@/curriculum/types/songLibrary';

export const still_the_one: Song = {
  id: 'still_the_one',
  title: 'Still The One',
  artist: 'Lake Street Dive',
  year: 2022,
  historicalDescription:
    "Lake Street Dive releases 'Still The One', a rock track that showcases the Boston-bred band's knack for blending classic American sounds with modern songwriting. The group — known for frontwoman Rachael Price's powerful voice — continues to build a devoted following by channeling the warmth of vintage pop and soul into contemporary rock.",
  key: 'B♭ major',
  keyRoot: 70,
  mode: 'major',
  tempo: 55,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['rock'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      measuresPerRow: 6,
      bars: [
        { chords: [], restBars: 1 },
        { chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj', chordName: 'E♭', beat: 1, duration: 2 },
            { degree: '6 7', chordName: 'G7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'A♭', beat: 1, duration: 1 },
            { degree: '7 dim7', chordName: 'Adim7', beat: 2, duration: 1 },
            { degree: '1 7', chordName: 'B♭7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'E♭', beat: 1, duration: 2 },
            { degree: '6 7', chordName: 'G7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'A♭', beat: 1, duration: 1 },
            { degree: '7 dim7', chordName: 'Adim7', beat: 2, duration: 1 },
            { degree: '1 7', chordName: 'B♭7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      measuresPerRow: 6,
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '6 7', chordName: 'G7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'A♭', beat: 1, duration: 1 },
            { degree: '7 dim7', chordName: 'Adim7', beat: 2, duration: 1 },
            { degree: '1 7', chordName: 'B♭7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '6 7', chordName: 'G7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'A♭', beat: 1, duration: 1 },
            { degree: '7 dim7', chordName: 'Adim7', beat: 2, duration: 1 },
            { degree: '1 7', chordName: 'B♭7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_c',
      label: 'Section C',
      measuresPerRow: 7,
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '6 7', chordName: 'G7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'A♭', beat: 1, duration: 1 },
            { degree: '7 dim7', chordName: 'Adim7', beat: 2, duration: 1 },
            { degree: '1 7', chordName: 'B♭7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_d',
      label: 'Section D',
      measuresPerRow: 8,
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      measuresPerRow: 8,
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      measuresPerRow: 7,
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '6 7', chordName: 'G7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'A♭', beat: 1, duration: 1 },
            { degree: '7 dim7', chordName: 'Adim7', beat: 2, duration: 1 },
            { degree: '1 7', chordName: 'B♭7', beat: 3, duration: 2 },
          ],
          fermata: true,
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=ADS81q5E0ps' },
  ],
  artistImageSource: 'commissioned',

  artistImageRef: '/artists/lake-street-dive.webp',
  popularity: 50,
};
