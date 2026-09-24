import type { Song } from '@/curriculum/types/songLibrary';

export const hold_on_im_comin: Song = {
  id: 'hold_on_im_comin',
  title: 'Hold On, I’m Comin’',
  artist: 'Sam and Dave',
  year: 2007,
  historicalDescription:
    "Sam and Dave release 'Hold On, I'm Comin'', a defining anthem of Southern soul recorded at Stax Records in Memphis. Written by Isaac Hayes and David Porter, the track's call-and-response vocals and tight rhythm section capture the raw, church-inflected energy that makes Stax the rival of Motown. It becomes one of the duo's signature hits and a cornerstone of soul music.",
  key: 'A♭ mixolydian',
  keyRoot: 68,
  mode: 'mixolydian',
  tempo: 106,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['funk'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭3 maj', chordName: 'C♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'D♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'D♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_c',
      label: 'Section C',
      bars: [
        { chords: [{ degree: '4 7', chordName: 'D♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'D♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭3 maj', chordName: 'C♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭3 maj', chordName: 'C♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        { chords: [{ degree: '4 7', chordName: 'D♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'D♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'D♭7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭3 maj', chordName: 'C♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'C♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'C♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭3 maj', chordName: 'C♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'D♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'D♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'D♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'D♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭3 maj', chordName: 'C♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭3 maj', chordName: 'C♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 7', chordName: 'A♭7', beat: 1, duration: 4 }] },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=6JElrEbAcwY' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/sam-and-dave.webp',
  popularity: 50,
};
