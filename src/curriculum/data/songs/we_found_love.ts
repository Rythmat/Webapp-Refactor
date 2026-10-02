import type { Song } from '@/curriculum/types/songLibrary';

export const we_found_love: Song = {
  id: 'we_found_love',
  title: 'We Found Love',
  artist: 'Rihanna',
  year: 2011,
  historicalDescription:
    "Rihanna and producer Calvin Harris release 'We Found Love', a euphoric dance-pop anthem that becomes one of the best-selling singles of all time. Its pulsing four-on-the-floor beat and Rihanna's soaring vocal hook capture the peak of EDM's crossover into mainstream pop, cementing the era when festival culture and Top 40 radio fully collide.",
  key: 'D♯ minor',
  keyRoot: 63,
  mode: 'minor',
  tempo: 128,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['pop', 'rock'],
  techniques: [],
  credits: [
    { name: 'Marcos Tovar', role: 'engineer' },
    { name: 'Calvin Harris', role: 'producer', artistGlobeId: 'calvin-harris' },
    { name: 'Kuk Harrell', role: 'producer', artistGlobeId: 'kuk-harrell' },
    { name: 'Calvin Harris', role: 'engineer', artistGlobeId: 'calvin-harris' },
    {
      name: 'Calvin Harris',
      role: 'songwriter',
      artistGlobeId: 'calvin-harris',
    },
    {
      name: 'Rihanna',
      role: 'vocals',
      primary: true,
      artistGlobeId: 'rihanna',
    },
    { name: 'Kuk Harrell', role: 'engineer', artistGlobeId: 'kuk-harrell' },
    { name: 'Phil Tan', role: 'engineer' },
    {
      name: 'Calvin Harris',
      role: 'performer',
      primary: true,
      artistGlobeId: 'calvin-harris',
    },
  ],
  releases: [{ releaseId: 'rihanna-talk-that-talk', track: 3 }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [
        { chords: [], restBars: 4 },
        { chords: [], restBars: 8 },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 maj/♭6', chordName: 'F♯/B', beat: 1, duration: 2 },
            { degree: '♭3 maj', chordName: 'F♯', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/4', chordName: 'C♯/G♯', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'D♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭3 maj/♭6', chordName: 'F♯/B', beat: 1, duration: 2 },
            { degree: '♭3 maj', chordName: 'F♯', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/4', chordName: 'C♯/G♯', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 maj/♭6', chordName: 'F♯/B', beat: 1, duration: 2 },
            { degree: '♭3 maj', chordName: 'F♯', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/4', chordName: 'C♯/G♯', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'D♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭3 maj/♭6', chordName: 'F♯/B', beat: 1, duration: 2 },
            { degree: '♭3 maj', chordName: 'F♯', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/4', chordName: 'C♯/G♯', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 maj/♭6', chordName: 'F♯/B', beat: 1, duration: 2 },
            { degree: '♭3 maj', chordName: 'F♯', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/4', chordName: 'C♯/G♯', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'D♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭3 maj/♭6', chordName: 'F♯/B', beat: 1, duration: 2 },
            { degree: '♭3 maj', chordName: 'F♯', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/4', chordName: 'C♯/G♯', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus_3',
      label: 'Chorus 3',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_4',
      label: 'Verse 4',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭3 maj/♭6', chordName: 'F♯/B', beat: 1, duration: 2 },
            { degree: '♭3 maj', chordName: 'F♯', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/4', chordName: 'C♯/G♯', beat: 1, duration: 2 },
            { degree: '1 min7', chordName: 'D♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭3 maj/♭6', chordName: 'F♯/B', beat: 1, duration: 2 },
            { degree: '♭3 maj', chordName: 'F♯', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/4', chordName: 'C♯/G♯', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=tg00YEETFzg' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/rihanna.webp',
  popularity: 50,
};
