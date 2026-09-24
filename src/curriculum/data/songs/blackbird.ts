import type { Song } from '@/curriculum/types/songLibrary';

export const blackbird: Song = {
  id: 'blackbird',
  title: 'Blackbird',
  artist: 'The Beatles',
  year: 1968,
  historicalDescription:
    "Paul McCartney records 'Blackbird' as a spare, fingerpicked acoustic guitar piece for the Beatles' sprawling White Album. Written against the backdrop of the American civil rights movement, the song's call to 'take these broken wings and learn to fly' resonates far beyond its intimate arrangement — a quiet protest wrapped in folk simplicity.",
  key: 'G major',
  keyRoot: 67,
  mode: 'major',
  tempo: 92,
  timeSignature: [3, 4],

  difficulty: 3,
  genreTags: ['folk', 'rock'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 3 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'G/B', beat: 1, duration: 3 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 3 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 3 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'G/B', beat: 1, duration: 3 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 3 }] },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 3 }] },
        {
          chords: [
            { degree: '2 7/♯4', chordName: 'A7/C♯', beat: 1, duration: 3 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'D7', beat: 1, duration: 3 }] },
        {
          chords: [
            { degree: '3 7/♯5', chordName: 'B7/D♯', beat: 1, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 3 },
          ],
        },
        {
          chords: [
            {
              degree: '4 min7/♭6',
              chordName: 'Cmin7/E♭',
              beat: 1,
              duration: 3,
            },
          ],
        },
        {
          chords: [
            { degree: '1 maj/5', chordName: 'G/D', beat: 1, duration: 1 },
            { degree: '2 7/♯4', chordName: 'A7/C♯', beat: 2, duration: 1 },
            { degree: '2 min7/4', chordName: 'Amin7/C', beat: 3, duration: 2 },
            { degree: '4 min7', chordName: 'Cmin7', beat: 5, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'G/B', beat: 1, duration: 3 },
          ],
        },
        { chords: [{ degree: '2 7', chordName: 'A7', beat: 1, duration: 3 }] },
        { chords: [{ degree: '5 7', chordName: 'D7', beat: 1, duration: 3 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 3 }] },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 3 }] },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'G/B', beat: 1, duration: 3 },
          ],
        },
        { chords: [{ degree: '2 7', chordName: 'A7', beat: 1, duration: 3 }] },
        { chords: [{ degree: '5 7', chordName: 'D7', beat: 1, duration: 3 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 3 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 3 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'G/B', beat: 1, duration: 3 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 3 }] },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 3 }] },
        {
          chords: [
            { degree: '2 7/♯4', chordName: 'A7/C♯', beat: 1, duration: 3 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'D7', beat: 1, duration: 3 }] },
        {
          chords: [
            { degree: '3 7/♯5', chordName: 'B7/D♯', beat: 1, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 3 },
          ],
        },
        {
          chords: [
            {
              degree: '4 min7/♭6',
              chordName: 'Cmin7/E♭',
              beat: 1,
              duration: 3,
            },
          ],
        },
        {
          chords: [
            { degree: '1 maj/5', chordName: 'G/D', beat: 1, duration: 1 },
            { degree: '2 7/♯4', chordName: 'A7/C♯', beat: 2, duration: 1 },
            { degree: '2 min7/4', chordName: 'Amin7/C', beat: 3, duration: 2 },
            { degree: '4 min7', chordName: 'Cmin7', beat: 5, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'G/B', beat: 1, duration: 3 },
          ],
        },
        { chords: [{ degree: '2 7', chordName: 'A7', beat: 1, duration: 3 }] },
        { chords: [{ degree: '5 7', chordName: 'D7', beat: 1, duration: 3 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 3 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 3 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [
            { degree: '♭7 maj', chordName: 'F', beat: 1, duration: 1 },
            { degree: '4 maj/6', chordName: 'C/E', beat: 2, duration: 1 },
            { degree: '5 min7', chordName: 'Dmin7', beat: 3, duration: 1 },
            { degree: '4 maj', chordName: 'C', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'B♭', beat: 1, duration: 3 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 3 }] },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'F', beat: 1, duration: 1 },
            { degree: '4 maj/6', chordName: 'C/E', beat: 2, duration: 1 },
            { degree: '5 min7', chordName: 'Dmin7', beat: 3, duration: 1 },
            { degree: '4 maj', chordName: 'C', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'B♭', beat: 1, duration: 3 }],
        },
        { chords: [{ degree: '2 7', chordName: 'A7', beat: 1, duration: 3 }] },
        { chords: [{ degree: '5 7', chordName: 'D7', beat: 1, duration: 3 }] },
      ],
    },
    {
      id: 'interlude',
      label: 'Interlude',
      instrumental: true,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 3 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'G/B', beat: 1, duration: 3 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 3 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 3 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 3 }],
          fermata: true,
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 3 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'G/B', beat: 1, duration: 3 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 3 }] },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'G/B', beat: 1, duration: 3 },
          ],
        },
        { chords: [{ degree: '2 7', chordName: 'A7', beat: 1, duration: 3 }] },
        {
          chords: [
            { degree: '2 min7/5', chordName: 'Amin7/D', beat: 1, duration: 3 },
          ],
        },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 3 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'G/B', beat: 1, duration: 3 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 3 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 3 }] },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 3 }] },
        {
          chords: [
            { degree: '2 7/♯4', chordName: 'A7/C♯', beat: 1, duration: 3 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'D7', beat: 1, duration: 3 }] },
        {
          chords: [
            { degree: '3 7/♯5', chordName: 'B7/D♯', beat: 1, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 3 },
          ],
        },
        {
          chords: [
            {
              degree: '4 min7/♭6',
              chordName: 'Cmin7/E♭',
              beat: 1,
              duration: 3,
            },
          ],
        },
        {
          chords: [
            { degree: '1 maj/5', chordName: 'G/D', beat: 1, duration: 1 },
            { degree: '2 7/♯4', chordName: 'A7/C♯', beat: 2, duration: 1 },
            { degree: '2 min7/4', chordName: 'Amin7/C', beat: 3, duration: 2 },
            { degree: '4 min7', chordName: 'Cmin7', beat: 5, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'G/B', beat: 1, duration: 3 },
          ],
        },
        { chords: [{ degree: '2 7', chordName: 'A7', beat: 1, duration: 3 }] },
        { chords: [{ degree: '5 7', chordName: 'D7', beat: 1, duration: 3 }] },
        { chords: [{ degree: '5 7', chordName: 'D7', beat: 1, duration: 3 }] },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 3 }] },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 3 }] },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'G/B', beat: 1, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 3 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'D7', beat: 1, duration: 3 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 3 }] },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 3 }] },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'G/B', beat: 1, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 3 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'D7', beat: 1, duration: 3 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 3 }],
          fermata: true,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=Man4Xw8Xypo' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/the-beatles.webp',
  popularity: 50,
};
