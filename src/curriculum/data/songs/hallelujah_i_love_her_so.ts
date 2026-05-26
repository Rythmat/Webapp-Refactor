import type { Song } from '@/curriculum/types/songLibrary';

export const hallelujah_i_love_her_so: Song = {
  id: 'hallelujah_i_love_her_so',
  title: 'Hallelujah I Love Her So',
  artist: 'Ray Charles',
  year: 1956,
  historicalDescription:
    "Ray Charles records 'Hallelujah I Love Her So' in 1956, fusing the fervor of gospel with the earthiness of rhythm and blues in a way that scandalizes purists and electrifies listeners. The song captures Charles at the center of his own revolution — the moment he proves that sacred feeling and secular love are the same irresistible force. It becomes one of his signature early recordings, cementing the blueprint for soul music.",
  key: 'B♭ major',
  keyRoot: 70,
  mode: 'major',
  tempo: 146,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['jazz', 'pop'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      measuresPerRow: 5,
      bars: [
        { chords: [] },
        { chords: [{ degree: '5 7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 7', chordName: 'G7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 7', chordName: 'G7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_b',
      label: 'Section B',
      measuresPerRow: 7,
      bars: [
        {
          chords: [
            { degree: '1 maj/5', chordName: 'B♭/F', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '6 7', chordName: 'G7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'F7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'E♭', beat: 1, duration: 2 },
            { degree: '♭5 dim7', chordName: 'Edim7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'F7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      measuresPerRow: 8,
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'B♭/D', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'E♭', beat: 1, duration: 2 },
            { degree: '♭5 dim7', chordName: 'Edim7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'F7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'B♭/D', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'E♭', beat: 1, duration: 2 },
            { degree: '♭5 dim7', chordName: 'Edim7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'F7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_d',
      label: 'Section D',
      measuresPerRow: 8,
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 7/3', chordName: 'B♭7/D', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 7/3', chordName: 'B♭7/D', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭5 dim7', chordName: 'Edim7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭5 dim7', chordName: 'Edim7', beat: 1, duration: 4 },
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
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '2 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'F7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      measuresPerRow: 8,
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'B♭/D', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'E♭', beat: 1, duration: 2 },
            { degree: '♭5 dim7', chordName: 'Edim7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'F7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'B♭/D', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'E♭', beat: 1, duration: 2 },
            { degree: '♭5 dim7', chordName: 'Edim7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'F7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_g',
      label: 'Section G',
      measuresPerRow: 8,
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 7/3', chordName: 'B♭7/D', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 7/3', chordName: 'B♭7/D', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭5 dim7', chordName: 'Edim7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭5 dim7', chordName: 'Edim7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_h',
      label: 'Section H',
      measuresPerRow: 6,
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '2 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'F7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      measuresPerRow: 8,
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭5 dim7', chordName: 'Edim7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭5 dim7', chordName: 'Edim7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_j',
      label: 'Section J',
      measuresPerRow: 8,
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 7', chordName: 'D♭7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 7', chordName: 'D♭7', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '2 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'F7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      measuresPerRow: 8,
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'B♭/D', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'E♭', beat: 1, duration: 2 },
            { degree: '♭5 dim7', chordName: 'Edim7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'F7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'B♭/D', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'E♭', beat: 1, duration: 2 },
            { degree: '♭5 dim7', chordName: 'Edim7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'F7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_l',
      label: 'Section L',
      measuresPerRow: 8,
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 7/3', chordName: 'B♭7/D', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 7/3', chordName: 'B♭7/D', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭5 dim7', chordName: 'Edim7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭5 dim7', chordName: 'Edim7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_m',
      label: 'Section M',
      measuresPerRow: 7,
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '2 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'F7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '6 7', chordName: 'G7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_e_2',
      label: 'Section E',
      measuresPerRow: 8,
      bars: [
        { chords: [{ degree: '2 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'F7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '6 7', chordName: 'G7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'F7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '6 7', chordName: 'G7', beat: 1, duration: 4 }] },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=v-JsqKlVVGk' },
  ],
  artistImageSource: 'commissioned',

  artistImageRef: '/artists/ray-charles.webp',
  popularity: 50,
};
