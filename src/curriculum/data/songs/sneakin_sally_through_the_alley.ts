import type { Song } from '@/curriculum/types/songLibrary';

export const sneakin_sally_through_the_alley: Song = {
  id: 'sneakin_sally_through_the_alley',
  title: 'Sneakin’ Sally Through The Alley',
  artist: 'Robert Palmer',
  year: 1974,
  historicalDescription:
    "Robert Palmer releases his debut album 'Sneakin' Sally Through the Alley' in 1974, recording in New Orleans with members of Little Feat and the Meters. The result is a striking fusion of British rock sensibility with deep Louisiana funk and R&B grooves — an unlikely combination that announces Palmer as one of the most eclectic and sophisticated voices of his generation.",
  key: 'B major',
  keyRoot: 71,
  mode: 'major',
  tempo: 100,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      measuresPerRow: 2,
      bars: [
        { chords: [{ degree: '1 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_b',
      label: 'Section B',
      bars: [
        { chords: [{ degree: '4 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♭3 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      measuresPerRow: 6,
      bars: [
        { chords: [{ degree: '4 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♭7 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♭3 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♭7 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'E7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      measuresPerRow: 2,
      bars: [
        { chords: [{ degree: '1 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      bars: [
        { chords: [{ degree: '4 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♭3 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      measuresPerRow: 6,
      bars: [
        { chords: [{ degree: '4 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♭7 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♭3 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♭7 7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'E7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_e_2',
      label: 'Section E',
      measuresPerRow: 2,
      bars: [
        { chords: [{ degree: '1 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_h',
      label: 'Section H',
      bars: [
        { chords: [{ degree: '4 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♭3 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B7', beat: 1, duration: 4 }] },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=W4q9_XlsU3Y' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/robert-palmer.webp',
  popularity: 50,
};
