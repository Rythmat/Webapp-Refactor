import type { Song } from '@/curriculum/types/songLibrary';

export const what_i_got: Song = {
  id: 'what_i_got',
  title: 'What I Got',
  artist: 'Sublime',
  year: 1996,
  historicalDescription:
    "Sublime releases 'What I Got' in 1996, a laid-back anthem blending ska, punk, reggae, and acoustic rock that becomes the band's breakthrough hit. Tragically, frontman Bradley Nowell dies of a heroin overdose just two months before the self-titled album drops, making the song's carefree message of gratitude and love an unintentional farewell. It brings the Long Beach ska-punk scene to mainstream radio and cements Sublime's enduring cult legacy.",
  key: 'D minor',
  keyRoot: 62,
  mode: 'minor',
  tempo: 94,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],
  session: { studioId: 'total-access-recording' },
  credits: [
    { name: 'Bud Gaugh', role: 'songwriter', artistGlobeId: 'bud-gaugh' },
    { name: 'Eric Wilson', role: 'songwriter', artistGlobeId: 'eric-wilson' },
    { name: 'Eddie Ashworth', role: 'engineer' },
    { name: 'Marshall Goodman', role: 'performer', instrument: 'turntables' },
    {
      name: 'Michael "Miguel" Happoldt',
      role: 'performer',
      instrument: 'acoustic-guitar',
    },
    { name: 'David Kahne', role: 'producer', artistGlobeId: 'david-kahne' },
    {
      name: 'David Kahne',
      role: 'performer',
      instrument: 'organ',
      artistGlobeId: 'david-kahne',
    },
    {
      name: 'Bradley Nowell',
      role: 'songwriter',
      artistGlobeId: 'bradley-nowell',
    },
    { name: 'David Kahne', role: 'engineer', artistGlobeId: 'david-kahne' },
  ],
  releases: [{ releaseId: 'sublime-sublime', track: 2 }],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 dom7', chordName: 'G7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 dom7', chordName: 'G7', beat: 1, duration: 4 }],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=0Uc3ZrmhDN4' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/sublime.webp',
  popularity: 50,
};
