import type { Song } from '@/curriculum/types/songLibrary';

export const love_on_top: Song = {
  id: 'love_on_top',
  title: 'Love On Top',
  artist: 'Beyonce',
  year: 2011,
  historicalDescription:
    "Beyoncé releases 'Love On Top' as part of her fourth studio album '4', a jubilant R&B throwback dripping with Michael Jackson and 1980s new jack swing influence. The song's cascading key changes — modulating upward four times in the final chorus — become its signature showstopper moment, showcasing her vocal acrobatics. Beyoncé famously announces her pregnancy at the MTV VMAs after performing the track, making it a cultural flashpoint of 2011.",
  key: 'G minor',
  keyRoot: 67,
  mode: 'minor',
  tempo: 94,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['rnb'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      measuresPerRow: 10,
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♯7 dim7', chordName: 'F♯dim7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '7 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '♭2 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♯7 dim7', chordName: 'F♯dim7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '7 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '♭2 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      measuresPerRow: 9,
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♯7 dim7', chordName: 'F♯dim7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '7 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭2 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♯7 dim7', chordName: 'F♯dim7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '7 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'G7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      measuresPerRow: 8,
      bars: [
        {
          chords: [
            { degree: '5 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'G7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♯6 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'Amin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'G7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♯6 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'G', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      measuresPerRow: 9,
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♯7 dim7', chordName: 'F♯dim7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '7 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♯7 dim7', chordName: 'F♯dim7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '7 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '♭2 maj', chordName: 'A♭', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      measuresPerRow: 8,
      bars: [
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♯7 dim7', chordName: 'F♯dim7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '7 maj', chordName: 'F', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♯7 dim7', chordName: 'F♯dim7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '7 maj', chordName: 'F', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭2 7', chordName: 'A♭7', beat: 1, duration: 2 },
            { degree: '1 7', chordName: 'G7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      measuresPerRow: 8,
      bars: [
        {
          chords: [{ degree: '♭5 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 dim7', chordName: 'Gdim7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♯7 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭2 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭5 maj', chordName: 'D♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 dim7', chordName: 'Gdim7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♯7 maj', chordName: 'G♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 7', chordName: 'A7', beat: 1, duration: 2 },
            { degree: '♭2 7', chordName: 'A♭7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_f',
      label: 'Section F',
      measuresPerRow: 8,
      bars: [
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭2 dim7', chordName: 'A♭dim7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 maj', chordName: 'A', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 maj', chordName: 'D', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭2 dim7', chordName: 'A♭dim7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'G', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 7', chordName: 'B♭7', beat: 1, duration: 2 },
            { degree: '2 7', chordName: 'A7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_g',
      label: 'Section G',
      measuresPerRow: 8,
      bars: [
        {
          chords: [{ degree: '6 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 dim7', chordName: 'Adim7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭2 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '3 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '6 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 dim7', chordName: 'Adim7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭2 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♯3 7', chordName: 'B7', beat: 1, duration: 2 },
            { degree: '3 7', chordName: 'B♭7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'section_h',
      label: 'Section H',
      bars: [
        {
          chords: [{ degree: '♯6 maj', chordName: 'E', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '3 dim7', chordName: 'B♭dim7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '2 maj', chordName: 'A', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♯3 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=Ob7vObnFUJc' },
  ],
  artistImageSource: 'commissioned',

  artistImageRef: '/artists/beyonce.webp',
  popularity: 50,
};
