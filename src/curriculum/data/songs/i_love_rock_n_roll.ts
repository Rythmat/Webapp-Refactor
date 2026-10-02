import type { Song } from '@/curriculum/types/songLibrary';

export const i_love_rock_n_roll: Song = {
  id: 'i_love_rock_n_roll',
  title: 'I Love Rock ‘N’ Roll',
  artist: 'Joan Jett & The Blackhearts',
  year: 1981,

  historicalDescription:
    "Joan Jett & The Blackhearts release 'I Love Rock 'N' Roll', a stomping declaration of pure rock devotion that becomes one of the defining anthems of the early 1980s. Originally recorded by The Arrows in 1975, Jett's ferocious reinvention makes it entirely her own — spending seven weeks at #1 and cementing her status as one of rock's most unapologetic voices.",
  key: 'E major',
  keyRoot: 64,
  mode: 'major',
  tempo: 96,
  timeSignature: [4, 4],

  difficulty: 1,
  genreTags: ['rock'],
  techniques: [],
  credits: [
    {
      name: 'Kenny Laguna',
      role: 'performer',
      instrument: 'organ',
      artistGlobeId: 'kenny-laguna',
    },
    { name: 'Jake Hooker', role: 'songwriter', artistGlobeId: 'jake-hooker' },
    { name: 'Kenny Laguna', role: 'producer', artistGlobeId: 'kenny-laguna' },
    { name: 'Joan Jett', role: 'vocals', artistGlobeId: 'joan-jett' },
    { name: 'Ricky Byrd', role: 'performer' },
    {
      name: 'Kenny Laguna',
      role: 'performer',
      instrument: 'backing-vocals',
      artistGlobeId: 'kenny-laguna',
    },
    { name: 'Gary Ryan', role: 'performer', instrument: 'backing-vocals' },
    { name: 'Glen Kolotkin', role: 'engineer' },
    { name: 'Joan Jett', role: 'performer', artistGlobeId: 'joan-jett' },
    { name: 'Alan Merrill', role: 'songwriter', artistGlobeId: 'alan-merrill' },
    {
      name: 'Lee Crystal',
      role: 'performer',
      instrument: 'drum-kit',
      artistGlobeId: 'lee-crystal',
    },
    { name: 'Jerry Gabenelli', role: 'engineer' },
    {
      name: 'Kenny Laguna',
      role: 'performer',
      instrument: 'piano',
      artistGlobeId: 'kenny-laguna',
    },
    { name: 'Gary Ryan', role: 'performer', instrument: 'electric-bass' },
    {
      name: 'Ritchie Cordell',
      role: 'producer',
      artistGlobeId: 'ritchie-cordell',
    },
  ],
  releases: [{ releaseId: 'joan-jett-and-the-blackhearts-i-love-rock-n-roll' }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'B', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '5 maj', chordName: 'B', beat: 1, duration: 4 }],
          restBars: 2,
        },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'B', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'E', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [], restBars: 7 },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '5 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [] },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=wMsazR6Tnf8' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/joan-jett-the-blackhearts.webp',
  popularity: 50,
};
