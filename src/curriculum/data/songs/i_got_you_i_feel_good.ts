import type { Song } from '@/curriculum/types/songLibrary';

export const i_got_you_i_feel_good: Song = {
  id: 'i_got_you_i_feel_good',
  title: 'I Got You (I Feel Good)',
  artist: 'James Brown',
  year: 1965,
  historicalDescription:
    "James Brown releases 'I Got You (I Feel Good)', a explosive burst of joy that becomes one of the most recognizable opening riffs in popular music. The track showcases Brown's raw vocal power and the tight, rhythmic interplay that is pushing soul toward something harder and more percussive — the sound the world will soon call funk. It cements Brown's status as the hardest-working man in show business.",
  key: 'D major',
  keyRoot: 62,
  mode: 'major',
  tempo: 145,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['funk'],
  techniques: [],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'D7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_b',
      label: 'Section B',
      bars: [
        { chords: [{ degree: '4 7', chordName: 'G7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'G7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'D7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_c',
      label: 'Section C',
      bars: [
        { chords: [{ degree: '5 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'G7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'D7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      bars: [
        { chords: [], restBars: 4 },
        { chords: [{ degree: '4 7', chordName: 'G7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'G7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'D7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'D7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      bars: [
        { chords: [{ degree: '4 7', chordName: 'G7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'G7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'A7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'D7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_h',
      label: 'Section H',
      bars: [
        { chords: [{ degree: '4 7', chordName: 'G7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'G7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'D7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_i',
      label: 'Section I',
      bars: [
        { chords: [{ degree: '5 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'G7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'D7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        { chords: [], restBars: 4 },
        { chords: [{ degree: '4 7', chordName: 'G7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'G7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'D7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_k',
      label: 'Section K',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'D7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_l',
      label: 'Section L',
      bars: [
        { chords: [{ degree: '4 7', chordName: 'G7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'G7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'A7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_e_2',
      label: 'Section E',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'D7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_n',
      label: 'Section N',
      bars: [
        { chords: [{ degree: '4 7', chordName: 'G7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'G7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'D7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_o',
      label: 'Section O',
      bars: [
        { chords: [{ degree: '5 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'G7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'D7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_f_2',
      label: 'Section F',
      bars: [
        { chords: [{ degree: '5 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'G7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'D7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_q',
      label: 'Section Q',
      measuresPerRow: 5,
      bars: [
        { chords: [{ degree: '5 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'G7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'D7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 7', chordName: 'D7', beat: 1, duration: 4 }],
          fermata: true,
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=pTdihu-mp90' },
  ],
  artistImageSource: 'commissioned',

  artistImageRef: '/artists/james-brown.webp',
  popularity: 50,
};
