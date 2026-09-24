import type { Song } from '@/curriculum/types/songLibrary';

export const old_time_rock_and_roll: Song = {
  id: 'old_time_rock_and_roll',
  title: 'Old Time Rock And Roll',
  artist: 'Bob Seger',
  year: 1981,
  historicalDescription:
    "Bob Seger's 'Old Time Rock And Roll' becomes a generational anthem for classic rock purists who distrust the flashy sounds of disco and new wave. Already a staple of his live shows, the song crystallizes a defiant nostalgia — a working-class refusal to abandon the raw, guitar-driven music of the 1950s and 60s. Its cultural reach explodes when Tom Cruise slides across the floor in his socks in Risky Business in 1983.",
  key: 'F♯ blues',
  keyRoot: 66,
  mode: 'mixolydian',
  tempo: 124,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],

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
        { chords: [{ degree: '1 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'B7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        { chords: [{ degree: '5 7', chordName: 'C♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'C♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'C♯7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'interlude',
      label: 'Interlude',
      instrumental: true,
      bars: [{ chords: [], restBars: 8 }],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'B7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        { chords: [{ degree: '5 7', chordName: 'C♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'C♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'C♯7', beat: 1, duration: 4 }] },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=W1LsRShUPtY' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/bob-seger.webp',
  popularity: 50,
};
