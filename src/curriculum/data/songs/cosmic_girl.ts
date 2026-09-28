import type { Song } from '@/curriculum/types/songLibrary';

export const cosmic_girl: Song = {
  id: 'cosmic_girl',
  title: 'Cosmic Girl',
  artist: 'Jamiroquai',
  year: 1996,
  historicalDescription:
    "Jamiroquai releases 'Cosmic Girl', a sleek fusion of funk, acid jazz, and pop that becomes one of the defining tracks of mid-90s British cool. Built on rubbery bass lines and Jay Kay's effortless falsetto, it captures the moment when London's acid jazz scene crosses into the mainstream. The song cements Jamiroquai's reputation as heirs to the Parliament-Funkadelic throne — retrofuturist groove merchants for a new generation.",
  key: 'E minor',
  keyRoot: 64,
  mode: 'minor',
  tempo: 120,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['funk', 'pop'],
  techniques: [],

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
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'B7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'B7', beat: 3, duration: 2 },
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
            { degree: '5 min7', chordName: 'G♯min7', beat: 1, duration: 2 },
            { degree: '4 min7', chordName: 'F♯min7', beat: 3, duration: 2 },
          ],
          keyChange: 'C♯ minor',
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'G♯min7', beat: 1, duration: 2 },
            { degree: '4 min7', chordName: 'F♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 dom7', chordName: 'B7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'G♯min7', beat: 1, duration: 2 },
            { degree: '4 min7', chordName: 'F♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'G♯min7', beat: 1, duration: 2 },
            { degree: '4 min7', chordName: 'F♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 dom7', chordName: 'B7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'G♯min7', beat: 1, duration: 2 },
            { degree: '4 min7', chordName: 'F♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'G♯min7', beat: 1, duration: 2 },
            { degree: '4 min7', chordName: 'F♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 dom7', chordName: 'B7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'G♯min7', beat: 1, duration: 2 },
            { degree: '4 min7', chordName: 'F♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'G♯min7', beat: 1, duration: 2 },
            { degree: '4 min7', chordName: 'F♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 dom7', chordName: 'B7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
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
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
          keyChange: 'E minor',
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'B7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'F♯min7', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'B7', beat: 3, duration: 2 },
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
            { degree: '5 min7', chordName: 'G♯min7', beat: 1, duration: 2 },
            { degree: '4 min7', chordName: 'F♯min7', beat: 3, duration: 2 },
          ],
          keyChange: 'C♯ minor',
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'G♯min7', beat: 1, duration: 2 },
            { degree: '4 min7', chordName: 'F♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 dom7', chordName: 'B7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'G♯min7', beat: 1, duration: 2 },
            { degree: '4 min7', chordName: 'F♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'G♯min7', beat: 1, duration: 2 },
            { degree: '4 min7', chordName: 'F♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 dom7', chordName: 'B7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'G♯min7', beat: 1, duration: 2 },
            { degree: '4 min7', chordName: 'F♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'G♯min7', beat: 1, duration: 2 },
            { degree: '4 min7', chordName: 'F♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 dom7', chordName: 'B7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'G♯min7', beat: 1, duration: 2 },
            { degree: '4 min7', chordName: 'F♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'G♯min7', beat: 1, duration: 2 },
            { degree: '4 min7', chordName: 'F♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♭7 dom7', chordName: 'B7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=D-NvQ6VJYtE' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/jamiroquai.webp',
  popularity: 50,
};
