import type { Song } from '@/curriculum/types/songLibrary';

export const once_in_a_lifetime: Song = {
  id: 'once_in_a_lifetime',
  title: 'Once In A Lifetime',
  artist: 'Talking Heads',
  year: 1980,
  historicalDescription:
    "Talking Heads release 'Once In A Lifetime', a hypnotic meditation on suburban alienation and the unconscious drift of modern life. Built on African polyrhythms and Brian Eno's production, David Byrne's stream-of-consciousness delivery — 'same as it ever was' — captures something universal about routine and awakening. It becomes one of new wave's defining artistic statements.",
  key: 'A major',
  keyRoot: 69,
  mode: 'major',
  tempo: 118,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],
  credits: [
    {
      name: 'Jerry Harrison',
      role: 'performer',
      artistGlobeId: 'jerry-harrison',
    },
    { name: 'Jack Nuber', role: 'engineer' },
    { name: 'Nona Hendryx', role: 'performer', instrument: 'backing-vocals' },
    { name: 'John Potoker', role: 'engineer' },
    {
      name: 'Chris Frantz',
      role: 'performer',
      instrument: 'drum-kit',
      artistGlobeId: 'chris-frantz',
    },
    { name: 'Brian Eno', role: 'arranger', artistGlobeId: 'brian-eno' },
    { name: 'David Byrne', role: 'arranger', artistGlobeId: 'david-byrne' },
    {
      name: 'Tina Weymouth',
      role: 'performer',
      artistGlobeId: 'tina-weymouth',
    },
    { name: 'Brian Eno', role: 'engineer', artistGlobeId: 'brian-eno' },
    { name: 'Chris Frantz', role: 'songwriter', artistGlobeId: 'chris-frantz' },
    { name: 'Steven Stanley', role: 'engineer' },
    { name: 'David Byrne', role: 'engineer', artistGlobeId: 'david-byrne' },
    { name: 'Brian Eno', role: 'songwriter', artistGlobeId: 'brian-eno' },
    { name: 'David Byrne', role: 'songwriter', artistGlobeId: 'david-byrne' },
    {
      name: 'Talking Heads',
      role: 'producer',
      ensemble: true,
      artistGlobeId: 'talking-heads',
    },
    { name: 'Brian Eno', role: 'producer', artistGlobeId: 'brian-eno' },
    { name: 'David Byrne', role: 'performer', artistGlobeId: 'david-byrne' },
    {
      name: 'Brian Eno',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'brian-eno',
    },
    {
      name: 'Tina Weymouth',
      role: 'songwriter',
      artistGlobeId: 'tina-weymouth',
    },
    {
      name: 'Jerry Harrison',
      role: 'songwriter',
      artistGlobeId: 'jerry-harrison',
    },
    { name: 'Dave Jerden', role: 'engineer' },
    { name: 'David Byrne', role: 'vocals', artistGlobeId: 'david-byrne' },
    {
      name: 'Talking Heads',
      role: 'arranger',
      ensemble: true,
      artistGlobeId: 'talking-heads',
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
            { degree: '1 dom7', chordName: 'A7sus', beat: 1, duration: 4 },
          ],
        },
        { chords: [] },
        { chords: [] },
        { chords: [] },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=5IsSpAOD6K8' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/talking-heads.webp',
  popularity: 50,
};
