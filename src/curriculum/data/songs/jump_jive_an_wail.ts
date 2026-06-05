import type { Song } from '@/curriculum/types/songLibrary';

export const jump_jive_an_wail: Song = {
  id: 'jump_jive_an_wail',
  title: 'Jump, Jive An’ Wail',
  artist: 'Brian Setzer',
  year: 1998,
  historicalDescription:
    "Brian Setzer releases 'Jump, Jive An' Wail', a supercharged cover of Louis Prima's 1956 jump blues classic, propelling swing music back into mainstream American culture. At the height of the late-'90s swing revival, Setzer and his Orchestra become its most visible ambassadors — proving that big band brass and rockabilly attitude could ignite a new generation of dancers.",
  key: 'B major',
  keyRoot: 71,
  mode: 'major',
  tempo: 200,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['blues', 'jazz'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      bars: [
        { chords: [{ degree: '7 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      measuresPerRow: 6,
      bars: [
        { chords: [{ degree: '7 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '3 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_c',
      label: 'Section C',
      measuresPerRow: 6,
      repeatCount: 7,
      bars: [
        { chords: [{ degree: '7 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '♭2 min7', chordName: 'Cmin7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '♭5 7', chordName: 'F7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '7 7', chordName: 'B♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      measuresPerRow: 6,
      bars: [
        { chords: [{ degree: '1 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'E7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_e',
      label: 'Section E',
      measuresPerRow: 6,
      bars: [
        { chords: [{ degree: '1 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      measuresPerRow: 1,
      bars: [{ chords: [], restBars: 12 }],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      measuresPerRow: 6,
      bars: [
        { chords: [{ degree: '1 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'E7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '4 7', chordName: 'E7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'section_h',
      label: 'Section H',
      measuresPerRow: 6,
      bars: [
        { chords: [{ degree: '1 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B7', beat: 1, duration: 4 }] },
        {
          chords: [
            { degree: '2 min7', chordName: 'C♯min7', beat: 1, duration: 4 },
          ],
        },
        { chords: [{ degree: '5 7', chordName: 'F♯7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'B7', beat: 1, duration: 4 }] },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=aHWcN5YxuYc' },
  ],
  artistImageSource: 'commissioned',

  artistImageRef: '/artists/brian-setzer.webp',
  popularity: 50,
};
