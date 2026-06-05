import type { Song } from '@/curriculum/types/songLibrary';

export const you_make_me_feel_like_a_natural_woman: Song = {
  id: 'you_make_me_feel_like_a_natural_woman',
  title: 'You Make Me Feel (Like A Natural Woman)',
  artist: 'Carole King',
  year: 1971,
  historicalDescription:
    "Carole King records 'You Make Me Feel (Like A Natural Woman)' for her landmark album Tapestry, transforming a song she originally wrote for Aretha Franklin into a deeply personal statement of vulnerability and joy. Where Aretha's 1967 version was a soul triumph, King's piano-driven rendition strips it to something intimate and confessional — defining the singer-songwriter movement of the early 1970s.",
  key: 'A major',
  keyRoot: 69,
  mode: 'major',
  tempo: 83,
  timeSignature: [6, 8],

  difficulty: 2,
  genreTags: ['pop'],
  techniques: [],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'E/G♯', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'G', beat: 1, duration: 6 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 6 }] },
      ],
    },
    {
      id: 'section_b',
      label: 'Section B',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'E/G♯', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'G', beat: 1, duration: 6 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 6 }] },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      measuresPerRow: 8,
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'Bmin7', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Bmin7', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Bmin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'C♯min7', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 6 }] },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 6 }] },
      ],
    },
    {
      id: 'section_d',
      label: 'Section D',
      measuresPerRow: 8,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 6 }] },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 6 }] },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Bmin7', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 6 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'E/G♯', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'G', beat: 1, duration: 6 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 6 }] },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'E/G♯', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'G', beat: 1, duration: 6 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 6 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      measuresPerRow: 8,
      bars: [
        {
          chords: [
            { degree: '2 min7', chordName: 'Bmin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'C♯min7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Bmin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'C♯min7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Bmin7', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'C♯min7', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 6 }] },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 6 }] },
      ],
    },
    {
      id: 'section_h',
      label: 'Section H',
      measuresPerRow: 8,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 6 }] },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 6 }] },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Bmin7', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 6 }] },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 6 }] },
        {
          chords: [{ degree: '1 7', chordName: 'A7sus', beat: 1, duration: 6 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 6 }] },
        {
          chords: [{ degree: '1 7', chordName: 'A7sus', beat: 1, duration: 6 }],
        },
      ],
    },
    {
      id: 'section_j',
      label: 'Section J',
      measuresPerRow: 6,
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 6 }] },
        {
          chords: [{ degree: '4 7', chordName: 'D7sus', beat: 1, duration: 6 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '1 maj/3', chordName: 'A/C♯', beat: 1, duration: 6 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Bmin7', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 6 }] },
      ],
    },
    {
      id: 'section_f_2',
      label: 'Section F',
      measuresPerRow: 8,
      repeatCount: 3,
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 6 }] },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 6 }] },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 6 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 6 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Bmin7', beat: 1, duration: 6 },
          ],
        },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 6 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 6 }],
          fermata: true,
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=MOyvYnkdEcc' },
  ],
  artistImageSource: 'commissioned',

  artistImageRef: '/artists/carole-king.webp',
  popularity: 50,
};
