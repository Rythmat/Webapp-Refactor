import type { Song } from '@/curriculum/types/songLibrary';

export const golden_lady: Song = {
  id: 'golden_lady',
  title: 'Golden Lady',
  artist: 'Stevie Wonder',
  year: 1973,
  historicalDescription:
    "Stevie Wonder releases 'Golden Lady' as part of his landmark 1973 album 'Innervisions', a record that cements his status as one of the most visionary artists of his generation. A tender, floating love song amid the album's social commentary, it showcases Wonder's mastery of melody and atmosphere — proof that his creative renaissance is fully in bloom.",
  key: 'E♭ major',
  keyRoot: 63,
  mode: 'major',
  tempo: 102,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['funk'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯4 min7', chordName: 'Amin7', beat: 1, duration: 2 },
            { degree: '7 dom7', chordName: 'D7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯4 min7', chordName: 'Amin7', beat: 1, duration: 2 },
            { degree: '7 dom7', chordName: 'D7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯4 min7', chordName: 'Amin7', beat: 1, duration: 2 },
            { degree: '7 dom7', chordName: 'D7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'pre_chorus_1',
      label: 'Pre-Chorus 1',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'A♭min7', beat: 1, duration: 2 },
            { degree: '♭7 dom7', chordName: 'D♭7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♯2 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯2 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '♯5 dom7', chordName: 'B7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♯4 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '7 dom7', chordName: 'D7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      bars: [
        {
          chords: [
            { degree: '3 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min/♯2', chordName: 'Gmin/F♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min/2', chordName: 'Gmin/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min/♯1', chordName: 'Gmin/E', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min/♯2', chordName: 'Gmin/F♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min/2', chordName: 'Gmin/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min/♯1', chordName: 'Gmin/E', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'interlude',
      label: 'Interlude',
      instrumental: true,
      bars: [
        { chords: [{ degree: '3 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 dom7', chordName: 'B♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯4 min7', chordName: 'Amin7', beat: 1, duration: 2 },
            { degree: '7 dom7', chordName: 'D7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Fmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯4 min7', chordName: 'Amin7', beat: 1, duration: 2 },
            { degree: '7 dom7', chordName: 'D7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'pre_chorus_2',
      label: 'Pre-Chorus 2',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'A♭min7', beat: 1, duration: 2 },
            { degree: '♭7 dom7', chordName: 'D♭7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♯2 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯2 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '♯5 dom7', chordName: 'B7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♯4 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '7 dom7', chordName: 'D7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        {
          chords: [
            { degree: '4 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min/3', chordName: 'G♯min/G', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min/♯2', chordName: 'G♯min/F♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min/2', chordName: 'G♯min/F', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♯4 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♯4 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯4 min/4', chordName: 'Amin/G♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯4 min/3', chordName: 'Amin/G', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯4 min/♯2', chordName: 'Amin/F♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '5 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'A♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min/♯4', chordName: 'A♯min/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min/4', chordName: 'A♯min/G♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min/3', chordName: 'A♯min/G', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♯5 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♯5 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯5 min/5', chordName: 'Bmin/A♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯5 min/♯4', chordName: 'Bmin/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♯5 min/4', chordName: 'Bmin/G♯', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '6 maj', chordName: 'C', beat: 1, duration: 4 }] },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=CXCTjAMR3eA' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/stevie-wonder.webp',
  popularity: 50,
};
