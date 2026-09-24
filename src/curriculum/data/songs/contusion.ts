import type { Song } from '@/curriculum/types/songLibrary';

export const contusion: Song = {
  id: 'contusion',
  title: 'Contusion',
  artist: 'Stevie Wonder',
  year: 1976,
  historicalDescription:
    "Stevie Wonder releases 'Contusion' as part of his landmark double album 'Songs in the Key of Life' — a rare instrumental showcase that lets his jazz-fusion instincts run wild. The track bristles with technical ferocity, demonstrating Wonder's mastery across multiple instruments and his deep fluency in funk and jazz at the height of his creative peak.",
  key: 'E lydian',
  keyRoot: 64,
  mode: 'lydian',
  tempo: 132,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['funk', 'rock'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [
        { chords: [{ degree: '♯5 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♯5 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♯5 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♯5 7', chordName: 'C7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      instrumental: true,
      bars: [
        {
          chords: [{ degree: '♯1 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♯4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '♯6 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '3 7', chordName: 'A♭7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 7', chordName: 'A♭7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 7', chordName: 'A♭7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 7', chordName: 'A♭7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 7', chordName: 'A♭7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 7', chordName: 'A♭7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'B', beat: 1, duration: 1 },
            { degree: '4 maj', chordName: 'A', beat: 2, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '♯2 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '♯1 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '7 maj', chordName: 'E♭', beat: 1, duration: 1 },
            { degree: '6 maj', chordName: 'D♭', beat: 2, duration: 1 },
            { degree: '2 maj', chordName: 'G♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '7 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '7 maj', chordName: 'E♭', beat: 1, duration: 1 },
            { degree: '6 maj', chordName: 'D♭', beat: 2, duration: 1 },
            { degree: '2 maj', chordName: 'G♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '7 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      instrumental: true,
      bars: [
        {
          chords: [
            { degree: '2 maj/1', chordName: 'F♯/E', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/4', chordName: 'E/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 maj/1', chordName: 'F♯/E', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♯6 maj/1', chordName: 'D/E', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/4', chordName: 'E/A', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      instrumental: true,
      bars: [
        {
          chords: [{ degree: '♯1 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♯4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '♯6 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '3 7', chordName: 'A♭7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 7', chordName: 'A♭7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 7', chordName: 'A♭7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 7', chordName: 'A♭7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 7', chordName: 'A♭7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 7', chordName: 'A♭7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'B', beat: 1, duration: 1 },
            { degree: '4 maj', chordName: 'A', beat: 2, duration: 3 },
          ],
        },
        {
          chords: [
            { degree: '♯2 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '♯1 maj', chordName: 'F', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '7 maj', chordName: 'E♭', beat: 1, duration: 1 },
            { degree: '6 maj', chordName: 'D♭', beat: 2, duration: 1 },
            { degree: '2 maj', chordName: 'G♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '7 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '7 maj', chordName: 'E♭', beat: 1, duration: 1 },
            { degree: '6 maj', chordName: 'D♭', beat: 2, duration: 1 },
            { degree: '2 maj', chordName: 'G♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '7 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      instrumental: true,
      bars: [
        {
          chords: [
            { degree: '2 maj/1', chordName: 'F♯/E', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/4', chordName: 'E/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '2 maj/1', chordName: 'F♯/E', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'E', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '♯6 maj/1', chordName: 'D/E', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/4', chordName: 'E/A', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      instrumental: true,
      bars: [
        {
          chords: [{ degree: '♯1 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♯4 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 maj', chordName: 'A', beat: 1, duration: 2 },
            { degree: '♯6 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '3 7', chordName: 'A♭7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 7', chordName: 'A♭7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 7', chordName: 'A♭7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 7', chordName: 'A♭7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 7', chordName: 'A♭7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 7', chordName: 'A♭7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'B', beat: 1, duration: 1 },
            { degree: '4 maj', chordName: 'A', beat: 2, duration: 3 },
          ],
        },
        {
          chords: [{ degree: '♯2 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♯1 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '7 maj', chordName: 'E♭', beat: 1, duration: 1 },
            { degree: '6 maj', chordName: 'D♭', beat: 2, duration: 1 },
            { degree: '2 maj', chordName: 'G♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '7 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'B', beat: 1, duration: 1 },
            { degree: '4 maj', chordName: 'A', beat: 2, duration: 3 },
          ],
        },
        {
          chords: [{ degree: '♯2 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♯1 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '7 maj', chordName: 'E♭', beat: 1, duration: 1 },
            { degree: '6 maj', chordName: 'D♭', beat: 2, duration: 1 },
            { degree: '2 maj', chordName: 'G♭', beat: 3, duration: 2 },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=6T5q7BzpEe4' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/stevie-wonder.webp',
  popularity: 50,
};
