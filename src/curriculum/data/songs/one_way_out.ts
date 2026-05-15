import type { Song } from '@/curriculum/types/songLibrary';

export const one_way_out: Song = {
  id: 'one_way_out',
  title: 'One Way Out',
  artist: 'The Allman Brothers',
  year: 2004,
  historicalDescription:
    "The Allman Brothers Band resurrect 'One Way Out' — a song rooted in the Sonny Boy Williamson blues tradition — as a live staple that showcases their unrivaled improvisational power. By 2004, the band's legendary dual-guitar interplay and extended jams remind a new generation why they remain the gold standard of American blues-rock. Few songs in their catalog capture the raw, swaggering energy of a band utterly in their element.",
  key: 'A major',
  keyRoot: 69,
  mode: 'major',
  tempo: 108,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['blues_rock'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      measuresPerRow: 1,
      bars: [{ chords: [], restBars: 14 }],
    },
    {
      id: 'verse',
      label: 'Verse',
      measuresPerRow: 6,
      bars: [
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'D7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_c',
      label: 'Section C',
      measuresPerRow: 6,
      bars: [
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      measuresPerRow: 1,
      bars: [{ chords: [], restBars: 16 }],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      measuresPerRow: 8,
      bars: [
        { chords: [{ degree: '4 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      measuresPerRow: 8,
      bars: [
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_g',
      label: 'Section G',
      measuresPerRow: 6,
      bars: [
        { chords: [{ degree: '5 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'D7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_h',
      label: 'Section H',
      measuresPerRow: 6,
      bars: [
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'E7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '4 7', chordName: 'D7', beat: 1, duration: 4 }],
          fermata: true,
        },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }],
          fermata: true,
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=d0En8iD2uVI' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
