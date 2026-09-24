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
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        { chords: [{ degree: '1 dom7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 dom7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♭3 dom7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'B7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        { chords: [{ degree: '4 dom7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♭7 dom7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 dom7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♭3 dom7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♭7 dom7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 dom7', chordName: 'E7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '1 dom7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 dom7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♭3 dom7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'B7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        { chords: [{ degree: '4 dom7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♭7 dom7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 dom7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♭3 dom7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♭7 dom7', chordName: 'A7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 dom7', chordName: 'E7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        { chords: [{ degree: '1 dom7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 dom7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♭3 dom7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'B7', beat: 1, duration: 4 }] },
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
