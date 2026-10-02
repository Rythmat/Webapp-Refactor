import type { Song } from '@/curriculum/types/songLibrary';

export const shape_of_you: Song = {
  id: 'shape_of_you',
  title: 'Shape Of You',
  artist: 'Ed Sheeran',
  year: 2017,
  historicalDescription:
    "Ed Sheeran releases 'Shape Of You' in 2017, a sleek pop track built on tropical house rhythms and a looping melodic hook that makes it almost impossible to ignore. The song becomes one of the best-selling singles of all time, dominating charts worldwide and cementing Sheeran's place not just as a singer-songwriter but as a hitmaking force reshaping mainstream pop.",
  key: 'C♯ minor',
  keyRoot: 61,
  mode: 'minor',
  tempo: 192,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['pop', 'rock'],
  techniques: [],
  credits: [
    {
      name: 'Ed Sheeran',
      role: 'performer',
      instrument: 'percussion',
      artistGlobeId: 'ed-sheeran',
      primary: true,
    },
    {
      name: 'Wayne Hernandez',
      role: 'performer',
      instrument: 'backing-vocals',
    },
    { name: 'Joe Rubel', role: 'engineer' },
    { name: 'Daniel Pursey', role: 'engineer' },
    {
      name: 'Ed Sheeran',
      role: 'vocals',
      artistGlobeId: 'ed-sheeran',
      primary: true,
    },
    { name: 'Ed Sheeran', role: 'producer', artistGlobeId: 'ed-sheeran' },
    { name: 'Tjae Cole', role: 'performer', instrument: 'backing-vocals' },
    { name: 'Geo Gabriel', role: 'performer', instrument: 'backing-vocals' },
    {
      name: 'Ed Sheeran',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'ed-sheeran',
      primary: true,
    },
    { name: 'Steve Mac', role: 'producer', artistGlobeId: 'steve-mac' },
    { name: 'Ed Sheeran', role: 'songwriter', artistGlobeId: 'ed-sheeran' },
    { name: 'Chris Laws', role: 'engineer' },
    {
      name: 'Kevin “She’kspere” Briggs',
      role: 'songwriter',
      artistGlobeId: 'kevin-shekspere-briggs',
    },
    { name: 'Mark “Spike” Stent', role: 'engineer' },
    { name: 'Chris Laws', role: 'performer', instrument: 'drum-kit' },
    { name: 'Steve Mac', role: 'songwriter', artistGlobeId: 'steve-mac' },
    {
      name: 'Tameka “Tiny” Cottle',
      role: 'songwriter',
      artistGlobeId: 'tameka-tiny-cottle',
    },
    {
      name: 'Ed Sheeran',
      role: 'performer',
      artistGlobeId: 'ed-sheeran',
      primary: true,
    },
    { name: 'Kandi', role: 'songwriter', artistGlobeId: 'kandi' },
    {
      name: 'Johnny McDaid',
      role: 'songwriter',
      artistGlobeId: 'johnny-mcdaid',
    },
    { name: 'Steve Mac', role: 'performer', artistGlobeId: 'steve-mac' },
  ],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=JGwWNGJdvx8' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/ed-sheeran.webp',
  popularity: 50,
};
