import type { Song } from '@/curriculum/types/songLibrary';

export const pick_up_the_pieces: Song = {
  id: 'pick_up_the_pieces',
  title: 'Pick Up The Pieces',
  artist: 'The Average White Band',
  year: 1996,
  historicalDescription:
    "The Average White Band's 'Pick Up The Pieces' stands as one of the great ironies of funk — a group of white Scottish musicians delivering one of the genre's most celebrated instrumental grooves. Originally released in 1974, the track becomes a defining statement that funk is a feeling, not a birthright, and its infectious horn riff and locked-in rhythm section continue to influence musicians and producers for decades.",
  key: 'F minor',
  keyRoot: 65,
  mode: 'minor',
  tempo: 108,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['funk'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      bars: [
        {
          chords: [
            { degree: '5 7', chordName: 'C7sus4', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 7', chordName: 'C7sus4', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 7', chordName: 'C7sus4', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 7', chordName: 'C7sus4', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_c',
      label: 'Section C',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_d',
      label: 'Section D',
      measuresPerRow: 6,
      bars: [
        {
          chords: [
            { degree: '4 7', chordName: 'B♭7sus4', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 7', chordName: 'B♭7sus4', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
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
            { degree: '4 7', chordName: 'B♭7sus4', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 7', chordName: 'B♭7sus4', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 7', chordName: 'B♭7sus4', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 7', chordName: 'C7(♯9)', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      measuresPerRow: 3,
      bars: [
        {
          chords: [
            { degree: '5 7', chordName: 'C7(♯9)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_h',
      label: 'Section H',
      bars: [
        {
          chords: [
            { degree: '4 7', chordName: 'B♭7sus4', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 7', chordName: 'B♭7sus4', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
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
            { degree: '4 7', chordName: 'B♭7sus4', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 7', chordName: 'B♭7sus4', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 7', chordName: 'B♭7sus4', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 7', chordName: 'C7(♯9)', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_j',
      label: 'Section J',
      bars: [
        {
          chords: [
            { degree: '5 7', chordName: 'C7(♯9)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 7', chordName: 'C7(♯9)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 7', chordName: 'C7(♯9)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 7', chordName: 'C7(♯9)', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      repeatCount: 3,
      bars: [
        {
          chords: [
            { degree: '4 7', chordName: 'B♭7sus4', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 7', chordName: 'B♭7sus4', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 7', chordName: 'B♭7sus4', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 7', chordName: 'B♭7sus4', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_f_2',
      label: 'Section F',
      repeatCount: 3,
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_m',
      label: 'Section M',
      bars: [
        {
          chords: [
            { degree: '4 7', chordName: 'B♭7sus4', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 7', chordName: 'B♭7sus4', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
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
            { degree: '4 7', chordName: 'B♭7sus4', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 7', chordName: 'B♭7sus4', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 7', chordName: 'B♭7sus4', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 7', chordName: 'B♭7sus4', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_o',
      label: 'Section O',
      measuresPerRow: 5,
      bars: [
        {
          chords: [
            { degree: '4 7', chordName: 'B♭7sus4', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 7', chordName: 'B♭7sus4', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 7', chordName: 'B♭7sus4', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 7', chordName: 'B♭7sus4', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 7', chordName: 'C7(♯9)', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_h_2',
      label: 'Section H',
      repeatCount: 3,
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=MfAJLGFWxYo' },
  ],
  artistImageSource: 'commissioned',

  artistImageRef: '/artists/the-average-white-band.webp',
  popularity: 50,
};
