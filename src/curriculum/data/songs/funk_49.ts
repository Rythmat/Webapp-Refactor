import type { Song } from '@/curriculum/types/songLibrary';

export const funk_49: Song = {
  id: 'funk_49',
  title: 'Funk #49',
  artist: 'The James Gang',
  year: 1997,
  historicalDescription:
    "The James Gang release 'Funk #49', a hard-driving groove built around Joe Walsh's razor-sharp guitar riff and one of rock's most recognizable drum breaks. The track captures the raw, stripped-down energy of early 1970s funk rock, bridging the gap between blues-soaked rock and the rhythmic swagger that would define the decade. Walsh's guitar work here foreshadows his later stardom with the Eagles.",
  key: 'A major',
  keyRoot: 69,
  mode: 'major',
  tempo: 91,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['funk', 'rock'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      bars: [
        { chords: [], restBars: 3 },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'D7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'D7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_c',
      label: 'Section C',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'D7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_d',
      label: 'Section D',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      bars: [
        { chords: [{ degree: '2 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 7', chordName: 'B7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_g',
      label: 'Section G',
      bars: [
        { chords: [{ degree: '2 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 7', chordName: 'B7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_h',
      label: 'Section H',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'D7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      measuresPerRow: 5,
      bars: [
        { chords: [], restBars: 19 },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'D7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'D7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_k',
      label: 'Section K',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'D7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_l',
      label: 'Section L',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_m',
      label: 'Section M',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_n',
      label: 'Section N',
      bars: [
        { chords: [{ degree: '2 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 7', chordName: 'B7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_o',
      label: 'Section O',
      bars: [
        { chords: [{ degree: '2 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 7', chordName: 'B7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'D7', beat: 1, duration: 4 }] },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=ex7JTWDbH1A' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/the-james-gang.webp',
  popularity: 50,
};
