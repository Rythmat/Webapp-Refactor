import type { Song } from '@/curriculum/types/songLibrary';

export const try_a_little_tenderness: Song = {
  id: 'try_a_little_tenderness',
  title: 'Try A Little Tenderness',
  artist: 'Otis Redding',
  year: 1992,
  historicalDescription:
    "Otis Redding's 'Try A Little Tenderness' becomes one of the defining performances of classic soul — a slow, aching build that erupts into a frenzy of raw gospel energy. Recorded in the 1960s at Stax Studios in Memphis, Redding transforms a decades-old pop standard into something entirely his own, stripping it down to pure human longing. It remains a masterclass in emotional escalation and the power of the Memphis soul sound.",
  key: 'A minor',
  keyRoot: 69,
  mode: 'minor',
  tempo: 50,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['classic_soul'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      measuresPerRow: 2,
      bars: [
        { chords: [], restBars: 3 },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 2 },
            { degree: '4 7', chordName: 'D7', beat: 3, duration: 2 },
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
            { degree: '7 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '5 min7', chordName: 'Emin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 2 },
            { degree: '4 7', chordName: 'D7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '7 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '4 min7/6', chordName: 'Dmin7/F', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'E7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_c',
      label: 'Section C',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 7', chordName: 'D7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '7 maj/2', chordName: 'G/B', beat: 1, duration: 2 },
            { degree: '♭2 7', chordName: 'B♭7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 2 },
            { degree: '4 7', chordName: 'D7', beat: 3, duration: 2 },
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
            { degree: '7 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '5 min7', chordName: 'Emin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 2 },
            { degree: '4 7', chordName: 'D7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '7 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '4 min7/6', chordName: 'Dmin7/F', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'E7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 7', chordName: 'D7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '7 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '3 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '7 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        { chords: [{ degree: '3 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 7', chordName: 'B7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_g',
      label: 'Section G',
      bars: [
        { chords: [{ degree: '3 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Bmin7', beat: 1, duration: 2 },
            { degree: '2 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 2 },
            { degree: '4 7', chordName: 'D7', beat: 3, duration: 2 },
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
            { degree: '7 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '5 min7', chordName: 'Emin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 2 },
            { degree: '4 7', chordName: 'D7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '7 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '4 min7/6', chordName: 'Dmin7/F', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'E7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_i',
      label: 'Section I',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 7', chordName: 'D7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'E7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_e_2',
      label: 'Section E',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 1 },
            { degree: '2 min7', chordName: 'Bmin7', beat: 2, duration: 1 },
            { degree: '3 maj', chordName: 'C', beat: 3, duration: 1 },
            { degree: '1 maj/♯3', chordName: 'A/C♯', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'D', beat: 1, duration: 1 },
            { degree: '2 maj/♭5', chordName: 'B/D♯', beat: 2, duration: 1 },
            { degree: '5 7', chordName: 'E7', beat: 3, duration: 1 },
            { degree: '6 7', chordName: 'F7', beat: 4, duration: 1 },
            { degree: '♯6 7', chordName: 'F♯7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '7 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '6 7', chordName: 'F7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'E7', beat: 1, duration: 4 }] },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=CjO7qdADCyQ' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
