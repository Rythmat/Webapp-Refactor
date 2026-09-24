import type { Song } from '@/curriculum/types/songLibrary';

export const you_are_the_best_thing: Song = {
  id: 'you_are_the_best_thing',
  title: 'You Are the Best Thing',
  artist: 'Ray Lamontagne',
  year: 2008,
  historicalDescription:
    "Ray LaMontagne releases 'You Are the Best Thing' from his album Gossip in the Grain, a warm, soul-drenched declaration that stands apart from his brooding folk catalog. Drawing on classic Southern soul and vintage R&B, the song becomes one of his most beloved tracks — a staple at weddings and a testament to his ability to channel timeless American music.",
  key: 'B♭ major',
  keyRoot: 70,
  mode: 'major',
  tempo: 86,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      bars: [
        { chords: [] },
        {
          chords: [
            { degree: '1 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '3 dom7', chordName: 'D7', beat: 2, duration: 1 },
            { degree: '6 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '3 dom7', chordName: 'D7', beat: 2, duration: 1 },
            { degree: '6 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '3 dom7', chordName: 'D7', beat: 2, duration: 1 },
            { degree: '6 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
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
            { degree: '1 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '3 dom7', chordName: 'D7', beat: 2, duration: 1 },
            { degree: '6 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'E♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'B♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus_1',
      label: 'Chorus 1',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '6 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '6 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '6 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'F', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_3',
      label: 'Verse 3',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '3 dom7', chordName: 'D7', beat: 2, duration: 1 },
            { degree: '6 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '3 dom7', chordName: 'D7', beat: 2, duration: 1 },
            { degree: '6 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '3 dom7', chordName: 'D7', beat: 2, duration: 1 },
            { degree: '6 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
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
            { degree: '1 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '3 dom7', chordName: 'D7', beat: 2, duration: 1 },
            { degree: '6 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'E♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'B♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'chorus_2',
      label: 'Chorus 2',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '6 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '6 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_5',
      label: 'Verse 5',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '6 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'F', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_6',
      label: 'Verse 6',
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '3 dom7', chordName: 'D7', beat: 2, duration: 1 },
            { degree: '6 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '3 dom7', chordName: 'D7', beat: 2, duration: 1 },
            { degree: '6 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '3 dom7', chordName: 'D7', beat: 2, duration: 1 },
            { degree: '6 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '3 dom7', chordName: 'D7', beat: 2, duration: 1 },
            { degree: '6 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '3 dom7', chordName: 'D7', beat: 2, duration: 1 },
            { degree: '6 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'E♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'B♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '3 dom7', chordName: 'D7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'Gmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '3 min7', chordName: 'Dmin7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '4 maj', chordName: 'E♭', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '5 maj', chordName: 'F', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_7',
      label: 'Verse 7',
      bars: [
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '3 dom7', chordName: 'D7', beat: 2, duration: 1 },
            { degree: '6 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '3 dom7', chordName: 'D7', beat: 2, duration: 1 },
            { degree: '6 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '3 dom7', chordName: 'D7', beat: 2, duration: 1 },
            { degree: '6 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse_8',
      label: 'Verse 8',
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '3 dom7', chordName: 'D7', beat: 2, duration: 1 },
            { degree: '6 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'E♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'B♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
        },
      ],
    },
    {
      id: 'verse_9',
      label: 'Verse 9',
      bars: [
        {
          chords: [
            { degree: '1 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '3 dom7', chordName: 'D7', beat: 2, duration: 1 },
            { degree: '6 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '3 dom7', chordName: 'D7', beat: 2, duration: 1 },
            { degree: '6 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '3 dom7', chordName: 'D7', beat: 2, duration: 1 },
            { degree: '6 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '1 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '3 dom7', chordName: 'D7', beat: 2, duration: 1 },
            { degree: '6 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
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
            { degree: '1 maj', chordName: 'B♭', beat: 1, duration: 1 },
            { degree: '3 dom7', chordName: 'D7', beat: 2, duration: 1 },
            { degree: '6 min7', chordName: 'Gmin7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '4 maj', chordName: 'E♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [
            { degree: '5 maj', chordName: 'F', beat: 1, duration: 2 },
            { degree: '1 maj', chordName: 'B♭', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '1 maj', chordName: 'B♭', beat: 1, duration: 4 }],
          fermata: true,
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=pkntWssHboY' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/ray-lamontagne.webp',
  popularity: 50,
};
