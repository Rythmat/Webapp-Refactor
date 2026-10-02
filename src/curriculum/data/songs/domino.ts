import type { Song } from '@/curriculum/types/songLibrary';

export const domino: Song = {
  id: 'domino',
  title: 'Domino',
  artist: 'Jessie J',
  year: 2011,
  historicalDescription:
    "Jessie J releases 'Domino' in 2011, a euphoric pop-rock anthem that showcases her powerhouse vocals and knack for crafting radio-ready hooks. The song becomes one of her biggest international hits, cementing her place in the early 2010s pop landscape alongside a wave of British artists crossing over to global audiences.",
  key: 'G major',
  keyRoot: 67,
  mode: 'major',
  tempo: 127,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['pop', 'rock'],
  techniques: [],
  credits: [
    {
      name: 'Łukasz Gottwald',
      role: 'songwriter',
      artistGlobeId: 'ukasz-gottwald',
    },
    { name: 'Claude Kelly', role: 'songwriter', artistGlobeId: 'claude-kelly' },
    { name: 'Cirkut', role: 'producer', artistGlobeId: 'cirkut' },
    { name: 'Cirkut', role: 'songwriter', artistGlobeId: 'cirkut' },
    { name: 'Dr. Luke', role: 'producer', artistGlobeId: 'dr-luke' },
    { name: 'Emily Wright', role: 'engineer' },
    { name: 'Max Martin', role: 'songwriter', artistGlobeId: 'max-martin' },
    { name: 'Jessie J', role: 'songwriter', artistGlobeId: 'jessie-j' },
    { name: 'John Hanes', role: 'engineer' },
    { name: 'Claude Kelly', role: 'vocals', artistGlobeId: 'claude-kelly' },
    { name: 'Serban Ghenea', role: 'engineer' },
  ],
  releases: [{ releaseId: 'jessie-j-who-you-are', track: 14 }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [{ chords: [], restBars: 4 }],
    },
    {
      id: 'verse_1',
      label: 'Verse',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }],
          repeatStart: true,
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'D7sus', beat: 1, duration: 4 },
          ],
          repeatEnd: true,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=UJtB55MaoD0' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/jessie-j.webp',
  popularity: 50,
};
