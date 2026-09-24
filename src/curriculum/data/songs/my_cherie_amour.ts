import type { Song } from '@/curriculum/types/songLibrary';

export const my_cherie_amour: Song = {
  id: 'my_cherie_amour',
  title: 'My Cherie Amour',
  artist: 'Stevie Wonder',
  year: 1969,
  historicalDescription:
    "Stevie Wonder releases 'My Cherie Amour', a song he originally wrote as a teenager at Motown — a tender ballad inspired by a schoolgirl crush that sat unreleased for years before finding its moment. Its lush orchestration and Wonder's aching vocal performance make it one of the definitive expressions of longing in the Motown catalog. The song becomes a pop standard, cementing Wonder's transition from child prodigy to enduring romantic artist.",
  key: 'D♭ major',
  keyRoot: 61,
  mode: 'major',
  tempo: 102,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['rnb'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '♭7 7', chordName: 'B7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'C♯', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '♭7 7', chordName: 'B7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj', chordName: 'C♯', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'G♯7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'C♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 7', chordName: 'F♯7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 7', chordName: 'G♯7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'C♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 7', chordName: 'F♯7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 7', chordName: 'G♯7sus', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 7', chordName: 'G♯7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '6 7', chordName: 'A♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 7', chordName: 'D♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'G♯7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'C♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 7', chordName: 'G♯7sus', beat: 1, duration: 2 },
            { degree: '5 7', chordName: 'G♯7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'C♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 7', chordName: 'F♯7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 7', chordName: 'G♯7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'C♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 7', chordName: 'F♯7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 7', chordName: 'G♯7sus', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 7', chordName: 'G♯7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '6 7', chordName: 'A♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '2 7', chordName: 'D♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '5 7', chordName: 'G♯7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'C♯', beat: 1, duration: 4 }],
        },
        { chords: [] },
      ],
    },
    {
      id: 'interlude',
      label: 'Interlude',
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '♭7 7', chordName: 'B7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '1 maj', chordName: 'C♯', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'F♯', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'B', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '♭7 7', chordName: 'B7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '1 maj', chordName: 'C♯', beat: 1, duration: 2 },
            { degree: '♭6 7', chordName: 'A7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        {
          chords: [{ degree: '♭2 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭5 7', chordName: 'G7sus', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '7 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭6 7', chordName: 'A7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭2 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭5 7', chordName: 'G7sus', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '7 maj', chordName: 'C', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭6 7', chordName: 'A7sus', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'chorus_3',
      label: 'Chorus 3',
      bars: [
        {
          chords: [{ degree: '♭5 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭6 7', chordName: 'A7sus', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '7 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♭7 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♭3 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '♭6 7', chordName: 'A7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭2 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        { chords: [] },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        {
          chords: [{ degree: '♭5 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '7 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 7', chordName: 'C7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭2 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭5 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '7 maj', chordName: 'C', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 7', chordName: 'C7', beat: 1, duration: 4 }] },
        {
          chords: [{ degree: '♭2 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=Fjufjv4rH0s' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/stevie-wonder.webp',
  popularity: 50,
};
