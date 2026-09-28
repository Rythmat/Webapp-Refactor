import type { Song } from '@/curriculum/types/songLibrary';

export const p_y_t_pretty_young_thing: Song = {
  id: 'p_y_t_pretty_young_thing',
  title: 'P.Y.T. (Pretty Young Thing)',
  artist: 'Michael Jackson',
  year: 1983,
  historicalDescription:
    "Michael Jackson releases 'P.Y.T. (Pretty Young Thing)' as part of the landmark Thriller album, the best-selling record of all time. Propelled by irresistible, synth-driven grooves and Jackson's elastic, playful vocals, the track captures the euphoric energy of early 1980s pop at its peak. It cements Thriller's dominance across pop, R&B, and dance floors worldwide.",
  key: 'B dorian',
  keyRoot: 71,
  mode: 'dorian',
  tempo: 128,
  timeSignature: [4, 4],

  difficulty: 3,
  genreTags: ['pop', 'rock'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        {
          chords: [
            { degree: '1 min7/♭7', chordName: 'Bmin7/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7b5', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7/5', chordName: 'Bmin7/F♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/1', chordName: 'A/B', beat: 1, duration: 4 },
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
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'E7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 min7/1', chordName: 'F♯min7/B', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'E7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 min7/1', chordName: 'F♯min7/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [{ degree: '♭6 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            {
              degree: '2 min7/5',
              chordName: 'C♯min7/F♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'F♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7/1', chordName: 'F♯min7/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'B7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        {
          chords: [{ degree: '♭6 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            {
              degree: '2 min7/5',
              chordName: 'C♯min7/F♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'F♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '♭7 min7/♭3',
              chordName: 'Amin7/D',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'B7alt', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_4',
      label: 'Verse 4',
      bars: [
        {
          chords: [
            { degree: '4 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭7 maj6', chordName: 'A6', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭7 maj6', chordName: 'A6', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_5',
      label: 'Verse 5',
      bars: [
        {
          chords: [{ degree: '♭6 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 maj/5', chordName: 'D/F♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7/1', chordName: 'F♯min7/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'B7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_6',
      label: 'Verse 6',
      bars: [
        {
          chords: [
            { degree: '♭7 maj6', chordName: 'A6', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭7 maj6', chordName: 'A6', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 min7/1', chordName: 'F♯min7/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'B7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭6 maj/♭7', chordName: 'G/A', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 dom9', chordName: 'A9', beat: 1, duration: 4 },
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
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'E7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 min7/1', chordName: 'F♯min7/B', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_7',
      label: 'Verse 7',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 dom7', chordName: 'E7sus', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 min7/1', chordName: 'F♯min7/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_8',
      label: 'Verse 8',
      bars: [
        {
          chords: [{ degree: '♭6 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            {
              degree: '2 min7/5',
              chordName: 'C♯min7/F♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'F♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7/1', chordName: 'F♯min7/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'B7', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_9',
      label: 'Verse 9',
      bars: [
        {
          chords: [{ degree: '♭6 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            {
              degree: '2 min7/5',
              chordName: 'C♯min7/F♯',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [
            { degree: '5 dom7', chordName: 'F♯7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            {
              degree: '♭7 min7/♭3',
              chordName: 'Amin7/D',
              beat: 1,
              duration: 4,
            },
          ],
        },
        {
          chords: [
            { degree: '1 dom7', chordName: 'B7alt', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_10',
      label: 'Verse 10',
      bars: [
        {
          chords: [
            { degree: '4 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭7 maj6', chordName: 'A6', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭7 maj6', chordName: 'A6', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_11',
      label: 'Verse 11',
      bars: [
        {
          chords: [{ degree: '♭6 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 maj/5', chordName: 'D/F♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7/1', chordName: 'F♯min7/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'B7', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [
            { degree: '♭7 maj6', chordName: 'A6', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭7 maj6', chordName: 'A6', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 maj/5', chordName: 'D/F♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7/1', chordName: 'F♯min7/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7/1', chordName: 'F♯min7/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: 'n.c.', chordName: 'N.C.', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_12',
      label: 'Verse 12',
      bars: [
        {
          chords: [{ degree: '♭7 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '4 maj/6', chordName: 'E/G♯', beat: 1, duration: 2 },
            { degree: '5 dom7', chordName: 'F♯7sus', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Bmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 maj/5', chordName: 'D/F♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'B7', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_13',
      label: 'Verse 13',
      bars: [
        {
          chords: [
            { degree: '4 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭7 maj6', chordName: 'A6', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭7 maj6', chordName: 'A6', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        {
          chords: [{ degree: '♭6 maj', chordName: 'G', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 maj/5', chordName: 'D/F♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '5 min7/1', chordName: 'F♯min7/B', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '1 dom7', chordName: 'B7', beat: 1, duration: 4 }],
        },
        { chords: [] },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=1ZZQuj6htF4' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/michael-jackson.webp',
  popularity: 50,
};
