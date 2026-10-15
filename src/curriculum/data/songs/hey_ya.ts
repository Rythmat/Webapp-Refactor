import type { Song } from '@/curriculum/types/songLibrary';

export const hey_ya: Song = {
  id: 'hey_ya',
  title: 'Hey Ya!',
  artist: 'Outkast',
  year: 2003,
  historicalDescription:
    "Outkast's Andre 3000 releases 'Hey Ya!' in 2003, a song so genre-defying it collapses the walls between hip hop, funk, pop, and rock into a single irresistible burst of energy. Despite its relentlessly upbeat sound, the lyrics wrestle with relationship disillusionment — a contradiction that makes it one of the most deceptively complex pop songs of its era. It becomes a cultural flashpoint, cementing Outkast's status as the most adventurous act in hip hop.",
  key: 'G major',
  keyRoot: 67,
  mode: 'major',
  tempo: 162,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['hip-hop'],
  techniques: [],
  credits: [
    { name: 'John Frye', role: 'engineer' },
    { name: 'Neal Pogue', role: 'engineer' },
    {
      name: 'André Benjamin',
      role: 'songwriter',
      artistGlobeId: 'andre-benjamin',
    },
    { name: 'André 3000', role: 'vocals', artistGlobeId: 'andre-3000' },
    { name: 'Pete Novak', role: 'engineer' },
    { name: 'André 3000', role: 'producer', artistGlobeId: 'andre-3000' },
    { name: 'Kevin Kendrick', role: 'performer' },
    { name: 'Robert Hannon', role: 'engineer' },
    { name: 'André 3000', role: 'performer', artistGlobeId: 'andre-3000' },
    {
      name: 'André 3000',
      role: 'performer',
      instrument: 'acoustic-guitar',
      artistGlobeId: 'andre-3000',
    },
  ],
  releases: [{ releaseId: 'outkast-speakerboxxx-the-love-below' }],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      notes:
        "The loop runs G, C, a two-beat D, and E major: 22 beats, the song's famously lopsided phrase.",
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }],
          repeatStart: true,
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          timeSignature: [2, 4],
          chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 2 }],
        },
        {
          timeSignature: [4, 4],
          chords: [{ degree: '6 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '6 maj', chordName: 'E', beat: 1, duration: 4 }],
          repeatEnd: true,
          repeatTimes: 2,
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }],
          repeatStart: true,
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          timeSignature: [2, 4],
          chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 2 }],
        },
        {
          timeSignature: [4, 4],
          chords: [{ degree: '6 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '6 maj', chordName: 'E', beat: 1, duration: 4 }],
          repeatEnd: true,
          repeatTimes: 2,
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }],
          repeatStart: true,
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          timeSignature: [2, 4],
          chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 2 }],
        },
        {
          timeSignature: [4, 4],
          chords: [{ degree: '6 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '6 maj', chordName: 'E', beat: 1, duration: 4 }],
          repeatEnd: true,
          repeatTimes: 2,
        },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }],
          repeatStart: true,
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          timeSignature: [2, 4],
          chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 2 }],
        },
        {
          timeSignature: [4, 4],
          chords: [{ degree: '6 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '6 maj', chordName: 'E', beat: 1, duration: 4 }],
          repeatEnd: true,
          repeatTimes: 2,
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }],
          repeatStart: true,
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          timeSignature: [2, 4],
          chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 2 }],
        },
        {
          timeSignature: [4, 4],
          chords: [{ degree: '6 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '6 maj', chordName: 'E', beat: 1, duration: 4 }],
          repeatEnd: true,
          repeatTimes: 2,
        },
      ],
    },
    {
      id: 'chorus_3',
      label: 'Chorus 3',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }],
          repeatStart: true,
        },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          timeSignature: [2, 4],
          chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 2 }],
        },
        {
          timeSignature: [4, 4],
          chords: [{ degree: '6 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '6 maj', chordName: 'E', beat: 1, duration: 4 }],
          repeatEnd: true,
          cue: 'Repeat and Fade',
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=PWgvGjAhvIw' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/outkast.webp',
  popularity: 50,
};
