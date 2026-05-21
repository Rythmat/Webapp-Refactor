import type { Song } from '@/curriculum/types/songLibrary';

export const change_the_world: Song = {
  id: 'change_the_world',
  title: 'Change The World',
  artist: 'Eric Clapton',
  year: 1996,
  historicalDescription:
    "Eric Clapton releases 'Change The World' in 1996, a warm, understated blues-pop ballad that reaches audiences far beyond his rock and blues roots. Originally recorded for the Phenomenon soundtrack, the song wins three Grammy Awards including Record of the Year — a late-career triumph that introduces Clapton's soulful restraint to a new generation of listeners.",
  key: 'E major',
  keyRoot: 64,
  mode: 'major',
  tempo: 96,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['blues_rock'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 2 },
            { degree: '♭3 maj', chordName: 'G', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_b',
      label: 'Section B',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 2 },
            { degree: '♭3 maj', chordName: 'G', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'B7sus', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7/1', chordName: 'F♯min7/E', beat: 1, duration: 2 },
            { degree: '♭3 maj/1', chordName: 'G/E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭3 maj/1', chordName: 'G/E', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7/1', chordName: 'F♯min7/E', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_d',
      label: 'Section D',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7/1', chordName: 'F♯min7/E', beat: 1, duration: 2 },
            { degree: '♭3 maj/1', chordName: 'G/E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭3 maj/1', chordName: 'G/E', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7/1', chordName: 'F♯min7/E', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 min7/4', chordName: 'Bmin7/A', beat: 1, duration: 2 },
            { degree: '♭6 maj/4', chordName: 'C/A', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj/4', chordName: 'C/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7/4', chordName: 'Bmin7/A', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7/1', chordName: 'F♯min7/E', beat: 1, duration: 2 },
            { degree: '♭3 maj/1', chordName: 'G/E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭3 maj/1', chordName: 'G/E', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7/1', chordName: 'F♯min7/E', beat: 1, duration: 2 },
            { degree: '3 7', chordName: 'G♯7', beat: 3, duration: 2 },
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
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 7', chordName: 'G♯7', beat: 1, duration: 2 },
            { degree: '6 min7', chordName: 'C♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 min7', chordName: 'D♯min7b5', beat: 1, duration: 2 },
            { degree: '3 7', chordName: 'G♯7', beat: 3, duration: 1 },
            { degree: '6 min7', chordName: 'C♯min7', beat: 4, duration: 1 },
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
            { degree: '7 min7', chordName: 'D♯min7b5', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 7', chordName: 'G♯7', beat: 1, duration: 1 },
            { degree: '6 min7', chordName: 'C♯min7', beat: 2, duration: 1 },
            { degree: '♭6 min7', chordName: 'Cmin7', beat: 3, duration: 1 },
            { degree: '5 min7', chordName: 'Bmin7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '1 maj/3', chordName: 'E/G♯', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭3 dim7', chordName: 'Gdim7', beat: 1, duration: 2 },
            { degree: '2 min7', chordName: 'F♯min7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_i',
      label: 'Section I',
      measuresPerRow: 5,
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7/1', chordName: 'F♯min7/E', beat: 1, duration: 2 },
            { degree: '♭3 maj/1', chordName: 'G/E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭3 maj/1', chordName: 'G/E', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7/1', chordName: 'F♯min7/E', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_j',
      label: 'Section J',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '1 maj/3', chordName: 'E/G♯', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'E/G♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 dim7', chordName: 'Gdim7', beat: 1, duration: 2 },
            { degree: '2 min7', chordName: 'F♯min7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 2 },
            { degree: '♭3 maj', chordName: 'G', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_l',
      label: 'Section L',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 2 },
            { degree: '♭3 maj', chordName: 'G', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 2 },
            { degree: '3 7', chordName: 'G♯7', beat: 3, duration: 2 },
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
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 7', chordName: 'G♯7', beat: 1, duration: 2 },
            { degree: '6 min7', chordName: 'C♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '7 min7', chordName: 'D♯min7b5', beat: 1, duration: 2 },
            { degree: '3 7', chordName: 'G♯7', beat: 3, duration: 1 },
            { degree: '6 min7', chordName: 'C♯min7', beat: 4, duration: 1 },
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
            { degree: '7 min7', chordName: 'D♯min7b5', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 7', chordName: 'G♯7', beat: 1, duration: 1 },
            { degree: '6 min7', chordName: 'C♯min7', beat: 2, duration: 1 },
            { degree: '♭6 min7', chordName: 'Cmin7', beat: 3, duration: 1 },
            { degree: '5 min7', chordName: 'Bmin7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '1 maj/3', chordName: 'E/G♯', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭3 dim7', chordName: 'Gdim7', beat: 1, duration: 2 },
            { degree: '2 min7', chordName: 'F♯min7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_o',
      label: 'Section O',
      bars: [
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '1 maj/3', chordName: 'E/G♯', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭3 dim7', chordName: 'Gdim7', beat: 1, duration: 2 },
            { degree: '2 min7', chordName: 'F♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '1 maj/3', chordName: 'E/G♯', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭3 dim7', chordName: 'Gdim7', beat: 1, duration: 2 },
            { degree: '2 min7', chordName: 'F♯min7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_f_2',
      label: 'Section F',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 2 },
            { degree: '♭3 maj', chordName: 'G', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
          fermata: true,
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=kntzQiaFzOQ' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
