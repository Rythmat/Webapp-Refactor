import type { Song } from '@/curriculum/types/songLibrary';

export const houses_in_motion: Song = {
  id: 'houses_in_motion',
  title: 'Houses In Motion',
  artist: 'Talking Heads',
  year: 1981,
  historicalDescription:
    "Talking Heads release 'Houses In Motion' from their landmark album 'Remain in Light', a record that reshapes what rock music can be. Built on interlocking rhythms drawn from West African music and produced with Brian Eno, the track pulses with a hypnotic urgency that places David Byrne's fractured lyrical visions inside a groove that never lets go. It marks a turning point where art rock and the dancefloor become the same place.",
  key: 'E minor',
  keyRoot: 64,
  mode: 'minor',
  tempo: 204,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],
  credits: [
    { name: 'David Byrne', role: 'arranger', artistGlobeId: 'david-byrne' },
    { name: 'Jon Hassell', role: 'performer', instrument: 'trumpet' },
    { name: 'David Byrne', role: 'vocals', artistGlobeId: 'david-byrne' },
    {
      name: 'Brian Eno',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'brian-eno',
    },
    {
      name: 'Talking Heads',
      role: 'arranger',
      ensemble: true,
      artistGlobeId: 'talking-heads',
    },
    { name: 'Brian Eno', role: 'producer', artistGlobeId: 'brian-eno' },
    { name: 'Nona Hendryx', role: 'performer', instrument: 'backing-vocals' },
    {
      name: 'Tina Weymouth',
      role: 'songwriter',
      artistGlobeId: 'tina-weymouth',
    },
    { name: 'John Potoker', role: 'engineer' },
    { name: 'Brian Eno', role: 'arranger', artistGlobeId: 'brian-eno' },
    { name: 'David Byrne', role: 'songwriter', artistGlobeId: 'david-byrne' },
    { name: 'David Byrne', role: 'engineer', artistGlobeId: 'david-byrne' },
    { name: 'Brian Eno', role: 'engineer', artistGlobeId: 'brian-eno' },
    {
      name: 'Jerry Harrison',
      role: 'songwriter',
      artistGlobeId: 'jerry-harrison',
    },
    { name: 'Chris Frantz', role: 'songwriter', artistGlobeId: 'chris-frantz' },
    { name: 'Jon Hassell', role: 'arranger' },
    { name: 'Brian Eno', role: 'songwriter', artistGlobeId: 'brian-eno' },
    { name: 'Dave Jerden', role: 'engineer' },
  ],
  releases: [{ releaseId: 'talking-heads-remain-in-light' }],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7/♭7', chordName: 'Emin7/D', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7/♭7', chordName: 'Emin7/D', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7/♭7', chordName: 'Emin7/D', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7/♭7', chordName: 'Emin7/D', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=Yt9_uyXgOzc' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/talking-heads.webp',
  popularity: 50,
};
