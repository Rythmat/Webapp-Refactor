import type { Song } from '@/curriculum/types/songLibrary';

export const sweet_home_alabama: Song = {
  id: 'sweet_home_alabama',
  title: 'Sweet Home Alabama',
  artist: 'Lynyrd Skynyrd',
  year: 1976,
  historicalDescription:
    "Lynyrd Skynyrd's 'Sweet Home Alabama' becomes an anthem of Southern pride and a defining moment for Southern rock. Written partly as a rebuttal to Neil Young's criticisms of the South in 'Southern Man' and 'Alabama', the song stakes out a defiant regional identity — and its three-guitar attack cements Lynyrd Skynyrd as the genre's definitive voice.",
  key: 'D major',
  keyRoot: 62,
  mode: 'major',
  tempo: 98,
  timeSignature: [4, 4],

  difficulty: 1,
  genreTags: ['folk', 'rock'],
  techniques: [],
  session: { studioId: 'studio-one' },
  credits: [
    {
      name: 'Ed King',
      role: 'performer',
      instrument: 'electric-guitar',
      artistGlobeId: 'ed-king',
    },
    { name: 'Billy Powell', role: 'performer', artistGlobeId: 'billy-powell' },
    { name: 'Clydie King', role: 'performer', instrument: 'backing-vocals' },
    {
      name: 'Bob Burns',
      role: 'performer',
      instrument: 'drum-kit',
      artistGlobeId: 'bob-burns',
    },
    { name: 'Al Kooper', role: 'producer', artistGlobeId: 'al-kooper' },
    { name: 'Al Kooper', role: 'engineer', artistGlobeId: 'al-kooper' },
    {
      name: 'Ronnie Van Zant',
      role: 'vocals',
      artistGlobeId: 'ronnie-van-zant',
    },
    {
      name: 'Gary Rossington',
      role: 'songwriter',
      artistGlobeId: 'gary-rossington',
    },
    { name: 'Merry Clayton', role: 'performer', instrument: 'backing-vocals' },
    {
      name: 'Gary Rossington',
      role: 'performer',
      instrument: 'electric-guitar',
      artistGlobeId: 'gary-rossington',
    },
    {
      name: 'Ronnie Van Zant',
      role: 'songwriter',
      artistGlobeId: 'ronnie-van-zant',
    },
    { name: 'Ed King', role: 'songwriter', artistGlobeId: 'ed-king' },
    {
      name: 'Leon Wilkeson',
      role: 'performer',
      instrument: 'electric-bass',
      artistGlobeId: 'leon-wilkeson',
    },
    {
      name: 'Allen Collins',
      role: 'performer',
      instrument: 'electric-guitar',
      artistGlobeId: 'allen-collins',
    },
  ],
  releases: [{ releaseId: 'lynyrd-skynyrd-second-helping' }],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [] },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=-p8GXZcdrIk' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/lynyrd-skynyrd.webp',
  popularity: 50,
};
