import type { Song } from '@/curriculum/types/songLibrary';

export const you_are_the_best_thing: Song = {
  id: 'you_are_the_best_thing',
  title: 'You Are the Best Thing',
  artist: 'Ray Lamontagne',
  year: 2008,
  historicalDescription:
    "Ray LaMontagne releases 'You Are the Best Thing' from his album Gossip in the Grain, a warm, soul-drenched declaration that stands apart from his brooding folk catalog. Drawing on classic Southern soul and vintage R&B, the song becomes one of his most beloved tracks — a staple at weddings and a testament to his ability to channel timeless American music.",
  key: 'B♭ major',
  keyRoot: 70,
  mode: 'major',
  tempo: 86,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        { chords: [] },
        {
          chords: [
            { degree: '1 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '3 7', chordName: 'D7', beat: 2, duration: 1 },
            { degree: '6 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '3 7', chordName: 'D7', beat: 2, duration: 1 },
            { degree: '6 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '3 7', chordName: 'D7', beat: 2, duration: 1 },
            { degree: '6 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_b',
      label: 'Section B',
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '3 7', chordName: 'D7', beat: 2, duration: 1 },
            { degree: '6 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'E♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'B♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      measuresPerRow: 6,
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '6 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '6 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_d',
      label: 'Section D',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '6 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'F', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '3 7', chordName: 'D7', beat: 2, duration: 1 },
            { degree: '6 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '3 7', chordName: 'D7', beat: 2, duration: 1 },
            { degree: '6 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '3 7', chordName: 'D7', beat: 2, duration: 1 },
            { degree: '6 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
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
            { degree: '1 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '3 7', chordName: 'D7', beat: 2, duration: 1 },
            { degree: '6 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'E♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'B♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      measuresPerRow: 6,
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '6 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '6 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_h',
      label: 'Section H',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '6 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'F', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '3 7', chordName: 'D7', beat: 2, duration: 1 },
            { degree: '6 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '3 7', chordName: 'D7', beat: 2, duration: 1 },
            { degree: '6 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '3 7', chordName: 'D7', beat: 2, duration: 1 },
            { degree: '6 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '3 7', chordName: 'D7', beat: 2, duration: 1 },
            { degree: '6 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
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
            { degree: '1 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '3 7', chordName: 'D7', beat: 2, duration: 1 },
            { degree: '6 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'E♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'B♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '3 7', chordName: 'D7', beat: 3, duration: 2 },
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
            { degree: '6 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_l',
      label: 'Section L',
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'F', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_g',
      label: 'Section G',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '3 7', chordName: 'D7', beat: 2, duration: 1 },
            { degree: '6 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '3 7', chordName: 'D7', beat: 2, duration: 1 },
            { degree: '6 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '3 7', chordName: 'D7', beat: 2, duration: 1 },
            { degree: '6 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
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
            { degree: '1 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '3 7', chordName: 'D7', beat: 2, duration: 1 },
            { degree: '6 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'E♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'B♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_h_2',
      label: 'Section H',
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '3 7', chordName: 'D7', beat: 2, duration: 1 },
            { degree: '6 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '3 7', chordName: 'D7', beat: 2, duration: 1 },
            { degree: '6 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '3 7', chordName: 'D7', beat: 2, duration: 1 },
            { degree: '6 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '3 7', chordName: 'D7', beat: 2, duration: 1 },
            { degree: '6 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_p',
      label: 'Section P',
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '3 7', chordName: 'D7', beat: 2, duration: 1 },
            { degree: '6 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'E♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'B♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
          fermata: true,
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=pkntWssHboY' },
  ],
  artistImageSource: 'commissioned',

  artistImageRef: '/artists/ray-lamontagne.webp',
  popularity: 50,
};
