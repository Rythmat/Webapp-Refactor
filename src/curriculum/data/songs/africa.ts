import type { Song } from '@/curriculum/types/songLibrary';

export const africa: Song = {
  id: 'africa',
  title: 'Africa',
  artist: 'Toto',
  composer: 'David Paich and Jeff Porcaro',
  year: 1982,
  historicalDescription:
    "Toto releases 'Africa', a lush, atmospheric rock ballad that becomes one of the defining pop hits of 1982. Written by drummer Jeff Porcaro and keyboardist David Paich, the song's sweeping synths and layered vocals evoke a romanticized continent its writers had never visited — a creative leap that somehow resonates with millions. Decades later, it achieves a second life as an enduring internet cultural phenomenon.",
  key: 'B major',
  keyRoot: 71,
  mode: 'major',
  tempo: 93,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['rock'],
  techniques: [],

  session: {
    studio: 'Sunset Sound',
    city: 'Los Angeles',
    country: 'USA',
    label: 'Columbia',
    recordedYear: 1982,
  },
  credits: [
    { name: 'Bobby Kimball', role: 'vocals', primary: true },
    { name: 'David Paich', role: 'vocals', primary: true },
    { name: 'David Paich', role: 'performer', instrument: 'synthesizer' },
    { name: 'David Paich', role: 'performer', instrument: 'piano' },
    { name: 'David Paich', role: 'songwriter' },
    { name: 'Jeff Porcaro', role: 'performer', instrument: 'drum-kit' },
    { name: 'Jeff Porcaro', role: 'performer', instrument: 'cowbell' },
    { name: 'Jeff Porcaro', role: 'performer', instrument: 'gong' },
    { name: 'Jeff Porcaro', role: 'songwriter' },
    {
      name: 'Steve Lukather',
      role: 'performer',
      instrument: 'electric-guitar',
    },
    { name: 'Steve Porcaro', role: 'performer', instrument: 'synthesizer' },
    { name: 'David Hungate', role: 'performer', instrument: 'electric-bass' },
    { name: 'Greg Ladanyi', role: 'engineer' },
    { name: 'Toto', role: 'producer', ensemble: true },
  ],

  sections: [
    {
      id: 'intro',
      label: 'Intro',
      instrumental: true,
      bars: [
        { chords: [], restBars: 4 },
        {
          chords: [{ degree: '♭7 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 2 },
            { degree: '2 min7', chordName: 'C♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 2 },
            { degree: '2 min7', chordName: 'C♯min7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse_1',
      label: 'Verse 1',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/5', chordName: 'B/F♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/4', chordName: 'A/E', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/5', chordName: 'E/F♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/6', chordName: 'E/G♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 2 },
            { degree: '2 min7', chordName: 'C♯min7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/5', chordName: 'B/F♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/4', chordName: 'A/E', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/5', chordName: 'E/F♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/6', chordName: 'E/G♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 2 },
            { degree: '2 min7', chordName: 'C♯min7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 2 },
            { degree: '2 min7', chordName: 'C♯min7', beat: 3, duration: 2 },
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
            { degree: '5 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 min7', chordName: 'F♯min7', beat: 1, duration: 2 },
            { degree: '6 min7', chordName: 'G♯min7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'interlude_1',
      label: 'Interlude 1',
      instrumental: true,
      bars: [
        {
          chords: [{ degree: '♭7 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 2 },
            { degree: '2 min7', chordName: 'C♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 2 },
            { degree: '2 min7', chordName: 'C♯min7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/5', chordName: 'B/F♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/4', chordName: 'A/E', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/5', chordName: 'E/F♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/6', chordName: 'E/G♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 2 },
            { degree: '2 min7', chordName: 'C♯min7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 2 },
            { degree: '2 min7', chordName: 'C♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 2 },
            { degree: '2 min7', chordName: 'C♯min7', beat: 3, duration: 2 },
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
            { degree: '5 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 min7', chordName: 'F♯min7', beat: 1, duration: 2 },
            { degree: '6 min7', chordName: 'G♯min7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'interlude_2',
      label: 'Interlude 2',
      instrumental: true,
      bars: [
        {
          chords: [{ degree: '♭7 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 2 },
            { degree: '2 min7', chordName: 'C♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 2 },
            { degree: '2 min7', chordName: 'C♯min7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '1 maj/5', chordName: 'B/F♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '♭7 maj/4', chordName: 'A/E', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/5', chordName: 'E/F♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '4 maj/6', chordName: 'E/G♯', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 2 },
            { degree: '2 min7', chordName: 'C♯min7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 maj', chordName: 'B', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '3 min7', chordName: 'D♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 2 },
            { degree: '2 min7', chordName: 'C♯min7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'chorus_3',
      label: 'Chorus 3',
      bars: [
        {
          chords: [
            { degree: '5 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus_4',
      label: 'Chorus 4',
      bars: [
        {
          chords: [
            { degree: '5 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 min7', chordName: 'F♯min7', beat: 1, duration: 4 },
          ],
        },
        {
          chords: [{ degree: '♭3 maj', chordName: 'D', beat: 1, duration: 4 }],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '2 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '4 maj', chordName: 'E', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '5 min7', chordName: 'F♯min7', beat: 1, duration: 2 },
            { degree: '6 min7', chordName: 'G♯min7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
    {
      id: 'outro',
      label: 'Outro',
      bars: [
        {
          chords: [{ degree: '♭7 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 2 },
            { degree: '2 min7', chordName: 'C♯min7', beat: 3, duration: 2 },
          ],
        },
        {
          chords: [{ degree: '♭7 maj', chordName: 'A', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '6 min7', chordName: 'G♯min7', beat: 1, duration: 2 },
            { degree: '2 min7', chordName: 'C♯min7', beat: 3, duration: 2 },
          ],
        },
      ],
    },
  ],
  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=FTQbiNvZqaY' },
  ],
  artistImageSource: 'manual',

  artistImageRef: '/artists/svg/toto.webp',
  popularity: 50,
};
