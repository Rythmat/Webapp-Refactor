import type { Song } from '@/curriculum/types/songLibrary';

export const golden: Song = {
  id: 'golden',
  title: 'Golden',
  artist: 'Jill Scott',
  year: 2004,
  historicalDescription:
    "Jill Scott releases 'Golden' in 2004, a sun-drenched anthem of self-affirmation that becomes one of the defining songs of the neo-soul movement. Built on her trademark blend of spoken word, soulful vocals, and hip-hop grooves, it captures the Philadelphia singer at her most radiant — celebrating living freely and unapologetically. The song cements Scott's place as a leading voice in a generation redefining Black feminine joy.",
  key: 'E♭ minor',
  keyRoot: 63,
  mode: 'minor',
  tempo: 100,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['hip-hop'],
  techniques: [],
  credits: [
    { name: 'Serban Ghenea', role: 'engineer' },
    { name: 'Darrell Robinson', role: 'performer', instrument: 'drum-kit' },
    { name: 'Anthony Bell', role: 'performer', artistGlobeId: 'anthony-bell' },
    { name: 'Anthony Bell', role: 'producer', artistGlobeId: 'anthony-bell' },
    { name: 'Anthony Bell', role: 'songwriter', artistGlobeId: 'anthony-bell' },
    { name: 'Jill Scott', role: 'songwriter', artistGlobeId: 'jill-scott' },
    { name: 'Pete Kuzma', role: 'performer', instrument: 'piano' },
    {
      name: 'Jill Scott',
      role: 'vocals',
      artistGlobeId: 'jill-scott',
      primary: true,
    },
    { name: 'Harold Robinson', role: 'performer' },
  ],
  releases: [
    {
      releaseId: 'jill-scott-beautifully-human-words-and-sounds-vol-2',
      track: 3,
    },
  ],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      bars: [{ chords: [], restBars: 8 }],
    },
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♯5 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'B♭7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'E♭min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=4QCXr79Rkcw' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/jill-scott.webp',
  popularity: 50,
};
