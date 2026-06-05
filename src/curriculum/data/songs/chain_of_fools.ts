import type { Song } from '@/curriculum/types/songLibrary';

export const chain_of_fools: Song = {
  id: 'chain_of_fools',
  title: 'Chain of Fools',
  artist: 'Aretha Franklin',
  year: 1967,
  historicalDescription:
    "Aretha Franklin records 'Chain of Fools' in 1967, delivering a raw, commanding vocal performance that cements her reign as the Queen of Soul. The track's churning groove and call-and-response structure draw deep from gospel and R&B roots, becoming one of the defining hits of her landmark breakthrough year — the same year she released 'Respect.' Together, these recordings transform American popular music.",
  key: 'C major',
  keyRoot: 60,
  mode: 'major',
  tempo: 116,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['funk', 'pop'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      measuresPerRow: 1,
      bars: [
        {
          chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }],
          fermata: true,
        },
      ],
    },
    {
      id: 'verse',
      label: 'Verse',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [], restBars: 8 },
        { chords: [] },
        { chords: [] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      bars: [
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'C7', beat: 1, duration: 4 }] },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=5C4FnlftQt4' },
  ],
  artistImageSource: 'commissioned',

  artistImageRef: '/artists/aretha-franklin.webp',
  popularity: 50,
};
