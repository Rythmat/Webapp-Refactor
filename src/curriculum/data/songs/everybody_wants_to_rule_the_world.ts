import type { Song } from '@/curriculum/types/songLibrary';

export const everybody_wants_to_rule_the_world: Song = {
  id: 'everybody_wants_to_rule_the_world',
  title: 'Everybody Wants To Rule The World',
  artist: 'Tears For Fears',
  year: 1985,
  historicalDescription:
    "Tears For Fears release 'Everybody Wants To Rule The World', a sleek, anthemic meditation on power and ambition that becomes one of the defining songs of the mid-1980s. Its irresistible blend of new wave polish and arena-rock sweep captures the mood of a decade obsessed with wealth, politics, and control. The song tops charts on both sides of the Atlantic, cementing the British duo as global pop icons.",
  key: 'D major',
  keyRoot: 62,
  mode: 'major',
  tempo: 102,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['pop', 'rock'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      bars: [{ chords: [], restBars: 4 }],
    },
    {
      id: 'section_b',
      label: 'Section B',
      bars: [
        {
          chords: [
            { degree: '5 maj/1', chordName: 'A/D', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'G/D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/1', chordName: 'A/D', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'G/D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/1', chordName: 'A/D', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'G/D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/1', chordName: 'A/D', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'G/D', beat: 3, duration: 2 },
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
            { degree: '5 maj/1', chordName: 'A/D', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'G/D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/1', chordName: 'A/D', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'G/D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/1', chordName: 'A/D', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'G/D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/1', chordName: 'A/D', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'G/D', beat: 3, duration: 2 },
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
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
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
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 1 },
            { degree: '3 min7', chordName: 'F♯min7', beat: 2, duration: 1 },
            { degree: '4 maj', chordName: 'G', beat: 3, duration: 1 },
            { degree: '5 maj', chordName: 'A', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/1', chordName: 'A/D', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'G/D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/1', chordName: 'A/D', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'G/D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/1', chordName: 'A/D', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'G/D', beat: 3, duration: 2 },
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
            { degree: '5 maj/1', chordName: 'A/D', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'G/D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/1', chordName: 'A/D', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'G/D', beat: 3, duration: 2 },
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
            { degree: '5 maj/1', chordName: 'A/D', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'G/D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/1', chordName: 'A/D', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'G/D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/1', chordName: 'A/D', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'G/D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/1', chordName: 'A/D', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'G/D', beat: 3, duration: 2 },
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
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 1 },
            { degree: '3 min7', chordName: 'F♯min7', beat: 2, duration: 1 },
            { degree: '4 maj', chordName: 'G', beat: 3, duration: 1 },
            { degree: '5 maj', chordName: 'A', beat: 4, duration: 1 },
          ],
        },
      ],
    },
    {
      id: 'section_e_2',
      label: 'Section E',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj', chordName: 'D', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj', chordName: 'D', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj', chordName: 'D', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_f_2',
      label: 'Section F',
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 1 },
            { degree: '3 min7', chordName: 'F♯min7', beat: 2, duration: 1 },
            { degree: '4 maj', chordName: 'G', beat: 3, duration: 1 },
            { degree: '5 maj', chordName: 'A', beat: 4, duration: 1 },
          ],
        },
      ],
    },
    {
      id: 'section_g',
      label: 'Section G',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj', chordName: 'D', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj', chordName: 'D', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'A', beat: 3, duration: 2 },
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
            { degree: '6 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_i',
      label: 'Section I',
      bars: [
        {
          chords: [
            { degree: '5 maj/1', chordName: 'A/D', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'G/D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/1', chordName: 'A/D', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'G/D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/1', chordName: 'A/D', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'G/D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/1', chordName: 'A/D', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'G/D', beat: 3, duration: 2 },
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
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Emin7', beat: 1, duration: 1 },
            { degree: '3 min7', chordName: 'F♯min7', beat: 2, duration: 1 },
            { degree: '4 maj', chordName: 'G', beat: 3, duration: 1 },
            { degree: '5 maj', chordName: 'A', beat: 4, duration: 1 },
          ],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=aGCdLKXNF3w' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/tears-for-fears.webp',
  popularity: 50,
};
