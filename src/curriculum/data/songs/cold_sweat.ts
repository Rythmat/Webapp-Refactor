import type { Song } from '@/curriculum/types/songLibrary';

export const cold_sweat: Song = {
  id: 'cold_sweat',
  title: 'Cold Sweat',
  artist: 'James Brown',
  year: 1967,
  historicalDescription:
    "James Brown releases 'Cold Sweat', stripping soul music down to its rhythmic bones and birthing a new grammar for funk. The groove locks into a relentless, hypnotic pulse where the one-beat reigns supreme — a blueprint that will define Black popular music for decades. Hip hop producers, from the 1970s to the present day, return to this record again and again.",
  key: 'D mixolydian',
  keyRoot: 62,
  mode: 'mixolydian',
  tempo: 110,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['funk'],
  techniques: [],

  sections: [
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'D7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        {
          chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }],
          keyChange: 'C mixolydian',
        },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [
            { degree: '3 7', chordName: 'E7', beat: 1, duration: 1 },
            { degree: '4 7', chordName: 'F7', beat: 2, duration: 1 },
            { degree: '♯4 7', chordName: 'F♯7', beat: 3, duration: 1 },
            { degree: '5 7', chordName: 'G7', beat: 4, duration: 1 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'G7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 7', chordName: 'F7', beat: 1, duration: 1 },
            { degree: '♯4 7', chordName: 'F♯7', beat: 2, duration: 1 },
            { degree: '5 7', chordName: 'G7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'G7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        {
          chords: [{ degree: '1 7', chordName: 'D7', beat: 1, duration: 4 }],
          keyChange: 'D mixolydian',
        },
        { chords: [{ degree: '1 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'D7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        {
          chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }],
          keyChange: 'C mixolydian',
        },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_4',
      label: 'Verse 4',
      bars: [
        {
          chords: [
            { degree: '3 7', chordName: 'E7', beat: 1, duration: 1 },
            { degree: '4 7', chordName: 'F7', beat: 2, duration: 1 },
            { degree: '♯4 7', chordName: 'F♯7', beat: 3, duration: 1 },
            { degree: '5 7', chordName: 'G7', beat: 4, duration: 1 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'G7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '4 7', chordName: 'F7', beat: 1, duration: 1 },
            { degree: '♯4 7', chordName: 'F♯7', beat: 2, duration: 1 },
            { degree: '5 7', chordName: 'G7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'G7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_5',
      label: 'Verse 5',
      bars: [
        {
          chords: [{ degree: '1 7', chordName: 'D7', beat: 1, duration: 4 }],
          keyChange: 'D mixolydian',
        },
        { chords: [{ degree: '1 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'D7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'interlude',
      label: 'Interlude',
      instrumental: true,
      bars: [{ chords: [], restBars: 4 }],
    },
    {
      id: 'verse_6',
      label: 'Verse 6',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'D7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'D7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_3',
      label: 'Chorus 3',
      bars: [
        {
          chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }],
          keyChange: 'C mixolydian',
        },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=tvltTXEg5kI' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/james-brown.webp',
  popularity: 50,
};
