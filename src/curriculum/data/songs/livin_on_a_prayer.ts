import type { Song } from '@/curriculum/types/songLibrary';

export const livin_on_a_prayer: Song = {
  id: 'livin_on_a_prayer',
  title: 'Livin’ On A Prayer',
  artist: 'Jon Bon Jovi',
  year: 1986,
  historicalDescription:
    "Bon Jovi releases 'Livin' On A Prayer', a working-class anthem built around the story of Tommy and Gina struggling to make ends meet. The song becomes one of the defining rock hits of the 1980s, cementing Bon Jovi's place at the top of the arena rock world and capturing the blue-collar spirit of a generation.",
  key: 'E minor',
  keyRoot: 64,
  mode: 'minor',
  tempo: 122,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
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
            { degree: '♭6 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '♭7 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '♭7 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
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
            { degree: '♭6 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '♭7 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 2 },
            { degree: '♭7 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '♭6 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '♭6 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse_4',
      label: 'Verse 4',
      bars: [
        {
          chords: [{ degree: '♭7 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_5',
      label: 'Verse 5',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_6',
      label: 'Verse 6',
      bars: [
        {
          chords: [
            { degree: '♭6 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '♭7 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭6 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '♭7 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
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
            { degree: '♭6 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '♭7 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 2 },
            { degree: '♭7 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '♭6 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_8',
      label: 'Verse 8',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '♭6 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'pre_chorus',
      label: 'Pre-Chorus',
      bars: [
        {
          chords: [{ degree: '♭7 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus_3',
      label: 'Chorus 3',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '♭6 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭3 maj', chordName: 'G', beat: 1, duration: 2 },
            { degree: '♭6 maj', chordName: 'C', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 4 },
          ],
        },
      ],
    },
    {
      id: 'verse_9',
      label: 'Verse 9',
      bars: [
        {
          chords: [
            { degree: '♭6 maj', chordName: 'C', beat: 1, duration: 2 },
            { degree: '♭7 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 min7', chordName: 'Emin7', beat: 1, duration: 2 },
            { degree: '♭7 maj', chordName: 'D', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '♭6 maj', chordName: 'C', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        {
          chords: [
            { degree: '♭3 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '7 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭2 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭5 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '7 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭2 maj', chordName: 'F', beat: 1, duration: 4 }],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=lDK9QqIzhwk' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/jon-bon-jovi.webp',
  popularity: 50,
};
