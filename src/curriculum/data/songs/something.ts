import type { Song } from '@/curriculum/types/songLibrary';

export const something: Song = {
  id: 'something',
  title: 'Something',
  artist: 'The Beatles',
  year: 1964,
  historicalDescription:
    "George Harrison's 'Something' appears on Abbey Road, becoming the first Harrison composition to lead a Beatles single. Frank Sinatra later calls it the greatest love song of the past fifty years — a remarkable vindication for the Beatle long overshadowed by Lennon and McCartney. It signals Harrison's full arrival as a songwriter of the highest order.",
  key: 'A minor',
  keyRoot: 69,
  mode: 'minor',
  tempo: 65,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['classic_rock'],
  techniques: [],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      measuresPerRow: 8,
      bars: [
        { chords: [{ degree: '3 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 maj/5', chordName: 'F/E', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_b',
      label: 'Section B',
      measuresPerRow: 8,
      bars: [
        { chords: [{ degree: '4 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'D7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '7 maj', chordName: 'G', beat: 1, duration: 1 },
            { degree: '1 min7', chordName: 'Amin7', beat: 2, duration: 1 },
            { degree: '7 maj/2', chordName: 'G/B', beat: 3, duration: 1 },
            { degree: '7 maj', chordName: 'G', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 1 },
            {
              degree: '1 min7/♯7',
              chordName: 'Amin7/G♯',
              beat: 2,
              duration: 1,
            },
            { degree: '1 min7/7', chordName: 'Amin7/G', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '4 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'D7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '♭5 maj', chordName: 'E♭', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      measuresPerRow: 6,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj/♯7', chordName: 'E/G♯', beat: 1, duration: 2 },
            { degree: '♯6 min7', chordName: 'F♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            {
              degree: '♯6 min7/5',
              chordName: 'F♯min7/E',
              beat: 1,
              duration: 2,
            },
            { degree: '4 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '7 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_d',
      label: 'Section D',
      measuresPerRow: 6,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj/♯7', chordName: 'E/G♯', beat: 1, duration: 2 },
            { degree: '♯6 min7', chordName: 'F♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            {
              degree: '♯6 min7/5',
              chordName: 'F♯min7/E',
              beat: 1,
              duration: 2,
            },
            { degree: '4 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '7 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      measuresPerRow: 8,
      bars: [
        { chords: [{ degree: '3 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 maj/5', chordName: 'F/E', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      measuresPerRow: 8,
      bars: [
        { chords: [{ degree: '4 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'D7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '7 maj', chordName: 'G', beat: 1, duration: 1 },
            { degree: '1 min7', chordName: 'Amin7', beat: 2, duration: 1 },
            { degree: '7 maj/2', chordName: 'G/B', beat: 3, duration: 1 },
            { degree: '7 maj', chordName: 'G', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 1 },
            {
              degree: '1 min7/♯7',
              chordName: 'Amin7/G♯',
              beat: 2,
              duration: 1,
            },
            { degree: '1 min7/7', chordName: 'Amin7/G', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '4 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'D7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '♭5 maj', chordName: 'E♭', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      measuresPerRow: 5,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭5 maj', chordName: 'E♭', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '3 maj', chordName: 'C', beat: 1, duration: 4 }],
          fermata: true,
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=UelDrZ1aFeY' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
