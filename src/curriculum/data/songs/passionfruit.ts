import type { Song } from '@/curriculum/types/songLibrary';

export const passionfruit: Song = {
  id: 'passionfruit',
  title: 'Passionfruit',
  artist: 'Drake/Scary Pockets',
  year: 2017,

  historicalDescription:
    "Scary Pockets reimagine Drake's 'Passionfruit' as a live-band funk workout, stripping away the minimalist R&B production and rebuilding it from the groove up. The cover highlights how deeply the original's melody and chord structure translate across genres — a testament to Drake's songwriting reaching far beyond hip hop and pop audiences.",
  key: 'E major',
  keyRoot: 64,
  mode: 'major',
  tempo: 112,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['funk'],
  techniques: [],
  credits: [
    { name: 'Nana Rogues', role: 'songwriter', artistGlobeId: 'nana-rogues' },
    { name: 'Noel Cadastre', role: 'engineer' },
    { name: '40', role: 'songwriter', artistGlobeId: '40' },
    { name: 'Nana Rogues', role: 'producer', artistGlobeId: 'nana-rogues' },
    { name: 'Zoë Kravitz', role: 'vocals' },
    { name: 'Moodymann', role: 'vocals' },
    { name: 'Greg Moffet', role: 'engineer' },
    { name: 'Drake', role: 'songwriter', artistGlobeId: 'drake' },
    { name: 'Noel Campbell', role: 'engineer' },
    { name: '40', role: 'engineer', artistGlobeId: '40' },
  ],

  sections: [
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'B/D♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/7', chordName: 'B/D♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 dom7', chordName: 'G♯7sus', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [] },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=5HZl-8a85p8' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/scary-pockets.webp',
  popularity: 50,
};
