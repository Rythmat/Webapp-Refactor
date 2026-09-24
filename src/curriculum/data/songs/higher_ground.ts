import type { Song } from '@/curriculum/types/songLibrary';

export const higher_ground: Song = {
  id: 'higher_ground',
  title: 'Higher Ground',
  artist: 'Stevie Wonder',
  year: 1973,
  historicalDescription:
    "Stevie Wonder records 'Higher Ground' in 1973, a self-produced funk powerhouse driven by his own clavinet and drum machine — a rare feat of one-man studio mastery. Part of his celebrated 'classic period', the song channels spiritual urgency into a relentless groove, reflecting Wonder's belief in reincarnation and personal transcendence. It becomes one of the defining funk tracks of the decade.",
  key: 'E♭ dorian',
  keyRoot: 63,
  mode: 'dorian',
  tempo: 122,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['funk'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      repeatCount: 3,
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'G♭', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'G♭', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'G♭', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'G♭', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'G♭', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'G♭', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'G♭', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'G♭', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_c',
      label: 'Section C',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'G♭', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'G♭', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'G♭', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'G♭', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'A♭', beat: 3, duration: 2 },
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
            { degree: '2 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'A♭', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'B♭', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '2 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '♭7 7', chordName: 'D♭7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 7', chordName: 'D♭7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'G♭', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'G♭', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'G♭', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'G♭', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        { chords: [{ degree: '4 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_g',
      label: 'Section G',
      bars: [
        { chords: [{ degree: '4 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_h',
      label: 'Section H',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'G♭', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'G♭', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'G♭', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'G♭', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'G♭', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'G♭', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'G♭', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'G♭', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_j',
      label: 'Section J',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'G♭', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'G♭', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'G♭', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'G♭', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_e_2',
      label: 'Section E',
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'A♭', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'B♭', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '2 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '♭7 7', chordName: 'D♭7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 7', chordName: 'D♭7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_l',
      label: 'Section L',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'G♭', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'G♭', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'G♭', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'G♭', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      bars: [
        { chords: [{ degree: '4 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_n',
      label: 'Section N',
      bars: [
        { chords: [{ degree: '4 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_g_2',
      label: 'Section G',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'G♭', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'G♭', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'G♭', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'G♭', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=1esf0efHbjM' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/stevie-wonder.webp',
  popularity: 50,
};
