import type { Song } from '@/curriculum/types/songLibrary';

export const so_far_away: Song = {
  id: 'so_far_away',
  title: 'So Far Away',
  artist: 'Carole King',
  year: 1971,
  historicalDescription:
    "Carole King releases 'So Far Away' as part of her landmark album Tapestry, a tender meditation on distance and longing that resonates with a generation navigating change. The song exemplifies the intimate singer-songwriter movement sweeping early 1970s America, where confessional lyrics and understated piano replace the bombast of the previous decade. Tapestry becomes one of the best-selling albums in history, cementing King's transformation from Brill Building hitmaker to iconic solo artist.",
  key: 'E minor',
  keyRoot: 64,
  mode: 'minor',
  tempo: 72,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      measuresPerRow: 8,
      bars: [
        { chords: [{ degree: '7 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7/7', chordName: 'Emin7/D', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '7 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7/7', chordName: 'Emin7/D', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '7 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7/7', chordName: 'Emin7/D', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '7 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7/7', chordName: 'Emin7/D', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        { chords: [{ degree: '7 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [] },
        { chords: [{ degree: '3 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 2 },
            { degree: '1 min7/4', chordName: 'Emin7/A', beat: 3, duration: 2 },
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
            { degree: '7 maj', chordName: 'D', beat: 1, duration: 2 },
            { degree: '3 maj/7', chordName: 'G/D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '7 maj', chordName: 'D', beat: 1, duration: 1 },
            { degree: '3 maj', chordName: 'G', beat: 2, duration: 1 },
            { degree: '2 min7', chordName: 'F♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 2 },
            { degree: '1 min7/4', chordName: 'Emin7/A', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '7 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_d',
      label: 'Section D',
      bars: [
        { chords: [{ degree: '3 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 2 },
            { degree: '1 min7/4', chordName: 'Emin7/A', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '7 maj', chordName: 'D', beat: 1, duration: 2 },
            { degree: '3 maj/7', chordName: 'G/D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '7 maj', chordName: 'D', beat: 1, duration: 1 },
            { degree: '3 maj', chordName: 'G', beat: 2, duration: 1 },
            { degree: '2 min7', chordName: 'F♯min7', beat: 3, duration: 1 },
            { degree: '1 min7', chordName: 'Emin7', beat: 4, duration: 1 },
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
            { degree: '1 min7/4', chordName: 'Emin7/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 maj', chordName: 'D', beat: 1, duration: 2 },
            { degree: '4 maj/♯6', chordName: 'A/C♯', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Bmin7', beat: 1, duration: 2 },
            { degree: '7 maj/4', chordName: 'D/A', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '3 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '7 maj/2', chordName: 'D/F♯', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 2 },
            { degree: '1 min7/4', chordName: 'Emin7/A', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '7 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
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
            { degree: '1 min7/4', chordName: 'Emin7/A', beat: 1, duration: 2 },
            { degree: '5 min7', chordName: 'Bmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 2 },
            { degree: '1 min7/4', chordName: 'Emin7/A', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '7 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        { chords: [{ degree: '3 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 2 },
            { degree: '1 min7/4', chordName: 'Emin7/A', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '7 maj', chordName: 'D', beat: 1, duration: 2 },
            { degree: '3 maj/7', chordName: 'G/D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '7 maj', chordName: 'D', beat: 1, duration: 1 },
            { degree: '3 maj', chordName: 'G', beat: 2, duration: 1 },
            { degree: '2 min7', chordName: 'F♯min7', beat: 3, duration: 1 },
            { degree: '1 min7', chordName: 'Emin7', beat: 4, duration: 1 },
          ],
        },
      ],
    },
    {
      id: 'section_i',
      label: 'Section I',
      bars: [
        {
          chords: [
            { degree: '1 min7/4', chordName: 'Emin7/A', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '7 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 2 },
            { degree: '1 min7/4', chordName: 'Emin7/A', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [{ degree: '4 7', chordName: 'A7sus', beat: 1, duration: 4 }],
        },
        { chords: [] },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 2 },
            { degree: '1 min7/4', chordName: 'Emin7/A', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '7 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_k',
      label: 'Section K',
      measuresPerRow: 5,
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7/4', chordName: 'Emin7/A', beat: 1, duration: 2 },
            { degree: '5 min7', chordName: 'Bmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7/4', chordName: 'Emin7/A', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_e_2',
      label: 'Section E',
      bars: [
        { chords: [{ degree: '7 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [] },
        { chords: [{ degree: '3 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 2 },
            { degree: '1 min7/4', chordName: 'Emin7/A', beat: 3, duration: 2 },
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
            { degree: '7 maj', chordName: 'D', beat: 1, duration: 2 },
            { degree: '3 maj/7', chordName: 'G/D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '7 maj', chordName: 'D', beat: 1, duration: 1 },
            { degree: '3 maj', chordName: 'G', beat: 2, duration: 1 },
            { degree: '2 min7', chordName: 'F♯min7', beat: 3, duration: 1 },
            { degree: '1 min7', chordName: 'Emin7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '1 min7/4', chordName: 'Emin7/A', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '7 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_f_2',
      label: 'Section F',
      bars: [
        { chords: [{ degree: '3 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 2 },
            { degree: '1 min7/4', chordName: 'Emin7/A', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '7 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [] },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=UofYl3dataU' },
  ],
  artistImageSource: 'commissioned',

  artistImageRef: '/artists/carole-king.webp',
  popularity: 50,
};
