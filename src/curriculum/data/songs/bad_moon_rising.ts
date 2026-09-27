import type { Song } from '@/curriculum/types/songLibrary';

export const bad_moon_rising: Song = {
  id: 'bad_moon_rising',
  title: 'Bad Moon Rising',
  artist: 'Creedence Clearwater Revival',
  year: undefined,

  historicalDescription:
    "Creedence Clearwater Revival releases 'Bad Moon Rising', a deceptively bright, uptempo rocker wrapped around a dark omen of disaster. Written by John Fogerty and drawn from a scene in the 1941 film 'The Devil and Daniel Webster', it captures the dread and uncertainty of late-1960s America — Vietnam, social upheaval, and a nation on edge. It becomes one of CCR's signature songs and a rock standard.",
  key: 'D major',
  keyRoot: 62,
  mode: 'major',
  tempo: 180,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['rock'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [
        { chords: [], restBars: 2 },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }],
          repeatStart: true,
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'G', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'G', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }],
          repeatEnd: true,
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }],
          repeatStart: true,
        },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'G', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'G', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }],
          repeatEnd: true,
        },
      ],
    },
    {
      id: 'chorus_3',
      label: 'Chorus 2',
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'D', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        { chords: [{ degree: '2 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '7 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯1 maj', chordName: 'D♯', beat: 1, duration: 2 },
            { degree: '3 maj', chordName: 'F♯', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 maj', chordName: 'B', beat: 1, duration: 2 },
            { degree: '6 dom7', chordName: 'B7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '2 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 maj', chordName: 'B', beat: 1, duration: 2 },
            { degree: '6 dom7', chordName: 'B7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '2 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♯4 min7', chordName: 'G♯min7', beat: 1, duration: 1 },
            { degree: '♯5 min7', chordName: 'A♯min7', beat: 2, duration: 1 },
            { degree: '♯1 maj', chordName: 'D♯', beat: 3, duration: 1 },
            { degree: '♯4 min7', chordName: 'G♯min7', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '7 min7', chordName: 'C♯min7', beat: 1, duration: 2 },
            { degree: '3 dom7', chordName: 'F♯7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 maj', chordName: 'B', beat: 1, duration: 2 },
            { degree: '6 dom7', chordName: 'B7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '2 maj', chordName: 'E', beat: 1, duration: 4 }] },
        { chords: [{ degree: '6 maj', chordName: 'B', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '6 maj', chordName: 'B', beat: 1, duration: 2 },
            { degree: '6 dom7', chordName: 'B7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '2 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♯4 min7', chordName: 'G♯min7', beat: 1, duration: 1 },
            { degree: '♯5 min7', chordName: 'A♯min7', beat: 2, duration: 1 },
            { degree: '♯1 maj', chordName: 'D♯', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '♯1 maj', chordName: 'D♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♯4 min7', chordName: 'G♯min7', beat: 1, duration: 1 },
            { degree: '♯5 min7', chordName: 'A♯min7', beat: 2, duration: 1 },
            { degree: '6 maj', chordName: 'B', beat: 3, duration: 1 },
            { degree: '7 maj', chordName: 'C♯', beat: 4, duration: 1 },
          ],
        },
        {
          chords: [
            { degree: '♯4 min7', chordName: 'G♯min7', beat: 1, duration: 1 },
            { degree: '♯5 min7', chordName: 'A♯min7', beat: 2, duration: 1 },
            { degree: '6 maj', chordName: 'B', beat: 3, duration: 1 },
            { degree: '7 maj', chordName: 'C♯', beat: 4, duration: 1 },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=zUQiUFZ5RDw' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/creedence-clearwater-revival.webp',
  popularity: 50,
};
