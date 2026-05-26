import type { Song } from '@/curriculum/types/songLibrary';

export const the_bones: Song = {
  id: 'the_bones',
  title: 'The Bones',
  artist: 'Maren Morris',
  year: 2019,
  historicalDescription:
    "Maren Morris releases 'The Bones', a spare, emotionally grounded country ballad about the bedrock of a lasting relationship. Built on a simple metaphor — that a love is only as strong as its foundation — the song becomes one of the defining country hits of 2019, cementing Morris's place as a leading voice in modern Nashville's crossover era.",
  key: 'G major',
  keyRoot: 67,
  mode: 'major',
  tempo: 78,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['folk'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Bmin7', beat: 1, duration: 2 },
            { degree: '2 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Bmin7', beat: 1, duration: 2 },
            { degree: '2 maj', chordName: 'A', beat: 3, duration: 2 },
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
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Bmin7', beat: 1, duration: 2 },
            { degree: '2 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Bmin7', beat: 1, duration: 2 },
            { degree: '2 maj', chordName: 'A', beat: 3, duration: 2 },
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
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Bmin7', beat: 1, duration: 2 },
            { degree: '2 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Bmin7', beat: 1, duration: 2 },
            { degree: '2 maj', chordName: 'A', beat: 3, duration: 2 },
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
            { degree: '5 maj/7', chordName: 'D/F♯', beat: 1, duration: 1 },
            { degree: '1 maj', chordName: 'G', beat: 2, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '2 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '3 min7', chordName: 'Bmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'D/F♯', beat: 1, duration: 1 },
            { degree: '1 maj', chordName: 'G', beat: 2, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '2 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '3 min7', chordName: 'Bmin7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      measuresPerRow: 6,
      bars: [
        {
          chords: [
            { degree: '5 maj/7', chordName: 'D/F♯', beat: 1, duration: 1 },
            { degree: '1 maj', chordName: 'G', beat: 2, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '2 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '3 min7', chordName: 'Bmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'D/F♯', beat: 1, duration: 1 },
            { degree: '1 maj', chordName: 'G', beat: 2, duration: 3 },
          ],
        },
        { chords: [{ degree: '2 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Bmin7', beat: 1, duration: 2 },
            { degree: '2 maj', chordName: 'A', beat: 3, duration: 2 },
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
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Bmin7', beat: 1, duration: 2 },
            { degree: '2 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Bmin7', beat: 1, duration: 2 },
            { degree: '2 maj', chordName: 'A', beat: 3, duration: 2 },
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
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Bmin7', beat: 1, duration: 2 },
            { degree: '2 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Bmin7', beat: 1, duration: 2 },
            { degree: '2 maj', chordName: 'A', beat: 3, duration: 2 },
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
            { degree: '5 maj/7', chordName: 'D/F♯', beat: 1, duration: 1 },
            { degree: '1 maj', chordName: 'G', beat: 2, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '2 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '3 min7', chordName: 'Bmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'D/F♯', beat: 1, duration: 1 },
            { degree: '1 maj', chordName: 'G', beat: 2, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '2 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '3 min7', chordName: 'Bmin7', beat: 3, duration: 2 },
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
            { degree: '5 maj/7', chordName: 'D/F♯', beat: 1, duration: 1 },
            { degree: '1 maj', chordName: 'G', beat: 2, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '2 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '3 min7', chordName: 'Bmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'D/F♯', beat: 1, duration: 1 },
            { degree: '1 maj', chordName: 'G', beat: 2, duration: 3 },
          ],
        },
        { chords: [{ degree: '2 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_e_2',
      label: 'Section E',
      bars: [
        {
          chords: [
            { degree: '5 maj/7', chordName: 'D/F♯', beat: 1, duration: 1 },
            { degree: '1 maj', chordName: 'G', beat: 2, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '2 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '3 min7', chordName: 'Bmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'D/F♯', beat: 1, duration: 1 },
            { degree: '1 maj', chordName: 'G', beat: 2, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '2 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '3 min7', chordName: 'Bmin7', beat: 3, duration: 2 },
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
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Bmin7', beat: 1, duration: 2 },
            { degree: '2 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Bmin7', beat: 1, duration: 2 },
            { degree: '2 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_l',
      label: 'Section L',
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Bmin7', beat: 1, duration: 2 },
            { degree: '2 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Bmin7', beat: 1, duration: 2 },
            { degree: '2 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_g_2',
      label: 'Section G',
      bars: [
        {
          chords: [
            { degree: '5 maj/7', chordName: 'D/F♯', beat: 1, duration: 1 },
            { degree: '1 maj', chordName: 'G', beat: 2, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '2 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '3 min7', chordName: 'Bmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'D/F♯', beat: 1, duration: 1 },
            { degree: '1 maj', chordName: 'G', beat: 2, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '2 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '3 min7', chordName: 'Bmin7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_n',
      label: 'Section N',
      bars: [
        {
          chords: [
            { degree: '5 maj/7', chordName: 'D/F♯', beat: 1, duration: 1 },
            { degree: '1 maj', chordName: 'G', beat: 2, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '2 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '3 min7', chordName: 'Bmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'D/F♯', beat: 1, duration: 1 },
            { degree: '1 maj', chordName: 'G', beat: 2, duration: 3 },
          ],
        },
        { chords: [{ degree: '2 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_h',
      label: 'Section H',
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Bmin7', beat: 1, duration: 2 },
            { degree: '2 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Bmin7', beat: 1, duration: 2 },
            { degree: '2 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=gvPMVKUI9go' },
  ],
  artistImageSource: 'commissioned',

  artistImageRef: '/artists/maren-morris.webp',
  popularity: 50,
};
