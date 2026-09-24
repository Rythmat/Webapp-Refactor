import type { Song } from '@/curriculum/types/songLibrary';

export const easy: Song = {
  id: 'easy',
  title: 'Easy',
  artist: 'The Commodores',
  year: 1977,
  historicalDescription:
    "The Commodores release 'Easy', a slow-burning soul ballad that reveals a softer side of the Motown-signed funk outfit. Written by Lionel Richie, the song's quiet, confessional tone stands in contrast to the band's harder dance tracks — and becomes one of the defining moments of 1970s soft soul, foreshadowing Richie's massively successful solo career.",
  key: 'A♭ major',
  keyRoot: 68,
  mode: 'major',
  tempo: 68,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['pop'],
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
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '2 min7/5',
              chordName: 'B♭min7/E♭',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '2 min7/5',
              chordName: 'B♭min7/E♭',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '2 min7/5',
              chordName: 'B♭min7/E♭',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '2 min7/5',
              chordName: 'B♭min7/E♭',
              beat: 1,
              duration: 4,
            },
          ],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '2 min7/5',
              chordName: 'B♭min7/E♭',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '2 min7/5',
              chordName: 'B♭min7/E♭',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '2 min7/5',
              chordName: 'B♭min7/E♭',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 maj/6', chordName: 'D♭/F', beat: 1, duration: 2 },
            { degree: '4 maj/5', chordName: 'D♭/E♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      bars: [
        {
          chords: [{ degree: '♭7 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Fmin7', beat: 1, duration: 2 },
            { degree: '5 min7', chordName: 'E♭min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            {
              degree: '5 min7/1',
              chordName: 'E♭min7/A♭',
              beat: 1,
              duration: 2,
            },
            { degree: '4 maj/6', chordName: 'D♭/F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Fmin7', beat: 1, duration: 2 },
            { degree: '5 min7', chordName: 'E♭min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            {
              degree: '5 min7/1',
              chordName: 'E♭min7/A♭',
              beat: 1,
              duration: 2,
            },
            { degree: '4 maj/6', chordName: 'D♭/F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Fmin7', beat: 1, duration: 2 },
            { degree: '5 min7', chordName: 'E♭min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            {
              degree: '2 min7/1',
              chordName: 'B♭min7/A♭',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [{ degree: '♯2 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♯2 maj/5', chordName: 'B/E♭', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'interlude',
      label: 'Interlude',
      instrumental: true,
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '2 min7/5',
              chordName: 'B♭min7/E♭',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '2 min7/5',
              chordName: 'B♭min7/E♭',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '2 min7/5',
              chordName: 'B♭min7/E♭',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'B♭min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '♯2 min7/♯5',
              chordName: 'Bmin7/E',
              beat: 1,
              duration: 4,
            },
          ],
        },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        {
          chords: [{ degree: '♯1 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯2 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '♯2 min7/♯5',
              chordName: 'Bmin7/E',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [{ degree: '♯1 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯2 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '♯2 min7/♯5',
              chordName: 'Bmin7/E',
              beat: 1,
              duration: 4,
            },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=9nBSd1U18vM' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/the-commodores.webp',
  popularity: 50,
};
