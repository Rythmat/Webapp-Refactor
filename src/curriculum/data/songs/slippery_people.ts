import type { Song } from '@/curriculum/types/songLibrary';

export const slippery_people: Song = {
  id: 'slippery_people',
  title: 'Slippery People',
  artist: 'Talking Heads',
  year: 1983,
  historicalDescription:
    "Talking Heads release 'Slippery People' from their landmark album 'Speaking in Tongues', a track that fuses funk, gospel, and art-rock into something utterly their own. David Byrne's jerky, possessed vocal delivery and the band's polyrhythmic groove capture the anxious energy of early-80s New York. The song becomes a centerpiece of their legendary Stop Making Sense concert film, one of the greatest live documents in rock history.",
  key: 'A minor',
  keyRoot: 69,
  mode: 'minor',
  tempo: 104,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],
  credits: [
    {
      name: 'Chris Frantz',
      role: 'performer',
      instrument: 'synthesizer',
      artistGlobeId: 'chris-frantz',
    },
    { name: 'David Byrne', role: 'performer', artistGlobeId: 'david-byrne' },
    {
      name: 'Tina Weymouth',
      role: 'performer',
      artistGlobeId: 'tina-weymouth',
    },
    {
      name: 'Tina Weymouth',
      role: 'performer',
      instrument: 'synthesizer',
      artistGlobeId: 'tina-weymouth',
    },
    {
      name: 'Chris Frantz',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'chris-frantz',
    },
    { name: 'Chris Frantz', role: 'songwriter', artistGlobeId: 'chris-frantz' },
    {
      name: 'Talking Heads',
      role: 'producer',
      ensemble: true,
      artistGlobeId: 'talking-heads',
    },
    { name: 'David Byrne', role: 'songwriter', artistGlobeId: 'david-byrne' },
    {
      name: 'Chris Frantz',
      role: 'performer',
      instrument: 'drum-kit',
      artistGlobeId: 'chris-frantz',
    },
    {
      name: 'Tina Weymouth',
      role: 'songwriter',
      artistGlobeId: 'tina-weymouth',
    },
    { name: 'David Byrne', role: 'vocals', artistGlobeId: 'david-byrne' },
    {
      name: 'Jerry Harrison',
      role: 'songwriter',
      artistGlobeId: 'jerry-harrison',
    },
    { name: 'Butch Jones', role: 'engineer' },
    { name: 'Dickie Landry', role: 'performer' },
    {
      name: 'Jerry Harrison',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'jerry-harrison',
    },
    {
      name: 'Dolette McDonald',
      role: 'performer',
      instrument: 'backing-vocals',
    },
    { name: 'Nona Hendryx', role: 'performer', instrument: 'backing-vocals' },
    {
      name: 'Jerry Harrison',
      role: 'performer',
      artistGlobeId: 'jerry-harrison',
    },
    { name: 'Raphael DeJesus', role: 'performer', instrument: 'percussion' },
    {
      name: 'David Byrne',
      role: 'performer',
      instrument: 'percussion',
      artistGlobeId: 'david-byrne',
    },
    { name: 'Alex Sadkin', role: 'engineer' },
    {
      name: 'Tina Weymouth',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'tina-weymouth',
    },
  ],
  releases: [{ releaseId: 'talking-heads-speaking-in-tongues' }],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=paSczHpWC3I' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/talking-heads.webp',
  popularity: 50,
};
