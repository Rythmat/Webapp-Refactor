import type { Song } from '@/curriculum/types/songLibrary';

export const the_overload: Song = {
  id: 'the_overload',
  title: 'The Overload',
  artist: 'Talking Heads',
  year: 1980,
  historicalDescription:
    "Talking Heads close their landmark album 'Remain in Light' with 'The Overload', a deliberately stark, brooding piece the band writes as their imagining of what Joy Division sounds like — having never actually heard them. The result captures a rare moment of transatlantic post-punk convergence, two scenes arriving at the same bleak, cavernous sound from opposite sides of the Atlantic.",
  key: 'E minor',
  keyRoot: 64,
  mode: 'minor',
  tempo: 90,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],
  credits: [
    { name: 'David Byrne', role: 'songwriter', artistGlobeId: 'david-byrne' },
    { name: 'David Byrne', role: 'arranger', artistGlobeId: 'david-byrne' },
    { name: 'John Potoker', role: 'engineer' },
    { name: 'Brian Eno', role: 'producer', artistGlobeId: 'brian-eno' },
    { name: 'Brian Eno', role: 'engineer', artistGlobeId: 'brian-eno' },
    { name: 'Brian Eno', role: 'arranger', artistGlobeId: 'brian-eno' },
    { name: 'Chris Frantz', role: 'songwriter', artistGlobeId: 'chris-frantz' },
    { name: 'David Byrne', role: 'vocals', artistGlobeId: 'david-byrne' },
    { name: 'David Byrne', role: 'engineer', artistGlobeId: 'david-byrne' },
    { name: 'Dave Jerden', role: 'engineer' },
    { name: 'Brian Eno', role: 'songwriter', artistGlobeId: 'brian-eno' },
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
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
          fermata: true,
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
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=fNpc8jv7Awk' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/talking-heads.webp',
  popularity: 50,
};
