import type { Song } from '@/curriculum/types/songLibrary';

export const black_hole_sun: Song = {
  id: 'black_hole_sun',
  title: 'Black Hole Sun',
  artist: 'Soundgarden',
  year: 1994,
  historicalDescription:
    "Soundgarden releases 'Black Hole Sun' from their landmark album Superunknown, and it becomes one of the defining anthems of the grunge era. Chris Cornell's sweeping, operatic vocals ride a hypnotic, slow-burning riff that sounds unlike anything else coming out of Seattle — simultaneously melancholic and grandiose. Its surreal music video becomes an MTV staple, cementing Soundgarden's place alongside Nirvana and Pearl Jam at the peak of alternative rock's mainstream moment.",
  key: 'A♭ major',
  keyRoot: 68,
  mode: 'major',
  tempo: 52,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [{ chords: [], fermata: true, restBars: 1 }],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♯2 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '6 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♯5 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 dom7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj', chordName: 'A♭', beat: 1, duration: 1 },
            { degree: '1 maj/♭7', chordName: 'A♭/G♭', beat: 2, duration: 1 },
            { degree: '♯1 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♯2 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '6 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♯5 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 dom7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj', chordName: 'A♭', beat: 1, duration: 1 },
            { degree: '1 maj/♭7', chordName: 'A♭/G♭', beat: 2, duration: 1 },
            { degree: '♯1 maj', chordName: 'A', beat: 3, duration: 2 },
          ],
        },
        { chords: [] },
      ],
    },
    {
      id: 'pre_chorus_1',
      label: 'Pre-Chorus 1',
      bars: [
        { chords: [{ degree: '♯5 dom7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 dom7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 dom7', chordName: 'A♭7', beat: 1, duration: 1 },
            { degree: '1 maj/♭7', chordName: 'A♭/G♭', beat: 2, duration: 1 },
            { degree: '♯2 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '♯5 dom7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 dom7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '4 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 dom7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [] },
        { chords: [{ degree: '♯5 dom7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 dom7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 dom7', chordName: 'A♭7', beat: 1, duration: 1 },
            { degree: '1 maj/♭7', chordName: 'A♭/G♭', beat: 2, duration: 1 },
            { degree: '♯2 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '♯5 dom7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 dom7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '4 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♯2 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'pre_chorus_2',
      label: 'Pre-Chorus 2',
      bars: [
        { chords: [{ degree: '♯5 dom7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 dom7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 dom7', chordName: 'A♭7', beat: 1, duration: 1 },
            { degree: '1 maj/♭7', chordName: 'A♭/G♭', beat: 2, duration: 1 },
            { degree: '♯2 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '♯5 dom7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 dom7', chordName: 'E♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♯2 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 dom7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '4 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♯2 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 dom7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '4 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♯2 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 dom7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '4 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♯2 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 dom7', chordName: 'E♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'interlude',
      label: 'Interlude',
      instrumental: true,
      bars: [
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
        { chords: [] },
        { chords: [] },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'G♭', beat: 1, duration: 1 },
            { degree: '1 maj', chordName: 'A♭', beat: 2, duration: 3 },
          ],
        },
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
        { chords: [], restBars: 1 },
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
          chords: [{ degree: '♯2 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '6 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
        { chords: [] },
      ],
    },
    {
      id: 'pre_chorus_3',
      label: 'Pre-Chorus 3',
      bars: [
        { chords: [{ degree: '♯5 dom7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 dom7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 dom7', chordName: 'A♭7', beat: 1, duration: 1 },
            { degree: '1 maj/♭7', chordName: 'A♭/G♭', beat: 2, duration: 1 },
            { degree: '♯2 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '♯5 dom7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 dom7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '4 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♯2 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '♯5 dom7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 dom7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 dom7', chordName: 'A♭7', beat: 1, duration: 1 },
            { degree: '1 maj/♭7', chordName: 'A♭/G♭', beat: 2, duration: 1 },
            { degree: '♯2 maj', chordName: 'B', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '♯5 dom7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 dom7', chordName: 'E♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♯2 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 dom7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '4 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♯2 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 dom7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '4 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♯2 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 dom7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '4 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♯2 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 dom7', chordName: 'E♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      instrumental: true,
      bars: [
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
        { chords: [] },
        { chords: [] },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'G♭', beat: 1, duration: 1 },
            { degree: '1 maj', chordName: 'A♭', beat: 2, duration: 3 },
          ],
          fermata: true,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=3mbBbFH9fAg' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/soundgarden.webp',
  popularity: 50,
};
