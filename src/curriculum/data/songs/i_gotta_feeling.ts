import type { Song } from '@/curriculum/types/songLibrary';

export const i_gotta_feeling: Song = {
  id: 'i_gotta_feeling',
  title: 'I Gotta Feeling',
  artist: 'Black Eyed Peas',
  year: 2009,
  historicalDescription:
    "The Black Eyed Peas release 'I Gotta Feeling' in 2009, and it becomes an anthem for a generation of celebrants. The track's euphoric, hands-in-the-air energy captures the optimistic spirit of the late 2000s club scene — spending a record-breaking 14 weeks at number one on the Billboard Hot 100 and embedding itself into the soundtrack of graduations, weddings, and New Year's countdowns worldwide.",
  key: 'G major',
  keyRoot: 67,
  mode: 'major',
  tempo: 128,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['pop', 'rock'],
  techniques: [],
  credits: [
    { name: 'David Guetta', role: 'songwriter', artistGlobeId: 'david-guetta' },
    { name: 'apl.de.ap', role: 'songwriter', artistGlobeId: 'apl-de-ap' },
    {
      name: 'Frédéric Riesterer',
      role: 'songwriter',
      artistGlobeId: 'frederic-riesterer',
    },
    { name: 'Taboo', role: 'songwriter', artistGlobeId: 'taboo' },
    { name: 'Fergie', role: 'songwriter', artistGlobeId: 'fergie' },
    { name: 'will.i.am', role: 'songwriter', artistGlobeId: 'will-i-am' },
  ],
  releases: [{ releaseId: 'black-eyed-peas-the-e-n-d' }],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj', chordName: 'D', beat: 1, duration: 2 },
            { degree: '6 min7', chordName: 'Emin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'D', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'interlude',
      label: 'Interlude',
      instrumental: true,
      bars: [{ chords: [], restBars: 16 }],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj', chordName: 'D', beat: 1, duration: 2 },
            { degree: '6 min7', chordName: 'Emin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'D', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }],
          fermata: true,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=uSD4vsh1zDA' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/black-eyed-peas.webp',
  popularity: 50,
};
