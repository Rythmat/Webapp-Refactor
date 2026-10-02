import type { Song } from '@/curriculum/types/songLibrary';

export const celebration: Song = {
  id: 'celebration',
  title: 'Celebration',
  artist: 'Kool & the Gang',
  year: 1980,

  historicalDescription:
    "Kool and the Gang releases 'Celebration', a euphoric funk anthem that becomes one of the most recognizable party songs in history. Its irresistible horn-driven groove and jubilant chorus cross every demographic barrier, transforming the band from jazz-funk underground pioneers into mainstream pop stars. The song becomes the soundtrack to Super Bowls, weddings, and New Year's Eve countdowns for decades to come.",
  key: 'A♭ major',
  keyRoot: 68,
  mode: 'major',
  tempo: 120,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['funk'],
  techniques: [],
  credits: [
    {
      name: 'Robert Spike Mickens',
      role: 'songwriter',
      artistGlobeId: 'robert-spike-mickens',
    },
    {
      name: 'James “J.T.” Taylor',
      role: 'songwriter',
      artistGlobeId: 'james-j-t-taylor',
    },
    { name: 'George Brown', role: 'songwriter', artistGlobeId: 'george-brown' },
    { name: 'Ronald Bell', role: 'songwriter', artistGlobeId: 'ronald-bell' },
    {
      name: 'Dennis “D.T.” Thomas',
      role: 'songwriter',
      artistGlobeId: 'dennis-d-t-thomas',
    },
    {
      name: 'Robert “Kool” Bell',
      role: 'songwriter',
      artistGlobeId: 'robert-kool-bell',
    },
    {
      name: 'Eumir Deodato',
      role: 'songwriter',
      artistGlobeId: 'eumir-deodato',
    },
    {
      name: 'Earl Toon, Jr.',
      role: 'songwriter',
      artistGlobeId: 'earl-toon-jr',
    },
    {
      name: 'Claydes Smith',
      role: 'songwriter',
      artistGlobeId: 'claydes-smith',
    },
  ],
  releases: [{ releaseId: 'kool-and-the-gang-celebrate' }],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [{ chords: [], restBars: 8 }],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [
            { degree: '4 maj/6', chordName: 'D♭/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 maj/6', chordName: 'D♭/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'G♭', beat: 1, duration: 1 },
            { degree: '4 maj/6', chordName: 'D♭/F', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/6', chordName: 'D♭/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 maj/6', chordName: 'D♭/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'G♭', beat: 1, duration: 1 },
            { degree: '4 maj/6', chordName: 'D♭/F', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'A♭', beat: 3, duration: 2 },
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
            { degree: '♭7 maj/1', chordName: 'G♭/A♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/1', chordName: 'G♭/A♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'D♭/A♭', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        { chords: [] },
        {
          chords: [
            { degree: '♭7 maj/1', chordName: 'G♭/A♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/1', chordName: 'G♭/A♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'D♭/A♭', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        { chords: [] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [
            { degree: '1 maj/4', chordName: 'A♭/D♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/4', chordName: 'A♭/D♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 maj/6', chordName: 'E♭/F', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '6 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'E♭7', beat: 1, duration: 4 },
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
            { degree: '4 maj/6', chordName: 'D♭/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 maj/6', chordName: 'D♭/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'G♭', beat: 1, duration: 1 },
            { degree: '4 maj/6', chordName: 'D♭/F', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/6', chordName: 'D♭/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 maj/6', chordName: 'D♭/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'G♭', beat: 1, duration: 1 },
            { degree: '4 maj/6', chordName: 'D♭/F', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'A♭', beat: 3, duration: 2 },
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
            { degree: '♭7 maj/1', chordName: 'G♭/A♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/1', chordName: 'G♭/A♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'D♭/A♭', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        { chords: [] },
        {
          chords: [
            { degree: '♭7 maj/1', chordName: 'G♭/A♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/1', chordName: 'G♭/A♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/1', chordName: 'D♭/A♭', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        { chords: [] },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        {
          chords: [
            { degree: '4 maj/6', chordName: 'D♭/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 maj/6', chordName: 'D♭/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'G♭', beat: 1, duration: 1 },
            { degree: '4 maj/6', chordName: 'D♭/F', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/6', chordName: 'D♭/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 maj/6', chordName: 'D♭/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'G♭', beat: 1, duration: 1 },
            { degree: '4 maj/6', chordName: 'D♭/F', beat: 2, duration: 1 },
            { degree: '1 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=3GwjfUFyY6M' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/kool-and-the-gang.webp',
  popularity: 50,
};
