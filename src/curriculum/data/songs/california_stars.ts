import type { Song } from '@/curriculum/types/songLibrary';

export const california_stars: Song = {
  id: 'california_stars',
  title: 'California Stars',
  artist: 'Wilco',
  year: 1998,
  historicalDescription:
    "Wilco records 'California Stars' for the Mermaid Avenue project, setting an unrecorded Woody Guthrie lyric to music alongside Billy Bragg. The collaboration bridges the gap between Guthrie's Depression-era folk tradition and the alt-country sound Wilco is forging in 1990s Chicago — a reminder that American roots music is a living, breathing inheritance.",
  key: 'A major',
  keyRoot: 69,
  mode: 'major',
  tempo: 110,
  timeSignature: [4, 4],

  difficulty: 1,
  genreTags: ['folk', 'rock'],
  techniques: [],
  credits: [
    { name: 'Billy Bragg', role: 'producer', artistGlobeId: 'billy-bragg' },
    { name: 'Wilco', role: 'producer', ensemble: true, artistGlobeId: 'wilco' },
    {
      name: 'John Stirratt',
      role: 'performer',
      instrument: 'electric-bass',
      artistGlobeId: 'john-stirratt',
    },
    {
      name: 'Wilco',
      role: 'performer',
      ensemble: true,
      primary: true,
      artistGlobeId: 'wilco',
    },
    {
      name: 'Jay Bennett',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'jay-bennett',
    },
    {
      name: 'Ken Coomer',
      role: 'performer',
      instrument: 'drum-kit',
      artistGlobeId: 'ken-coomer',
    },
    {
      name: 'Billy Bragg',
      role: 'performer',
      artistGlobeId: 'billy-bragg',
      primary: true,
    },
    { name: 'Jeff Tweedy', role: 'vocals', artistGlobeId: 'jeff-tweedy' },
    {
      name: 'Ken Coomer',
      role: 'performer',
      instrument: 'percussion',
      artistGlobeId: 'ken-coomer',
    },
    { name: 'Corey Harris', role: 'performer', instrument: 'slide-guitar' },
    {
      name: 'John Stirratt',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'john-stirratt',
    },
    {
      name: 'Jeff Tweedy',
      role: 'performer',
      instrument: 'acoustic-guitar',
      artistGlobeId: 'jeff-tweedy',
    },
    {
      name: 'Woody Guthrie',
      role: 'songwriter',
      artistGlobeId: 'woody-guthrie',
    },
    { name: 'Jeff Tweedy', role: 'songwriter', artistGlobeId: 'jeff-tweedy' },
    { name: 'Eliza Carthy', role: 'performer', instrument: 'violin' },
    { name: 'Grant Showbiz', role: 'producer', artistGlobeId: 'grant-showbiz' },
    {
      name: 'Billy Bragg',
      role: 'performer',
      instrument: 'acoustic-guitar',
      primary: true,
      artistGlobeId: 'billy-bragg',
    },
    {
      name: 'Jay Bennett',
      role: 'performer',
      instrument: 'piano',
      artistGlobeId: 'jay-bennett',
    },
    { name: 'Jay Bennett', role: 'songwriter', artistGlobeId: 'jay-bennett' },
  ],
  releases: [{ releaseId: 'billy-bragg-mermaid-avenue', track: 2 }],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }],
          fermata: true,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=FeQX-9Uxh_w' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/wilco.webp',
  popularity: 50,
};
