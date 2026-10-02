import type { Song } from '@/curriculum/types/songLibrary';

export const steal_my_kisses: Song = {
  id: 'steal_my_kisses',
  title: 'Steal My Kisses',
  artist: 'Ben Harper',
  year: 2000,
  historicalDescription:
    "Ben Harper releases 'Steal My Kisses' in 2000, a warmly infectious roots-rock shuffle that becomes his biggest mainstream breakthrough. Blending folk, soul, and reggae-tinged grooves, the song introduces Harper's eclectic sound to a wide audience far beyond his devoted touring fanbase — proving that organic, guitar-driven music still has a place on radio at the turn of the millennium.",
  key: 'G major',
  keyRoot: 67,
  mode: 'major',
  tempo: 102,
  timeSignature: [4, 4],

  difficulty: 1,
  genreTags: ['rock'],
  techniques: [],
  credits: [
    {
      name: 'Ben Harper',
      role: 'vocals',
      primary: true,
      artistGlobeId: 'ben-harper',
    },
    { name: 'Eric Sarafin', role: 'engineer' },
    {
      name: 'Ben Harper',
      role: 'performer',
      primary: true,
      artistGlobeId: 'ben-harper',
    },
    { name: 'Nick Rich', role: 'performer' },
    {
      name: 'Ben Harper & The Innocent Criminals',
      role: 'performer',
      ensemble: true,
      artistGlobeId: 'ben-harper-and-the-innocent-criminals',
      primary: true,
    },
    { name: 'Dean Butterworth', role: 'performer' },
    { name: 'Juan Nelson', role: 'performer', instrument: 'electric-bass' },
    { name: 'JP Plunier', role: 'producer', artistGlobeId: 'jp-plunier' },
    { name: 'Ben Harper', role: 'songwriter', artistGlobeId: 'ben-harper' },
  ],
  releases: [
    {
      releaseId: 'ben-harper-and-the-innocent-criminals-burn-to-shine',
      track: 7,
    },
  ],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [{ chords: [], restBars: 4 }],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      instrumental: true,
      bars: [{ chords: [], restBars: 4 }],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'interlude',
      label: 'Interlude',
      instrumental: true,
      bars: [{ chords: [], restBars: 8 }],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=NL6dIt0CHe0' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/ben-harper.webp',
  popularity: 50,
};
