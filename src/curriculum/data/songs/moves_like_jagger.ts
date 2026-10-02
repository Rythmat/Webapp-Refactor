import type { Song } from '@/curriculum/types/songLibrary';

export const moves_like_jagger: Song = {
  id: 'moves_like_jagger',
  title: 'Moves Like Jagger',
  artist: 'Maroon 5',
  year: 2011,
  historicalDescription:
    "Maroon 5 releases 'Moves Like Jagger' in 2011, a sleek pop-rock track that becomes one of the defining radio hits of the early 2010s. The song's confident swagger and minimalist groove mark a decisive shift in Maroon 5's sound — from funk-inflected rock toward mainstream pop dominance. The Mick Jagger namecheck captures a broader cultural moment of rock mythology being absorbed into polished, radio-ready pop.",
  key: 'B minor',
  keyRoot: 71,
  mode: 'minor',
  tempo: 128,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['pop', 'rock'],
  techniques: [],
  credits: [
    {
      name: 'James Valentine',
      role: 'performer',
      artistGlobeId: 'james-valentine',
    },
    { name: 'Ammar Malik', role: 'songwriter', artistGlobeId: 'ammar-malik' },
    { name: 'Shellback', role: 'songwriter', artistGlobeId: 'shellback' },
    {
      name: 'Matt Flynn',
      role: 'performer',
      instrument: 'drum-kit',
      artistGlobeId: 'matt-flynn',
    },
    { name: 'benny blanco', role: 'songwriter', artistGlobeId: 'benny-blanco' },
    { name: 'Adam Levine', role: 'vocals', artistGlobeId: 'adam-levine' },
    {
      name: 'Mickey Madden',
      role: 'performer',
      artistGlobeId: 'mickey-madden',
    },
    {
      name: 'Adam Levine',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'adam-levine',
    },
    {
      name: 'Matt Flynn',
      role: 'performer',
      instrument: 'percussion',
      artistGlobeId: 'matt-flynn',
    },
    {
      name: 'Maroon 5',
      role: 'performer',
      ensemble: true,
      primary: true,
      artistGlobeId: 'maroon-5',
    },
    {
      name: 'Christina Aguilera',
      role: 'performer',
      primary: true,
      artistGlobeId: 'christina-aguilera',
    },
    { name: 'PJ Morton', role: 'performer', artistGlobeId: 'pj-morton' },
    { name: 'Adam Levine', role: 'songwriter', artistGlobeId: 'adam-levine' },
  ],
  releases: [{ releaseId: 'maroon-5-hands-all-over', track: 13 }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [{ chords: [], restBars: 16 }],
    },
    {
      id: 'verse',
      label: 'Verse',
      bars: [{ chords: [], restBars: 8 }],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=iEPTlhBmwRg' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/maroon-5.webp',
  popularity: 50,
};
