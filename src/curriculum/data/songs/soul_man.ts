import type { Song } from '@/curriculum/types/songLibrary';

export const soul_man: Song = {
  id: 'soul_man',
  title: 'Soul Man',
  artist: 'Sam and Dave',
  year: 1967,

  historicalDescription:
    "Sam and Dave release 'Soul Man', a barnstorming anthem that distills the essence of Southern soul into two and a half minutes of pure fire. Recorded at Stax Studios in Memphis with Booker T. & the M.G.'s and the Memphis Horns driving the groove, it becomes one of the defining records of the genre — and gives soul music its unofficial name.",
  key: 'G major',
  keyRoot: 67,
  mode: 'major',
  tempo: 110,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rnb'],
  techniques: [],
  credits: [
    { name: 'Booker T. & the MG’s', role: 'performer', ensemble: true },
    { name: 'David Porter', role: 'songwriter', artistGlobeId: 'david-porter' },
    { name: 'Sam Moore', role: 'vocals', artistGlobeId: 'sam-moore' },
    { name: 'Jim Stewart', role: 'producer', artistGlobeId: 'jim-stewart' },
    { name: 'David Porter', role: 'producer', artistGlobeId: 'david-porter' },
    { name: 'David Prater', role: 'vocals', artistGlobeId: 'david-prater' },
    { name: 'Isaac Hayes', role: 'songwriter', artistGlobeId: 'isaac-hayes' },
    { name: 'The Mar‐Keys', role: 'performer', ensemble: true },
    { name: 'Isaac Hayes', role: 'producer', artistGlobeId: 'isaac-hayes' },
  ],
  releases: [{ releaseId: 'sam-and-dave-soul-men' }],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭6 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭2 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭2 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '7 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '7 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '3 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭5 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭2 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭2 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭2 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭2 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=S_OX2HwWy-o' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/sam-and-dave.webp',
  popularity: 50,
};
