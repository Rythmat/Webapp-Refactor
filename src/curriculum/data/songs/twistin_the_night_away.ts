import type { Song } from '@/curriculum/types/songLibrary';

export const twistin_the_night_away: Song = {
  id: 'twistin_the_night_away',
  title: 'Twistin’ The Night Away',
  artist: 'Sam Cooke',
  year: 1962,
  historicalDescription:
    "Sam Cooke releases 'Twistin' The Night Away' in 1962, capturing the twist dance craze sweeping America with his signature silky tenor and irresistible charm. The song becomes a massive hit, showcasing Cooke's rare gift for making pop feel effortless — bridging the Black R&B tradition with mainstream white audiences at a pivotal moment in American cultural integration.",
  key: 'A major',
  keyRoot: 69,
  mode: 'major',
  tempo: 158,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rnb'],
  techniques: [],
  session: { studioId: 'rca-studios' },
  credits: [
    { name: 'Tommy Tedesco', role: 'performer' },
    { name: 'Red Callender', role: 'performer' },
    { name: 'Earl Palmer', role: 'performer', instrument: 'drum-kit' },
    { name: 'Ernest Hayes', role: 'performer', instrument: 'piano' },
    {
      name: 'Luigi Creatore',
      role: 'producer',
      artistGlobeId: 'luigi-creatore',
    },
    { name: 'Jewell Grant', role: 'performer' },
    { name: 'John Ewing', role: 'performer', instrument: 'trombone' },
    { name: 'John Kelsom', role: 'performer' },
    { name: 'Sam Cooke', role: 'songwriter', artistGlobeId: 'sam-cooke' },
    { name: 'René Hall', role: 'arranger' },
    { name: 'Sam Cooke', role: 'producer', artistGlobeId: 'sam-cooke' },
    { name: 'Hugo Peretti', role: 'producer', artistGlobeId: 'hugo-peretti' },
    { name: 'Al Schmitt', role: 'engineer' },
    { name: 'René Hall', role: 'conductor' },
    { name: 'René Hall', role: 'performer' },
    { name: 'Clifton White', role: 'performer' },
    {
      name: 'Sam Cooke',
      role: 'vocals',
      artistGlobeId: 'sam-cooke',
      primary: true,
    },
    { name: 'Stuart Williamson', role: 'performer', instrument: 'trumpet' },
  ],
  releases: [{ releaseId: 'sam-cooke-twistin-the-night-away' }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        {
          chords: [{ degree: '1 dom7', chordName: 'A7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'A7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'A7', beat: 1, duration: 4 }],
        },
        { chords: [], restBars: 1 },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }],
          repeatStart: true,
        },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }],
          repeatEnd: true,
        },
      ],
    },
    {
      id: 'verse_5',
      label: 'Verse 3',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'E', beat: 1, duration: 4 }] },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=yddHfpbK438' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/sam-cooke.webp',
  popularity: 50,
};
