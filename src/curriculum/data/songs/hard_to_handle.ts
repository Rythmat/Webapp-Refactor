import type { Song } from '@/curriculum/types/songLibrary';

export const hard_to_handle: Song = {
  id: 'hard_to_handle',
  title: 'Hard To Handle',
  artist: 'The Black Crowes',
  year: 1990,
  historicalDescription:
    "The Black Crowes release their swaggering cover of Otis Redding's 'Hard To Handle' as one of the breakout moments from their debut era, transplanting raw Southern soul into a hard rock framework. From Atlanta, the Robinson brothers channel the spirit of classic rock and R&B at a time when grunge is beginning to dominate — proving there's still an appetite for unabashed, groove-driven rock and roll.",
  key: 'B♭ major',
  keyRoot: 70,
  mode: 'major',
  tempo: 96,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['funk'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      bars: [{ chords: [] }, { chords: [] }, { chords: [] }, { chords: [] }],
    },
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_c',
      label: 'Section C',
      measuresPerRow: 5,
      bars: [
        { chords: [{ degree: '5 7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [], restBars: 2 },
        {
          chords: [
            { degree: '4 maj', chordName: 'E♭', beat: 1, duration: 1 },
            { degree: '5 maj', chordName: 'F', beat: 2, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'A♭', beat: 1, duration: 1 },
            { degree: '4 maj', chordName: 'E♭', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'B♭', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      measuresPerRow: 3,
      bars: [
        { chords: [{ degree: '5 7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [], restBars: 2 },
      ],
    },
    {
      id: 'section_g',
      label: 'Section G',
      bars: [
        {
          chords: [
            { degree: '♭7 maj', chordName: 'A♭', beat: 1, duration: 1 },
            { degree: '4 maj', chordName: 'E♭', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'B♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'A♭', beat: 1, duration: 1 },
            { degree: '4 maj', chordName: 'E♭', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'B♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'A♭', beat: 1, duration: 1 },
            { degree: '4 maj', chordName: 'E♭', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'B♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'A♭', beat: 1, duration: 1 },
            { degree: '4 maj', chordName: 'E♭', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'B♭', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=BRcs_OzQb14' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
