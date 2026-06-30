import type { Song } from '@/curriculum/types/songLibrary';

export const keep_your_soul_together: Song = {
  id: 'keep_your_soul_together',
  title: 'Keep Your Soul Together',
  artist: 'Freddie Hubbard',
  year: 1973,
  historicalDescription:
    "Freddie Hubbard records 'Keep Your Soul Together' in 1973, capturing the moment jazz fully embraces funk and soul without apology. The track rides a loose, rolling groove that reflects the era's hunger for music that moves the body as much as the mind — a sound rooted in the hard bop tradition but reaching toward something earthier and more communal.",
  key: 'C minor',
  keyRoot: 60,
  mode: 'minor',
  tempo: 192,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['funk', 'jazz'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      measuresPerRow: 1,
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
          fermata: true,
        },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7/3', chordName: 'Cmin7/E♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 maj', chordName: 'A♭', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'G7', beat: 3, duration: 2 },
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
            { degree: '4 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '7 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♯6 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_d',
      label: 'Section D',
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'Dmin7b5', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 7', chordName: 'G7(♯9)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Cmin7', beat: 1, duration: 2 },
            { degree: '2 min7', chordName: 'Dmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '3 maj', chordName: 'E♭', beat: 1, duration: 2 },
            { degree: '1 7/♯3', chordName: 'C7/E', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      bars: [
        {
          chords: [
            { degree: '4 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯6 min7', chordName: 'Amin7', beat: 1, duration: 2 },
            { degree: '2 7', chordName: 'D7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '7 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '3 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      measuresPerRow: 5,
      bars: [
        {
          chords: [
            { degree: '♭2 min7', chordName: 'D♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭5 7', chordName: 'G♭7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '2 7', chordName: 'D7sus', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♯7 7', chordName: 'B7sus', beat: 1, duration: 2 },
            { degree: '♭2 dim7', chordName: 'D♭dim7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      measuresPerRow: 5,
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7/3', chordName: 'Cmin7/E♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 maj', chordName: 'A♭', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'G7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
          fermata: true,
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=8mgtk460AhI' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/freddie-hubbard.webp',
  popularity: 50,
};
