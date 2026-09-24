import type { Song } from '@/curriculum/types/songLibrary';

export const give_me_one_reason: Song = {
  id: 'give_me_one_reason',
  title: 'Give Me One Reason',
  artist: 'Tracy Chapman',
  year: 1995,
  historicalDescription:
    "Tracy Chapman releases 'Give Me One Reason', a slow-burning blues-rooted track that stands apart from the mid-90s pop landscape. Written and performed with raw simplicity, it earns her a Grammy for Best Rock Song — a striking vindication for an artist who had always worn her blues influences openly. The song proves that authenticity can still cut through in an era of overproduction.",
  key: 'F♯ major',
  keyRoot: 66,
  mode: 'major',
  tempo: 102,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['blues', 'pop'],
  techniques: [],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        { chords: [{ degree: '1 dom7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 dom7', chordName: 'B7', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'C♯7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 dom7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 dom7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 dom7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 dom7', chordName: 'C♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 dom7', chordName: 'C♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 dom7', chordName: 'C♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 dom7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'F♯7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '1 dom7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 dom7', chordName: 'B7', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'C♯7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 dom7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 dom7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 dom7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 dom7', chordName: 'C♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 dom7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 dom7', chordName: 'C♯7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '5 dom7', chordName: 'C♯7', beat: 1, duration: 4 }],
          restBars: 1,
        },
        { chords: [{ degree: '1 dom7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 dom7', chordName: 'F♯7', beat: 1, duration: 4 }],
          fermata: true,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=V6hQ9HSKlIE' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/tracy-chapman.webp',
  popularity: 50,
};
