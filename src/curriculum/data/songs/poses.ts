import type { Song } from '@/curriculum/types/songLibrary';

export const poses: Song = {
  id: 'poses',
  title: 'Poses',
  artist: 'Rufus Wainwright',
  year: 2001,
  historicalDescription:
    "Rufus Wainwright releases 'Poses', the title track of his second album, a lush, melancholic meditation on decadence, desire, and self-destruction set against the backdrop of New York City. With orchestral arrangements and his signature baroque pop sensibility, Wainwright carves out a space for queer vulnerability and literary ambition in an era of polished mainstream pop — proving that confessional songwriting could be both intimate and grandiose.",
  key: 'D♭ major',
  keyRoot: 61,
  mode: 'major',
  tempo: 86,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['pop'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      measuresPerRow: 8,
      bars: [
        { chords: [{ degree: '1 6', chordName: 'D♭6', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 6', chordName: 'D♭6', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 6', chordName: 'D♭6', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 6', chordName: 'D♭6', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 6', chordName: 'D♭6', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 6', chordName: 'D♭6', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 6', chordName: 'D♭6', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 6', chordName: 'D♭6', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      measuresPerRow: 8,
      bars: [
        { chords: [{ degree: '1 6', chordName: 'D♭6', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 6', chordName: 'D♭6', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'G♭/D♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'G♭/D♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 7/1', chordName: 'G♭7/D♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 7/1', chordName: 'G♭7/D♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 7', chordName: 'A♭7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 7', chordName: 'A♭7sus', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      measuresPerRow: 8,
      bars: [
        { chords: [{ degree: '1 6', chordName: 'D♭6', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 6', chordName: 'D♭6', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'G♭/D♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'G♭/D♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 7/1', chordName: 'G♭7/D♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 7/1', chordName: 'G♭7/D♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 7', chordName: 'A♭7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 7', chordName: 'A♭7sus', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      measuresPerRow: 8,
      bars: [
        { chords: [{ degree: '5 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'D♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'D♭7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 7', chordName: 'E♭7(♭9)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 7', chordName: 'E♭7(♭9)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 7', chordName: 'A♭7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 7', chordName: 'A♭7sus', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      measuresPerRow: 8,
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 7/2', chordName: 'A♭7/E♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'D♭/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 7/2', chordName: 'A♭7/E♭', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      measuresPerRow: 8,
      bars: [
        {
          chords: [
            { degree: '5 7/2', chordName: 'A♭7/E♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 7/2', chordName: 'A♭7/E♭', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      measuresPerRow: 8,
      bars: [
        { chords: [{ degree: '1 6', chordName: 'D♭6', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 6', chordName: 'D♭6', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'G♭/D♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'G♭/D♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 7/1', chordName: 'G♭7/D♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 7/1', chordName: 'G♭7/D♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 7', chordName: 'A♭7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 7', chordName: 'A♭7sus', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_f_2',
      label: 'Section F',
      measuresPerRow: 8,
      bars: [
        { chords: [{ degree: '1 6', chordName: 'D♭6', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 6', chordName: 'D♭6', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'G♭/D♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'G♭/D♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 7/1', chordName: 'G♭7/D♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 7/1', chordName: 'G♭7/D♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 7', chordName: 'A♭7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 7', chordName: 'A♭7sus', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_g',
      label: 'Section G',
      measuresPerRow: 8,
      bars: [
        { chords: [{ degree: '5 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'D♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'D♭7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 7', chordName: 'E♭7(♭9)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 7', chordName: 'E♭7(♭9)', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 7', chordName: 'A♭7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 7', chordName: 'A♭7sus', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'section_h',
      label: 'Section H',
      measuresPerRow: 8,
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 7/2', chordName: 'A♭7/E♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'D♭/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 7/2', chordName: 'A♭7/E♭', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_k',
      label: 'Section K',
      measuresPerRow: 6,
      bars: [
        {
          chords: [
            { degree: '5 7/2', chordName: 'A♭7/E♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 7/2', chordName: 'A♭7/E♭', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_i',
      label: 'Section I',
      measuresPerRow: 8,
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 7/2', chordName: 'A♭7/E♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'D♭/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'section_m',
      label: 'Section M',
      measuresPerRow: 7,
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
          fermata: true,
        },
        {
          chords: [{ degree: '1 maj', chordName: 'D♭', beat: 1, duration: 4 }],
          fermata: true,
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=T4ChJ0_wGxY' },
  ],
  artistImageSource: 'commissioned',

  artistImageRef: '/artists/rufus-wainwright.webp',
  popularity: 50,
};
