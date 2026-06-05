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
      id: 'verse',
      label: 'Verse',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 7', chordName: 'B7', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'C♯7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_b',
      label: 'Section B',
      measuresPerRow: 5,
      bars: [
        { chords: [{ degree: '4 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'C♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_c',
      label: 'Section C',
      measuresPerRow: 5,
      bars: [
        { chords: [{ degree: '5 7', chordName: 'C♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'C♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      measuresPerRow: 5,
      bars: [
        { chords: [{ degree: '1 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 7', chordName: 'B7', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'C♯7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      measuresPerRow: 5,
      bars: [
        { chords: [{ degree: '4 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'C♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      bars: [
        { chords: [{ degree: '5 7', chordName: 'C♯7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '5 7', chordName: 'C♯7', beat: 1, duration: 4 }],
          restBars: 1,
        },
        { chords: [{ degree: '1 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 7', chordName: 'F♯7', beat: 1, duration: 4 }],
          fermata: true,
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=V6hQ9HSKlIE' },
  ],
  artistImageSource: 'commissioned',

  artistImageRef: '/artists/tracy-chapman.webp',
  popularity: 50,
};
