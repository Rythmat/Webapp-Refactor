import type { Song } from '@/curriculum/types/songLibrary';

export const ignition_remix: Song = {
  id: 'ignition_remix',
  title: 'Ignition (Remix)',
  artist: 'R. Kelly',
  year: 2002,
  historicalDescription:
    "R. Kelly releases 'Ignition (Remix)' in 2002, a buoyant, hook-driven R&B anthem that immediately takes on a life of its own beyond its parent album. Its irresistible bounce and sing-along chorus make it one of the most ubiquitous party records of the early 2000s — a rare remix that eclipses the original and becomes the definitive version in pop culture memory.",
  key: 'E♭ major',
  keyRoot: 63,
  mode: 'major',
  tempo: 134,
  timeSignature: [4, 4],

  difficulty: 2,
  genreTags: ['hip hop'],
  techniques: [],

  sections: [
    {
      id: 'section_a',
      label: 'Section A',
      measuresPerRow: 1,
      bars: [{ chords: [], restBars: 4 }],
    },
    {
      id: 'verse',
      label: 'Verse',
      repeatCount: 3,
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'D♭', beat: 1, duration: 1 },
            { degree: '6 min7', chordName: 'Cmin7', beat: 2, duration: 1 },
            { degree: '5 min7', chordName: 'B♭min7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'chorus',
      label: 'Chorus',
      repeatCount: 6,
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'D♭', beat: 1, duration: 1 },
            { degree: '6 min7', chordName: 'Cmin7', beat: 2, duration: 1 },
            { degree: '5 min7', chordName: 'B♭min7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'bridge',
      label: 'Bridge',
      repeatCount: 7,
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'D♭', beat: 1, duration: 1 },
            { degree: '6 min7', chordName: 'Cmin7', beat: 2, duration: 1 },
            { degree: '5 min7', chordName: 'B♭min7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
      ],
    },
    {
      id: 'verse_2',
      label: 'Verse 2',
      bars: [
        {
          chords: [{ degree: '4 maj', chordName: 'A♭', beat: 1, duration: 4 }],
        },
        {
          chords: [
            { degree: '♭7 maj', chordName: 'D♭', beat: 1, duration: 1 },
            { degree: '6 min7', chordName: 'Cmin7', beat: 2, duration: 1 },
            { degree: '5 min7', chordName: 'B♭min7', beat: 3, duration: 2 },
          ],
        },
        { chords: [{ degree: '1 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
        { chords: [{ degree: '1 7', chordName: 'E♭7', beat: 1, duration: 4 }] },
      ],
    },
  ],

  audioSources: [
    { provider: 'youtube', uri: 'https://youtube.com/watch?v=MKvqpnB0SxE' },
  ],
  artistImageSource: 'commissioned',

  artistImageRef: '/artists/r-kelly.webp',
  popularity: 50,
};
