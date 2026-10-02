import type { Song } from '@/curriculum/types/songLibrary';

export const listening_wind: Song = {
  id: 'listening_wind',
  title: 'Listening Wind',
  artist: 'Talking Heads',
  year: 1980,

  historicalDescription:
    "Talking Heads release 'Listening Wind' on their landmark album Remain in Light, a haunting meditation on displacement and geopolitics told from the perspective of a Third World nationalist. Built on interlocking rhythms drawn from West African music, the track stands as one of the album's most unsettling and cinematic moments — a reminder that pop music can carry the weight of the world.",
  key: 'E minor',
  keyRoot: 64,
  mode: 'minor',
  tempo: 145,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],
  credits: [
    { name: 'Brian Eno', role: 'producer', artistGlobeId: 'brian-eno' },
    {
      name: 'Tina Weymouth',
      role: 'songwriter',
      artistGlobeId: 'tina-weymouth',
    },
    { name: 'Chris Frantz', role: 'songwriter', artistGlobeId: 'chris-frantz' },
    { name: 'Dave Jerden', role: 'engineer' },
    { name: 'Brian Eno', role: 'arranger', artistGlobeId: 'brian-eno' },
    {
      name: 'Jerry Harrison',
      role: 'songwriter',
      artistGlobeId: 'jerry-harrison',
    },
    { name: 'Brian Eno', role: 'engineer', artistGlobeId: 'brian-eno' },
    { name: 'Brian Eno', role: 'songwriter', artistGlobeId: 'brian-eno' },
    {
      name: 'Talking Heads',
      role: 'arranger',
      ensemble: true,
      artistGlobeId: 'talking-heads',
    },
    { name: 'David Byrne', role: 'vocals', artistGlobeId: 'david-byrne' },
    { name: 'David Byrne', role: 'engineer', artistGlobeId: 'david-byrne' },
    { name: 'John Potoker', role: 'engineer' },
    { name: 'David Byrne', role: 'arranger', artistGlobeId: 'david-byrne' },
    { name: 'David Byrne', role: 'songwriter', artistGlobeId: 'david-byrne' },
  ],
  releases: [{ releaseId: 'talking-heads-remain-in-light' }],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      instrumental: true,
      bars: [
        { chords: [], restBars: 10 },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/1', chordName: 'D/E', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/1', chordName: 'D/E', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=RjWej8fOdR8' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/talking-heads.webp',
  popularity: 50,
};
