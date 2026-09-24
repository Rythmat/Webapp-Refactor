import type { Song } from '@/curriculum/types/songLibrary';

export const counting_stars: Song = {
  id: 'counting_stars',
  title: 'Counting Stars',
  artist: 'One Republic',
  year: 2013,
  historicalDescription:
    "OneRepublic releases 'Counting Stars', a pop-rock anthem that becomes one of the defining radio hits of 2013. Driven by a brooding verse that erupts into an anthemic chorus, the song captures a restless hunger for meaning over money — a sentiment that resonates globally and propels the band to their biggest commercial breakthrough.",
  key: 'C♯ minor',
  keyRoot: 61,
  mode: 'minor',
  tempo: 104,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['pop', 'rock'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        { chords: [] },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [] },
        {
          chords: [{ degree: '♭3 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        { chords: [] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        { chords: [] },
        {
          chords: [{ degree: '♭6 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        { chords: [] },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [] },
        {
          chords: [{ degree: '♭3 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        { chords: [] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        { chords: [] },
        {
          chords: [{ degree: '♭6 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        { chords: [] },
        { chords: [] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [] },
        {
          chords: [{ degree: '♭3 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        { chords: [] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        { chords: [] },
        {
          chords: [{ degree: '♭6 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        { chords: [] },
        { chords: [] },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [] },
        {
          chords: [{ degree: '♭3 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        { chords: [] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        { chords: [] },
        {
          chords: [{ degree: '♭6 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        { chords: [] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        { chords: [], restBars: 8 },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [] },
        {
          chords: [{ degree: '♭6 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        { chords: [] },
        { chords: [] },
      ],
    },
    {
      id: 'chorus_3',
      label: 'Chorus 3',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [] },
        {
          chords: [{ degree: '♭3 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        { chords: [] },
        {
          chords: [{ degree: '♭7 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        { chords: [] },
        {
          chords: [{ degree: '♭6 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        { chords: [] },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=hT_nvWreIhg' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/one-republic.webp',
  popularity: 50,
};
