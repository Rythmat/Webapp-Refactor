import type { Song } from '@/curriculum/types/songLibrary';

export const it_wasnt_me: Song = {
  id: 'it_wasnt_me',
  title: 'It Wasn’t Me',
  artist: 'Shaggy',
  year: 2000,
  historicalDescription:
    "Shaggy releases 'It Wasn't Me', a reggae-fusion track built on deadpan denial and infectious Caribbean rhythm. The song becomes one of the defining pop hits of the early 2000s, blending dancehall attitude with mainstream radio accessibility and cementing Shaggy as one of reggae fusion's biggest crossover stars.",
  key: 'C major',
  keyRoot: 60,
  mode: 'major',
  tempo: 94,
  timeSignature: [4, 4],

  difficulty: 1,
  genreTags: ['reggae'],
  techniques: [],
  credits: [
    {
      name: 'Sting International',
      role: 'producer',
      artistGlobeId: 'sting-international',
    },
    {
      name: 'Ricardo “Rik Rok” Ducent',
      role: 'songwriter',
      artistGlobeId: 'ricardo-rik-rok-ducent',
    },
    {
      name: 'Brian & Tony Gold',
      role: 'performer',
      instrument: 'backing-vocals',
      ensemble: true,
    },
    { name: 'Jerry Johnson', role: 'performer', instrument: 'horn-section' },
    { name: 'Brian Gold', role: 'songwriter', artistGlobeId: 'brian-gold' },
    {
      name: 'Shaun Pizzonia',
      role: 'songwriter',
      artistGlobeId: 'shaun-pizzonia',
    },
    { name: 'Kevin Bachelor', role: 'performer', instrument: 'horn-section' },
    {
      name: 'Shaun Pizzonia',
      role: 'producer',
      artistGlobeId: 'shaun-pizzonia',
    },
    {
      name: 'Ricardo “Rik Rok” Ducent',
      role: 'performer',
      artistGlobeId: 'ricardo-rik-rok-ducent',
    },
    {
      name: 'Shaun Pizzonia',
      role: 'engineer',
      artistGlobeId: 'shaun-pizzonia',
    },
    { name: 'Nigel Staff', role: 'performer' },
    { name: 'Shaggy', role: 'vocals', primary: true, artistGlobeId: 'shaggy' },
    { name: 'Shaggy', role: 'songwriter', artistGlobeId: 'shaggy' },
    { name: 'Robert Zapata', role: 'performer' },
    {
      name: 'Shaun Pizzonia',
      role: 'performer',
      instrument: 'percussion',
      artistGlobeId: 'shaun-pizzonia',
    },
    {
      name: 'Shaun Pizzonia',
      role: 'performer',
      artistGlobeId: 'shaun-pizzonia',
    },
    {
      name: 'Ricardo “Rik Rok” Ducent',
      role: 'vocals',
      primary: true,
      artistGlobeId: 'ricardo-rik-rok-ducent',
    },
    { name: 'Gwen Laster', role: 'performer', instrument: 'violin' },
    {
      name: 'Shaun Pizzonia',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'shaun-pizzonia',
    },
  ],
  releases: [{ releaseId: 'shaggy-hot-shot', track: 10 }],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      instrumental: true,
      bars: [
        { chords: [], restBars: 8 },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=2g5Hz17C4is' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/shaggy.webp',
  popularity: 50,
};
