import type { Song } from '@/curriculum/types/songLibrary';

export const i_wish: Song = {
  id: 'i_wish',
  title: 'I Wish',
  artist: 'Stevie Wonder',
  year: 1976,
  historicalDescription:
    "Stevie Wonder releases 'I Wish' in 1976, a nostalgic funk powerhouse driven by a rolling bass line and vivid memories of childhood mischief. The track becomes a cornerstone of his landmark run of 1970s albums, cementing his reputation as one of the era's most complete musical visionaries. Its irresistible groove influences generations of funk, R&B, and hip-hop artists.",
  key: 'A♭ minor',
  keyRoot: 68,
  mode: 'minor',
  tempo: 212,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['funk'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      repeatCount: 4,
      bars: [
        {
          chords: [
            { degree: '5 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        {
          chords: [
            { degree: '5 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_c',
      label: 'Section C',
      bars: [
        {
          chords: [
            { degree: '5 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      bars: [
        {
          chords: [
            { degree: '5 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      bars: [
        {
          chords: [
            { degree: '5 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        { chords: [{ degree: '2 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♯3 7', chordName: 'C7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♯6 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'A♭min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_g',
      label: 'Section G',
      bars: [
        { chords: [{ degree: '2 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♯3 7', chordName: 'C7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♯6 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '2 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      repeatCount: 4,
      bars: [
        {
          chords: [
            { degree: '5 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_e_2',
      label: 'Section E',
      measuresPerRow: 5,
      bars: [
        {
          chords: [
            { degree: '5 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [] },
        { chords: [] },
        { chords: [] },
        { chords: [] },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      bars: [
        {
          chords: [
            { degree: '5 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_k',
      label: 'Section K',
      bars: [
        {
          chords: [
            { degree: '5 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_g_2',
      label: 'Section G',
      bars: [
        {
          chords: [
            { degree: '5 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_m',
      label: 'Section M',
      bars: [
        {
          chords: [
            { degree: '5 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_h',
      label: 'Section H',
      bars: [
        { chords: [{ degree: '2 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♯3 7', chordName: 'C7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♯6 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'A♭min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_o',
      label: 'Section O',
      bars: [
        { chords: [{ degree: '2 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♯3 7', chordName: 'C7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♯6 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '2 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_i',
      label: 'Section I',
      bars: [
        {
          chords: [
            { degree: '5 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=B6cqrjlqjuM' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
