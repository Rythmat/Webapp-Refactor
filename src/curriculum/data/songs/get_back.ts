import type { Song } from '@/curriculum/types/songLibrary';

export const get_back: Song = {
  id: 'get_back',
  title: 'Get Back',
  artist: 'The Beatles',
  year: 1969,
  historicalDescription:
    "The Beatles record 'Get Back' during the fractious Let It Be sessions, a deliberate return to their rock and roll roots stripped of studio embellishment. The song captures the band at a crossroads — tensions are high, but the raw, live energy is undeniable. It becomes one of their final singles before the group dissolves.",
  key: 'A major',
  keyRoot: 69,
  mode: 'major',
  tempo: 126,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['classic_rock'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭7 maj/1', chordName: 'G/A', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'D/A', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/1', chordName: 'G/A', beat: 1, duration: 2 },
            { degree: '4 maj/1', chordName: 'D/A', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      repeatCount: 4,
      bars: [
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      repeatCount: 3,
      bars: [
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'D7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 7', chordName: 'A7', beat: 1, duration: 2 },
            { degree: '♭7 maj', chordName: 'G', beat: 3, duration: 1 },
            { degree: '4 maj', chordName: 'D', beat: 4, duration: 1 },
          ],
        },
      ],
    },
    {
      id: 'section_d',
      label: 'Section D',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '4 7', chordName: 'D7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '4 7', chordName: 'D7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      repeatCount: 4,
      bars: [
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      repeatCount: 5,
      bars: [
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'D7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 7', chordName: 'A7', beat: 1, duration: 2 },
            { degree: '♭7 maj', chordName: 'G', beat: 3, duration: 1 },
            { degree: '4 maj', chordName: 'D', beat: 4, duration: 1 },
          ],
        },
      ],
    },
    {
      id: 'section_g',
      label: 'Section G',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'D7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '4 7', chordName: 'D7', beat: 3, duration: 2 },
          ],
          fermata: true,
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=IKJqecxswCA' },
  ],
  artistImageSource: 'none',
  popularity: 50,
};
