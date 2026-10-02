import type { Song } from '@/curriculum/types/songLibrary';

export const born_under_punches_the_heat_goes_on: Song = {
  id: 'born_under_punches_the_heat_goes_on',
  title: 'Born Under Punches',
  artist: 'Talking Heads',
  year: 1980,
  historicalDescription:
    "Talking Heads open 'Remain in Light' with 'Born Under Punches', a hypnotic collision of funk, African polyrhythms, and David Byrne's fractured, paranoid lyrics. Recorded in 1980, the track signals a radical leap from the band's art-punk origins — layering loops and interlocking grooves under the influence of Brian Eno and Fela Kuti. It redefines what a rock band can be.",
  key: 'G minor',
  keyRoot: 67,
  mode: 'minor',
  tempo: 114,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],
  credits: [
    { name: 'Chris Frantz', role: 'songwriter', artistGlobeId: 'chris-frantz' },
    {
      name: 'Brian Eno',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'brian-eno',
    },
    { name: 'Brian Eno', role: 'producer', artistGlobeId: 'brian-eno' },
    { name: 'David Byrne', role: 'vocals', artistGlobeId: 'david-byrne' },
    { name: 'Brian Eno', role: 'engineer', artistGlobeId: 'brian-eno' },
    { name: 'John Potoker', role: 'engineer' },
    { name: 'Brian Eno', role: 'arranger', artistGlobeId: 'brian-eno' },
    { name: 'David Byrne', role: 'engineer', artistGlobeId: 'david-byrne' },
    { name: 'David Byrne', role: 'songwriter', artistGlobeId: 'david-byrne' },
    {
      name: 'Tina Weymouth',
      role: 'songwriter',
      artistGlobeId: 'tina-weymouth',
    },
    { name: 'Brian Eno', role: 'songwriter', artistGlobeId: 'brian-eno' },
    { name: 'David Byrne', role: 'arranger', artistGlobeId: 'david-byrne' },
    { name: 'Dave Jerden', role: 'engineer' },
    {
      name: 'Talking Heads',
      role: 'arranger',
      ensemble: true,
      artistGlobeId: 'talking-heads',
    },
    {
      name: 'Jerry Harrison',
      role: 'songwriter',
      artistGlobeId: 'jerry-harrison',
    },
    {
      name: 'Talking Heads',
      role: 'songwriter',
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
            { degree: '1 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Dmin7', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        { chords: [] },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=w6T_X7MXg40' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/talking-heads.webp',
  popularity: 50,
};
