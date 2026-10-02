import type { Song } from '@/curriculum/types/songLibrary';

export const crosseyed_and_painless: Song = {
  id: 'crosseyed_and_painless',
  title: 'Crosseyed and Painless',
  artist: 'Talking Heads',
  year: 1980,
  historicalDescription:
    "Talking Heads release 'Crosseyed and Painless' on their landmark album 'Remain in Light', a record that fuses rock with African polyrhythms and funk in a way that reshapes what a rock band can sound like. Built on interlocking grooves and David Byrne's anxious, fractured lyrics, the track captures a band at their most adventurous — dissolving the boundaries between downtown New York art rock and the global sounds pouring into their world.",
  key: 'B minor',
  keyRoot: 71,
  mode: 'minor',
  tempo: 136,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],
  credits: [
    { name: 'Brian Eno', role: 'arranger', artistGlobeId: 'brian-eno' },
    { name: 'David Byrne', role: 'vocals', artistGlobeId: 'david-byrne' },
    { name: 'David Byrne', role: 'songwriter', artistGlobeId: 'david-byrne' },
    { name: 'Chris Frantz', role: 'songwriter', artistGlobeId: 'chris-frantz' },
    { name: 'Dave Jerden', role: 'engineer' },
    { name: 'Brian Eno', role: 'producer', artistGlobeId: 'brian-eno' },
    {
      name: 'Jerry Harrison',
      role: 'songwriter',
      artistGlobeId: 'jerry-harrison',
    },
    {
      name: 'Brian Eno',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'brian-eno',
    },
    { name: 'David Byrne', role: 'arranger', artistGlobeId: 'david-byrne' },
    { name: 'Brian Eno', role: 'engineer', artistGlobeId: 'brian-eno' },
    { name: 'Brian Eno', role: 'songwriter', artistGlobeId: 'brian-eno' },
    { name: 'David Byrne', role: 'engineer', artistGlobeId: 'david-byrne' },
    { name: 'John Potoker', role: 'engineer' },
    {
      name: 'Talking Heads',
      role: 'arranger',
      ensemble: true,
      artistGlobeId: 'talking-heads',
    },
    {
      name: 'Tina Weymouth',
      role: 'songwriter',
      artistGlobeId: 'tina-weymouth',
    },
  ],
  releases: [{ releaseId: 'talking-heads-remain-in-light' }],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=z92avHmgDRA' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/talking-heads.webp',
  popularity: 50,
};
