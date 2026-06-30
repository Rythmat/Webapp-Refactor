import type { Song } from '@/curriculum/types/songLibrary';

export const a_thousand_years: Song = {
  id: 'a_thousand_years',
  title: 'A Thousand Years',
  artist: 'Christina Perri',
  year: 2011,
  historicalDescription:
    "Christina Perri releases 'A Thousand Years' as part of The Twilight Saga: Breaking Dawn soundtrack, turning a declaration of eternal love into a global phenomenon. The song transcends its film origins, becoming one of the most streamed love songs of the decade and a staple at weddings worldwide — a rare pop ballad that genuinely crosses over from teen fantasy into timeless romance.",
  key: 'F major',
  keyRoot: 65,
  mode: 'major',
  tempo: 142,
  timeSignature: [6, 4],

  difficulty: 2,
  genreTags: ['pop'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 6 }],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'F/A', beat: 1, duration: 3 },
            { degree: '2 min7', chordName: 'Gmin7', beat: 4, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'F', beat: 1, duration: 3 },
            { degree: '♭7 maj', chordName: 'E♭', beat: 4, duration: 3 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 6 }] },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      measuresPerRow: 8,
      bars: [
        {
          chords: [{ degree: '♭7 maj', chordName: 'E♭', beat: 1, duration: 6 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'E♭', beat: 1, duration: 6 }],
        },
        {
          chords: [
            { degree: '4 maj/6', chordName: 'B♭/D', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/6', chordName: 'B♭/D', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'F/A', beat: 1, duration: 3 },
            { degree: '4 maj', chordName: 'B♭', beat: 4, duration: 3 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'E♭', beat: 1, duration: 6 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'E♭', beat: 1, duration: 6 }],
        },
      ],
    },
    {
      id: 'section_c',
      label: 'Section C',
      measuresPerRow: 8,
      bars: [
        {
          chords: [
            { degree: '4 maj/6', chordName: 'B♭/D', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/6', chordName: 'B♭/D', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'F/A', beat: 1, duration: 3 },
            { degree: '4 maj', chordName: 'B♭', beat: 4, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Cmin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Cmin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 6 }] },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      measuresPerRow: 6,
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 6 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 6 }],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'F/A', beat: 1, duration: 3 },
            { degree: '2 min7', chordName: 'Gmin7', beat: 4, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 6 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'E♭', beat: 1, duration: 6 }],
        },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 6 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'E♭', beat: 1, duration: 6 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'E♭', beat: 1, duration: 6 }],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      measuresPerRow: 8,
      bars: [
        {
          chords: [{ degree: '♭7 maj', chordName: 'E♭', beat: 1, duration: 6 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'E♭', beat: 1, duration: 6 }],
        },
        {
          chords: [
            { degree: '4 maj/6', chordName: 'B♭/D', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/6', chordName: 'B♭/D', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'F/A', beat: 1, duration: 3 },
            { degree: '4 maj', chordName: 'B♭', beat: 4, duration: 3 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'E♭', beat: 1, duration: 6 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'E♭', beat: 1, duration: 6 }],
        },
      ],
    },
    {
      id: 'section_g',
      label: 'Section G',
      measuresPerRow: 8,
      bars: [
        {
          chords: [
            { degree: '4 maj/6', chordName: 'B♭/D', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/6', chordName: 'B♭/D', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'F/A', beat: 1, duration: 3 },
            { degree: '4 maj', chordName: 'B♭', beat: 4, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Cmin7', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 6 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      measuresPerRow: 7,
      repeatCount: 3,
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 6 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 6 }],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'F/A', beat: 1, duration: 3 },
            { degree: '2 min7', chordName: 'Gmin7', beat: 4, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 6 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'E♭', beat: 1, duration: 6 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 6 }] },
      ],
    },
    {
      id: 'section_e_2',
      label: 'Section E',
      measuresPerRow: 8,
      bars: [
        {
          chords: [
            { degree: '5 min7', chordName: 'Cmin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Cmin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '5 min7', chordName: 'Cmin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Cmin7', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 3 },
            { degree: '1 maj/3', chordName: 'F/A', beat: 4, duration: 3 },
          ],
        },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      measuresPerRow: 7,
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 6 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'B♭', beat: 1, duration: 6 }],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'F/A', beat: 1, duration: 3 },
            { degree: '2 min7', chordName: 'Gmin7', beat: 4, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 6 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'E♭', beat: 1, duration: 6 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 6 }] },
      ],
    },
    {
      id: 'section_g_2',
      label: 'Section G',
      measuresPerRow: 9,
      bars: [
        {
          chords: [{ degree: '♭7 maj', chordName: 'E♭', beat: 1, duration: 6 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'E♭', beat: 1, duration: 6 }],
        },
        {
          chords: [
            { degree: '4 maj/6', chordName: 'B♭/D', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/6', chordName: 'B♭/D', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'E♭', beat: 1, duration: 6 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'E♭', beat: 1, duration: 6 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Gmin7', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'F', beat: 1, duration: 6 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'E♭', beat: 1, duration: 6 }],
          fermata: true,
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=rtOvBOTyX00' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/christina-perri.webp',
  popularity: 50,
};
